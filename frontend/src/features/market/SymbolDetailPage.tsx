import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDerivStore } from '../../shared/store/deriv.store';
import api from '../../shared/api/client';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, Clock, DollarSign } from 'lucide-react';
import { TradingPanel } from './components/TradingPanel';

export function SymbolDetailPage() {
  const { symbol } = useParams<{ symbol: string }>();
  const { ticks } = useDerivStore();
  const [history, setHistory] = useState<Array<{ time: number; price: number }>>([]);
  const tick = symbol ? ticks[symbol] : null;

  useEffect(() => {
    if (!symbol) return;

    // Subscribe to ticks
    api.post('/deriv/market/subscribe', { symbol }).catch(() => {});

    // Request history
    api.get(`/deriv/market/ticks-history?symbol=${symbol}&style=ticks&count=100`).catch(() => {});
  }, [symbol]);

  // Build history from live ticks
  useEffect(() => {
    if (tick) {
      setHistory(prev => [
        ...prev,
        { time: tick.epoch, price: tick.quote }
      ].slice(-200));
    }
  }, [tick]);

  const chartData = history.map(h => ({
    time: new Date(h.time * 1000).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    price: h.price,
  }));

  const isUp = history.length >= 2 && history[history.length - 1]?.price > history[history.length - 2]?.price;

  return (
    <div className="fade-in" style={{ maxWidth: '1200px' }}>
      <div className="dashboard-header">
        <div>
          <h1 className="page-title" style={{ fontFamily: 'var(--font-mono)' }}>{symbol}</h1>
          <p className="page-subtitle">Symbol Details</p>
        </div>
      </div>

      {/* Price Card */}
      <div className="status-cards" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '24px' }}>
        <div className="card status-card">
          <div className="status-card-icon" style={{ background: isUp ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)' }}>
            <DollarSign size={20} color={isUp ? 'var(--accent-green)' : 'var(--accent-red)'} />
          </div>
          <div className="status-card-content">
            <span className="status-card-label">Last Price</span>
            <span className={`status-card-value ${isUp ? 'text-green' : 'text-red'}`} style={{ fontFamily: 'var(--font-mono)' }}>
              {tick?.quote?.toFixed(5) || '—'}
            </span>
          </div>
        </div>

        <div className="card status-card">
          <div className="status-card-icon" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>
            <TrendingUp size={20} color="var(--accent-blue)" />
          </div>
          <div className="status-card-content">
            <span className="status-card-label">Bid / Ask</span>
            <span className="status-card-value" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}>
              {tick?.bid?.toFixed(5) || '—'} / {tick?.ask?.toFixed(5) || '—'}
            </span>
          </div>
        </div>

        <div className="card status-card">
          <div className="status-card-icon" style={{ background: 'var(--accent-amber-dim)' }}>
            <Clock size={20} color="var(--accent-amber)" />
          </div>
          <div className="status-card-content">
            <span className="status-card-label">Data Points</span>
            <span className="status-card-value">{history.length}</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'start' }}>
        
        {/* Chart */}
        <div className="card" style={{ padding: '24px' }}>
          <div className="card-header">
            <span className="card-title">Price Chart (Live)</span>
          </div>
          {chartData.length > 2 ? (
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={isUp ? '#10b981' : '#ef4444'} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={isUp ? '#10b981' : '#ef4444'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} stroke="var(--border-primary)" />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} stroke="var(--border-primary)" />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-secondary)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                  }}
                />
                <Area type="monotone" dataKey="price" stroke={isUp ? '#10b981' : '#ef4444'} fill="url(#priceGradient)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Waiting for data...
            </div>
          )}
        </div>

        {/* Trading Panel */}
        <TradingPanel symbol={symbol || ''} />

      </div>
    </div>
  );
}
