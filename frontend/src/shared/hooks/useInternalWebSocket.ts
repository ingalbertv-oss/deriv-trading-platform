import { useEffect, useRef, useCallback } from 'react';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { useDerivStore } from '../store/deriv.store';
import { useAuthStore } from '../store/auth.store';
import api from '../api/client';

type ReverbEcho = Echo<'reverb'>;

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
const DRIVER = import.meta.env.VITE_REALTIME_DRIVER || 'legacy';

const eventTypes = [
  'deriv.connection.status',
  'deriv.account.balance.updated',
  'deriv.market.tick',
  'deriv.market.symbols.updated',
  'deriv.market.candle',
  'deriv.account.portfolio.updated',
  'deriv.account.transaction.created',
  'deriv.error',
  'deriv.trade.proposal',
  'deriv.trade.buy',
  'deriv.trade.sell',
  'deriv.trade.open_contract',
] as const;

function createEcho(): ReverbEcho {
  (window as typeof window & { Pusher?: typeof Pusher }).Pusher = Pusher;
  return new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY || 'deriv-local-key',
    wsHost: import.meta.env.VITE_REVERB_HOST || window.location.hostname,
    wsPort: Number(import.meta.env.VITE_REVERB_PORT || 8080),
    wssPort: Number(import.meta.env.VITE_REVERB_PORT || 8080),
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME || 'http') === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${API_BASE}/broadcasting/auth`,
    auth: { headers: { Accept: 'application/json' } },
  });
}

function applyEvent(eventType: string, data: any, store: ReturnType<typeof useDerivStore.getState>) {
  switch (eventType) {
    case 'deriv.connection.status':
      store.setWsStatus(data.status);
      store.setDerivConnected(data.status === 'connected');
      break;
    case 'deriv.account.balance.updated': store.setBalance(data); break;
    case 'deriv.market.tick': store.updateTick(data); break;
    case 'deriv.market.symbols.updated': store.setActiveSymbols(data); break;
    case 'deriv.account.portfolio.updated': store.setPortfolio(data.contracts || []); break;
    case 'deriv.account.transaction.created': store.addTransaction(data); break;
    case 'deriv.error': store.setError(data.message); break;
    case 'deriv.trade.proposal': store.setProposal(data.id, data); break;
    case 'deriv.trade.buy': store.setBuyResponse(data); break;
    case 'deriv.trade.sell': store.setSellResponse(data); break;
    case 'deriv.trade.open_contract': store.updateOpenContract(data); break;
    default: break;
  }
}

export function useInternalWebSocket() {
  const echoRef = useRef<ReverbEcho | null>(null);
  const legacyWsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectCountRef = useRef(0);
  const user = useAuthStore((s) => s.user);
  const store = useDerivStore();

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    if (echoRef.current) {
      echoRef.current.leaveAllChannels();
      echoRef.current.disconnect();
      echoRef.current = null;
    }
    if (legacyWsRef.current) {
      legacyWsRef.current.close(1000);
      legacyWsRef.current = null;
    }
    store.setWsStatus('disconnected');
    store.setDerivConnected(false);
  }, [store]);

  const scheduleReconnect = useCallback((connect: () => void) => {
    reconnectCountRef.current++;
    const delay = Math.min(1000 * Math.pow(2, reconnectCountRef.current), 30000);
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    store.setWsStatus('reconnecting');
    reconnectTimerRef.current = setTimeout(connect, delay);
  }, [store]);

  const connect = useCallback(async () => {
    if (!user?.id) return;
    disconnect();
    store.setWsStatus('connecting');

    if (DRIVER !== 'reverb') {
      const ws = new WebSocket(`${WS_BASE}/ws/app?userId=${user.id}`);
      legacyWsRef.current = ws;
      ws.onopen = () => { reconnectCountRef.current = 0; store.setWsStatus('connected'); };
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          applyEvent(message.event, message.data, store);
        } catch { /* ignore malformed messages */ }
      };
      ws.onclose = () => scheduleReconnect(() => void connect());
      ws.onerror = () => store.setWsStatus('error');
      return;
    }

    try {
      const { data } = await api.get('/deriv/accounts/active');
      const account = data.data;
      if (!account?.derivAccountId) {
        store.setWsStatus('disconnected');
        return;
      }

      const echo = createEcho();
      echoRef.current = echo;
      const channel = echo.private(`deriv.${user.id}.account.${account.derivAccountId}`);
      channel.subscribed(() => {
        reconnectCountRef.current = 0;
        store.setWsStatus('connected');
      });
      channel.error(() => scheduleReconnect(() => void connect()));
      eventTypes.forEach((eventType) => {
        channel.listen(`.${eventType}`, (data: any) => applyEvent(eventType, data.data || data, store));
      });
    } catch {
      store.setWsStatus('error');
      scheduleReconnect(() => void connect());
    }
  }, [user?.id, disconnect, scheduleReconnect, store]);

  useEffect(() => {
    if (user?.id) void connect();
    return () => disconnect();
  }, [user?.id, connect, disconnect]);

  return { connect, disconnect };
}
