import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useInternalWebSocket } from '../hooks/useInternalWebSocket';

export function AppLayout() {
  useInternalWebSocket();

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-main">
        <div className="app-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
