import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../shared/store/auth.store';
import toast from 'react-hot-toast';
import { BarChart3, Mail, Lock, User } from 'lucide-react';
import './LoginPage.css';

export function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        await register(name, email, password);
        toast.success('Account created!');
      } else {
        await login(email, password);
        toast.success('Welcome back!');
      }
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-orb orb-1" />
        <div className="login-orb orb-2" />
        <div className="login-orb orb-3" />
      </div>

      <div className="login-container fade-in">
        <div className="login-header">
          <div className="login-brand">
            <BarChart3 size={32} />
            <h1>Deriv Pro</h1>
          </div>
          <p className="login-subtitle">
            {isRegister ? 'Create your trading account' : 'Sign in to your dashboard'}
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {isRegister && (
            <div className="input-group">
              <label className="input-label" htmlFor="name">Full Name</label>
              <div className="input-with-icon">
                <User size={18} />
                <input
                  id="name"
                  className="input"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="input-group">
            <label className="input-label" htmlFor="email">Email</label>
            <div className="input-with-icon">
              <Mail size={18} />
              <input
                id="email"
                className="input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="password">Password</label>
            <div className="input-with-icon">
              <Lock size={18} />
              <input
                id="password"
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
          </div>

          <button className="btn btn-primary btn-lg login-submit" type="submit" disabled={loading}>
            {loading ? 'Processing...' : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="login-toggle">
          <span>{isRegister ? 'Already have an account?' : "Don't have an account?"}</span>
          <button className="btn-ghost toggle-btn" onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? 'Sign In' : 'Register'}
          </button>
        </div>
      </div>
    </div>
  );
}
