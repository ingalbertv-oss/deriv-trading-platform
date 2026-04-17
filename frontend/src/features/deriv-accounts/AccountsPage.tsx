import { useEffect, useState } from 'react';
import api from '../../shared/api/client';
import toast from 'react-hot-toast';
import { CreditCard, Check, RefreshCw } from 'lucide-react';

export function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/deriv/accounts');
      setAccounts(data.data || []);
    } catch (err: any) {
      toast.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const selectAccount = async (accountId: string) => {
    try {
      await api.post(`/deriv/accounts/${accountId}/select`);
      toast.success(`Account ${accountId} selected`);
      loadAccounts();
    } catch (err: any) {
      toast.error('Failed to select account');
    }
  };

  return (
    <div className="fade-in" style={{ maxWidth: '1000px' }}>
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Deriv Accounts</h1>
          <p className="page-subtitle">Manage your connected Deriv trading accounts</p>
        </div>
        <button className="btn btn-secondary" onClick={loadAccounts}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="card">
              <div className="skeleton" style={{ height: '24px', width: '40%', marginBottom: '8px' }} />
              <div className="skeleton" style={{ height: '16px', width: '60%' }} />
            </div>
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <CreditCard size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>No accounts found</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
            Connect your Deriv account first from Settings → Integrations
          </p>
          <a href="/settings/integrations" className="btn btn-primary">Connect Deriv</a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {accounts.map((account) => (
            <div key={account.id} className="card" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderColor: account.isDefault ? 'var(--accent-blue)' : undefined,
              background: account.isDefault ? 'rgba(59, 130, 246, 0.05)' : undefined,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: 'var(--radius-lg)',
                  background: account.isDefault ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-tertiary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <CreditCard size={20} color={account.isDefault ? 'var(--accent-blue)' : 'var(--text-muted)'} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{account.derivAccountId}</span>
                    {account.isDefault && <span className="badge badge-blue">Active</span>}
                    <span className={`badge ${account.isActive ? 'badge-green' : 'badge-red'}`}>
                      {account.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {account.accountType} · {account.currency} {account.groupName ? `· ${account.groupName}` : ''}
                  </div>
                </div>
              </div>
              {!account.isDefault && (
                <button className="btn btn-secondary btn-sm" onClick={() => selectAccount(account.derivAccountId)}>
                  <Check size={14} />
                  Set Active
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
