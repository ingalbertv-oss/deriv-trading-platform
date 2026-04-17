import {
  DerivAccountRaw,
  DerivBalanceResponse,
  DerivTickRaw,
  DerivTicksHistoryRaw,
  DerivActiveSymbolRaw,
  DerivPortfolioRaw,
  DerivStatementRaw,
  DerivTransactionRaw,
  DerivProfitTableRaw,
  DerivTradingTimesRaw,
} from './deriv.types';
import {
  InternalAccount,
  InternalBalance,
  InternalTick,
  InternalTicksHistory,
  InternalCandlesHistory,
  InternalActiveSymbol,
  InternalPortfolio,
  InternalStatement,
  InternalTransaction,
  InternalProfitTable,
  InternalTradingTimes,
  InternalCandle,
} from './internal.types';

/**
 * Adapter layer: maps Deriv raw types to internal domain types.
 * If Deriv changes field names, only this file needs updating.
 */
export class DerivAdapter {
  static toInternalAccount(raw: DerivAccountRaw): InternalAccount {
    return {
      accountId: raw.account_id,
      accountType: raw.account_type,
      currency: raw.currency,
      group: raw.group || null,
      isDisabled: raw.is_disabled || false,
    };
  }

  static toInternalAccounts(rawList: DerivAccountRaw[]): InternalAccount[] {
    return rawList.map(this.toInternalAccount);
  }

  static toInternalBalance(raw: DerivBalanceResponse): InternalBalance {
    return {
      balance: raw.balance.balance,
      currency: raw.balance.currency,
      accountId: raw.balance.loginid,
    };
  }

  static toInternalTick(raw: DerivTickRaw): InternalTick | null {
    if (!raw.tick) return null;
    return {
      symbol: raw.tick.symbol,
      quote: raw.tick.quote,
      bid: raw.tick.bid ?? null,
      ask: raw.tick.ask ?? null,
      epoch: raw.tick.epoch,
      pipSize: raw.tick.pip_size ?? null,
    };
  }

  static toInternalTicksHistory(raw: DerivTicksHistoryRaw, symbol: string): InternalTicksHistory | null {
    if (!raw.history) return null;
    return {
      prices: raw.history.prices,
      times: raw.history.times,
      pipSize: raw.pip_size ?? null,
    };
  }

  static toInternalCandlesHistory(raw: DerivTicksHistoryRaw, symbol: string, granularity: number): InternalCandlesHistory | null {
    if (!raw.candles) return null;
    return {
      candles: raw.candles.map((c) => ({
        symbol,
        epoch: c.epoch,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        granularity,
      })),
      pipSize: raw.pip_size ?? null,
    };
  }

  static toInternalActiveSymbols(rawList: DerivActiveSymbolRaw[]): InternalActiveSymbol[] {
    return rawList.map((raw) => ({
      symbol: raw.symbol,
      displayName: raw.display_name,
      displayOrder: raw.display_order,
      market: raw.market,
      marketDisplayName: raw.market_display_name,
      submarket: raw.submarket,
      submarketDisplayName: raw.submarket_display_name,
      symbolType: raw.symbol_type,
      exchangeIsOpen: raw.exchange_is_open === 1,
      isTradingSuspended: raw.is_trading_suspended === 1,
      pip: raw.pip,
    }));
  }

  static toInternalPortfolio(raw: DerivPortfolioRaw): InternalPortfolio {
    return {
      contracts: raw.portfolio.contracts.map((c) => ({
        contractId: c.contract_id,
        contractType: c.contract_type,
        currency: c.currency,
        buyPrice: c.buy_price,
        payout: c.payout,
        symbol: c.symbol,
        dateStart: c.date_start,
        expiryTime: c.expiry_time,
        longcode: c.longcode,
        purchaseTime: c.purchase_time,
        transactionId: c.transaction_id,
      })),
    };
  }

  static toInternalStatement(raw: DerivStatementRaw): InternalStatement {
    return {
      count: raw.statement.count,
      transactions: raw.statement.transactions.map((t) => ({
        referenceId: String(t.reference_id),
        actionType: t.action_type,
        amount: t.amount,
        balanceAfter: t.balance_after,
        epoch: t.transaction_time,
        contractId: t.contract_id,
        longcode: t.longcode,
      })),
    };
  }

  static toInternalTransactionEvent(raw: DerivTransactionRaw): InternalTransaction {
    return {
      referenceId: String(raw.transaction.transaction_id),
      actionType: raw.transaction.action,
      amount: raw.transaction.amount,
      balanceAfter: raw.transaction.balance,
      epoch: raw.transaction.transaction_time,
      contractId: raw.transaction.contract_id,
    };
  }

  static toInternalProfitTable(raw: DerivProfitTableRaw): InternalProfitTable {
    return {
      count: raw.profit_table.count,
      entries: raw.profit_table.transactions.map((t) => ({
        contractId: t.contract_id,
        contractType: t.contract_type,
        buyPrice: t.buy_price,
        sellPrice: t.sell_price,
        payout: t.payout,
        purchaseTime: t.purchase_time,
        sellTime: t.sell_time,
        profit: t.sell_price - t.buy_price,
        longcode: t.longcode,
      })),
    };
  }

  static toInternalTradingTimes(raw: DerivTradingTimesRaw): InternalTradingTimes {
    return {
      markets: raw.trading_times.markets.map((m) => ({
        name: m.name,
        submarkets: m.submarkets.map((sm) => ({
          name: sm.name,
          symbols: sm.symbols.map((s) => ({
            name: s.name,
            symbol: s.symbol,
            tradingDays: s.trading_days,
          })),
        })),
      })),
    };
  }
}
