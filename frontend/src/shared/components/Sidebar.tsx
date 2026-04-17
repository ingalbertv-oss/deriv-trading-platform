import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../shared/store/auth.store';
import { useDerivStore } from '../../shared/store/deriv.store';
import { 
  LayoutDashboard, 
  CreditCard, 
  TrendingUp, 
  History, 
  Settings, 
  LogOut, 
  Wifi, 
  WifiOff,
  BarChart3 
} from 'lucide-react';
import './Sidebar.css';

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const { wsStatus } = useDerivStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/accounts', icon: CreditCard, label: 'Accounts' },
    { to: '/market', icon: TrendingUp, label: 'Market' },
    { to: '/history', icon: History, label: 'History' },
    { to: '/settings/integrations', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand">
        <BarChart3 size={24} className="brand-icon" />
        <span className="sidebar-text brand-text">Deriv Pro</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink 
            key={to} 
            to={to} 
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <Icon size={20} />
            <span className="sidebar-text">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-status">
          <div className={`status-dot ${wsStatus}`} />
          <span className="sidebar-text status-label">
            {wsStatus === 'connected' ? 'Live' : wsStatus}
          </span>
        </div>

        {user && (
          <div className="sidebar-user">
            <div className="user-avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-text user-info">
              <span className="user-name">{user.name}</span>
              <span className="user-email">{user.email}</span>
            </div>
          </div>
        )}

        <button className="sidebar-link logout-btn" onClick={handleLogout}>
          <LogOut size={20} />
          <span className="sidebar-text">Logout</span>
        </button>
      </div>
    </aside>
  );
}
