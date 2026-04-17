import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

export function DerivCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const queryStatus = searchParams.get('status');
    const error = searchParams.get('error');

    if (queryStatus === 'success') {
      setStatus('success');
      setMessage('Deriv account connected successfully!');
      toast.success('Deriv connected!');
      setTimeout(() => navigate('/dashboard'), 2000);
    } else if (error) {
      setStatus('error');
      setMessage(decodeURIComponent(error));
      toast.error('Connection failed');
    } else {
      setStatus('loading');
      setMessage('Processing...');
    }
  }, [searchParams, navigate]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      gap: '20px',
    }}>
      {status === 'loading' && (
        <>
          <Loader size={48} className="spin" style={{ color: 'var(--accent-blue)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Connecting your Deriv account...</p>
        </>
      )}
      {status === 'success' && (
        <>
          <CheckCircle size={48} style={{ color: 'var(--accent-green)' }} />
          <h2 style={{ color: 'var(--text-primary)' }}>Connected!</h2>
          <p style={{ color: 'var(--text-secondary)' }}>{message}</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Redirecting to dashboard...</p>
        </>
      )}
      {status === 'error' && (
        <>
          <XCircle size={48} style={{ color: 'var(--accent-red)' }} />
          <h2 style={{ color: 'var(--text-primary)' }}>Connection Failed</h2>
          <p style={{ color: 'var(--text-secondary)' }}>{message}</p>
          <button className="btn btn-primary" onClick={() => navigate('/settings/integrations')}>
            Try Again
          </button>
        </>
      )}
    </div>
  );
}
