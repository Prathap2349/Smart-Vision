import React from 'react';
import { useSecurity } from '../../context/SecurityContext';
import { Play, Pause, AlertTriangle, UserCheck, Info, Camera, Video } from 'lucide-react';
import { Badge } from '../ui/Badge';

export const DemoSimulationBar: React.FC = () => {
  const {
    isRealCameraMode,
    setIsRealCameraMode,
    setHikvisionSetupModalOpen,
    isSimulating,
    toggleSimulation,
    triggerThreatSimulation,
    triggerResidentSimulation,
    feedbackToastMessage,
    setFeedbackToastMessage,
  } = useSecurity();

  return (
    <div className="bg-slate-950 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs select-none shadow-sm">
      <div className="flex items-center gap-3">
        {isRealCameraMode ? (
          <Badge variant="emerald" pulse>
            REAL HIKVISION CAMERA ONLINE
          </Badge>
        ) : (
          <Badge variant="amber" pulse>
            SIMULATION MODE ACTIVE
          </Badge>
        )}

        <span className="text-slate-400 font-mono hidden md:inline">
          {isRealCameraMode
            ? 'Hikvision RTSP Stream: 1920x1080 @ 10 FPS • Local Edge AI Processing'
            : 'Live CCTV Telemetry Emulator • 3-Gate Evaluation Active'}
        </span>
      </div>

      {feedbackToastMessage && (
        <div className="flex items-center gap-2 px-3 py-1 bg-indigo-950/80 border border-indigo-500/40 rounded-full text-indigo-200 font-mono text-[11px] animate-fadeIn">
          <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="truncate max-w-md">{feedbackToastMessage}</span>
          <button
            onClick={() => setFeedbackToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white font-bold"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        {isRealCameraMode ? (
          <>
            <button
              onClick={() => setHikvisionSetupModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-indigo-300 font-bold hover:bg-slate-800 transition"
            >
              <Camera className="w-4 h-4 text-indigo-400" />
              Configure RTSP
            </button>

            <button
              onClick={() => setIsRealCameraMode(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-slate-400 font-medium hover:bg-slate-800 transition border border-slate-800"
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition shadow-md shadow-indigo-600/20"
            >
              <Video className="w-4 h-4" />
              Connect Camera
            </button>

            <button
              onClick={toggleSimulation}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition border ${
                isSimulating
                  ? 'bg-slate-900 border-slate-700 text-amber-400 hover:bg-slate-800'
                  : 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500'
              }`}
            >
              {isSimulating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isSimulating ? 'Pause Engine' : 'Resume Engine'}
            </button>

            <button
              onClick={triggerThreatSimulation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-500 transition shadow-md shadow-rose-600/20"
            >
              <AlertTriangle className="w-4 h-4" />
              Simulate Intruder
            </button>

            <button
              onClick={triggerResidentSimulation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition shadow-md shadow-emerald-600/20"
            >
              <UserCheck className="w-4 h-4" />
              Simulate Resident
            </button>
          </>
        )}
      </div>
    </div>
  );
};

