import React, { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SecurityProvider } from './context/SecurityContext';
import { MainLayout } from './components/layout/MainLayout';
import { NavTab } from './components/layout/Sidebar';

import { LandingPage } from './pages/LandingPage';
import { OverviewPage } from './pages/OverviewPage';

const LiveMonitorPage = lazy(() => import('./pages/LiveMonitorPage').then(m => ({ default: m.LiveMonitorPage })));
const AlertsPage = lazy(() => import('./pages/AlertsPage').then(m => ({ default: m.AlertsPage })));
const PeoplePage = lazy(() => import('./pages/PeoplePage').then(m => ({ default: m.PeoplePage })));
const CamerasPage = lazy(() => import('./pages/CamerasPage').then(m => ({ default: m.CamerasPage })));
const DetectionZonesPage = lazy(() => import('./pages/DetectionZonesPage').then(m => ({ default: m.DetectionZonesPage })));
const EventHistoryPage = lazy(() => import('./pages/EventHistoryPage').then(m => ({ default: m.EventHistoryPage })));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const SystemHealthPage = lazy(() => import('./pages/SystemHealthPage').then(m => ({ default: m.SystemHealthPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));

const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center p-12 text-slate-400 text-xs font-mono">
    Loading module...
  </div>
);

const DashboardView: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return (
    <MainLayout>
      {(currentTab: NavTab, setTab: (t: NavTab) => void) => (
        <Suspense fallback={<PageLoader />}>
          {(() => {
            switch (currentTab) {
              case 'overview':
                return <OverviewPage onNavigateTab={setTab} />;
              case 'live-monitor':
                return <LiveMonitorPage />;
              case 'alerts':
                return <AlertsPage />;
              case 'people':
                return <PeoplePage />;
              case 'cameras':
                return <CamerasPage />;
              case 'zones':
                return <DetectionZonesPage />;
              case 'history':
                return <EventHistoryPage />;
              case 'analytics':
                return <AnalyticsPage />;
              case 'health':
                return <SystemHealthPage />;
              case 'settings':
                return <SettingsPage />;
              default:
                return <OverviewPage onNavigateTab={setTab} />;
            }
          })()}
        </Suspense>
      )}
    </MainLayout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SecurityProvider>
        <DashboardView />
      </SecurityProvider>
    </AuthProvider>
  );
}
