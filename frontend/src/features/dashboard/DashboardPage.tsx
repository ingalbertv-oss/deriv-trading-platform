import { useEffect, useState } from 'react';
import { useDerivStore } from '../../shared/store/deriv.store';
import api from '../../shared/api/client';
import toast from 'react-hot-toast';
import { 
  Wallet, 
  TrendingUp, 
  Activity, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  ArrowUpRight, 
  ArrowDownRight,
  Zap
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import './DashboardPage.css';

export function DashboardPage() {
  const { wsStatus, balance, ticks, activeSymbols, transactions, portfolio } = useDerivStore();
  const [derivStatus, setDerivStatus] = useState<any>(null);
  const [activeAccount, setActiveAccount] = useState<any>(null);
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [tickHistory, setTickHistory] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(true);
  const [sellingId, setSellingId] = useState<number | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  // Track tick history for sparklines
  useEffect(() => {
    Object.entries(ticks).forEach(([symbol, tick]) => {
      setTickHistory(prev => {
        const history = prev[symbol] || [];
        return {
          ...prev,
          [symbol]: [...history, tick.quote].slice(-30),
        };
      });
    });
  }, [ticks]);

  const loadInitialData = async () => {
    try {
      const [statusRes, accountRes, watchlistRes] = await Promise.allSettled([
        api.get('/auth/deriv/status'),
        api.get('/deriv/accounts/active'),
        api.get('/watchlists'),
      ]);

      if (statusRes.status === 'fulfilled') setDerivStatus(statusRes.value.data.data);
      if (accountRes.status === 'fulfilled') setActiveAccount(accountRes.value.data.data);
      if (watchlistRes.status === 'fulfilled') {
        const lists = watchlistRes.value.data.data;
        const defaultList = lists.find((w: any) => w.isDefault) || lists[0];
        if (defaultList?.symbols) {
          setWatchlist(defaultList.symbols.map((s: any) => s.symbol));
        }
      }
    } catch (err) {
      console.error('Failed to load initial data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!activeAccount) {
      toast.error('No active account. Go to Accounts first.');
      return;
    }
    try {
      await api.post(`/deriv/accounts/${activeAccount.derivAccountId}/ws/connect`);
      toast.success('Connecting to Deriv...');

      // Subscribe to ticks for watchlist symbols
      setTimeout(async () => {
        for (const symbol of watchlist) {
          await api.post('/deriv/market/subscribe', { symbol });
        }
        await api.get('/deriv/market/active-symbols');
      }, 2000);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Connection failed');
    }
  };

  const handleDisconnect = async () => {
    if (!activeAccount) return;
    try {
      await api.post(`/deriv/accounts/${activeAccount.derivAccountId}/ws/disconnect`);
      toast.success('Disconnected');
    } catch (err: any) {
      toast.error('Disconnect failed');
    }
  };

  const handleSell = async (contractId: number) => {
    setSellingId(contractId);
    try {
      await api.post('/deriv/trade/sell', { contractId, price: 0 });
      toast.success('Sell request processed');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to sell contract');
    } finally {
      setSellingId(null);
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card">
              <div className="skeleton" style={{ height: '20px', width: '60%', marginBottom: '12px' }} />
              <div className="skeleton" style={{ height: '36px', width: '40%', marginBottom: '8px' }} />
              <div className="skeleton" style={{ height: '14px', width: '80%' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard fade-in">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Real-time trading overview</p>
        </div>
        <div className="dashboard-actions">
          {wsStatus === 'connected' ? (
            <button className="btn btn-secondary" onClick={handleDisconnect}>
              <WifiOff size={16} />
              Disconnect
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleConnect} disabled={wsStatus === 'connecting'}>
              {wsStatus === 'connecting' ? (
                <><RefreshCw size={16} className="spin" /> Connecting...</>
              ) : (
                <><Wifi size={16} /> Connect Live</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Status Cards */}
      <div className="status-cards">
        <div className="card status-card">
          <div className="status-card-icon" style={{ background: wsStatus === 'connected' ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)' }}>
            {wsStatus === 'connected' ? <Wifi size={20} color="var(--accent-green)" /> : <WifiOff size={20} color="var(--accent-red)" />}
          </div>
          <div className="status-card-content">
            <span className="status-card-label">Connection</span>
            <span className={`status-card-value ${wsStatus === 'connected' ? 'text-green' : 'text-red'}`}>
              {wsStatus.charAt(0).toUpperCase() + wsStatus.slice(1)}
            </span>
          </div>
        </div>

        <div className="card status-card">
          <div className="status-card-icon" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>
            <Wallet size={20} color="var(--accent-blue)" />
          </div>
          <div className="status-card-content">
            <span className="status-card-label">Balance</span>
            <span className="status-card-value">
              {balance ? `${balance.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${balance.currency}` : '—'}
            </span>
          </div>
        </div>

        <div className="card status-card">
          <div className="status-card-icon" style={{ background: 'rgba(139, 92, 246, 0.15)' }}>
            <Activity size={20} color="var(--accent-purple)" />
          </div>
          <div className="status-card-content">
            <span className="status-card-label">Active Account</span>
            <span className="status-card-value">
              {activeAccount ? `${activeAccount.derivAccountId} (${activeAccount.currency})` : 'None'}
            </span>
          </div>
        </div>

        <div className="card status-card">
          <div className="status-card-icon" style={{ background: 'var(--accent-amber-dim)' }}>
            <Zap size={20} color="var(--accent-amber)" />
          </div>
          <div className="status-card-content">
            <span className="status-card-label">Live Feeds</span>
            <span className="status-card-value">{Object.keys(ticks).length} symbols</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* Watchlist / Live Ticks */}
        <div className="card grid-span-2">
          <div className="card-header">
            <span className="card-title">📈 Watchlist · Live Quotes</span>
            <span className="badge badge-green">{Object.keys(ticks).length} active</span>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Quote</th>
                  <th>Bid</th>
                  <th>Ask</th>
                  <th>Trend</th>
                </tr>
              </thead>
              <tbody>
                {watchlist.length === 0 && Object.keys(ticks).length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                      {wsStatus === 'connected' ? 'No symbols in watchlist' : 'Connect to see live data'}
                    </td>
                  </tr>
                ) : (
                  [...new Set([...watchlist, ...Object.keys(ticks)])].map((symbol) => {
                    const tick = ticks[symbol];
                    const history = tickHistory[symbol] || [];
                    const isUp = history.length >= 2 && history[history.length - 1] > history[history.length - 2];
                    const sparkData = history.map((v, i) => ({ v, i }));

                    return (
                      <tr key={symbol}>
                        <td>
                          <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                            {symbol}
                          </span>
                        </td>
                        <td>
                          <span className={tick ? (isUp ? 'price-up' : 'price-down') : 'price-neutral'} 
                                style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                            {tick?.quote?.toFixed(4) || '—'}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                          {tick?.bid?.toFixed(4) || '—'}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                          {tick?.ask?.toFixed(4) || '—'}
                        </td>
                        <td style={{ width: '100px' }}>
                          {sparkData.length > 2 && (
                            <ResponsiveContainer width={80} height={24}>
                              <AreaChart data={sparkData}>
                                <defs>
                                  <linearGradient id={`grad-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={isUp ? '#10b981' : '#ef4444'} stopOpacity={0.3} />
                                    <stop offset="100%" stopColor={isUp ? '#10b981' : '#ef4444'} stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <Area type="monotone" dataKey="v" stroke={isUp ? '#10b981' : '#ef4444'} fill={`url(#grad-${symbol})`} strokeWidth={1.5} dot={false} />
                              </AreaChart>
                            </ResponsiveContainer>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">💰 Recent Activity</span>
          </div>
          <div className="transactions-list">
            {transactions.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0' }}>
                No recent transactions
              </div>
            ) : (
              transactions.slice(0, 10).map((tx: any, i: number) => (
                <div key={i} className="transaction-item">
                  <div className="tx-icon" style={{
                    background: tx.amount >= 0 ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)'
                  }}>
                    {tx.amount >= 0 ? <ArrowUpRight size={16} color="var(--accent-green)" /> : <ArrowDownRight size={16} color="var(--accent-red)" />}
                  </div>
                  <div className="tx-details">
                    <span className="tx-type">{tx.actionType}</span>
                    <span className="tx-ref">#{tx.referenceId}</span>
                  </div>
                  <span className={`tx-amount ${tx.amount >= 0 ? 'price-up' : 'price-down'}`}>
                    {tx.amount >= 0 ? '+' : ''}{tx.amount?.toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Open Positions (Portfolio) */}
      <div className="dashboard-grid" style={{ marginTop: '24px' }}>
        <div className="card grid-span-3">
          <div className="card-header">
            <span className="card-title">💼 Open Positions (Portfolio)</span>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Contract ID</th>
                  <th>Type</th>
                  <th>Buy Price</th>
                  <th>Payout</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                      No open positions
                    </td>
                  </tr>
                ) : (
                  portfolio.map((contract: any) => (
                    <tr key={contract.contract_id}>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{contract.contract_id}</td>
                      <td>{contract.contract_type}</td>
                      <td>{contract.buy_price} {contract.currency}</td>
                      <td>{contract.payout} {contract.currency}</td>
                      <td>
                        <button 
                          className="btn btn-primary" 
                          style={{ padding: '4px 12px', fontSize: '0.75rem', height: 'auto', background: 'var(--accent-red)' }}
                          disabled={sellingId === contract.contract_id}
                          onClick={() => handleSell(contract.contract_id)}
                        >
                          {sellingId === contract.contract_id ? 'Selling...' : 'Sell at Market'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
