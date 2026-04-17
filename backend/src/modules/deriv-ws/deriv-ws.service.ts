import WebSocket from 'ws';
import axios from 'axios';
import { config } from '../../shared/config';
import { decrypt } from '../../shared/crypto';
import prisma from '../../shared/database/prisma';
import { logger } from '../../shared/logger';
import { AuditService } from '../audit-logs/audit.service';
import { DerivAdapter } from '../deriv-shared/deriv.adapter';
import { WsConnectionStatus } from '../deriv-shared/internal.types';
import { InternalWebSocketServer } from './internal-ws.server';
import { EventEmitter } from 'events';

interface DerivSocketSession {
  ws: WebSocket | null;
  userId: string;
  accountId: string;
  derivAccountId: string;
  status: WsConnectionStatus;
  subscriptions: Map<string, string>; // reqId -> subscriptionId
  reconnectCount: number;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  pingTimer: ReturnType<typeof setInterval> | null;
  dbSessionId: string | null;
}

const MAX_RECONNECT_DELAY = 30000;
const PING_INTERVAL = 30000;
const PONG_TIMEOUT = 10000;

export class DerivWsService extends EventEmitter {
  private sessions = new Map<string, DerivSocketSession>();
  private internalWs: InternalWebSocketServer;

  constructor(internalWs: InternalWebSocketServer) {
    super();
    this.internalWs = internalWs;
  }

  /**
   * Request OTP and connect to Deriv WebSocket for a specific account
   */
  async connect(userId: string, derivAccountId: string): Promise<void> {
    const sessionKey = `${userId}:${derivAccountId}`;

    // Check if already connected
    const existing = this.sessions.get(sessionKey);
    if (existing && existing.status === 'connected') {
      logger.info('Already connected to Deriv WS', { userId, derivAccountId });
      return;
    }

    // Get access token
    const connection = await prisma.derivConnection.findFirst({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!connection) {
      throw new Error('No active Deriv connection found');
    }

    const accessToken = decrypt(connection.accessTokenEncrypted);

    // Get account record
    const account = await prisma.derivAccount.findFirst({
      where: { userId, derivAccountId },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    // Request OTP
    let wsUrl: string;
    try {
      const otpResponse = await axios.post(
        `${config.deriv.apiBaseUrl}/trading/v1/options/accounts/${derivAccountId}/otp`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Deriv-App-ID': config.deriv.appId,
          },
        }
      );
      wsUrl = otpResponse.data.url;
    } catch (error: any) {
      logger.error('Failed to get OTP', { error: error.message, derivAccountId });
      throw new Error(`Failed to get WebSocket OTP: ${error.message}`);
    }

    // Create DB session record
    const dbSession = await prisma.derivWsSession.create({
      data: {
        userId,
        derivAccountId: account.id,
        status: 'connecting',
        socketType: 'trading',
        reconnectCount: 0,
      },
    });

    // Create session object
    const session: DerivSocketSession = {
      ws: null,
      userId,
      accountId: account.id,
      derivAccountId,
      status: 'connecting',
      subscriptions: new Map(),
      reconnectCount: 0,
      reconnectTimer: null,
      pingTimer: null,
      dbSessionId: dbSession.id,
    };

    this.sessions.set(sessionKey, session);
    this.connectSocket(sessionKey, wsUrl, session);
  }

  /**
   * Actually open the WebSocket connection
   */
  private connectSocket(sessionKey: string, wsUrl: string, session: DerivSocketSession): void {
    try {
      const ws = new WebSocket(wsUrl);
      session.ws = ws;

      ws.on('open', () => {
        session.status = 'connected';
        logger.info('Deriv WS connected', { sessionKey });

        this.updateDbSession(session.dbSessionId!, {
          status: 'connected',
          connectedAt: new Date(),
        });

        this.broadcastStatus(session.userId, session.derivAccountId, 'connected');
        this.startPingPong(sessionKey, session);

        // Re-subscribe if reconnecting
        if (session.reconnectCount > 0) {
          this.resubscribeAll(sessionKey, session);
        }

        AuditService.log({
          userId: session.userId,
          domain: 'deriv-ws',
          action: 'connected',
          message: `WebSocket connected to account ${session.derivAccountId}`,
          context: { reconnectCount: session.reconnectCount },
        });
      });

      ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleDerivMessage(sessionKey, session, message);
        } catch (err) {
          logger.error('Failed to parse Deriv WS message', { error: err });
        }
      });

      ws.on('close', (code, reason) => {
        logger.warn('Deriv WS closed', { sessionKey, code, reason: reason.toString() });
        session.status = 'disconnected';
        this.stopPingPong(session);
        this.broadcastStatus(session.userId, session.derivAccountId, 'disconnected');

        this.updateDbSession(session.dbSessionId!, {
          status: 'disconnected',
          disconnectedAt: new Date(),
        });

        // Auto-reconnect unless manually disconnected
        if (code !== 1000) {
          this.scheduleReconnect(sessionKey, session);
        }
      });

      ws.on('error', (error) => {
        logger.error('Deriv WS error', { sessionKey, error: error.message });
        session.status = 'error';
        this.broadcastStatus(session.userId, session.derivAccountId, 'error');
      });

      ws.on('pong', () => {
        if (session.dbSessionId) {
          this.updateDbSession(session.dbSessionId, { lastPongAt: new Date() });
        }
      });
    } catch (error: any) {
      logger.error('Failed to connect Deriv WS', { error: error.message });
      this.scheduleReconnect(sessionKey, session);
    }
  }

  /**
   * Handle messages from Deriv WebSocket and normalize them
   */
  private handleDerivMessage(sessionKey: string, session: DerivSocketSession, message: any): void {
    // Store subscription IDs
    if (message.subscription) {
      const reqId = message.req_id?.toString();
      if (reqId) {
        session.subscriptions.set(reqId, message.subscription.id);
      }
    }

    // Route message types to normalized events
    if (message.msg_type === 'balance') {
      const balance = DerivAdapter.toInternalBalance(message);
      this.internalWs.broadcast(session.userId, 'deriv.account.balance.updated', balance);
    } else if (message.msg_type === 'tick') {
      const tick = DerivAdapter.toInternalTick(message);
      if (tick) {
        this.internalWs.broadcast(session.userId, 'deriv.market.tick', tick);
      }
    } else if (message.msg_type === 'ohlc') {
      // Candle data
      if (message.ohlc) {
        const candle = {
          symbol: message.ohlc.symbol,
          epoch: message.ohlc.epoch,
          open: parseFloat(message.ohlc.open),
          high: parseFloat(message.ohlc.high),
          low: parseFloat(message.ohlc.low),
          close: parseFloat(message.ohlc.close),
          granularity: message.ohlc.granularity,
        };
        this.internalWs.broadcast(session.userId, 'deriv.market.candle', candle);
      }
    } else if (message.msg_type === 'portfolio') {
      const portfolio = DerivAdapter.toInternalPortfolio(message);
      this.internalWs.broadcast(session.userId, 'deriv.account.portfolio.updated', portfolio);
    } else if (message.msg_type === 'transaction') {
      const transaction = DerivAdapter.toInternalTransactionEvent(message);
      this.internalWs.broadcast(session.userId, 'deriv.account.transaction.created', transaction);
    } else if (message.msg_type === 'active_symbols') {
      const symbols = DerivAdapter.toInternalActiveSymbols(message.active_symbols || []);
      this.internalWs.broadcast(session.userId, 'deriv.market.symbols.updated', symbols);
    } else if (message.msg_type === 'history' || message.msg_type === 'candles') {
      // One-shot response, emit once
      this.internalWs.broadcast(session.userId, 'deriv.market.history', message);
    } else if (message.msg_type === 'proposal') {
      // Pricing Proposal Request / Stream
      this.internalWs.broadcast(session.userId, 'deriv.trade.proposal', message.proposal);
    } else if (message.msg_type === 'buy') {
      // Contract purchase response
      this.internalWs.broadcast(session.userId, 'deriv.trade.buy', message.buy);
    } else if (message.msg_type === 'sell') {
      // Contract sell response
      this.internalWs.broadcast(session.userId, 'deriv.trade.sell', message.sell);
    } else if (message.msg_type === 'proposal_open_contract') {
      // Status update for an open contract
      this.internalWs.broadcast(session.userId, 'deriv.trade.open_contract', message.proposal_open_contract);
    } else if (message.error) {
      this.internalWs.broadcast(session.userId, 'deriv.error', {
        code: message.error.code,
        message: message.error.message,
      });
    }
  }

  /**
   * Start ping/pong heartbeat
   */
  private startPingPong(sessionKey: string, session: DerivSocketSession): void {
    this.stopPingPong(session);

    session.pingTimer = setInterval(() => {
      if (session.ws?.readyState === WebSocket.OPEN) {
        session.ws.send(JSON.stringify({ ping: 1 }));

        if (session.dbSessionId) {
          this.updateDbSession(session.dbSessionId, { lastPingAt: new Date() });
        }
      }
    }, PING_INTERVAL);
  }

  /**
   * Stop heartbeat timers
   */
  private stopPingPong(session: DerivSocketSession): void {
    if (session.pingTimer) {
      clearInterval(session.pingTimer);
      session.pingTimer = null;
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private async scheduleReconnect(sessionKey: string, session: DerivSocketSession): Promise<void> {
    session.reconnectCount++;
    const delay = Math.min(1000 * Math.pow(2, session.reconnectCount), MAX_RECONNECT_DELAY);

    logger.info(`Scheduling reconnect in ${delay}ms`, {
      sessionKey,
      attempt: session.reconnectCount,
    });

    session.status = 'reconnecting';
    this.broadcastStatus(session.userId, session.derivAccountId, 'reconnecting');

    session.reconnectTimer = setTimeout(async () => {
      try {
        // Get fresh OTP
        const connection = await prisma.derivConnection.findFirst({
          where: { userId: session.userId, isActive: true },
          orderBy: { createdAt: 'desc' },
        });

        if (!connection) {
          logger.error('No active connection for reconnect');
          return;
        }

        const accessToken = decrypt(connection.accessTokenEncrypted);

        const otpResponse = await axios.post(
          `${config.deriv.apiBaseUrl}/trading/v1/options/accounts/${session.derivAccountId}/otp`,
          {},
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Deriv-App-ID': config.deriv.appId,
            },
          }
        );

        this.updateDbSession(session.dbSessionId!, {
          reconnectCount: session.reconnectCount,
          status: 'connecting',
        });

        this.connectSocket(sessionKey, otpResponse.data.url, session);
      } catch (error: any) {
        logger.error('Reconnect failed', { error: error.message });
        this.scheduleReconnect(sessionKey, session);
      }
    }, delay);
  }

  /**
   * Re-subscribe to all active subscriptions after reconnect
   */
  private resubscribeAll(sessionKey: string, session: DerivSocketSession): void {
    logger.info('Re-subscribing after reconnect', {
      sessionKey,
      count: session.subscriptions.size,
    });

    // Re-subscribe to balance
    this.sendToSocket(sessionKey, { balance: 1, subscribe: 1 });

    // Re-subscribe to any tick subscriptions
    // Note: actual symbols would need to be tracked - this is handled by the caller
  }

  /**
   * Send a message to the Deriv WebSocket
   */
  sendToSocket(sessionKey: string, message: Record<string, unknown>): boolean {
    const session = this.sessions.get(sessionKey);
    if (!session || !session.ws || session.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    const reqId = Date.now();
    session.ws.send(JSON.stringify({ ...message, req_id: reqId }));
    return true;
  }

  /**
   * Send to socket by userId and derivAccountId
   */
  send(userId: string, derivAccountId: string, message: Record<string, unknown>): boolean {
    return this.sendToSocket(`${userId}:${derivAccountId}`, message);
  }

  /**
   * Subscribe to balance updates
   */
  subscribeBalance(userId: string, derivAccountId: string): boolean {
    return this.send(userId, derivAccountId, { balance: 1, subscribe: 1 });
  }

  /**
   * Subscribe to portfolio updates
   */
  subscribePortfolio(userId: string, derivAccountId: string): boolean {
    return this.send(userId, derivAccountId, { portfolio: 1 });
  }

  /**
   * Subscribe to transaction updates
   */
  subscribeTransaction(userId: string, derivAccountId: string): boolean {
    return this.send(userId, derivAccountId, { transaction: 1, subscribe: 1 });
  }

  /**
   * Get active symbols
   */
  getActiveSymbols(userId: string, derivAccountId: string): boolean {
    return this.send(userId, derivAccountId, {
      active_symbols: 'brief',
      product_type: 'basic',
    });
  }

  /**
   * Subscribe to ticks for a symbol
   */
  subscribeTicks(userId: string, derivAccountId: string, symbol: string): boolean {
    return this.send(userId, derivAccountId, { ticks: symbol, subscribe: 1 });
  }

  /**
   * Get ticks history
   */
  getTicksHistory(
    userId: string,
    derivAccountId: string,
    symbol: string,
    options: { style?: string; granularity?: number; start?: number; end?: number; count?: number }
  ): boolean {
    const msg: Record<string, unknown> = {
      ticks_history: symbol,
      adjust_start_time: 1,
      style: options.style || 'ticks',
      end: options.end || 'latest',
      count: options.count || 100,
    };

    if (options.start) msg.start = options.start;
    if (options.granularity) msg.granularity = options.granularity;

    return this.send(userId, derivAccountId, msg);
  }

  /**
   * Get statement
   */
  getStatement(userId: string, derivAccountId: string, options?: { limit?: number; offset?: number }): boolean {
    return this.send(userId, derivAccountId, {
      statement: 1,
      description: 1,
      limit: options?.limit || 50,
      offset: options?.offset || 0,
    });
  }

  /**
   * Get profit table
   */
  getProfitTable(userId: string, derivAccountId: string, options?: { limit?: number; offset?: number }): boolean {
    return this.send(userId, derivAccountId, {
      profit_table: 1,
      description: 1,
      limit: options?.limit || 50,
      offset: options?.offset || 0,
    });
  }

  /**
   * Get trading times
   */
  getTradingTimes(userId: string, derivAccountId: string): boolean {
    const today = new Date().toISOString().split('T')[0];
    return this.send(userId, derivAccountId, { trading_times: today });
  }

  /**
   * Forget a subscription
   */
  forgetSubscription(userId: string, derivAccountId: string, subscriptionId: string): boolean {
    return this.send(userId, derivAccountId, { forget: subscriptionId });
  }

  /**
   * Forget all subscriptions of a type
   */
  forgetAll(userId: string, derivAccountId: string, streamType: string): boolean {
    return this.send(userId, derivAccountId, { forget_all: [streamType] });
  }

  // --- TRADING OPERATIONS (ADDED) ---

  /**
   * Request a pricing proposal
   */
  getProposal(userId: string, derivAccountId: string, options: any): boolean {
    return this.send(userId, derivAccountId, {
      proposal: 1,
      ...options
    });
  }

  /**
   * Buy a contract (using a proposal ID)
   */
  buyContract(userId: string, derivAccountId: string, buyId: string, price: number): boolean {
    return this.send(userId, derivAccountId, {
      buy: buyId,
      price: price
    });
  }

  /**
   * Sell an open contract
   */
  sellContract(userId: string, derivAccountId: string, contractId: number, price: number = 0): boolean {
    return this.send(userId, derivAccountId, {
      sell: contractId,
      price: price
    });
  }

  /**
   * Subscribe to specific open contract status
   */
  subscribeOpenContract(userId: string, derivAccountId: string, contractId?: number): boolean {
    const payload: any = { proposal_open_contract: 1, subscribe: 1 };
    if (contractId) payload.contract_id = contractId;
    return this.send(userId, derivAccountId, payload);
  }

  // -----------------------------------

  /**
   * Disconnect a specific session
   */
  async disconnect(userId: string, derivAccountId: string): Promise<void> {
    const sessionKey = `${userId}:${derivAccountId}`;
    const session = this.sessions.get(sessionKey);

    if (session) {
      this.stopPingPong(session);

      if (session.reconnectTimer) {
        clearTimeout(session.reconnectTimer);
      }

      if (session.ws) {
        session.ws.close(1000, 'User disconnected');
      }

      if (session.dbSessionId) {
        await this.updateDbSession(session.dbSessionId, {
          status: 'disconnected',
          disconnectedAt: new Date(),
        });
      }

      this.sessions.delete(sessionKey);
      this.broadcastStatus(userId, derivAccountId, 'disconnected');

      await AuditService.log({
        userId,
        domain: 'deriv-ws',
        action: 'disconnected',
        message: `WebSocket disconnected from account ${derivAccountId}`,
      });
    }
  }

  /**
   * Get session status
   */
  getSessionStatus(userId: string, derivAccountId: string): WsConnectionStatus {
    const session = this.sessions.get(`${userId}:${derivAccountId}`);
    return session?.status || 'disconnected';
  }

  /**
   * Broadcast connection status to frontend
   */
  private broadcastStatus(userId: string, derivAccountId: string, status: WsConnectionStatus): void {
    this.internalWs.broadcast(userId, 'deriv.connection.status', {
      derivAccountId,
      status,
    });
  }

  /**
   * Update DB session record
   */
  private async updateDbSession(sessionId: string, data: Record<string, unknown>): Promise<void> {
    try {
      await prisma.derivWsSession.update({
        where: { id: sessionId },
        data: data as any,
      });
    } catch (error: any) {
      logger.error('Failed to update WS session', { error: error.message });
    }
  }

  /**
   * Cleanup all sessions on shutdown
   */
  async cleanup(): Promise<void> {
    for (const [key, session] of this.sessions) {
      this.stopPingPong(session);
      if (session.reconnectTimer) clearTimeout(session.reconnectTimer);
      if (session.ws) session.ws.close(1000, 'Server shutdown');
    }
    this.sessions.clear();
  }
}
