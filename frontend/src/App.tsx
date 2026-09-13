import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './shared/store/auth.store';
import { AppLayout } from './shared/components/AppLayout';
import { LoginPage } from './features/auth/LoginPage';
import { DerivCallbackPage } from './features/auth/DerivCallbackPage';

const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage').then(({ DashboardPage }) => ({ default: DashboardPage })));
const AccountsPage = lazy(() => import('./features/deriv-accounts/AccountsPage').then(({ AccountsPage }) => ({ default: AccountsPage })));
const MarketPage = lazy(() => import('./features/market/MarketPage').then(({ MarketPage }) => ({ default: MarketPage })));
const SymbolDetailPage = lazy(() => import('./features/market/SymbolDetailPage').then(({ SymbolDetailPage }) => ({ default: SymbolDetailPage })));
const HistoryPage = lazy(() => import('./features/history/HistoryPage').then(({ HistoryPage }) => ({ default: HistoryPage })));
const SettingsIntegrationsPage = lazy(() => import('./features/settings/SettingsIntegrationsPage').then(({ SettingsIntegrationsPage }) => ({ default: SettingsIntegrationsPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        color: 'var(--text-muted)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spin" style={{ width: '32px', height: '32px', border: '3px solid var(--border-secondary)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%', margin: '0 auto 16px' }} />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading...</div>}>
          <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/deriv/callback" element={<DerivCallbackPage />} />

          {/* Protected */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/accounts" element={<AccountsPage />} />
              <Route path="/market" element={<MarketPage />} />
              <Route path="/market/:symbol" element={<SymbolDetailPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/settings/integrations" element={<SettingsIntegrationsPage />} />
            </Route>
          </Route>

          {/* Default */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-secondary)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#fff' },
          },
        }}
      />
    </QueryClientProvider>
  );
}

export default App;
