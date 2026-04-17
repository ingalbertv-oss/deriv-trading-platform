// Internal domain types - decoupled from Deriv raw types

export interface InternalAccount {
  accountId: string;
  accountType: string;
  currency: string;
  group: string | null;
  isDisabled: boolean;
}

export interface InternalBalance {
  balance: number;
  currency: string;
  accountId: string;
}

export interface InternalTick {
  symbol: string;
  quote: number;
  bid: number | null;
  ask: number | null;
  epoch: number;
  pipSize: number | null;
}

export interface InternalCandle {
  symbol: string;
  epoch: number;
  open: number;
  high: number;
  low: number;
  close: number;
  granularity: number;
}

export interface InternalTicksHistory {
  prices: number[];
  times: number[];
  pipSize: number | null;
}

export interface InternalCandlesHistory {
  candles: InternalCandle[];
  pipSize: number | null;
}

export interface InternalActiveSymbol {
  symbol: string;
  displayName: string;
  displayOrder: number;
  market: string;
  marketDisplayName: string;
  submarket: string;
  submarketDisplayName: string;
  symbolType: string;
  exchangeIsOpen: boolean;
  isTradingSuspended: boolean;
  pip: number;
}

export interface InternalPortfolioContract {
  contractId: number;
  contractType: string;
  currency: string;
  buyPrice: number;
  payout: number;
  symbol: string;
  dateStart: number;
  expiryTime: number;
  longcode: string;
  purchaseTime: number;
  transactionId: number;
}

export interface InternalPortfolio {
  contracts: InternalPortfolioContract[];
}

export interface InternalTransaction {
  referenceId: string;
  actionType: string;
  amount: number;
  balanceAfter: number;
  epoch: number;
  contractId?: number;
  longcode?: string;
}

export interface InternalStatement {
  count: number;
  transactions: InternalTransaction[];
}

export interface InternalProfitEntry {
  contractId: number;
  contractType: string;
  buyPrice: number;
  sellPrice: number;
  payout: number;
  purchaseTime: number;
  sellTime: number;
  profit: number;
  longcode: string;
}

export interface InternalProfitTable {
  count: number;
  entries: InternalProfitEntry[];
}

export interface InternalTradingTimes {
  markets: Array<{
    name: string;
    submarkets: Array<{
      name: string;
      symbols: Array<{
        name: string;
        symbol: string;
        tradingDays: string[];
      }>;
    }>;
  }>;
}

export type WsConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';
