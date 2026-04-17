import { useEffect, useState } from 'react';
import { useDerivStore } from '../../shared/store/deriv.store';
import api from '../../shared/api/client';
import toast from 'react-hot-toast';
import { Search, Plus, Minus, TrendingUp } from 'lucide-react';

export function MarketPage() {
  const { activeSymbols, ticks } = useDerivStore();
  const [search, setSearch] = useState('');
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([]);
  const [defaultWatchlistId, setDefaultWatchlistId] = useState<string>('');

  useEffect(() => {
    loadWatchlist();
    // Request symbols if connected
    api.get('/deriv/market/active-symbols').catch(() => {});
  }, []);

  const loadWatchlist = async () => {
    try {
      const { data } = await api.get('/watchlists');
      const lists = data.data || [];
      const defaultList = lists.find((w: any) => w.isDefault) || lists[0];
      if (defaultList) {
        setDefaultWatchlistId(defaultList.id);
        setWatchlistSymbols(defaultList.symbols.map((s: any) => s.symbol));
      }
    } catch {
      // ignore
    }
  };

  const addToWatchlist = async (symbol: string) => {
    if (!defaultWatchlistId) {
      // Create default watchlist
      try {
        const { data } = await api.post('/watchlists', { name: 'My Watchlist', isDefault: true });
        setDefaultWatchlistId(data.data.id);
        await api.post(`/watchlists/${data.data.id}/symbols`, { symbol });
      } catch {
        toast.error('Failed to create watchlist');
        return;
      }
    } else {
      try {
        await api.post(`/watchlists/${defaultWatchlistId}/symbols`, { symbol });
      } catch {
        toast.error('Failed to add symbol');
        return;
      }
    }
    // Subscribe to ticks
    await api.post('/deriv/market/subscribe', { symbol });
    setWatchlistSymbols(prev => [...prev, symbol]);
    toast.success(`${symbol} added to watchlist`);
  };

  const removeFromWatchlist = async (symbol: string) => {
    if (!defaultWatchlistId) return;
    try {
      await api.delete(`/watchlists/${defaultWatchlistId}/symbols/${symbol}`);
      setWatchlistSymbols(prev => prev.filter(s => s !== symbol));
      toast.success(`${symbol} removed`);
    } catch {
      toast.error('Failed to remove symbol');
    }
  };

  const filtered = activeSymbols.filter((s: any) =>
    s.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    s.symbol?.toLowerCase().includes(search.toLowerCase()) ||
    s.market?.toLowerCase().includes(search.toLowerCase())
  );

  // Group by market
  const grouped = filtered.reduce((acc: Record<string, any[]>, sym: any) => {
    const market = sym.marketDisplayName || sym.market || 'Other';
    if (!acc[market]) acc[market] = [];
    acc[market].push(sym);
    return acc;
  }, {});

  return (
    <div className="fade-in" style={{ maxWidth: '1200px' }}>
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Market</h1>
          <p className="page-subtitle">{activeSymbols.length} symbols available</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input"
            style={{ paddingLeft: '44px', width: '100%' }}
            placeholder="Search symbols, markets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {activeSymbols.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <TrendingUp size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>No symbols loaded</h3>
          <p style={{ color: 'var(--text-muted)' }}>
            Connect to Deriv from the Dashboard to load market symbols
          </p>
        </div>
      ) : (
        Object.entries(grouped).map(([market, symbols]) => (
          <div key={market} className="card" style={{ marginBottom: '12px' }}>
            <div className="card-header">
              <span className="card-title">{market}</span>
              <span className="badge badge-blue">{(symbols as any[]).length}</span>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Quote</th>
                    <th>Status</th>
                    <th style={{ width: '80px' }}>Watch</th>
                  </tr>
                </thead>
                <tbody>
                  {(symbols as any[]).map((sym: any) => {
                    const tick = ticks[sym.symbol];
                    const inWatchlist = watchlistSymbols.includes(sym.symbol);
                    return (
                      <tr key={sym.symbol}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.8125rem' }}>
                          {sym.symbol}
                        </td>
                        <td>{sym.displayName}</td>
                        <td>
                          <span className="badge badge-blue">{sym.symbolType}</span>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>
                          {tick?.quote?.toFixed(4) || '—'}
                        </td>
                        <td>
                          <span className={`badge ${sym.exchangeIsOpen ? 'badge-green' : 'badge-red'}`}>
                            {sym.exchangeIsOpen ? 'Open' : 'Closed'}
                          </span>
                        </td>
                        <td>
                          <button
                            className={`btn btn-sm ${inWatchlist ? 'btn-danger' : 'btn-secondary'}`}
                            onClick={() => inWatchlist ? removeFromWatchlist(sym.symbol) : addToWatchlist(sym.symbol)}
                            style={{ padding: '4px 8px' }}
                          >
                            {inWatchlist ? <Minus size={14} /> : <Plus size={14} />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
