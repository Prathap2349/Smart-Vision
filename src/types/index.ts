export type ThreatSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type AlertStatus = 'ACTIVE' | 'RESOLVED' | 'FALSE_POSITIVE' | 'UNDER_REVIEW';

export interface SecurityAlert {
  id: string;
  timestamp: string;
  cameraName: string;
  cameraId: string;
  personTrackId: string;
  detectionType: string;
  dwellDuration: number; // in seconds
  faceStatus: 'UNKNOWN' | 'VERIFIED_RESIDENT' | 'UNCLEAR';
  residentName?: string;
  confidence: number; // e.g. 0.96
  severity: ThreatSeverity;
  status: AlertStatus;
  evidenceFrameUrl?: string;
  telegramDelivered: boolean;
  telegramLatency?: number; // e.g. 1.3
  falsePositiveReason?: string;
  falsePositiveTimestamp?: string;
  zoneName: string;
  aiReasoning: {
    gate1Human: boolean;
    gate2Dwell: boolean;
    gate3Unknown: boolean;
  };
}

export interface ResidentPerson {
  id: string;
  name: string;
  residentId: string;
  faceStatus: 'VERIFIED' | 'PENDING' | 'REVOKED';
  lastDetected: string;
  detectionCount: number;
  avatarUrl: string;
  role: 'Primary Resident' | 'Family Member' | 'Frequent Visitor' | 'Staff';
  addedDate: string;
}

export interface UnknownPerson {
  id: string;
  trackId: string;
  firstSeen: string;
  lastSeen: string;
  camera: string;
  confidence: number;
  threatStatus: 'HIGH' | 'MEDIUM' | 'SAFE';
  snapshotUrl: string;
  dwellSeconds: number;
}

export interface CameraDevice {
  id: string;
  name: string;
  location: string;
  status: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
  streamType: 'RTSP' | 'WEBRTC' | 'HLS';
  resolution: string;
  fps: number;
  aiActive: boolean;
  latency: number; // seconds
  rtspUrlMasked: string;
  bitrateMb: number;
  aiLoadCpu: number;
  aiLoadGpu: number;
  recentEventCount: number;
}

export interface DetectionZone {
  id: string;
  name: string;
  type: 'CORRIDOR' | 'ENTRY' | 'RESTRICTED' | 'TRIPWIRE';
  dwellThreshold: number; // seconds
  enabled: boolean;
  color: string;
  polygonPoints: { x: number; y: number }[]; // percentages 0..100
  cameraName: string;
}

export interface SecurityEvent {
  id: string;
  timestamp: string;
  camera: string;
  trackId: string;
  personType: 'Known Resident' | 'Unknown Person' | 'Vehicle' | 'Animal';
  eventType: 'Human detected' | 'Resident recognized' | 'Unknown face' | 'Zone entered' | 'Zone exited' | 'Loitering detected' | 'Threat verified' | 'False positive' | 'Alert delivered';
  confidence: number;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  status: string;
}

export interface SystemMetrics {
  edgeStatus: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  edgeConnectionState?: 'NOT_CONNECTED' | 'CONNECTED_NO_CAMERA' | 'CONNECTED_CAMERA_OFFLINE' | 'LIVE';
  cpuUsage: number;
  gpuUsage: number;
  ramUsageGb: number;
  ramTotalGb: number;
  tempCelsius: number;
  fps: number;
  inferenceLatencyMs: number;
  networkLatencyMs: number;
  queueSize: number;
  uptimeSeconds: number;
  yoloStatus: 'ACTIVE' | 'WARNING' | 'OFFLINE';
  byteTrackStatus: 'ACTIVE' | 'WARNING' | 'OFFLINE';
  insightFaceStatus: 'ACTIVE' | 'WARNING' | 'OFFLINE';
  openCvStatus: 'ACTIVE' | 'WARNING' | 'OFFLINE';
  rtspStatus: 'CONNECTED' | 'DISCONNECTED';
  telegramStatus: 'CONNECTED' | 'DISCONNECTED';
}

export interface PipelineGateState {
  gate1Human: { pass: boolean; confidence: number; label: string };
  gate2Dwell: { pass: boolean; dwellSeconds: number; thresholdSeconds: number; label: string };
  gate3Unknown: { pass: boolean; faceStatus: string; label: string };
  finalDecision: 'VERIFIED_THREAT' | 'SAFE_RESIDENT' | 'MONITORING' | 'ENVIRONMENTAL_MOTION';
}

export interface AISettings {
  humanConfidenceThreshold: number;
  faceConfidenceThreshold: number;
  dwellThresholdSeconds: number;
  maxTrackingAgeSeconds: number;
  targetFps: number;
  telegramEnabled: boolean;
  webPushEnabled: boolean;
  alertCooldownSeconds: number;
  duplicateSuppression: boolean;
  localProcessingOnly: boolean;
  cloudUploadEnabled: boolean;
  evidenceRetentionDays: number;
  nightModeIrFallback: boolean;
  int8Quantization: boolean;
}
