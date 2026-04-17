import { useEffect, useRef, useCallback } from 'react';
import { useDerivStore } from '../store/deriv.store';
import { useAuthStore } from '../store/auth.store';

const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

export function useInternalWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectCountRef = useRef(0);
  const user = useAuthStore((s) => s.user);
  const store = useDerivStore();

  const connect = useCallback(() => {
    if (!user?.id) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(`${WS_BASE}/ws/app?userId=${user.id}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Internal WebSocket connected');
      reconnectCountRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const { event: eventType, data } = JSON.parse(event.data);

        switch (eventType) {
          case 'deriv.connection.status':
            store.setWsStatus(data.status);
            break;
          case 'deriv.account.balance.updated':
            store.setBalance(data);
            break;
          case 'deriv.market.tick':
            store.updateTick(data);
            break;
          case 'deriv.market.symbols.updated':
            store.setActiveSymbols(data);
            break;
          case 'deriv.account.portfolio.updated':
            store.setPortfolio(data.contracts || []);
            break;
          case 'deriv.account.transaction.created':
            store.addTransaction(data);
            break;
          case 'deriv.error':
            store.setError(data.message);
            break;
          case 'deriv.trade.proposal':
            // data is the nested proposal object from Deriv
            store.setProposal(data.id, data);
            break;
          case 'deriv.trade.buy':
            store.setBuyResponse(data);
            break;
          case 'deriv.trade.sell':
            store.setSellResponse(data);
            break;
          case 'deriv.trade.open_contract':
            store.updateOpenContract(data);
            break;
          default:
            console.log('[WS] Unhandled event:', eventType, data);
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onclose = () => {
      console.log('[WS] Internal WebSocket closed');
      scheduleReconnect();
    };

    ws.onerror = (error) => {
      console.error('[WS] Internal WebSocket error:', error);
    };
  }, [user?.id]);

  const scheduleReconnect = useCallback(() => {
    reconnectCountRef.current++;
    const delay = Math.min(1000 * Math.pow(2, reconnectCountRef.current), 30000);
    
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
    
    reconnectTimerRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close(1000);
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [user?.id, connect, disconnect]);

  return { connect, disconnect };
}
