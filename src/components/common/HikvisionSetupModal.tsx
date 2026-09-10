import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { api } from '../../services/api';
import { Camera, CheckCircle2, AlertTriangle, Shield, RefreshCw, Video, Info, Radar, Cpu } from 'lucide-react';
import { Badge } from '../ui/Badge';

export type CameraBrand = 'hikvision' | 'dahua' | 'cpplus' | 'tapo' | 'reolink' | 'generic';

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
  const [selectedBrand, setSelectedBrand] = useState<CameraBrand>('hikvision');
  const [cameraName, setCameraName] = useState<string>('Corridor CCTV Camera');
  const [host, setHost] = useState<string>('192.168.1.104');
  const [port, setPort] = useState<number>(554);
  const [username, setUsername] = useState<string>('admin');
  const [password, setPassword] = useState<string>('');
  const [streamType, setStreamType] = useState<'101' | '102'>('101');

  const [testing, setTesting] = useState<boolean>(false);
  const [scanningOnvif, setScanningOnvif] = useState<boolean>(false);
  const [onvifDiscovered, setOnvifDiscovered] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ connected: boolean; message: string } | null>(null);

  const brandTemplates: Record<CameraBrand, { name: string; pathTemplate: string; defaultPort: number }> = {
    hikvision: { name: 'Hikvision', pathTemplate: '/Streaming/channels/101', defaultPort: 554 },
    dahua: { name: 'Dahua', pathTemplate: '/cam/realmonitor?channel=1&subtype=0', defaultPort: 554 },
    cpplus: { name: 'CP Plus', pathTemplate: '/cam/realmonitor?channel=1&subtype=0', defaultPort: 554 },
    tapo: { name: 'TP-Link Tapo', pathTemplate: '/stream1', defaultPort: 554 },
    reolink: { name: 'Reolink', pathTemplate: '/h264Preview_01_main', defaultPort: 554 },
    generic: { name: 'Generic RTSP', pathTemplate: '/live/ch0', defaultPort: 554 },
  };

  const handleBrandSelect = (brand: CameraBrand) => {
    setSelectedBrand(brand);
    setPort(brandTemplates[brand].defaultPort);
    setCameraName(`${brandTemplates[brand].name} Camera`);
  };

  const handleScanOnvif = async () => {
    setScanningOnvif(true);
    setOnvifDiscovered(false);
    try {
      const res = await api.scanOnvifNetwork();
      setScanningOnvif(false);
      if (res && res.devices && res.devices.length > 0) {
        const dev = res.devices[0];
        setOnvifDiscovered(true);
        if (dev.ip) setHost(dev.ip);
        setTestResult({
          connected: true,
          message: `✓ ONVIF Device Discovered: ${dev.name || 'Camera'} (${dev.ip || 'LAN'}) responding on network.`,
        });
      } else {
        setTestResult({
          connected: false,
          message: 'No ONVIF camera discovered on LAN. Enter IP manually or select Webcam.',
        });
      }
    } catch {
      setScanningOnvif(false);
      setTestResult({
        connected: false,
        message: 'ONVIF scan failed or network permissions restricted.',
      });
    }
  };

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
        message: res.message || '✓ RTSP Connection Successful! Camera stream active.',
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
    setCameraName('Local Webcam Feed');
    handleTestConnection('0');
  };

  const handleSaveAndConnect = (e: React.FormEvent) => {
    e.preventDefault();
    onSuccessConnect({
      name: cameraName,
      brand: selectedBrand,
      host,
      port,
      username,
      channel: streamType,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Connect Any Home CCTV Camera">
      <form onSubmit={handleSaveAndConnect} className="space-y-5">
        {/* Brand Selector Bar */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Select Your Camera Brand
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs">
            {(Object.keys(brandTemplates) as CameraBrand[]).map(bKey => (
              <button
                key={bKey}
                type="button"
                onClick={() => handleBrandSelect(bKey)}
                className={`p-2.5 rounded-xl border font-bold flex flex-col items-center gap-1.5 transition ${
                  selectedBrand === bKey
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Video className="w-4 h-4" />
                <span className="truncate text-[11px]">{brandTemplates[bKey].name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ONVIF Scan & Quick Webcam Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radar className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-white">ONVIF Network Scan</p>
                <p className="text-[10px] text-slate-400">Scan LAN for local IP cameras</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleScanOnvif}
              disabled={scanningOnvif}
              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition shrink-0"
            >
              {scanningOnvif ? 'Scanning...' : 'Scan LAN'}
            </button>
          </div>

          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-white">Instant Webcam Test</p>
                <p className="text-[10px] text-slate-400">Use built-in camera</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleUseWebcam}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shrink-0"
            >
              Use Webcam
            </button>
          </div>
        </div>

        {/* RTSP Path Preview */}
        <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs flex items-center justify-between">
          <span className="text-slate-400 font-mono">Stream Path Template:</span>
          <code className="text-cyan-300 font-mono text-[11px] bg-slate-900 px-2 py-1 rounded">
            rtsp://{username}:***@{host}:{port}{brandTemplates[selectedBrand].pathTemplate}
          </code>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Camera Name</label>
            <input
              type="text"
              value={cameraName}
              onChange={e => setCameraName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">IP Address (Host)</label>
            <input
              type="text"
              value={host}
              onChange={e => setHost(e.target.value)}
              placeholder="e.g. 192.168.1.104"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">RTSP Port</label>
            <input
              type="number"
              value={port}
              onChange={e => setPort(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Local Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="admin"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none"
              required
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-slate-400 mb-1">Local Camera Password</label>
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
            className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
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
            {testing ? 'Testing Stream...' : 'Test Camera Connection'}
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
