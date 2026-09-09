import React from 'react';
import { useSecurity } from '../context/SecurityContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Switch } from '../components/ui/Switch';
import { Sliders, Bell, Shield, Cpu, Save, RefreshCw } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings } = useSecurity();

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Section 1: AI Model Detection Thresholds */}
      <Card className="space-y-4 border-cyan-500/30">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" /> AI Detection Sensitivity & Thresholds
          </h3>
          <Badge variant="cyan">3-GATE PIPELINE</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-1 text-xs">
              <label className="text-slate-300">Human Detection Sensitivity</label>
              <span className="font-bold text-cyan-400">{Math.round(settings.humanConfidenceThreshold * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="0.99"
              step="0.01"
              value={settings.humanConfidenceThreshold}
              onChange={e => updateSettings({ humanConfidenceThreshold: Number(e.target.value) })}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 mt-1">Minimum confidence required to detect human presence.</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1 text-xs">
              <label className="text-slate-300">Loitering Duration Threshold (Seconds)</label>
              <span className="font-bold text-amber-400">{settings.dwellThresholdSeconds} Seconds</span>
            </div>
            <input
              type="range"
              min="5"
              max="60"
              value={settings.dwellThresholdSeconds}
              onChange={e => updateSettings({ dwellThresholdSeconds: Number(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 mt-1">Default recommended duration: 20 seconds.</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1 text-xs">
              <label className="text-slate-300">Resident Recognition Sensitivity</label>
              <span className="font-bold text-emerald-400">{Math.round(settings.faceConfidenceThreshold * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.6"
              max="0.99"
              step="0.01"
              value={settings.faceConfidenceThreshold}
              onChange={e => updateSettings({ faceConfidenceThreshold: Number(e.target.value) })}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 mt-1">Accuracy threshold required to verify approved residents.</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1 text-xs">
              <label className="text-slate-300">Video Processing Frame Rate</label>
              <span className="font-bold text-slate-200">{settings.targetFps} FPS</span>
            </div>
            <input
              type="range"
              min="5"
              max="30"
              value={settings.targetFps}
              onChange={e => updateSettings({ targetFps: Number(e.target.value) })}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 mt-1">Optimizes hardware performance and minimizes power usage.</p>
          </div>
        </div>
      </Card>

      {/* Section 2: Alert Delivery Channels */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Bell className="w-4 h-4 text-cyan-400" /> Telegram &amp; Mobile Notifications
          </h3>
          <Badge variant={settings.telegramEnabled ? 'emerald' : 'slate'}>
            {settings.telegramEnabled ? 'ACTIVE' : 'NOT CONFIGURED'}
          </Badge>
        </div>

        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800">
            <div>
              <p className="font-bold text-white">Enable Telegram Bot API Push</p>
              <p className="text-slate-400 text-[11px]">Instant security alert delivery (&lt;2.0s latency)</p>
            </div>
            <Switch
              checked={settings.telegramEnabled}
              onChange={checked => updateSettings({ telegramEnabled: checked })}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800">
            <div>
              <p className="font-bold text-white">Web Push Desktop Notifications</p>
              <p className="text-slate-400 text-[11px]">Browser push alerts when dashboard is open</p>
            </div>
            <Switch
              checked={settings.webPushEnabled}
              onChange={checked => updateSettings({ webPushEnabled: checked })}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800">
            <div>
              <p className="font-bold text-white">Duplicate Alert Suppression</p>
              <p className="text-slate-400 text-[11px]">Suppress repeated pings for same subject within cooldown period (60s)</p>
            </div>
            <Switch
              checked={settings.duplicateSuppression}
              onChange={checked => updateSettings({ duplicateSuppression: checked })}
            />
          </div>
        </div>
      </Card>

      {/* Section 3: Privacy & Edge Architecture */}
      <Card className="space-y-4 border-emerald-500/30">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" /> Privacy &amp; Local Processing
          </h3>
          <Badge variant="emerald">100% LOCAL EDGE</Badge>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 bg-emerald-950/30 rounded-xl border border-emerald-500/30">
            <div>
              <p className="font-bold text-emerald-300">Local Edge-AI Processing Only</p>
              <p className="text-slate-400 text-[11px]">Zero raw video frames transmitted to external cloud servers</p>
            </div>
            <Badge variant="emerald">ENFORCED</Badge>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800">
            <div>
              <p className="font-bold text-white">Night-Time IR Fallback Tracking</p>
              <p className="text-slate-400 text-[11px]">Fallback to temporal line-crossing tracking during IR camera flare</p>
            </div>
            <Switch
              checked={settings.nightModeIrFallback}
              onChange={checked => updateSettings({ nightModeIrFallback: checked })}
            />
          </div>
        </div>
      </Card>
    </div>
  );
};
