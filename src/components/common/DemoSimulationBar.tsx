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
    <div className="bg-white border-b border-slate-200/90 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs select-none shadow-2xs">
      <div className="flex items-center gap-3">
        {isRealCameraMode ? (
          <Badge variant="emerald" pulse>
            Live Camera Connected
          </Badge>
        ) : (
          <Badge variant="amber" pulse>
            Demo Preview Mode
          </Badge>
        )}

        <span className="text-slate-500 hidden md:inline">
          {isRealCameraMode
            ? 'Real-time camera feed active • Smart home security enabled'
            : 'Interactive demo environment • Test real-time intruder and resident scenarios'}
        </span>
      </div>

      {feedbackToastMessage && (
        <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-blue-800 text-[11px] animate-fadeIn">
          <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="truncate max-w-md">{feedbackToastMessage}</span>
          <button
            onClick={() => setFeedbackToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-slate-700 font-bold"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={() => setDeviceCameraModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition shadow-xs"
        >
          <Camera className="w-3.5 h-3.5" />
          Test Webcam
        </button>

        {isRealCameraMode ? (
          <>
            <button
              onClick={() => setHikvisionSetupModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-semibold hover:bg-slate-200 transition"
            >
              <Video className="w-3.5 h-3.5 text-slate-500" />
              Configure Camera
            </button>

            <button
              onClick={() => setIsRealCameraMode(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 font-medium hover:bg-slate-200 transition"
            >
              Switch to Demo Mode
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => {
                setHikvisionSetupModalOpen(true);
                setIsRealCameraMode(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-semibold hover:bg-slate-200 transition"
            >
              <Video className="w-3.5 h-3.5 text-blue-600" />
              Connect Camera
            </button>

            <button
              onClick={toggleSimulation}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition border ${
                isSimulating
                  ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                  : 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500'
              }`}
            >
              {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isSimulating ? 'Pause Preview' : 'Play Preview'}
            </button>

            <button
              onClick={triggerThreatSimulation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold hover:bg-rose-100 transition shadow-xs"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              Simulate Intruder
            </button>

            <button
              onClick={triggerResidentSimulation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold hover:bg-emerald-100 transition shadow-xs"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              Simulate Resident
            </button>
          </>
        )}
      </div>
    </div>
  );
};
