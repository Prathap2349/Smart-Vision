import React, { createContext, useContext, useState, useEffect } from 'react';
import { SecurityAlert, ResidentPerson, UnknownPerson, CameraDevice, DetectionZone, SystemMetrics, AISettings, SecurityEvent, OperatingMode } from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface SimulationPerson {
  trackId: string;
  x: number; // 0..100 percentage across corridor
  y: number; // 0..100
  dwellSeconds: number;
  faceStatus: 'UNKNOWN' | 'VERIFIED_RESIDENT';
  residentName?: string;
  confidence: number;
  isHuman: boolean;
  active: boolean;
}

interface OverlayToggles {
  boundingBoxes: boolean;
  trackIds: boolean;
  zones: boolean;
  faceRecognition: boolean;
  aiLabels: boolean;
}

interface SecurityContextType {
  alerts: SecurityAlert[];
  residents: ResidentPerson[];
  unknownPersons: UnknownPerson[];
  cameras: CameraDevice[];
  zones: DetectionZone[];
  metrics: SystemMetrics;
  settings: AISettings;
  events: SecurityEvent[];
  
  // Operating Mode model: LIVE_CCTV | DEVICE_CAMERA_TEST | DEMO_SIMULATION | OFFLINE
  operatingMode: OperatingMode;
  setOperatingMode: (mode: OperatingMode) => void;
  deviceCameraModalOpen: boolean;
  setDeviceCameraModalOpen: (val: boolean) => void;

  // Real vs Demo Mode state
  isRealCameraMode: boolean;
  setIsRealCameraMode: (val: boolean) => void;
  hikvisionSetupModalOpen: boolean;
  setHikvisionSetupModalOpen: (val: boolean) => void;

  // Live Simulation & Multi-Person Track state
  isSimulating: boolean;
  simulatedPerson: SimulationPerson;
  activeTracks: any[];
  gate1Human: boolean;
  gate2Dwell: boolean;
  gate3Unknown: boolean;
  finalDecision: 'VERIFIED_THREAT' | 'SAFE_RESIDENT' | 'MONITORING' | 'CLEAR';
  overlayToggles: OverlayToggles;

  // Actions
  toggleSimulation: () => void;
  triggerThreatSimulation: () => void;
  triggerResidentSimulation: () => void;
  setOverlayToggles: React.Dispatch<React.SetStateAction<OverlayToggles>>;
  markAlertFalsePositive: (id: string, reason: string) => void;
  confirmAlertThreat: (id: string) => void;
  resolveAlert: (id: string) => void;
  addResident: (resData: { name: string; role?: string; avatarUrl?: string; faceImageBase64?: string }) => Promise<void>;
  deleteResident: (id: string) => Promise<void>;
  addCamera: (camera: Omit<CameraDevice, 'id'>) => Promise<void>;
  connectCamera: (config: {
    name: string;
    host: string;
    port: number;
    username: string;
    password: string;
    channel: string;
  }) => Promise<void>;
  addZone: (zone: Omit<DetectionZone, 'id'>) => void;
  updateZone: (id: string, updated: Partial<DetectionZone>) => void;
  updateSettings: (newSettings: Partial<AISettings>) => void;
  
  // Feedback modal helper
  feedbackModalAlert: SecurityAlert | null;
  setFeedbackModalAlert: (alert: SecurityAlert | null) => void;
  feedbackToastMessage: string | null;
  setFeedbackToastMessage: (msg: string | null) => void;
}

const defaultSettings: AISettings = {
  humanConfidenceThreshold: 0.85,
  faceConfidenceThreshold: 0.90,
  dwellThresholdSeconds: 20,
  maxTrackingAgeSeconds: 30,
  targetFps: 5,
  telegramEnabled: true,
  webPushEnabled: true,
  alertCooldownSeconds: 60,
  duplicateSuppression: true,
  localProcessingOnly: true,
  cloudUploadEnabled: false,
  evidenceRetentionDays: 30,
  nightModeIrFallback: true,
  int8Quantization: true,
};

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [residents, setResidents] = useState<ResidentPerson[]>([]);
  const [unknownPersons, setUnknownPersons] = useState<UnknownPerson[]>([]);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [zones, setZones] = useState<DetectionZone[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics>({
    edgeStatus: 'OFFLINE',
    cpuUsage: 0,
    gpuUsage: 0,
    ramUsageGb: 0,
    ramTotalGb: 0,
    tempCelsius: 0,
    fps: 0,
    inferenceLatencyMs: 0,
    networkLatencyMs: 0,
    queueSize: 0,
    uptimeSeconds: 0,
    yoloStatus: 'OFFLINE',
    byteTrackStatus: 'OFFLINE',
    insightFaceStatus: 'OFFLINE',
    openCvStatus: 'OFFLINE',
    rtspStatus: 'DISCONNECTED',
    telegramStatus: 'DISCONNECTED',
  });
  const [settings, setSettings] = useState<AISettings>(defaultSettings);
  const [events, setEvents] = useState<SecurityEvent[]>([]);

  // Operating Mode model: LIVE_CCTV | DEVICE_CAMERA_TEST | DEMO_SIMULATION | OFFLINE
  const [operatingMode, setOperatingMode] = useState<OperatingMode>('LIVE_CCTV');
  const [deviceCameraModalOpen, setDeviceCameraModalOpen] = useState<boolean>(false);

  // Real vs Demo Mode state
  const [isRealCameraMode, setIsRealCameraMode] = useState<boolean>(true);
  const [hikvisionSetupModalOpen, setHikvisionSetupModalOpen] = useState<boolean>(false);

  // Feedback modal helper state
  const [feedbackModalAlert, setFeedbackModalAlert] = useState<SecurityAlert | null>(null);
  const [feedbackToastMessage, setFeedbackToastMessage] = useState<string | null>(null);

  // Overlay Toggles
  const [overlayToggles, setOverlayToggles] = useState<OverlayToggles>({
    boundingBoxes: true,
    trackIds: true,
    zones: true,
    faceRecognition: true,
    aiLabels: true,
  });

  // Live Simulation state
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulatedPerson, setSimulatedPerson] = useState<SimulationPerson>({
    trackId: '',
    x: 50,
    y: 55,
    dwellSeconds: 0,
    faceStatus: 'UNKNOWN',
    confidence: 0,
    isHuman: false,
    active: false,
  });

  // Decision Pipeline state
  const gate1Human = simulatedPerson.active && simulatedPerson.isHuman;
  const gate2Dwell = simulatedPerson.active && simulatedPerson.dwellSeconds >= settings.dwellThresholdSeconds;
  const gate3Unknown = simulatedPerson.active && simulatedPerson.faceStatus === 'UNKNOWN';

  let finalDecision: 'VERIFIED_THREAT' | 'SAFE_RESIDENT' | 'MONITORING' | 'CLEAR' = 'CLEAR';
  if (simulatedPerson.active) {
    if (gate1Human && gate2Dwell && gate3Unknown) {
      finalDecision = 'VERIFIED_THREAT';
    } else if (gate1Human && simulatedPerson.faceStatus === 'VERIFIED_RESIDENT') {
      finalDecision = 'SAFE_RESIDENT';
    } else {
      finalDecision = 'MONITORING';
    }
  }

  // Load initial data & poll metrics from backend
  useEffect(() => {
    async function loadData() {
      const health = await api.getHealth();
      if (health.status === 'OFFLINE' || health.edgeStatus === 'OFFLINE') {
        setIsRealCameraMode(false);
        setIsSimulating(true);
      }
      const cams = await api.getCameras(user?.id);
      setCameras(cams);
      const alts = await api.getAlerts();
      setAlerts(alts);
      const people = await api.getPeople();
      setResidents(people.residents);
      setUnknownPersons(people.unknownPersons);
      const zn = await api.getZones();
      setZones(zn);
      const m = await api.getSystemMetrics();
      setMetrics(m);
    }
    loadData();

    const metricsInterval = setInterval(async () => {
      if (import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))) {
        const m = await api.getSystemMetrics();
        setMetrics(m);
      }
    }, 5000);

    return () => clearInterval(metricsInterval);
  }, [user?.id]);

  const [activeTracks, setActiveTracks] = useState<any[]>([]);

  // WebSocket Live Updates Connection to FastAPI
  useEffect(() => {
    if (!isRealCameraMode) return;

    const getWsUrl = (camId: string) => {
      if (import.meta.env.VITE_WS_BASE_URL) {
        return `${import.meta.env.VITE_WS_BASE_URL}/ws/cameras/${camId}`;
      }
      if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//localhost:8000/ws/cameras/${camId}`;
      }
      return null;
    };

    const cameraId = cameras[0]?.id ?? 'cam-01';
    const wsUrl = getWsUrl(cameraId);

    if (!wsUrl) {
      setIsRealCameraMode(false);
      setIsSimulating(true);
      return;
    }

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.fps !== undefined) {
            setMetrics(prev => ({ ...prev, fps: data.fps }));
          }
          if (data.tracks) {
            setActiveTracks(data.tracks);
            if (data.tracks.length > 0) {
              const primaryTrack = data.tracks.reduce((max: any, item: any) => (item.dwell_seconds > (max.dwell_seconds || 0) ? item : max), data.tracks.at(0));
              setSimulatedPerson(prev => ({
                ...prev,
                trackId: primaryTrack.track_id ?? prev.trackId,
                dwellSeconds: primaryTrack.dwell_seconds ?? prev.dwellSeconds,
                faceStatus: primaryTrack.face_status === 'KNOWN' ? 'VERIFIED_RESIDENT' : 'UNKNOWN',
                residentName: primaryTrack.resident_name,
                confidence: primaryTrack.confidence ?? 0,
                isHuman: true,
                active: true,
              }));
            } else if (isRealCameraMode) {
              setSimulatedPerson(prev => ({ ...prev, active: false }));
            }
          } else if (isRealCameraMode) {
            setActiveTracks([]);
            setSimulatedPerson(prev => ({ ...prev, active: false }));
          }

          if (data.decision && data.decision.new_alert) {
            setAlerts(curr => [data.decision.new_alert, ...curr]);
            setFeedbackToastMessage(`🚨 REAL THREAT DETECTED: Track ${data.decision.new_alert.personTrackId} loitering > 20s. Snapshot saved & alert delivered!`);
          }
        } catch {}
      };
      ws.onerror = () => {
        setIsRealCameraMode(false);
      };
    } catch {
      setIsRealCameraMode(false);
    }

    return () => {
      if (ws) ws.close();
    };
  }, [isRealCameraMode, cameras]);

  // Simulation Loop when in Demo Mode
  useEffect(() => {
    if (!isSimulating || isRealCameraMode || operatingMode === 'DEVICE_CAMERA_TEST') return;

    const interval = setInterval(() => {
      setSimulatedPerson(prev => {
        if (!prev.active) return prev;
        const newDwell = Number((prev.dwellSeconds + 1).toFixed(1));
        const newX = Math.min(80, Math.max(20, prev.x + (Math.random() * 4 - 2)));
        const newY = Math.min(80, Math.max(30, prev.y + (Math.random() * 4 - 2)));

        if (newDwell === settings.dwellThresholdSeconds + 1 && prev.faceStatus === 'UNKNOWN') {
          const newAlert: SecurityAlert = {
            id: `alt-${Date.now().toString().slice(-4)}`,
            timestamp: new Date().toISOString(),
            cameraName: 'Residential Corridor',
            cameraId: 'cam-01',
            personTrackId: prev.trackId,
            detectionType: 'Unknown Person Loitering',
            dwellDuration: newDwell,
            faceStatus: 'UNKNOWN',
            confidence: 0.97,
            severity: 'CRITICAL',
            status: 'ACTIVE',
            telegramDelivered: true,
            telegramLatency: 1.3,
            zoneName: 'Corridor Protection Zone',
            aiReasoning: { gate1Human: true, gate2Dwell: true, gate3Unknown: true },
          };
          setAlerts(curr => [newAlert, ...curr]);
          setFeedbackToastMessage(`[SIMULATION] 🚨 VERIFIED THREAT: Subject ${prev.trackId} loitering > 20s. Demo alert triggered.`);
        }

        return { ...prev, dwellSeconds: newDwell, x: newX, y: newY };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isSimulating, isRealCameraMode, settings.dwellThresholdSeconds]);

  const toggleSimulation = () => setIsSimulating(!isSimulating);

  const triggerThreatSimulation = () => {
    const newTrackId = `#${Math.floor(100 + Math.random() * 900)}`;
    setSimulatedPerson({
      trackId: newTrackId,
      x: 35,
      y: 45,
      dwellSeconds: 0,
      faceStatus: 'UNKNOWN',
      confidence: 0.96,
      isHuman: true,
      active: true,
    });
    setIsRealCameraMode(false);
    setIsSimulating(true);
    setFeedbackToastMessage(`[SIMULATION STARTED] Unknown subject ${newTrackId} entered corridor protection zone.`);
  };

  const triggerResidentSimulation = () => {
    const newTrackId = `#${Math.floor(100 + Math.random() * 900)}`;
    setSimulatedPerson({
      trackId: newTrackId,
      x: 50,
      y: 60,
      dwellSeconds: 22.5,
      faceStatus: 'VERIFIED_RESIDENT',
      residentName: 'Arun Kumar',
      confidence: 0.99,
      isHuman: true,
      active: true,
    });
    setIsRealCameraMode(false);
    setIsSimulating(true);
    setFeedbackToastMessage(`SIMULATION STARTED: Recognized Resident (Arun Kumar) detected. Dwell > 20s, but Gate 3 verifies face → NO ALERT (SAFE).`);
  };

  const markAlertFalsePositive = (id: string, reason: string) => {
    setAlerts(prev =>
      prev.map(a => (a.id === id ? { ...a, status: 'FALSE_POSITIVE', falsePositiveReason: reason, falsePositiveTimestamp: new Date().toISOString() } : a))
    );
    api.sendFalsePositiveFeedback(id, reason);
    setFeedbackToastMessage(`Feedback recorded for threshold analysis ("${reason}").`);
  };

  const confirmAlertThreat = (id: string) => {
    setAlerts(prev => prev.map(a => (a.id === id ? { ...a, status: 'ACTIVE', severity: 'CRITICAL' } : a)));
    setFeedbackToastMessage(`Threat confirmed for Alert ${id}. Security protocol engaged.`);
  };

  const resolveAlert = (id: string) => {
    setAlerts(prev => prev.map(a => (a.id === id ? { ...a, status: 'RESOLVED' } : a)));
    setFeedbackToastMessage(`Alert ${id} marked as RESOLVED.`);
  };

  const addResident = async (resData: { name: string; role?: string; avatarUrl?: string; faceImageBase64?: string }) => {
    const resp = await api.addResident({
      name: resData.name,
      role: resData.role || 'Family Member',
      avatar_url: resData.avatarUrl,
      face_image_base64: resData.faceImageBase64,
    });
    
    // Refresh residents list from backend
    const people = await api.getPeople();
    setResidents(people.residents);
    setFeedbackToastMessage(`Resident ${resData.name} added with face status: ${resp.faceStatus || 'ENROLLED'}.`);
  };

  const deleteResident = async (id: string) => {
    await api.deleteResident(id);
    setResidents(prev => prev.filter(r => r.id !== id));
    setFeedbackToastMessage(`Resident removed from biometric whitelist.`);
  };


  const addCamera = async (cam: Omit<CameraDevice, 'id'>) => {
    const resp = await api.addCamera({ ...cam, user_id: user?.id || 'default_user' });
    if (resp && !resp.error) {
      const updated = await api.getCameras(user?.id);
      setCameras(updated);
      setFeedbackToastMessage(`Camera "${cam.name}" connected and saved.`);
    } else {
      setFeedbackToastMessage(resp?.message || `Failed to connect camera "${cam.name}" to backend.`);
    }
  };

  const connectCamera = async (config: {
    name: string;
    host: string;
    port: number;
    username: string;
    password: string;
    channel: string;
  }) => {
    const resp = await api.addCamera({
      name: config.name,
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      channel: config.channel,
      stream_type: 'RTSP',
      user_id: user?.id || 'default_user',
    });
    if (resp && !resp.error) {
      const updated = await api.getCameras(user?.id);
      setCameras(updated);
      setIsRealCameraMode(true);
      setFeedbackToastMessage(`Camera "${config.name}" connected and saved to backend.`);
    } else {
      throw new Error(resp?.message || 'Failed to connect camera.');
    }
  };

  const addZone = (zone: Omit<DetectionZone, 'id'>) => {
    const newZone: DetectionZone = { ...zone, id: `zone-0${zones.length + 1}` };
    setZones(prev => [...prev, newZone]);
    setFeedbackToastMessage(`Detection Zone "${zone.name}" created with ${zone.dwellThreshold}s dwell threshold.`);
  };

  const updateZone = (id: string, updated: Partial<DetectionZone>) => {
    setZones(prev => prev.map(z => (z.id === id ? { ...z, ...updated } : z)));
    setFeedbackToastMessage(`Detection Zone updated successfully.`);
  };

  const updateSettings = (newSettings: Partial<AISettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    setFeedbackToastMessage(`Edge AI pipeline settings updated.`);
  };

  return (
    <SecurityContext.Provider
      value={{
        alerts,
        residents,
        unknownPersons,
        cameras,
        zones,
        metrics,
        settings,
        events,
        operatingMode,
        setOperatingMode,
        deviceCameraModalOpen,
        setDeviceCameraModalOpen,
        isRealCameraMode,
        setIsRealCameraMode,
        hikvisionSetupModalOpen,
        setHikvisionSetupModalOpen,
        isSimulating,
        simulatedPerson,
        activeTracks,
        gate1Human,
        gate2Dwell,
        gate3Unknown,
        finalDecision,
        overlayToggles,
        toggleSimulation,
        triggerThreatSimulation,
        triggerResidentSimulation,
        setOverlayToggles,
        markAlertFalsePositive,
        confirmAlertThreat,
        resolveAlert,
        addResident,
        deleteResident,
        addCamera,
        connectCamera,
        addZone,
        updateZone,
        updateSettings,
        feedbackModalAlert,
        setFeedbackModalAlert,
        feedbackToastMessage,
        setFeedbackToastMessage,
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) throw new Error('useSecurity must be used within a SecurityProvider');
  return context;
};
