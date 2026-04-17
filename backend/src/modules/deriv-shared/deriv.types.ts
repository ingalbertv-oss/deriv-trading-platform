// Deriv API response types - isolated adapter layer
// These types represent raw Deriv responses and are mapped to internal domain types

export interface DerivOAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

export interface DerivAccountRaw {
  account_id: string;
  account_type: string;
  currency: string;
  group?: string;
  is_disabled?: boolean;
  landing_company_name?: string;
  linked_to?: Array<{ loginid: string; platform: string }>;
}

export interface DerivAccountsListResponse {
  accounts: DerivAccountRaw[];
}

export interface DerivOtpResponse {
  url: string;
}

export interface DerivBalanceResponse {
  balance: {
    balance: number;
    currency: string;
    id: string;
    loginid: string;
  };
}

export interface DerivTickRaw {
  tick?: {
    ask: number;
    bid: number;
    epoch: number;
    id: string;
    pip_size: number;
    quote: number;
    symbol: string;
  };
  // Subscription ID from Deriv WS
  subscription?: { id: string };
}

export interface DerivTicksHistoryRaw {
  history?: {
    prices: number[];
    times: number[];
  };
  candles?: Array<{
    close: number;
    epoch: number;
    high: number;
    low: number;
    open: number;
  }>;
  pip_size?: number;
}

export interface DerivActiveSymbolRaw {
  allow_forward_starting: number;
  display_name: string;
  display_order: number;
  exchange_is_open: number;
  is_trading_suspended: number;
  market: string;
  market_display_name: string;
  pip: number;
  subgroup: string;
  subgroup_display_name: string;
  submarket: string;
  submarket_display_name: string;
  symbol: string;
  symbol_type: string;
}

export interface DerivPortfolioRaw {
  portfolio: {
    contracts: Array<{
      app_id: number;
      buy_price: number;
      contract_id: number;
      contract_type: string;
      currency: string;
      date_start: number;
      expiry_time: number;
      longcode: string;
      payout: number;
      purchase_time: number;
      shortcode: string;
      symbol: string;
      transaction_id: number;
    }>;
  };
}

export interface DerivStatementRaw {
  statement: {
    count: number;
    transactions: Array<{
      action_type: string;
      amount: number;
      balance_after: number;
      contract_id?: number;
      longcode?: string;
      payout?: number;
      purchase_time?: number;
      reference_id: number;
      shortcode?: string;
      transaction_id: number;
      transaction_time: number;
    }>;
  };
}

export interface DerivTransactionRaw {
  transaction: {
    action: string;
    amount: number;
    balance: number;
    contract_id?: number;
    currency: string;
    date_expiry?: number;
    display_name?: string;
    id: string;
    longcode?: string;
    purchase_time?: number;
    stop_loss?: string;
    stop_out?: string;
    symbol?: string;
    take_profit?: string;
    transaction_id: number;
    transaction_time: number;
  };
  subscription?: { id: string };
}

export interface DerivProfitTableRaw {
  profit_table: {
    count: number;
    transactions: Array<{
      app_id: number;
      buy_price: number;
      contract_id: number;
      contract_type: string;
      duration_type: string;
      longcode: string;
      payout: number;
      purchase_time: number;
      sell_price: number;
      sell_time: number;
      shortcode: string;
      transaction_id: number;
    }>;
  };
}

export interface DerivTradingTimesRaw {
  trading_times: {
    markets: Array<{
      name: string;
      submarkets: Array<{
        name: string;
        symbols: Array<{
          events: Array<{ dates: string; descrip: string }>;
          name: string;
          symbol: string;
          times: Record<string, string[]>;
          trading_days: string[];
        }>;
      }>;
    }>;
  };
}
