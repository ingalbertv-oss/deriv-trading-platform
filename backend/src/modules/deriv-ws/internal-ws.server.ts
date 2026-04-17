import WebSocket, { WebSocketServer } from 'ws';
import { Server as HttpServer } from 'http';
import { logger } from '../../shared/logger';
import { v4 as uuid } from 'uuid';

interface InternalClient {
  id: string;
  ws: WebSocket;
  userId: string;
  isAlive: boolean;
}

export interface InternalWsEvent {
  event: string;
  data: unknown;
  timestamp: number;
}

/**
 * Internal WebSocket server that broadcasts normalized events to frontend clients.
 * Frontend connects to /ws/app with session cookie authentication.
 */
export class InternalWebSocketServer {
  private wss: WebSocketServer | null = null;
  private clients = new Map<string, InternalClient>();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  initialize(server: HttpServer, path: string = '/ws/app'): void {
    this.wss = new WebSocketServer({ server, path });

    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientId = uuid();

      // Extract userId from query param (set during auth handshake)
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const userId = url.searchParams.get('userId');

      if (!userId) {
        ws.close(4001, 'Unauthorized');
        return;
      }

      const client: InternalClient = {
        id: clientId,
        ws,
        userId,
        isAlive: true,
      };

      this.clients.set(clientId, client);
      logger.info('Internal WS client connected', { clientId, userId });

      // Send initial connection confirmation
      this.sendToClient(client, {
        event: 'connected',
        data: { clientId },
        timestamp: Date.now(),
      });

      ws.on('pong', () => {
        client.isAlive = true;
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(client, message);
        } catch {
          // ignore invalid messages
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
        logger.info('Internal WS client disconnected', { clientId });
      });

      ws.on('error', (error) => {
        logger.error('Internal WS client error', { clientId, error: error.message });
        this.clients.delete(clientId);
      });
    });

    // Heartbeat
    this.heartbeatInterval = setInterval(() => {
      for (const [id, client] of this.clients) {
        if (!client.isAlive) {
          client.ws.terminate();
          this.clients.delete(id);
          continue;
        }
        client.isAlive = false;
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.ping();
        }
      }
    }, 30000);

    logger.info(`Internal WebSocket server initialized on ${path}`);
  }

  /**
   * Handle messages from frontend clients (commands, subscriptions)
   */
  private handleClientMessage(client: InternalClient, message: any): void {
    // Frontend can send subscription commands through internal WS
    // These are forwarded to the appropriate handler
    this.emit('client:message', {
      userId: client.userId,
      clientId: client.id,
      message,
    });
  }

  /**
   * Broadcast event to all clients of a specific user
   */
  broadcast(userId: string, event: string, data: unknown): void {
    const payload: InternalWsEvent = {
      event,
      data,
      timestamp: Date.now(),
    };

    for (const client of this.clients.values()) {
      if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
        this.sendToClient(client, payload);
      }
    }
  }

  /**
   * Broadcast to ALL connected clients
   */
  broadcastAll(event: string, data: unknown): void {
    const payload: InternalWsEvent = {
      event,
      data,
      timestamp: Date.now(),
    };

    for (const client of this.clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        this.sendToClient(client, payload);
      }
    }
  }

  private sendToClient(client: InternalClient, payload: InternalWsEvent): void {
    try {
      client.ws.send(JSON.stringify(payload));
    } catch (error: any) {
      logger.error('Failed to send to internal WS client', {
        clientId: client.id,
        error: error.message,
      });
    }
  }

  // Simple event emitter pattern
  private listeners = new Map<string, Array<(data: any) => void>>();

  on(event: string, handler: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
  }

  private emit(event: string, data: any): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((h) => h(data));
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }

  cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    for (const client of this.clients.values()) {
      client.ws.close(1000, 'Server shutdown');
    }
    this.clients.clear();
  }
}
