import React, { useState } from 'react';
import { Sidebar, NavTab } from './Sidebar';
import { Topbar } from './Topbar';
import { DemoSimulationBar } from '../common/DemoSimulationBar';
import { FalsePositiveModal } from '../common/FalsePositiveModal';
import { HikvisionSetupModal } from '../common/HikvisionSetupModal';
import { DeviceCameraTestModal } from '../common/DeviceCameraTestModal';
import { AuroraBackground } from '../ui/AuroraBackground';
import { useSecurity } from '../../context/SecurityContext';

interface MainLayoutProps {
  children: (tab: NavTab, setTab: (t: NavTab) => void) => React.ReactNode;
}

const TAB_TITLES: Record<NavTab, { title: string; subtitle: string }> = {
  overview: { title: 'Home', subtitle: 'Your security summary and live home view' },
  'live-monitor': { title: 'Live Feed', subtitle: 'Real-time camera streaming with AI detection' },
  cameras: { title: 'Cameras', subtitle: 'Manage your connected cameras and live views' },
  alerts: { title: 'Alerts', subtitle: 'Important events requiring your attention' },
  people: { title: 'People', subtitle: 'Household members and recognized visitors' },
  zones: { title: 'Protected Areas', subtitle: 'Custom boundary zones and activity rules' },
  history: { title: 'Activity', subtitle: 'Complete timeline of household activity' },
  analytics: { title: 'Insights', subtitle: 'Activity trends, recognition rates, and performance' },
  health: { title: 'System', subtitle: 'Device health, AI processing, and hardware status' },
  settings: { title: 'Settings', subtitle: 'Notifications, cameras, privacy, and advanced options' },
};

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const {
    hikvisionSetupModalOpen,
    setHikvisionSetupModalOpen,
    connectCamera,
    deviceCameraModalOpen,
    setDeviceCameraModalOpen,
  } = useSecurity();

  const { title, subtitle } = TAB_TITLES[currentTab] || TAB_TITLES.overview;

  return (
    <AuroraBackground>
      <div className="flex min-h-screen text-text-primary font-sans">
        {/* Left Sidebar */}
        <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <Topbar title={title} subtitle={subtitle} />

          {/* Demo Simulation Control Banner */}
          <DemoSimulationBar />

          {/* Dynamic Page View */}
          <main className="p-4 pb-24 sm:p-6 sm:pb-24 md:p-8 md:pb-8 flex-1 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full">
            {children(currentTab, setCurrentTab)}
          </main>
        </div>

        {/* Global Modals */}
        <FalsePositiveModal />
        <HikvisionSetupModal
          isOpen={hikvisionSetupModalOpen}
          onClose={() => setHikvisionSetupModalOpen(false)}
          onSuccessConnect={connectCamera}
        />
        <DeviceCameraTestModal
          isOpen={deviceCameraModalOpen}
          onClose={() => setDeviceCameraModalOpen(false)}
        />
      </div>
    </AuroraBackground>
  );
};
