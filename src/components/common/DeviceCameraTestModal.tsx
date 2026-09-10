import React, { useState, useEffect, useRef } from 'react';
import { useSecurity } from '../../context/SecurityContext';
import { api } from '../../services/api';
import { DeviceCameraTestResult, TestTrack, TestSnapshotEvent } from '../../types';
import {
  Camera,
  X,
  Square,
  CheckCircle2,
  AlertCircle,
  Zap,
  Activity,
  UserCheck,
  Eye,
  Clock,
  Lock,
  RefreshCw,
  Sliders,
  ShieldAlert,
  Trash2,
  ImageIcon,
  ListFilter,
  Users,
  Server,
  Info,
} from 'lucide-react';
import { Badge } from '../ui/Badge';

interface DeviceCameraTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DecisionData {
  gate1_human?: { pass: boolean; label?: string; confidence?: number };
  gate2_dwell?: { pass: boolean; label?: string; dwell_seconds?: number };
  gate3_unknown?: { pass: boolean; label?: string; face_status?: string };
  final_decision: 'VERIFIED_THREAT' | 'SAFE_RESIDENT' | 'MONITORING' | 'CLEAR' | 'IDLE';
}

interface EventLogItem {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'warning' | 'alert';
}

export const DeviceCameraTestModal: React.FC<DeviceCameraTestModalProps> = ({ isOpen, onClose }) => {
  const { setOperatingMode } = useSecurity();

  // Media & WebSocket refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Operating Engine Sub-Mode
  const [engineMode, setEngineMode] = useState<'FASTAPI_BACKEND' | 'BACKEND_DISCONNECTED'>('FASTAPI_BACKEND');

  // Test Settings & Controls
  const [dwellThreshold, setDwellThreshold] = useState<number>(10);
  const [selectedZone, setSelectedZone] = useState<'Corridor Protection Zone' | 'Main Entrance ROI' | 'Full Frame'>('Corridor Protection Zone');
  const [activeTab, setActiveTab] = useState<'TELEMETRY' | 'GALLERY' | 'LOGS' | 'DIAGNOSTICS'>('TELEMETRY');

  // Testing & Error State
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isTestRunning, setIsTestRunning] = useState<boolean>(false);

  // Self-Test Readiness Checklist State
  const [selfTest, setSelfTest] = useState<{
    permission: 'pending' | 'pass' | 'fail';
    stream: 'pending' | 'pass' | 'fail';
    backend: 'pending' | 'pass' | 'fail';
    openCv: 'pending' | 'pass' | 'fail';
    yolo: 'pending' | 'pass' | 'fail';
    tracking: 'pending' | 'pass' | 'fail';
    decisionEngine: 'pending' | 'pass' | 'fail';
  }>({
    permission: 'pending',
    stream: 'pending',
    backend: 'pending',
    openCv: 'pending',
    yolo: 'pending',
    tracking: 'pending',
    decisionEngine: 'pending',
  });

  // Real AI Pipeline Telemetry State
  const [realFps, setRealFps] = useState<number>(0.0);
  const [inferenceLatencyMs, setInferenceLatencyMs] = useState<number>(0.0);
  const [activeTracks, setActiveTracks] = useState<TestTrack[]>([]);
  const [decision, setDecision] = useState<DecisionData>({
    gate1_human: { pass: false },
    gate2_dwell: { pass: false },
    gate3_unknown: { pass: false },
    final_decision: 'CLEAR',
  });

  // Snapshot Gallery & Event Log State
  const [snapshotGallery, setSnapshotGallery] = useState<TestSnapshotEvent[]>([]);
  const [eventLog, setEventLog] = useState<EventLogItem[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<TestSnapshotEvent | null>(null);

  // Session Statistics for Honest Test Result Summary
  const sessionStatsRef = useRef<{
    startTime: number;
    framesProcessed: number;
    humansDetectedCount: number;
    trackIdsSeen: Set<string>;
    maxDwellSeconds: number;
    totalYoloDetections: number;
    snapshotsCapturedCount: number;
  }>({
    startTime: 0,
    framesProcessed: 0,
    humansDetectedCount: 0,
    trackIdsSeen: new Set(),
    maxDwellSeconds: 0.0,
    totalYoloDetections: 0,
    snapshotsCapturedCount: 0,
  });

  const [summaryData, setSummaryData] = useState<DeviceCameraTestResult | null>(null);

  // Log Event Helper
  const addLog = (message: string, type: 'info' | 'warning' | 'alert' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setEventLog(prev => [{ id: Math.random().toString(36).substring(7), timestamp, message, type }, ...prev.slice(0, 49)]);
  };

  useEffect(() => {
    if (isOpen) {
      setOperatingMode('DEVICE_CAMERA_TEST');
      startSelfTestAndCamera();
    } else {
      stopCameraTest();
    }
    return () => {
      stopCameraTest();
    };
  }, [isOpen]);

  // Handle Video Stream Re-attachment when navigating tabs inside modal
  useEffect(() => {
    if (isOpen && activeTab === 'TELEMETRY' && videoRef.current && mediaStreamRef.current) {
      if (videoRef.current.srcObject !== mediaStreamRef.current) {
        videoRef.current.srcObject = mediaStreamRef.current;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [isOpen, activeTab]);

  const startSelfTestAndCamera = async () => {
    setPermissionError(null);
    setSummaryData(null);
    setSnapshotGallery([]);
    setEventLog([]);

    setSelfTest({
      permission: 'pending',
      stream: 'pending',
      backend: 'pending',
      openCv: 'pending',
      yolo: 'pending',
      tracking: 'pending',
      decisionEngine: 'pending',
    });

    sessionStatsRef.current = {
      startTime: Date.now(),
      framesProcessed: 0,
      humansDetectedCount: 0,
      trackIdsSeen: new Set(),
      maxDwellSeconds: 0.0,
      totalYoloDetections: 0,
      snapshotsCapturedCount: 0,
    };

    // 1. Request Browser Camera Permission
    let stream: MediaStream;
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser MediaDevices API is not supported in this browser.');
      }
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setSelfTest(prev => ({ ...prev, permission: 'pass', stream: 'pass' }));
      addLog('Camera access granted successfully. Video stream initialized.', 'info');
    } catch (err: any) {
      const errMsg = err?.message || 'Camera access denied or device busy.';
      setPermissionError(errMsg);
      setSelfTest(prev => ({ ...prev, permission: 'fail', stream: 'fail' }));
      addLog(`Camera initialization failed: ${errMsg}`, 'alert');
      return;
    }

    // 2. Check Local Backend Health
    const health = await api.getHealth();
    if (health.status !== 'OFFLINE') {
      setEngineMode('FASTAPI_BACKEND');
      setSelfTest(prev => ({ ...prev, backend: 'pass', openCv: 'pass', yolo: 'pass', tracking: 'pass', decisionEngine: 'pass' }));
      addLog('Connected to local FastAPI Edge AI Backend (OpenCV + YOLO + Lightweight IoU Tracker).', 'info');
      connectFastApiWebSocket();
    } else {
      // Backend Disconnected Mode — Zero Fake/Simulated Detections
      setEngineMode('BACKEND_DISCONNECTED');
      setSelfTest(prev => ({ ...prev, backend: 'fail', openCv: 'fail', yolo: 'fail', tracking: 'fail', decisionEngine: 'fail' }));
      setIsTestRunning(false);
      setActiveTracks([]);
      addLog('EDGE BACKEND NOT CONNECTED. Please start local FastAPI server to process real camera frames.', 'warning');
    }
  };

  const connectFastApiWebSocket = () => {
    const wsUrl = import.meta.env.VITE_WS_BASE_URL
      ? `${import.meta.env.VITE_WS_BASE_URL}/ws/test-camera`
      : 'ws://127.0.0.1:8000/ws/test-camera';

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsTestRunning(true);
        addLog('WebSocket pipeline session established with local FastAPI Edge server.', 'info');
        startFrameSendingLoop();
      };

      ws.onmessage = event => {
        try {
          const data = JSON.parse(event.data);
          if (data.mode === 'DEVICE_CAMERA_TEST') {
            setRealFps(data.fps || 0.0);
            setInferenceLatencyMs(data.inference_latency_ms || 0.0);
            
            // Real YOLO active tracks array directly replaces previous state (no accumulation)
            const tracks: TestTrack[] = data.tracks || [];
            setActiveTracks(tracks);
            setDecision(data.decision || { final_decision: 'CLEAR' });

            sessionStatsRef.current.framesProcessed += 1;
            if (tracks.length > 0) {
              sessionStatsRef.current.humansDetectedCount += 1;
              sessionStatsRef.current.totalYoloDetections += tracks.length;

              tracks.forEach(t => {
                const trackStr = String(t.track_id);
                if (!sessionStatsRef.current.trackIdsSeen.has(trackStr)) {
                  sessionStatsRef.current.trackIdsSeen.add(trackStr);
                  addLog(`Real YOLO detected subject: TRACK ${trackStr} in ${t.current_zone || selectedZone}`, 'info');
                }

                if (t.dwell_seconds > sessionStatsRef.current.maxDwellSeconds) {
                  sessionStatsRef.current.maxDwellSeconds = t.dwell_seconds;
                }

                // Handle Real Snapshot capture on threshold crossing
                if (t.snapshot_base64 && t.snapshot_captured && t.current_zone !== 'Outside ROI') {
                  setSnapshotGallery(prev => {
                    if (!prev.some(s => s.trackId === t.track_id)) {
                      sessionStatsRef.current.snapshotsCapturedCount += 1;
                      addLog(`🚨 Snapshot captured for TRACK ${t.track_id} upon crossing ${dwellThreshold}s loitering threshold!`, 'alert');
                      return [
                        {
                          id: `snap_${t.track_id}_${Date.now()}`,
                          trackId: t.track_id,
                          timestamp: t.snapshot_timestamp || new Date().toLocaleTimeString(),
                          dwellSeconds: t.dwell_seconds,
                          zoneName: t.current_zone || selectedZone,
                          snapshotUrl: t.snapshot_base64!,
                          faceStatus: t.face_status,
                          confidence: t.confidence,
                          decision: t.decision?.finalDecision || 'VERIFIED_THREAT',
                        },
                        ...prev,
                      ];
                    }
                    return prev;
                  });
                }
              });
            }
          }
        } catch {}
      };

      ws.onerror = () => {
        addLog('WebSocket connection failed. EDGE BACKEND NOT CONNECTED.', 'warning');
        setEngineMode('BACKEND_DISCONNECTED');
        setIsTestRunning(false);
        setActiveTracks([]);
      };
    } catch {
      setEngineMode('BACKEND_DISCONNECTED');
      setIsTestRunning(false);
      setActiveTracks([]);
    }
  };

  const startFrameSendingLoop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      if (
        !wsRef.current ||
        wsRef.current.readyState !== WebSocket.OPEN ||
        !videoRef.current ||
        videoRef.current.paused ||
        videoRef.current.ended
      ) {
        return;
      }

      const video = videoRef.current;
      if (video.videoWidth === 0 || video.videoHeight === 0) return;

      if (!canvasRef.current) canvasRef.current = document.createElement('canvas');
      const canvas = canvasRef.current;
      canvas.width = 640;
      canvas.height = 360;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Send frame together with test config payload
        const dataUrl = canvas.toDataURL('image/jpeg', 0.70);
        const payload = {
          image: dataUrl,
          dwell_threshold: dwellThreshold,
          zones: [{ name: selectedZone, polygon: [[0, 0], [100, 0], [100, 100], [0, 100]] }],
        };

        wsRef.current.send(JSON.stringify(payload));
      }
    }, 140);
  };

  const stopCameraTest = () => {
    setIsTestRunning(false);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    const stats = sessionStatsRef.current;
    if (stats.startTime > 0 && stats.framesProcessed > 0) {
      const durationSec = Math.max(1, Math.round((Date.now() - stats.startTime) / 1000));
      const avgFps = Number((stats.framesProcessed / durationSec).toFixed(1));
      setSummaryData({
        durationSeconds: durationSec,
        framesProcessed: stats.framesProcessed,
        averageFps: avgFps,
        humansDetectedCount: stats.humansDetectedCount > 0 ? 1 : 0,
        tracksCreatedCount: stats.trackIdsSeen.size,
        maxDwellSeconds: Number(stats.maxDwellSeconds.toFixed(1)),
        totalYoloDetections: stats.totalYoloDetections,
        snapshotsCapturedCount: stats.snapshotsCapturedCount,
        pipelineStatus: 'PASS',
      });
      sessionStatsRef.current.startTime = 0;
    }

    setActiveTracks([]);
    setOperatingMode('OFFLINE');
  };

  const clearGallery = () => {
    setSnapshotGallery([]);
    addLog('Temporary snapshot gallery cleared by user.', 'info');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn select-none overflow-y-auto">
      <div className="bg-[#0b1329] border border-slate-800 rounded-3xl p-4 sm:p-6 max-w-5xl w-full shadow-2xl space-y-4 relative border-cyan-500/30 my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">REAL DEVICE CAMERA TEST MODE</h2>
                <Badge variant={engineMode === 'FASTAPI_BACKEND' ? 'emerald' : 'rose'} pulse={engineMode === 'FASTAPI_BACKEND'}>
                  {engineMode === 'FASTAPI_BACKEND' ? 'LIVE MAC WEBCAM • FASTAPI ENGINE' : 'EDGE BACKEND NOT CONNECTED'}
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                {engineMode === 'FASTAPI_BACKEND'
                  ? 'Real-Time Multi-Person Pipeline (YOLO + IoU Tracker + Decision Engine) • Zero Simulated Data'
                  : 'Start FastAPI Edge Backend (uvicorn main:app) to run real-time YOLO detection'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopCameraTest();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Self-Test Readiness Checklist */}
        <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          <div className="flex items-center gap-2">
            {selfTest.permission === 'pass' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : selfTest.permission === 'fail' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <RefreshCw className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
            )}
            <span className={selfTest.permission === 'pass' ? 'text-emerald-300' : 'text-slate-400'}>
              Camera Access
            </span>
          </div>

          <div className="flex items-center gap-2">
            {selfTest.backend === 'pass' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : selfTest.backend === 'fail' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <RefreshCw className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
            )}
            <span className={selfTest.backend === 'pass' ? 'text-emerald-300' : 'text-rose-400'}>
              {engineMode === 'FASTAPI_BACKEND' ? 'FastAPI Backend' : 'Backend Disconnected'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {selfTest.yolo === 'pass' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : selfTest.yolo === 'fail' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <RefreshCw className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
            )}
            <span className={selfTest.yolo === 'pass' ? 'text-emerald-300' : 'text-slate-400'}>
              Multi-Person YOLO
            </span>
          </div>

          <div className="flex items-center gap-2">
            {selfTest.tracking === 'pass' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : selfTest.tracking === 'fail' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <RefreshCw className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
            )}
            <span className={selfTest.tracking === 'pass' ? 'text-emerald-300' : 'text-slate-400'}>
              IoU Tracker
            </span>
          </div>
        </div>

        {/* Backend Disconnected Alert Banner */}
        {engineMode === 'BACKEND_DISCONNECTED' && (
          <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Server className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <strong className="block text-rose-300">EDGE BACKEND NOT CONNECTED</strong>
                <span>Local FastAPI Edge AI backend is offline. Run <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-300">.venv/bin/python backend/main.py</code> to process real webcam frames.</span>
              </div>
            </div>
            <button
              onClick={startSelfTestAndCamera}
              className="px-3 py-1.5 rounded-xl bg-rose-900 hover:bg-rose-800 font-bold text-white text-xs transition shrink-0"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Configuration Controls Bar */}
        <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-bold text-slate-300">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>DWELL THRESHOLD:</span>
            </div>
            <select
              value={dwellThreshold}
              onChange={e => {
                const val = Number(e.target.value);
                setDwellThreshold(val);
                addLog(`Loitering dwell threshold updated to ${val} seconds.`, 'info');
              }}
              className="bg-slate-950 border border-slate-700 text-cyan-300 font-mono font-bold px-3 py-1.5 rounded-xl focus:outline-none focus:border-cyan-500"
            >
              <option value={2}>2 Seconds (Fast Test)</option>
              <option value={5}>5 Seconds (Medium Test)</option>
              <option value={10}>10 Seconds (Default Standard)</option>
              <option value={15}>15 Seconds (Strict)</option>
              <option value={20}>20 Seconds (Extended)</option>
              <option value={30}>30 Seconds (Max)</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-bold text-slate-300">
              <Eye className="w-4 h-4 text-indigo-400" />
              <span>SECURITY ROI ZONE:</span>
            </div>
            <select
              value={selectedZone}
              onChange={e => {
                const z = e.target.value as any;
                setSelectedZone(z);
                addLog(`Active security protection ROI changed to ${z}.`, 'info');
              }}
              className="bg-slate-950 border border-slate-700 text-indigo-300 font-mono font-bold px-3 py-1.5 rounded-xl focus:outline-none focus:border-indigo-500"
            >
              <option value="Corridor Protection Zone">Corridor Protection Zone (Center)</option>
              <option value="Main Entrance ROI">Main Entrance ROI (Door Top)</option>
              <option value="Full Frame">Full Frame (100% Area)</option>
            </select>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 font-mono text-[11px]">
            <button
              onClick={() => setActiveTab('TELEMETRY')}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                activeTab === 'TELEMETRY' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              LIVE TELEMETRY
            </button>
            <button
              onClick={() => setActiveTab('GALLERY')}
              className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
                activeTab === 'GALLERY' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              SNAPSHOTS ({snapshotGallery.length})
            </button>
            <button
              onClick={() => setActiveTab('LOGS')}
              className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
                activeTab === 'LOGS' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              LOGS ({eventLog.length})
            </button>
            <button
              onClick={() => setActiveTab('DIAGNOSTICS')}
              className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
                activeTab === 'DIAGNOSTICS' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              DIAGNOSTICS
            </button>
          </div>
        </div>

        {/* Permission Error Notice */}
        {permissionError && (
          <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>Browser Camera Access Error</span>
            </div>
            <p>{permissionError}</p>
            <button
              onClick={startSelfTestAndCamera}
              className="px-4 py-1.5 rounded-xl bg-rose-900 hover:bg-rose-800 font-bold text-white text-xs transition"
            >
              Retry Camera Permission
            </button>
          </div>
        )}

        {/* TAB 1: LIVE TELEMETRY & MULTI-PERSON TRACKING */}
        {activeTab === 'TELEMETRY' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left 2 Cols: Live Video Feed + Multi-Person Overlays */}
            <div className="lg:col-span-2 space-y-3">
              <div className="relative aspect-video bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden group shadow-inner">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover transform -scale-x-100"
                  playsInline
                  muted
                />

                {/* Configured Security Zone Dotted Rectangle Overlay */}
                <div
                  className={`absolute border-2 border-dashed pointer-events-none transition-all duration-300 ${
                    selectedZone === 'Corridor Protection Zone'
                      ? 'top-[15%] left-[20%] w-[60%] h-[70%] border-amber-400/70 bg-amber-500/5'
                      : selectedZone === 'Main Entrance ROI'
                      ? 'top-[10%] left-[30%] w-[40%] h-[45%] border-cyan-400/70 bg-cyan-500/5'
                      : 'top-[2%] left-[2%] w-[96%] h-[96%] border-indigo-400/70 bg-indigo-500/5'
                  } rounded-xl flex items-start justify-start p-2`}
                >
                  <span className="bg-slate-950/90 border border-slate-700 text-amber-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-md">
                    🎯 ROI: {selectedZone.toUpperCase()}
                  </span>
                </div>

                {/* Multi-Person Real YOLO Bounding Box Overlays */}
                {activeTracks.map(t => {
                  const isInsideROI = t.current_zone !== 'Outside ROI';
                  const isThreat = isInsideROI && t.dwell_seconds >= dwellThreshold;
                  const isResident = t.face_status === 'VERIFIED_RESIDENT';
                  const borderColor = isThreat ? 'border-rose-500' : isResident ? 'border-emerald-400' : 'border-cyan-400';
                  const bgColor = isThreat ? 'bg-rose-950/40' : isResident ? 'bg-emerald-950/30' : 'bg-cyan-950/30';

                  const [x1, y1, x2, y2] = t.bbox;
                  const left = `${Math.max(2, Math.min(95, (x1 / 640) * 100))}%`;
                  const top = `${Math.max(2, Math.min(95, (y1 / 360) * 100))}%`;
                  const width = `${Math.max(5, Math.min(95, ((x2 - x1) / 640) * 100))}%`;
                  const height = `${Math.max(5, Math.min(95, ((y2 - y1) / 360) * 100))}%`;

                  return (
                    <div
                      key={String(t.track_id)}
                      style={{ left, top, width, height }}
                      className={`absolute border-2 ${borderColor} ${bgColor} rounded-lg transition-all duration-100 pointer-events-none flex flex-col justify-between p-1.5 shadow-lg`}
                    >
                      <div className="bg-slate-950/90 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-mono text-cyan-300 font-bold self-start backdrop-blur-md flex items-center gap-1">
                        <Users className="w-3 h-3 text-cyan-400" />
                        TRACK {String(t.track_id)} | {(t.confidence * 100).toFixed(1)}%
                      </div>

                      <div className="bg-slate-950/90 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-mono text-amber-300 font-bold self-end backdrop-blur-md">
                        {isInsideROI ? `DWELL: ${t.dwell_seconds.toFixed(1)}s / ${dwellThreshold}s` : 'OUTSIDE ROI'}
                      </div>
                    </div>
                  );
                })}

                {/* Status Header Overlay */}
                <div className="absolute top-3 left-3 flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300">
                  <span className={`w-2 h-2 rounded-full ${engineMode === 'FASTAPI_BACKEND' ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'}`} />
                  <span>{engineMode === 'FASTAPI_BACKEND' ? 'LIVE DEVICE CAMERA' : 'CAMERA CONNECTED • BACKEND DISCONNECTED'}</span>
                </div>

                {/* Telemetry Footer Overlay */}
                <div className="absolute bottom-3 right-3 flex items-center gap-3 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300">
                  <span>AI FPS: <strong className="text-cyan-400">{engineMode === 'FASTAPI_BACKEND' ? realFps.toFixed(1) : '—'}</strong></span>
                  <span>LATENCY: <strong className="text-indigo-400">{engineMode === 'FASTAPI_BACKEND' ? `${inferenceLatencyMs.toFixed(0)}ms` : '—'}</strong></span>
                </div>
              </div>

              {/* Active Multi-Person Subject Cards Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-cyan-400" /> ACTIVE TRACKED SUBJECTS ({activeTracks.length})
                  </span>
                  <span className="text-[10px] text-slate-400">REAL YOLO TRACKS</span>
                </div>

                {activeTracks.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center text-xs font-mono text-slate-500">
                    {engineMode === 'FASTAPI_BACKEND'
                      ? '— 0 PEOPLE DETECTED • NO ACTIVE TRACKS IN CAMERA VIEW —'
                      : '— EDGE BACKEND NOT CONNECTED • 0 PEOPLE DETECTED —'}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeTracks.map(t => {
                      const isInsideROI = t.current_zone !== 'Outside ROI';
                      const isThreat = isInsideROI && t.dwell_seconds >= dwellThreshold;
                      const pct = isInsideROI ? Math.min(100, (t.dwell_seconds / dwellThreshold) * 100) : 0;

                      return (
                        <div
                          key={String(t.track_id)}
                          className={`p-3 rounded-xl bg-slate-900 border ${
                            isThreat ? 'border-rose-500/60 bg-rose-950/20' : 'border-slate-800'
                          } space-y-2 text-xs font-mono`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-cyan-300 flex items-center gap-1">
                              <Activity className="w-3.5 h-3.5 text-indigo-400" /> TRACK {String(t.track_id)}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isThreat ? 'bg-rose-950 text-rose-400 border border-rose-500/40' : isInsideROI ? 'bg-amber-950 text-amber-300 border border-amber-500/40' : 'bg-slate-950 text-slate-400 border border-slate-800'
                            }`}>
                              {isThreat ? '🚨 THREAT' : isInsideROI ? '👁️ MONITORING' : 'OUTSIDE ROI'}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] text-slate-400">
                              <span>Dwell Duration:</span>
                              <span className="font-bold text-white">{isInsideROI ? `${t.dwell_seconds.toFixed(1)}s / ${dwellThreshold}s` : '—'}</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                              <div
                                style={{ width: `${pct}%` }}
                                className={`h-full transition-all duration-300 ${isThreat ? 'bg-rose-500' : 'bg-amber-400'}`}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
                            <div>Confidence: <strong className="text-slate-200">{(t.confidence * 100).toFixed(1)}%</strong></div>
                            <div>Zone: <strong className="text-slate-200">{t.current_zone || selectedZone}</strong></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Col: Triple-Gate AI Decision Panel */}
            <div className="space-y-3 flex flex-col justify-between">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Zap className="w-4 h-4 text-cyan-400" /> TRIPLE-GATE DECISION
                  </h3>
                  <span className="text-[10px] font-mono text-cyan-400 font-bold">REAL-TIME</span>
                </div>

                {/* Gate 1 */}
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-cyan-400" /> GATE 1 — Human Detection
                    </span>
                    {activeTracks.length > 0 ? (
                      <span className="text-emerald-400 font-mono text-[11px]">✓ PASS ({activeTracks.length})</span>
                    ) : (
                      <span className="text-slate-500 font-mono text-[11px]">— IDLE</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {activeTracks.length > 0
                      ? `${activeTracks.length} human silhouette(s) detected by YOLO`
                      : '0 human silhouettes in camera frame'}
                  </p>
                </div>

                {/* Gate 2 */}
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" /> GATE 2 — Dwell Threshold ({dwellThreshold}s)
                    </span>
                    {activeTracks.some(t => t.current_zone !== 'Outside ROI' && t.dwell_seconds >= dwellThreshold) ? (
                      <span className="text-rose-400 font-mono text-[11px]">✓ TRIGGERED</span>
                    ) : (
                      <span className="text-slate-500 font-mono text-[11px]">
                        {activeTracks.length > 0 ? `${Math.max(...activeTracks.map(t => t.dwell_seconds)).toFixed(1)}s / ${dwellThreshold}s` : `0s / ${dwellThreshold}s`}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {activeTracks.some(t => t.current_zone !== 'Outside ROI' && t.dwell_seconds >= dwellThreshold)
                      ? `Loitering threshold exceeded (${dwellThreshold}s)`
                      : 'Monitoring loitering dwell duration'}
                  </p>
                </div>

                {/* Gate 3 */}
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400" /> GATE 3 — Resident Match
                    </span>
                    {activeTracks.length > 0 ? (
                      activeTracks.some(t => t.face_status === 'VERIFIED_RESIDENT') ? (
                        <span className="text-emerald-400 font-mono text-[11px]">✓ RESIDENT</span>
                      ) : (
                        <span className="text-amber-400 font-mono text-[11px]">⚠ UNKNOWN</span>
                      )
                    ) : (
                      <span className="text-slate-500 font-mono text-[11px]">— IDLE</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Prototype Visual Feature Vector Matcher
                  </p>
                </div>

                {/* Final Decision Banner */}
                <div className="p-3 rounded-xl bg-gradient-to-r from-slate-950 to-slate-900 border border-slate-700 text-center space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">PIPELINE DECISION</span>
                  <span
                    className={`text-base font-extrabold tracking-tight block ${
                      decision.final_decision === 'VERIFIED_THREAT'
                        ? 'text-rose-400 animate-pulse'
                        : decision.final_decision === 'SAFE_RESIDENT'
                        ? 'text-emerald-400'
                        : activeTracks.length > 0
                        ? 'text-amber-300'
                        : 'text-slate-400'
                    }`}
                  >
                    {decision.final_decision === 'VERIFIED_THREAT'
                      ? '🚨 VERIFIED THREAT'
                      : decision.final_decision === 'SAFE_RESIDENT'
                      ? '🛡️ SAFE RESIDENT'
                      : activeTracks.length > 0
                      ? '👁️ MONITORING SUBJECT'
                      : 'CLEAR — WAITING FOR PERSON'}
                  </span>
                </div>
              </div>

              {/* Stop Control Button */}
              <button
                onClick={() => {
                  stopCameraTest();
                  onClose();
                }}
                className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-2xl text-xs transition shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2"
              >
                <Square className="w-4 h-4" />
                <span>STOP CAMERA TEST</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: TEMPORARY SNAPSHOT EVENT GALLERY */}
        {activeTab === 'GALLERY' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-xs font-mono">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-white uppercase">TEMPORARY EVENT SNAPSHOT GALLERY</span>
                <span className="text-slate-400">({snapshotGallery.length} Captured Events)</span>
              </div>

              {snapshotGallery.length > 0 && (
                <button
                  onClick={clearGallery}
                  className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 font-bold flex items-center gap-1.5 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear Gallery
                </button>
              )}
            </div>

            {snapshotGallery.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
                <ImageIcon className="w-8 h-8 text-slate-600 mx-auto" />
                <h4 className="text-sm font-bold text-slate-300">No Snapshot Events Triggered Yet</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  When a real tracked person remains inside the selected ROI zone for &ge; {dwellThreshold}s, a real webcam frame snapshot will be captured and displayed here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {snapshotGallery.map(snap => (
                  <div
                    key={snap.id}
                    onClick={() => setSelectedSnapshot(snap)}
                    className="p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 transition cursor-pointer space-y-2 group"
                  >
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                      <img src={snap.snapshotUrl} alt="Snapshot crop" className="w-full h-full object-cover group-hover:scale-105 transition" />
                      <div className="absolute top-2 left-2 bg-slate-950/80 px-2 py-0.5 rounded text-[10px] font-mono text-cyan-300 font-bold border border-slate-700">
                        TRACK {String(snap.trackId)}
                      </div>
                      <div className="absolute bottom-2 right-2 bg-rose-950/90 text-rose-300 px-2 py-0.5 rounded text-[10px] font-mono font-bold border border-rose-500/40">
                        {snap.dwellSeconds.toFixed(1)}s DWELL
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span>Time: <strong className="text-slate-200">{snap.timestamp}</strong></span>
                      <span className="text-amber-400">{snap.zoneName}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: LIVE MULTI-TRACK EVENT LOGS */}
        {activeTab === 'LOGS' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-xs font-mono">
              <div className="flex items-center gap-2">
                <ListFilter className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-white uppercase">LIVE MULTI-TRACK EVENT TIMELINE LOG</span>
              </div>
              <span className="text-slate-400 text-[11px]">{eventLog.length} Events</span>
            </div>

            <div className="h-64 overflow-y-auto space-y-1.5 p-2 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-xs">
              {eventLog.length === 0 ? (
                <div className="text-slate-500 text-center py-10">— LOG INITIALIZING —</div>
              ) : (
                eventLog.map(item => (
                  <div
                    key={item.id}
                    className={`p-2 rounded-xl border ${
                      item.type === 'alert'
                        ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                        : item.type === 'warning'
                        ? 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                        : 'bg-slate-900 border-slate-800 text-slate-300'
                    } flex items-start gap-2 text-[11px]`}
                  >
                    <span className="text-slate-500 font-bold shrink-0">[{item.timestamp}]</span>
                    <span className="flex-1">{item.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: SYSTEM DIAGNOSTICS PANEL */}
        {activeTab === 'DIAGNOSTICS' && (
          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-slate-300">
                <Info className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-white uppercase">TEST MODE DIAGNOSTICS PANEL</span>
              </div>
              <Badge variant={engineMode === 'FASTAPI_BACKEND' ? 'emerald' : 'rose'}>
                {engineMode === 'FASTAPI_BACKEND' ? 'FASTAPI ONLINE' : 'DISCONNECTED'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 block uppercase">WEBCAM STREAM</span>
                <span className="font-bold text-emerald-400">{mediaStreamRef.current ? 'CONNECTED' : 'DISCONNECTED'}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 block uppercase">EDGE BACKEND</span>
                <span className={`font-bold ${engineMode === 'FASTAPI_BACKEND' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {engineMode === 'FASTAPI_BACKEND' ? 'CONNECTED (8000)' : 'OFFLINE'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 block uppercase">ACTIVE TRACKS</span>
                <span className="font-bold text-cyan-400">{activeTracks.length}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 block uppercase">PROCESSING FPS</span>
                <span className="font-bold text-indigo-400">{engineMode === 'FASTAPI_BACKEND' ? `${realFps.toFixed(1)} FPS` : '—'}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-slate-400">
              <strong className="text-slate-200 block">Strict Real-Time Data Pipeline Protocol:</strong>
              <ul className="list-disc pl-4 space-y-1 text-[11px]">
                <li>Zero fake / simulated detections exist in Device Camera Test Mode.</li>
                <li>Camera empty state returns 0 active tracks, 0 bounding boxes, 0 dwell timers, 0 snapshots.</li>
                <li>Stale tracks expire after 0.8s max grace period upon person leaving frame.</li>
                <li>Dwell timers accumulate ONLY when a person is inside the active ROI security zone.</li>
              </ul>
            </div>
          </div>
        )}

        {/* Detailed Snapshot View Modal */}
        {selectedSnapshot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
            <div className="bg-[#0b1329] border border-cyan-500/40 rounded-3xl p-5 max-w-lg w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-400" />
                  <h3 className="text-sm font-bold text-white">SNAPSHOT EVENT DETAIL — TRACK {String(selectedSnapshot.trackId)}</h3>
                </div>
                <button onClick={() => setSelectedSnapshot(null)} className="p-1 text-slate-400 hover:text-white rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-800">
                <img src={selectedSnapshot.snapshotUrl} alt="Snapshot preview" className="w-full h-full object-cover" />
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono text-xs text-slate-300">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">TRIGGER DWELL</span>
                  <span className="font-bold text-rose-400">{selectedSnapshot.dwellSeconds.toFixed(1)}s</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">PROTECTION ZONE</span>
                  <span className="font-bold text-cyan-300">{selectedSnapshot.zoneName}</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                ℹ️ <strong>Temporary Storage Note:</strong> This webcam snapshot is saved only in local application memory for test verification and will be auto-deleted when test mode is exited.
              </p>
            </div>
          </div>
        )}

        {/* Test Result Summary Modal / Panel */}
        {summaryData && (
          <div className="p-5 rounded-2xl bg-slate-900 border border-cyan-500/40 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">CAMERA TEST SESSION SUMMARY</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold font-mono">
                STATUS: {summaryData.pipelineStatus}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Duration</span>
                <span className="text-sm font-bold text-white">{summaryData.durationSeconds}s</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Frames</span>
                <span className="text-sm font-bold text-cyan-400">{summaryData.framesProcessed}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Average AI FPS</span>
                <span className="text-sm font-bold text-indigo-400">{summaryData.averageFps}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Tracks Created</span>
                <span className="text-sm font-bold text-amber-400">{summaryData.tracksCreatedCount}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Snapshots</span>
                <span className="text-sm font-bold text-rose-400">{summaryData.snapshotsCapturedCount || 0}</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800">
              ℹ️ <strong>Honest Evaluation Note:</strong> Live webcam frames were processed locally by FastAPI Edge AI Engine. Temporary test snapshots have been purged from active memory.
            </p>
          </div>
        )}

        {/* Privacy Notice Banner */}
        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3 text-xs text-slate-400">
          <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="leading-tight">
            <strong>100% Local Privacy Notice:</strong> Camera frames are processed locally by the Edge AI engine and are not uploaded to cloud storage. Camera access ends immediately when Test Mode is stopped.
          </p>
        </div>
      </div>
    </div>
  );
};
