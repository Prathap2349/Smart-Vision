import React from 'react';
import { useSecurity } from '../../context/SecurityContext';
import { Play, Pause, AlertTriangle, UserCheck, Info, Camera, Video } from 'lucide-react';
import { Badge } from '../ui/Badge';

export const DemoSimulationBar: React.FC = () => {
  const {
    isRealCameraMode,
    setIsRealCameraMode,
    setHikvisionSetupModalOpen,
    setDeviceCameraModalOpen,
    isSimulating,
    toggleSimulation,
    triggerThreatSimulation,
    triggerResidentSimulation,
    feedbackToastMessage,
    setFeedbackToastMessage,
  } = useSecurity();

  return (
    <div className="bg-aurora-surface/60 backdrop-blur-md border-b border-white/10 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs select-none">
      <div className="flex items-center gap-3">
        {isRealCameraMode ? (
          <Badge variant="success">
            Live Camera Connected
          </Badge>
        ) : (
          <Badge variant="warning">
            Demo Preview Mode
          </Badge>
        )}

        <span className="text-text-muted hidden md:inline">
          {isRealCameraMode
            ? 'Real-time camera feed active • Smart home security enabled'
            : 'Interactive demo environment • Test intruder and resident scenarios'}
        </span>
      </div>

      {feedbackToastMessage && (
        <div className="flex items-center gap-2 px-3 py-1 bg-brand-blue/15 border border-brand-blue/30 rounded-full text-blue-300 text-[11px]">
          <Info className="w-3.5 h-3.5 text-brand-cyan shrink-0" />
          <span className="truncate max-w-md">{feedbackToastMessage}</span>
          <button
            onClick={() => setFeedbackToastMessage(null)}
            className="ml-2 text-text-muted hover:text-text-primary font-bold"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={() => setDeviceCameraModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-blue hover:bg-blue-600 text-white font-semibold transition shadow-blue-glow"
        >
          <Camera className="w-3.5 h-3.5" />
          Test Webcam
        </button>

        {isRealCameraMode ? (
          <>
            <button
              onClick={() => setHikvisionSetupModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/15 text-text-secondary font-semibold hover:bg-white/10 transition"
            >
              <Video className="w-3.5 h-3.5 text-text-muted" />
              Configure Camera
            </button>

            <button
              onClick={() => setIsRealCameraMode(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 text-text-secondary font-medium hover:bg-white/10 transition"
            >
              Switch to Demo
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => {
                setHikvisionSetupModalOpen(true);
                setIsRealCameraMode(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/15 text-text-secondary font-semibold hover:bg-white/10 transition"
            >
              <Video className="w-3.5 h-3.5 text-brand-cyan" />
              Connect Camera
            </button>

            <button
              onClick={toggleSimulation}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition border ${
                isSimulating
                  ? 'bg-brand-warning/15 border-brand-warning/30 text-amber-300 hover:bg-brand-warning/25'
                  : 'bg-brand-success/15 border-brand-success/30 text-brand-success hover:bg-brand-success/25'
              }`}
            >
              {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isSimulating ? 'Pause Preview' : 'Play Preview'}
            </button>

            <button
              onClick={triggerThreatSimulation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-alert/15 border border-brand-alert/30 text-rose-400 font-semibold hover:bg-brand-alert/25 transition shadow-rose-glow"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Simulate Intruder
            </button>

            <button
              onClick={triggerResidentSimulation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-success/15 border border-brand-success/30 text-brand-success font-semibold hover:bg-brand-success/25 transition"
            >
              <UserCheck className="w-3.5 h-3.5" />
              Simulate Resident
            </button>
          </>
        )}
      </div>
    </div>
  );
};
