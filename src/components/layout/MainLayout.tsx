import React, { useState } from 'react';
import { Sidebar, NavTab } from './Sidebar';
import { Topbar } from './Topbar';
import { DemoSimulationBar } from '../common/DemoSimulationBar';
import { FalsePositiveModal } from '../common/FalsePositiveModal';
import { HikvisionSetupModal } from '../common/HikvisionSetupModal';
import { DeviceCameraTestModal } from '../common/DeviceCameraTestModal';
import { useSecurity } from '../../context/SecurityContext';

interface MainLayoutProps {
  children: (tab: NavTab, setTab: (t: NavTab) => void) => React.ReactNode;
}

const TAB_TITLES: Record<NavTab, { title: string; subtitle: string }> = {
  overview: { title: 'Home Overview', subtitle: 'At-a-glance security summary and live home view' },
  'live-monitor': { title: 'Live Video Feed', subtitle: 'Real-time camera streaming with intelligent detection' },
  cameras: { title: 'Cameras', subtitle: 'Manage your connected cameras and live views' },
  alerts: { title: 'Security Alerts', subtitle: 'Important events and motion notifications requiring review' },
  people: { title: 'People & Family', subtitle: 'Manage recognized household members and trusted visitors' },
  zones: { title: 'Protected Areas', subtitle: 'Custom boundary zones and stay duration rules' },
  history: { title: 'Activity Timeline', subtitle: 'Complete chronological history of household detections' },
  analytics: { title: 'Security Insights', subtitle: 'Daily activity trends, recognition rates, and performance' },
  health: { title: 'System Status', subtitle: 'Device connection health, processing status, and hardware metrics' },
  settings: { title: 'Settings', subtitle: 'Notification preferences, camera setup, and privacy controls' },
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
    <div className="flex min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Left Sidebar */}
      <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <Topbar title={title} subtitle={subtitle} />

        {/* Demo Simulation Control Banner */}
        <DemoSimulationBar />

        {/* Dynamic Page View */}
        <main className="p-6 md:p-8 flex-1 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full">
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
  );
};
