import React, { createContext, useContext, useState, useEffect } from 'react';
import { SecurityAlert, ResidentPerson, UnknownPerson, CameraDevice, DetectionZone, SystemMetrics, AISettings, SecurityEvent } from '../types';
import { api } from '../services/api';

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
  
  // Real vs Demo Mode state
  isRealCameraMode: boolean;
  setIsRealCameraMode: (val: boolean) => void;
  hikvisionSetupModalOpen: boolean;
  setHikvisionSetupModalOpen: (val: boolean) => void;

  // Live Simulation state
  isSimulating: boolean;
  simulatedPerson: SimulationPerson;
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
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [residents, setResidents] = useState<ResidentPerson[]>([]);
  const [unknownPersons, setUnknownPersons] = useState<UnknownPerson[]>([]);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [zones, setZones] = useState<DetectionZone[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics>({
    edgeStatus: 'ONLINE',
    cpuUsage: 34,
    gpuUsage: 42,
    ramUsageGb: 2.8,
    ramTotalGb: 8.0,
    tempCelsius: 48,
    fps: 10.2,
    inferenceLatencyMs: 18,
    networkLatencyMs: 14,
    queueSize: 0,
    uptimeSeconds: 846200,
    yoloStatus: 'ACTIVE',
    byteTrackStatus: 'ACTIVE',
    insightFaceStatus: 'ACTIVE',
    openCvStatus: 'ACTIVE',
    rtspStatus: 'CONNECTED',
    telegramStatus: 'CONNECTED',
  });
  const [settings, setSettings] = useState<AISettings>(defaultSettings);
  const [events, setEvents] = useState<SecurityEvent[]>([]);

  // Operating Mode State
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
    trackId: '#104',
    x: 45,
    y: 55,
    dwellSeconds: 0,
    faceStatus: 'UNKNOWN',
    confidence: 0.97,
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

  // Load initial data & connect WebSocket if backend active
  useEffect(() => {
    async function loadData() {
      const cams = await api.getCameras();
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
  }, []);

  // WebSocket Live Updates Connection to FastAPI
  useEffect(() => {
    if (!isRealCameraMode) return;

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket('ws://localhost:8000/ws/cameras/cam-01');
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.tracks && data.tracks.length > 0) {
            const t = data.tracks[0];
            setSimulatedPerson(prev => ({
              ...prev,
              trackId: t.track_id || '#104',
              dwellSeconds: t.dwell_seconds || prev.dwellSeconds,
              faceStatus: t.face_status === 'KNOWN' ? 'VERIFIED_RESIDENT' : 'UNKNOWN',
              confidence: t.confidence || 0.97,
              active: true,
            }));
          }

          if (data.decision && data.decision.new_alert) {
            setAlerts(curr => [data.decision.new_alert, ...curr]);
            setFeedbackToastMessage(`🚨 REAL THREAT DETECTED: Track ${data.decision.new_alert.personTrackId} loitering > 20s. Snapshot saved & alert delivered!`);
          }
        } catch {}
      };
    } catch {}

    return () => {
      if (ws) ws.close();
    };
  }, [isRealCameraMode]);

  // Simulation Loop when in Demo Mode
  useEffect(() => {
    if (!isSimulating || isRealCameraMode) return;

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
          setFeedbackToastMessage(`🚨 VERIFIED THREAT: Subject ${prev.trackId} loitering > 20s. Telegram alert delivered!`);
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
    setFeedbackToastMessage(`SIMULATION STARTED: Unknown subject ${newTrackId} entered corridor protection zone.`);
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
    const resp = await api.addCamera(cam);
    if (resp && !resp.error) {
      setCameras(prev => [...prev, resp]);
      setFeedbackToastMessage(`Camera "${cam.name}" connected and saved.`);
    } else {
      const newCam: CameraDevice = { ...cam, id: `cam-0${cameras.length + 1}` };
      setCameras(prev => [...prev, newCam]);
      setFeedbackToastMessage(`Camera "${cam.name}" added locally.`);
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
        isRealCameraMode,
        setIsRealCameraMode,
        hikvisionSetupModalOpen,
        setHikvisionSetupModalOpen,
        isSimulating,
        simulatedPerson,
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
