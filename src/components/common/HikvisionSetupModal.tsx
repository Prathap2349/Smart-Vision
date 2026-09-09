import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { api } from '../../services/api';
import { Camera, CheckCircle2, AlertTriangle, Shield, RefreshCw, Video, Info } from 'lucide-react';
import { Badge } from '../ui/Badge';

interface HikvisionSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessConnect: (camConfig: any) => void;
}

export const HikvisionSetupModal: React.FC<HikvisionSetupModalProps> = ({
  isOpen,
  onClose,
  onSuccessConnect,
}) => {
  const [cameraName, setCameraName] = useState<string>('Corridor Hikvision NVR');
  const [host, setHost] = useState<string>('192.168.1.104');
  const [port, setPort] = useState<number>(554);
  const [username, setUsername] = useState<string>('admin');
  const [password, setPassword] = useState<string>('');
  const [streamType, setStreamType] = useState<'101' | '102'>('101');

  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ connected: boolean; message: string } | null>(null);

  const handleTestConnection = async (targetHost?: string) => {
    setTesting(true);
    setTestResult(null);

    const h = targetHost || host;
    const res = await api.testRTSPConnection({
      host: h,
      port,
      username,
      password: password || 'admin123',
      channel: streamType,
    });

    setTesting(false);
    if (res.connected) {
      setTestResult({
        connected: true,
        message: res.message || '✓ RTSP Connection Successful! Stream responsive.',
      });
    } else {
      setTestResult({
        connected: false,
        message: res.error || 'CONNECTION FAILED: Port 554 unreachable on target IP.',
      });
    }
  };

  const handleUseWebcam = () => {
    setHost('0');
    setCameraName('Mac FaceTime HD Camera (Real Live Feed)');
    handleTestConnection('0');
  };

  const handleSaveAndConnect = (e: React.FormEvent) => {
    e.preventDefault();
    onSuccessConnect({
      name: cameraName,
      host,
      port,
      username,
      channel: streamType,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Connect Real CCTV / Hikvision Camera">
      <form onSubmit={handleSaveAndConnect} className="space-y-5">
        {/* Quick Webcam Test Button */}
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Video className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-white">Instant Real AI Test</p>
              <p className="text-[11px] text-slate-400">Use Mac FaceTime/USB Camera to test real YOLOv8 AI detection</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleUseWebcam}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-emerald-glow shrink-0"
          >
            Use Mac Camera
          </button>
        </div>

        {/* Top Info Banner */}
        <div className="p-3.5 bg-cyan-950/40 border border-cyan-500/30 rounded-xl text-xs text-slate-300 flex items-start gap-3">
          <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-white">How to find your Hikvision RTSP Credentials:</p>
            <ul className="list-disc list-inside text-slate-400 mt-1 space-y-0.5 text-[11px]">
              <li><strong>IP Address:</strong> Scan LAN using <em>SADP Tool</em> or your Wi-Fi router admin panel (e.g. 192.168.1.64).</li>
              <li><strong>Username:</strong> Default is <code className="text-cyan-300 font-mono">admin</code> (not your Hik-Connect phone number).</li>
              <li><strong>Password:</strong> Camera admin password or Verification Code printed under device sticker.</li>
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-mono text-slate-400 mb-1">Camera Name</label>
            <input
              type="text"
              value={cameraName}
              onChange={e => setCameraName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block font-mono text-slate-400 mb-1">IP Address (Host)</label>
            <input
              type="text"
              value={host}
              onChange={e => setHost(e.target.value)}
              placeholder="e.g. 192.168.1.64 or 0 for Webcam"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none font-mono"
              required
            />
          </div>

          <div>
            <label className="block font-mono text-slate-400 mb-1">RTSP Port</label>
            <input
              type="number"
              value={port}
              onChange={e => setPort(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none font-mono"
              required
            />
          </div>

          <div>
            <label className="block font-mono text-slate-400 mb-1">Stream Channel</label>
            <select
              value={streamType}
              onChange={e => setStreamType(e.target.value as any)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:border-cyan-500 outline-none font-mono"
            >
              <option value="101">101 (Main Stream - 1080p)</option>
              <option value="102">102 (Sub Stream - 720p)</option>
            </select>
          </div>

          <div>
            <label className="block font-mono text-slate-400 mb-1">Local RTSP Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="admin"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none font-mono"
              required
            />
          </div>

          <div>
            <label className="block font-mono text-slate-400 mb-1">Local RTSP Password / Verification Code</label>
            <input
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none"
            />
          </div>
        </div>

        {/* Connection Test Result */}
        {testResult && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-mono flex items-start gap-2.5 ${
              testResult.connected
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
            }`}
          >
            {testResult.connected ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold">{testResult.connected ? 'CONNECTED' : 'CONNECTION FAILED'}</p>
              <p className="text-[11px] opacity-90 mt-0.5">{testResult.message}</p>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => handleTestConnection()}
            disabled={testing}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/60 text-xs font-bold text-indigo-300 transition flex items-center justify-center gap-2 border border-indigo-500/30"
          >
            {testing ? <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" /> : <Shield className="w-4 h-4 text-indigo-400" />}
            {testing ? 'Testing RTSP...' : 'Test Connection'}
          </button>

          <div className="w-full sm:w-auto flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20"
            >
              Start Live Monitoring
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
