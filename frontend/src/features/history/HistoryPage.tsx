import { useEffect, useState } from 'react';
import { useDerivStore } from '../../shared/store/deriv.store';
import api from '../../shared/api/client';
import { History, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export function HistoryPage() {
  const { transactions } = useDerivStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Request statement data
    api.get('/deriv/account/statement?limit=50').catch(() => {});
    api.get('/deriv/account/transactions').catch(() => {});
  }, []);

  return (
    <div className="fade-in" style={{ maxWidth: '1000px' }}>
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">History</h1>
          <p className="page-subtitle">Transaction history and statements</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Recent Transactions</span>
          <span className="badge badge-blue">{transactions.length} items</span>
        </div>

        {transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <History size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
            <h3 style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>No transactions yet</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              Transactions will appear here once you start trading
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Reference</th>
                  <th>Amount</th>
                  <th>Balance After</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx: any, i: number) => (
                  <tr key={i}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {tx.amount >= 0 ? (
                          <ArrowUpRight size={16} color="var(--accent-green)" />
                        ) : (
                          <ArrowDownRight size={16} color="var(--accent-red)" />
                        )}
                        <span style={{ textTransform: 'capitalize' }}>{tx.actionType}</span>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                      #{tx.referenceId}
                    </td>
                    <td>
                      <span className={tx.amount >= 0 ? 'price-up' : 'price-down'} style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {tx.amount >= 0 ? '+' : ''}{tx.amount?.toFixed(2)}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {tx.balanceAfter?.toFixed(2) || '—'}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                      {tx.epoch ? new Date(tx.epoch * 1000).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
