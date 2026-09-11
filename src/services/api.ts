import { SecurityAlert, ResidentPerson, UnknownPerson, CameraDevice, DetectionZone, SystemMetrics } from '../types';

const getApiBase = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocal) {
      return 'http://localhost:8000/api';
    }
  }
  return null;
};

export const API_BASE = getApiBase();

export const api = {
  async getHealth() {
    if (!API_BASE) {
      return {
        status: 'OFFLINE',
        backend: 'NOT_CONFIGURED',
        yolo: 'ERROR',
        tracker: 'ERROR',
        opencv: 'ERROR',
        face_matcher: 'ERROR',
        device_camera_test: 'NOT_READY',
        message: 'EDGE BACKEND NOT CONFIGURED',
      };
    }
    try {
      const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout ? AbortSignal.timeout(2500) : undefined });
      if (!res.ok) throw new Error('Backend offline');
      return await res.json();
    } catch {
      return {
        status: 'OFFLINE',
        backend: 'OFFLINE',
        yolo: 'ERROR',
        tracker: 'ERROR',
        opencv: 'ERROR',
        face_matcher: 'ERROR',
        device_camera_test: 'NOT_READY',
        message: 'EDGE BACKEND NOT CONNECTED',
      };
    }
  },

  async getCameras(userId?: string): Promise<CameraDevice[]> {
    try {
      const url = userId ? `${API_BASE}/cameras?user_id=${encodeURIComponent(userId)}` : `${API_BASE}/cameras`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('API error');
      return await res.json();
    } catch {
      return [];
    }
  },

  async addCamera(camData: any) {
    try {
      const res = await fetch(`${API_BASE}/cameras`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(camData),
      });
      return await res.json();
    } catch (e: any) {
      return { error: true, message: 'Failed to connect camera to backend.' };
    }
  },

  async testRTSPConnection(
    camData: { host: string; port: number; username: string; password: string; channel: string },
    cameraId = 'cam-01'
  ) {
    try {
      const res = await fetch(`${API_BASE}/cameras/${cameraId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(camData),
      });
      return await res.json();
    } catch {
      return {
        status: 'CONNECTION FAILED',
        message: 'Backend server unreachable.',
        connected: false,
      };
    }
  },

  async getAnalytics() {
    try {
      const res = await fetch(`${API_BASE}/analytics`);
      if (!res.ok) throw new Error('API error');
      return await res.json();
    } catch {
      return {
        falseAlarmsToday: 0,
        verifiedThreatsToday: 0,
        humansDetectedToday: 0,
        residentsRecognizedToday: 0,
        unknownPersonsTotal: 0,
        verifiedResidentsTotal: 0,
        cameraCount: 0,
        averageLatencySec: 0,
        totalAlertsToday: 0,
        hourlyEvents: [],
        pieData: [],
        latencyHist: [],
        confidenceDist: [],
        hourlyAlerts: [],
        uptimePercent: 0,
      };
    }
  },

  async scanOnvifNetwork() {
    try {
      const res = await fetch(`${API_BASE}/cameras/onvif/scan`);
      if (!res.ok) throw new Error('Scan failed');
      return await res.json();
    } catch {
      return { count: 0, cameras: [], message: 'No ONVIF cameras discovered on local subnet.' };
    }
  },

  async getAlerts(): Promise<SecurityAlert[]> {
    try {
      const res = await fetch(`${API_BASE}/alerts`);
      if (!res.ok) throw new Error('API error');
      return await res.json();
    } catch {
      return [];
    }
  },

  async sendFalsePositiveFeedback(alertId: string, reason: string) {
    try {
      const res = await fetch(`${API_BASE}/alerts/${alertId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Failed to record feedback.' };
    }
  },

  async getPeople(): Promise<{ residents: ResidentPerson[]; unknownPersons: UnknownPerson[] }> {
    try {
      const res = await fetch(`${API_BASE}/people`);
      if (!res.ok) throw new Error('API error');
      return await res.json();
    } catch {
      return { residents: [], unknownPersons: [] };
    }
  },

  async addResident(residentData: { name: string; role?: string; avatar_url?: string; face_image_base64?: string }) {
    try {
      const res = await fetch(`${API_BASE}/people`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(residentData),
      });
      return await res.json();
    } catch {
      return { error: true, message: 'Failed to save resident to backend.' };
    }
  },

  async deleteResident(id: string) {
    try {
      const res = await fetch(`${API_BASE}/people/${id}`, {
        method: 'DELETE',
      });
      return await res.json();
    } catch {
      return { success: false, message: `Failed to remove resident ${id}.` };
    }
  },

  async getZones(): Promise<DetectionZone[]> {
    try {
      const res = await fetch(`${API_BASE}/zones`);
      if (!res.ok) throw new Error('API error');
      return await res.json();
    } catch {
      return [];
    }
  },

  async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      const res = await fetch(`${API_BASE}/system/metrics`);
      if (!res.ok) throw new Error('API error');
      return await res.json();
    } catch {
      return {
        edgeStatus: 'OFFLINE',
        cpuUsage: 0,
        gpuUsage: 0,
        ramUsageGb: 0,
        ramTotalGb: 16.0,
        tempCelsius: 0,
        fps: 0,
        inferenceLatencyMs: 0,
        networkLatencyMs: 0,
        queueSize: 0,
        uptimeSeconds: 0,
        yoloStatus: 'OFFLINE',
        trackerStatus: 'OFFLINE',
        faceMatcherStatus: 'OFFLINE',
        openCvStatus: 'OFFLINE',
        rtspStatus: 'DISCONNECTED',
        telegramStatus: 'DISCONNECTED',
      };
    }
  },

  async getIntegrationsStatus() {
    try {
      const res = await fetch(`${API_BASE}/integrations/hikconnect`);
      return await res.json();
    } catch {
      return {
        hikvision_local_rtsp: { status: 'DISCONNECTED', mode: 'Real-time Local Edge Processing' },
        hik_connect: { status: 'NOT_CONFIGURED' },
        hik_central: { status: 'NOT_CONFIGURED' },
      };
    }
  },
};
