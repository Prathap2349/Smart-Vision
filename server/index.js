import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// In-memory telemetry data
let systemMetrics = {
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
};

// Initial Cameras
let cameras = [
  {
    id: 'cam-01',
    name: 'Residential Corridor',
    location: 'North Wing Corridor (Main Entrance)',
    status: 'ONLINE',
    streamType: 'RTSP',
    resolution: '1920x1080',
    fps: 10,
    aiActive: true,
    latency: 1.4,
    rtspUrlMasked: 'rtsp://admin:****@192.168.1.104:554/h264Preview_01_main',
    bitrateMb: 4.2,
    aiLoadCpu: 34,
    aiLoadGpu: 42,
    recentEventCount: 14,
  },
  {
    id: 'cam-02',
    name: 'Front Gate Driveway',
    location: 'Perimeter Entrance',
    status: 'ONLINE',
    streamType: 'RTSP',
    resolution: '1920x1080',
    fps: 10,
    aiActive: true,
    latency: 1.2,
    rtspUrlMasked: 'rtsp://admin:****@192.168.1.105:554/stream1',
    bitrateMb: 3.8,
    aiLoadCpu: 28,
    aiLoadGpu: 35,
    recentEventCount: 8,
  },
];

// Initial Alerts
let alerts = [
  {
    id: 'alt-1092',
    timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    cameraName: 'Residential Corridor',
    cameraId: 'cam-01',
    personTrackId: '#104',
    detectionType: 'Unknown Person Loitering',
    dwellDuration: 27,
    faceStatus: 'UNKNOWN',
    confidence: 0.96,
    severity: 'CRITICAL',
    status: 'ACTIVE',
    telegramDelivered: true,
    telegramLatency: 1.3,
    zoneName: 'Corridor Protection Zone',
    aiReasoning: {
      gate1Human: true,
      gate2Dwell: true,
      gate3Unknown: true,
    },
  },
  {
    id: 'alt-1091',
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    cameraName: 'Residential Corridor',
    cameraId: 'cam-01',
    personTrackId: '#098',
    detectionType: 'Unknown Person Loitering',
    dwellDuration: 22,
    faceStatus: 'UNKNOWN',
    confidence: 0.94,
    severity: 'HIGH',
    status: 'FALSE_POSITIVE',
    falsePositiveReason: 'Foliage / Delivery Courier',
    falsePositiveTimestamp: new Date(Date.now() - 1000 * 60 * 160).toISOString(),
    telegramDelivered: true,
    telegramLatency: 1.4,
    zoneName: 'Entry Vestibule',
    aiReasoning: {
      gate1Human: true,
      gate2Dwell: true,
      gate3Unknown: true,
    },
  },
  {
    id: 'alt-1090',
    timestamp: new Date(Date.now() - 1000 * 60 * 420).toISOString(),
    cameraName: 'Front Gate Driveway',
    cameraId: 'cam-02',
    personTrackId: '#087',
    detectionType: 'Restricted Boundary Breach',
    dwellDuration: 25,
    faceStatus: 'UNKNOWN',
    confidence: 0.98,
    severity: 'HIGH',
    status: 'RESOLVED',
    telegramDelivered: true,
    telegramLatency: 1.1,
    zoneName: 'Perimeter Tripwire',
    aiReasoning: {
      gate1Human: true,
      gate2Dwell: true,
      gate3Unknown: true,
    },
  },
];

// Whitelisted Residents
let residents = [
  {
    id: 'res-01',
    name: 'Arun Kumar',
    residentId: 'RES-8821',
    faceStatus: 'VERIFIED',
    lastDetected: '12 mins ago',
    detectionCount: 142,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    role: 'Primary Resident',
    addedDate: '2025-01-10',
  },
  {
    id: 'res-02',
    name: 'Priya S',
    residentId: 'RES-8822',
    faceStatus: 'VERIFIED',
    lastDetected: '45 mins ago',
    detectionCount: 118,
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=250&q=80',
    role: 'Primary Resident',
    addedDate: '2025-01-10',
  },
  {
    id: 'res-03',
    name: 'Family Member 03',
    residentId: 'RES-8823',
    faceStatus: 'VERIFIED',
    lastDetected: '3 hours ago',
    detectionCount: 64,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
    role: 'Family Member',
    addedDate: '2025-01-15',
  },
  {
    id: 'res-04',
    name: 'Family Member 04',
    residentId: 'RES-8824',
    faceStatus: 'VERIFIED',
    lastDetected: 'Yesterday',
    detectionCount: 39,
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80',
    role: 'Family Member',
    addedDate: '2025-01-20',
  },
];

// Unknown Persons
let unknownPersons = [
  {
    id: 'unk-104',
    trackId: '#104',
    firstSeen: '22:40:46',
    lastSeen: '22:41:13',
    camera: 'Residential Corridor',
    confidence: 0.96,
    threatStatus: 'HIGH',
    snapshotUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',
    dwellSeconds: 27,
  },
  {
    id: 'unk-098',
    trackId: '#098',
    firstSeen: '19:15:02',
    lastSeen: '19:15:24',
    camera: 'Residential Corridor',
    confidence: 0.94,
    threatStatus: 'MEDIUM',
    snapshotUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=250&q=80',
    dwellSeconds: 22,
  },
];

// Detection Zones
let detectionZones = [
  {
    id: 'zone-01',
    name: 'Corridor Protection Zone',
    type: 'CORRIDOR',
    dwellThreshold: 20,
    enabled: true,
    color: '#00f0ff',
    cameraName: 'Residential Corridor',
    polygonPoints: [
      { x: 15, y: 25 },
      { x: 85, y: 25 },
      { x: 90, y: 85 },
      { x: 10, y: 85 },
    ],
  },
  {
    id: 'zone-02',
    name: 'Entry Vestibule',
    type: 'ENTRY',
    dwellThreshold: 20,
    enabled: true,
    color: '#f59e0b',
    cameraName: 'Residential Corridor',
    polygonPoints: [
      { x: 5, y: 10 },
      { x: 35, y: 10 },
      { x: 35, y: 40 },
      { x: 5, y: 40 },
    ],
  },
  {
    id: 'zone-03',
    name: 'Restricted Perimeter',
    type: 'RESTRICTED',
    dwellThreshold: 15,
    enabled: true,
    color: '#ef4444',
    cameraName: 'Front Gate Driveway',
    polygonPoints: [
      { x: 60, y: 10 },
      { x: 95, y: 10 },
      { x: 95, y: 90 },
      { x: 60, y: 90 },
    ],
  },
];

// API Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    version: '1.0.0-edge',
    device: 'Smart Vision Sentry Edge Box (Jetson/x86)',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/cameras', (req, res) => {
  res.json(cameras);
});

app.get('/api/cameras/:id', (req, res) => {
  const camera = cameras.find(c => c.id === req.params.id);
  if (!camera) return res.status(404).json({ error: 'Camera not found' });
  res.json(camera);
});

app.get('/api/alerts', (req, res) => {
  res.json(alerts);
});

app.post('/api/alerts/:id/feedback', (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const alert = alerts.find(a => a.id === id);
  if (alert) {
    alert.status = 'FALSE_POSITIVE';
    alert.falsePositiveReason = reason || 'Resident Flagged';
    alert.falsePositiveTimestamp = new Date().toISOString();
  }
  res.json({
    success: true,
    message: 'Feedback recorded. Confidence threshold tuned.',
    alert,
  });
});

app.get('/api/people', (req, res) => {
  res.json({
    residents,
    unknownPersons,
  });
});

app.get('/api/zones', (req, res) => {
  res.json(detectionZones);
});

app.post('/api/zones', (req, res) => {
  const newZone = {
    id: `zone-${Date.now()}`,
    ...req.body,
  };
  detectionZones.push(newZone);
  res.status(201).json(newZone);
});

app.get('/api/analytics', (req, res) => {
  res.json({
    falseAlarmsBefore: 99,
    falseAlarmsAfter: 3,
    reductionPercentage: 97,
    timeWastedBeforeMins: 20,
    timeWastedAfterMins: 1,
    averageLatencySec: 1.4,
    accuracyPercent: 98.6,
    residentRecognitionPercent: 99.1,
    totalDetectionsToday: 18,
    residentsRecognizedToday: 14,
    unknownsDetectedToday: 4,
    verifiedThreatsToday: 1,
  });
});

app.get('/api/system/metrics', (req, res) => {
  // Add slight random noise to metrics for realistic live view
  const noisyMetrics = {
    ...systemMetrics,
    cpuUsage: Math.min(100, Math.max(10, Math.round(systemMetrics.cpuUsage + (Math.random() * 4 - 2)))),
    gpuUsage: Math.min(100, Math.max(15, Math.round(systemMetrics.gpuUsage + (Math.random() * 4 - 2)))),
    tempCelsius: Math.round(48 + Math.random() * 2),
    fps: Number((10 + Math.random() * 0.4 - 0.2).toFixed(1)),
    inferenceLatencyMs: Math.round(18 + Math.random() * 2),
  };
  res.json(noisyMetrics);
});

app.listen(PORT, () => {
  console.log(`Smart Vision Sentry API running on port ${PORT}`);
});
