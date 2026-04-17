import { create } from 'zustand';

export type WsConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';

interface DerivTick {
  symbol: string;
  quote: number;
  bid: number | null;
  ask: number | null;
  epoch: number;
}

interface DerivBalance {
  balance: number;
  currency: string;
  accountId: string;
}

interface DerivState {
  // Connection
  wsStatus: WsConnectionStatus;
  derivConnected: boolean;
  
  // Balance
  balance: DerivBalance | null;
  
  // Ticks
  ticks: Record<string, DerivTick>;
  
  // Active symbols
  activeSymbols: any[];
  
  // Portfolio
  portfolio: any[];
  
  // Transactions
  transactions: any[];
  
  // Trading
  activeProposal: Record<string, any>;
  lastBuyResponse: any | null;
  lastSellResponse: any | null;
  openContracts: Record<number, any>; // Active tracking of contract status
  
  // Errors
  lastError: string | null;

  // Actions
  setWsStatus: (status: WsConnectionStatus) => void;
  setDerivConnected: (connected: boolean) => void;
  setBalance: (balance: DerivBalance) => void;
  updateTick: (tick: DerivTick) => void;
  setActiveSymbols: (symbols: any[]) => void;
  setPortfolio: (portfolio: any[]) => void;
  addTransaction: (tx: any) => void;
  setProposal: (symbol: string, proposal: any) => void;
  setBuyResponse: (response: any) => void;
  setSellResponse: (response: any) => void;
  updateOpenContract: (contract: any) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useDerivStore = create<DerivState>((set) => ({
  wsStatus: 'disconnected',
  derivConnected: false,
  balance: null,
  ticks: {},
  activeSymbols: [],
  portfolio: [],
  transactions: [],
  activeProposal: {},
  lastBuyResponse: null,
  lastSellResponse: null,
  openContracts: {},
  lastError: null,

  setWsStatus: (status) => set({ wsStatus: status }),
  setDerivConnected: (connected) => set({ derivConnected: connected }),
  
  setBalance: (balance) => set({ balance }),
  
  updateTick: (tick) => set((state) => ({
    ticks: { ...state.ticks, [tick.symbol]: tick },
  })),
  
  setActiveSymbols: (symbols) => set({ activeSymbols: symbols }),
  
  setPortfolio: (portfolio) => set({ portfolio }),
  
  addTransaction: (tx) => set((state) => ({
    transactions: [tx, ...state.transactions].slice(0, 100),
  })),
  
  setProposal: (symbol, proposal) => set((state) => ({
    activeProposal: { ...state.activeProposal, [symbol]: proposal }
  })),

  setBuyResponse: (response) => set({ lastBuyResponse: response }),
  
  setSellResponse: (response) => set({ lastSellResponse: response }),
  
  updateOpenContract: (contract) => set((state) => ({
    openContracts: { ...state.openContracts, [contract.contract_id]: contract }
  })),

  setError: (error) => set({ lastError: error }),
  
  reset: () => set({
    wsStatus: 'disconnected',
    derivConnected: false,
    balance: null,
    ticks: {},
    activeSymbols: [],
    portfolio: [],
    transactions: [],
    activeProposal: {},
    lastBuyResponse: null,
    lastSellResponse: null,
    openContracts: {},
    lastError: null,
  }),
}));
