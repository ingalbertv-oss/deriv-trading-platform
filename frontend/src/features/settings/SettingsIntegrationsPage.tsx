import { useEffect, useState } from 'react';
import api from '../../shared/api/client';
import toast from 'react-hot-toast';
import { Link2, Unlink, ExternalLink, Shield, RefreshCw } from 'lucide-react';

export function SettingsIntegrationsPage() {
  const [derivStatus, setDerivStatus] = useState<any>(null);
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statusRes, connRes] = await Promise.all([
        api.get('/auth/deriv/status'),
        api.get('/deriv/connections'),
      ]);
      setDerivStatus(statusRes.data.data);
      setConnections(connRes.data.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const startOAuth = async () => {
    setConnecting(true);
    try {
      const { data } = await api.get('/auth/deriv/start');
      // Redirect to Deriv OAuth
      window.location.href = data.data.authorizationUrl;
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to start OAuth');
      setConnecting(false);
    }
  };

  const disconnectConnection = async (id: string) => {
    try {
      await api.delete(`/deriv/connections/${id}`);
      toast.success('Connection removed');
      loadData();
    } catch {
      toast.error('Failed to disconnect');
    }
  };

  return (
    <div className="fade-in" style={{ maxWidth: '800px' }}>
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Integrations</h1>
          <p className="page-subtitle">Connect external trading platforms</p>
        </div>
      </div>

      {/* Deriv Integration Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, #ff444f, #ff6b6b)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '1.125rem',
              color: 'white',
            }}>
              D
            </div>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Deriv</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Binary options & synthetic indices trading platform
              </p>
            </div>
          </div>
          <div>
            {derivStatus?.connected ? (
              <span className="badge badge-green" style={{ fontSize: '0.8125rem', padding: '6px 14px' }}>
                <div className="status-dot connected" style={{ marginRight: '6px' }} />
                Connected
              </span>
            ) : (
              <span className="badge badge-red" style={{ fontSize: '0.8125rem', padding: '6px 14px' }}>
                Disconnected
              </span>
            )}
          </div>
        </div>

        <div style={{
          padding: '16px',
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Shield size={16} color="var(--accent-blue)" />
            <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)' }}>OAuth 2.0 + PKCE</span>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Secure connection using OAuth 2.0 with PKCE. Your Deriv credentials and tokens are never exposed to the browser.
            All authentication happens server-side.
          </p>
        </div>

        {!derivStatus?.connected ? (
          <button className="btn btn-primary btn-lg" onClick={startOAuth} disabled={connecting} style={{ width: '100%' }}>
            {connecting ? (
              <><RefreshCw size={18} className="spin" /> Redirecting to Deriv...</>
            ) : (
              <><ExternalLink size={18} /> Connect with Deriv</>
            )}
          </button>
        ) : (
          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Active Connections
            </h4>
            {connections.map((conn) => (
              <div key={conn.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '8px',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Link2 size={16} color="var(--accent-blue)" />
                    <span style={{ fontWeight: 500 }}>Deriv OAuth</span>
                    <span className={`badge ${conn.isActive ? 'badge-green' : 'badge-red'}`}>
                      {conn.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Connected {new Date(conn.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => disconnectConnection(conn.id)}>
                  <Unlink size={14} />
                  Disconnect
                </button>
              </div>
            ))}

            <button className="btn btn-secondary" onClick={startOAuth} disabled={connecting} style={{ marginTop: '12px' }}>
              <Link2 size={16} />
              Add Another Connection
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
