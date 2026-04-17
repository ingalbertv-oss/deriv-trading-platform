import { useState, useEffect } from 'react';
import { useDerivStore } from '../../../shared/store/deriv.store';
import api from '../../../shared/api/client';
import { RefreshCw, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface TradingPanelProps {
  symbol: string;
}

export function TradingPanel({ symbol }: TradingPanelProps) {
  const { activeProposal, lastBuyResponse, lastError, setError } = useDerivStore();
  const [stake, setStake] = useState<number>(10);
  const [duration, setDuration] = useState<number>(5);
  const [durationUnit, setDurationUnit] = useState<'t' | 's' | 'm' | 'h' | 'd'>('t');
  const [isRequesting, setIsRequesting] = useState(false);
  const [isBuying, setIsBuying] = useState(false);

  // Deriv usually uses CALL/PUT for Up/Down
  const [contractType, setContractType] = useState<'CALL' | 'PUT'>('CALL');

  const proposal = activeProposal[symbol];

  const fetchProposal = async () => {
    setIsRequesting(true);
    setError(null);
    try {
      await api.post('/deriv/trade/proposal', {
        contract_type: contractType,
        currency: 'USD',
        symbol: symbol,
        stake,
        duration,
        duration_unit: durationUnit,
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch proposal');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleBuy = async () => {
    if (!proposal?.id) return;
    setIsBuying(true);
    setError(null);
    try {
      await api.post('/deriv/trade/buy', {
        buyId: proposal.id,
        price: proposal.ask_price,
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to execute buy');
    } finally {
      setIsBuying(false);
    }
  };

  // Auto-fetch proposal when parameters change
  useEffect(() => {
    if (!symbol) return;
    const timer = setTimeout(() => {
      fetchProposal();
    }, 500); // debounce
    return () => clearTimeout(timer);
  }, [symbol, stake, duration, durationUnit, contractType]);

  return (
    <div className="card" style={{ padding: '24px' }}>
      <div className="card-header" style={{ marginBottom: '16px' }}>
        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <DollarSign size={20} color="var(--accent-blue)" />
          Trade {symbol}
        </h3>
      </div>

      {lastError && (
        <div style={{ padding: '12px', background: 'var(--accent-red-dim)', color: 'var(--accent-red)', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.875rem' }}>
          {lastError}
        </div>
      )}

      {lastBuyResponse?.contract_id && (
        <div style={{ padding: '12px', background: 'var(--accent-green-dim)', color: 'var(--accent-green)', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.875rem' }}>
          Bought successfully! Contract ID: {lastBuyResponse.contract_id}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Type Selection */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`btn ${contractType === 'CALL' ? 'btn-primary' : 'btn-outline'}`}
            style={{ flex: 1, display: 'flex', justifyContent: 'center', backgroundColor: contractType === 'CALL' ? 'var(--accent-green)' : '' }}
            onClick={() => setContractType('CALL')}
          >
            <TrendingUp size={16} /> Rise (CALL)
          </button>
          <button
            className={`btn ${contractType === 'PUT' ? 'btn-primary' : 'btn-outline'}`}
            style={{ flex: 1, display: 'flex', justifyContent: 'center', backgroundColor: contractType === 'PUT' ? 'var(--accent-red)' : '' }}
            onClick={() => setContractType('PUT')}
          >
            <TrendingDown size={16} /> Fall (PUT)
          </button>
        </div>

        {/* Inputs */}
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Duration</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="number" 
                value={duration} 
                onChange={e => setDuration(Number(e.target.value))} 
                className="input" 
                min="1"
                style={{ width: '60px' }}
              />
              <select 
                value={durationUnit} 
                onChange={e => setDurationUnit(e.target.value as any)} 
                className="input"
                style={{ flex: 1 }}
              >
                <option value="t">Ticks</option>
                <option value="s">Seconds</option>
                <option value="m">Minutes</option>
                <option value="h">Hours</option>
              </select>
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Stake (USD)</label>
            <input 
              type="number" 
              value={stake} 
              onChange={e => setStake(Number(e.target.value))} 
              className="input" 
              min="0.35"
              step="0.5"
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* Proposal Info */}
        <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Net Profit</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--accent-green)' }}>
              {proposal ? `+${(proposal.payout - proposal.ask_price).toFixed(2)} USD` : '0.00 USD'}
            </span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Payout</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {proposal ? `${proposal.payout.toFixed(2)} USD` : '0.00 USD'}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <button 
          className="btn btn-primary" 
          disabled={!proposal || isRequesting || isBuying}
          onClick={handleBuy}
          style={{ 
            height: '48px', 
            fontSize: '1.1rem', 
            fontWeight: 600,
            background: contractType === 'CALL' ? 'var(--accent-green)' : 'var(--accent-red)'
          }}
        >
          {isBuying ? <RefreshCw className="spinner" size={20} /> : `Purchase for ${proposal?.ask_price?.toFixed(2) || stake.toFixed(2)} USD`}
        </button>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          {proposal?.longcode || 'Loading proposal...'}
        </span>
      </div>
    </div>
  );
}
