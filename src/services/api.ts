import { SecurityAlert, ResidentPerson, UnknownPerson, CameraDevice, DetectionZone, SystemMetrics } from '../types';

const API_BASE = 'http://localhost:8000/api';

export const api = {
  async getHealth() {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (!res.ok) throw new Error('Backend offline');
      return await res.json();
    } catch {
      return { status: 'OFFLINE', mode: 'STANDALONE' };
    }
  },

  async getCameras(): Promise<CameraDevice[]> {
    try {
      const res = await fetch(`${API_BASE}/cameras`);
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

  async testRTSPConnection(camData: { host: string; port: number; username: string; password: string; channel: string }) {
    try {
      const res = await fetch(`${API_BASE}/cameras/cam-01/test`, {
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
        byteTrackStatus: 'OFFLINE',
        insightFaceStatus: 'OFFLINE',
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
