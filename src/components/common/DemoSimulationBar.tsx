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
    <div className="bg-[#0b101c] border-b border-cyan-500/20 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs select-none">
      <div className="flex items-center gap-3">
        {isRealCameraMode ? (
          <Badge variant="emerald" pulse>
            REAL HIKVISION CAMERA ONLINE
          </Badge>
        ) : (
          <Badge variant="amber" pulse>
            SIMULATION MODE
          </Badge>
        )}

        <span className="text-slate-400 font-mono hidden md:inline">
          {isRealCameraMode
            ? 'Hikvision RTSP Stream: 1920x1080 @ 10 FPS • Local Edge AI Processing'
            : 'Live CCTV Telemetry Emulator'}
        </span>
      </div>

      {feedbackToastMessage && (
        <div className="flex items-center gap-2 px-3 py-1 bg-cyan-950/80 border border-cyan-500/40 rounded-full text-cyan-300 font-mono text-[11px] animate-fadeIn">
          <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="truncate max-w-md">{feedbackToastMessage}</span>
          <button
            onClick={() => setFeedbackToastMessage(null)}
            className="ml-2 text-cyan-400 hover:text-white font-bold"
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-semibold hover:bg-cyan-900 transition"
            >
              <Camera className="w-3.5 h-3.5" />
              Configure RTSP
            </button>

            <button
              onClick={() => setIsRealCameraMode(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-medium hover:bg-slate-700 transition"
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 text-white font-bold hover:bg-cyan-500 transition shadow-cyan-glow"
            >
              <Video className="w-3.5 h-3.5" />
              Connect Hikvision Camera
            </button>

            <button
              onClick={toggleSimulation}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                isSimulating
                  ? 'bg-slate-800 text-amber-400 hover:bg-slate-700'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500'
              }`}
            >
              {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isSimulating ? 'Pause Engine' : 'Resume Engine'}
            </button>

            <button
              onClick={triggerThreatSimulation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/90 text-white font-bold hover:bg-rose-500 transition shadow-rose-glow"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Simulate Intruder
            </button>

            <button
              onClick={triggerResidentSimulation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700/90 text-white font-medium hover:bg-emerald-600 transition"
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
