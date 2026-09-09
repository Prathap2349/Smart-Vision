import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SecurityProvider } from './context/SecurityContext';
import { MainLayout } from './components/layout/MainLayout';
import { NavTab } from './components/layout/Sidebar';

import { LandingPage } from './pages/LandingPage';
import { OverviewPage } from './pages/OverviewPage';
import { LiveMonitorPage } from './pages/LiveMonitorPage';
import { AlertsPage } from './pages/AlertsPage';
import { PeoplePage } from './pages/PeoplePage';
import { CamerasPage } from './pages/CamerasPage';
import { DetectionZonesPage } from './pages/DetectionZonesPage';
import { EventHistoryPage } from './pages/EventHistoryPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SystemHealthPage } from './pages/SystemHealthPage';
import { SettingsPage } from './pages/SettingsPage';

const DashboardView: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return (
    <MainLayout>
      {(currentTab: NavTab, setTab: (t: NavTab) => void) => {
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
      }}
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
