import React, { useState } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Switch } from '../components/ui/Switch';
import { Sliders, Bell, Shield, Cpu, MessageSquare, Webhook, Sparkles } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings } = useSecurity();
  const [whatsappEnabled, setWhatsappEnabled] = useState<boolean>(true);
  const [webhookEnabled, setWebhookEnabled] = useState<boolean>(false);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <SectionHeader
        title="System Configuration &amp; Sensitivity"
        subtitle="Fine-tune YOLOv8 human detection, dwell duration, InsightFace thresholds, and alert channels"
        icon={<Sliders className="w-5 h-5 text-blue-400" />}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge variant="success" label="Configuration Active" />
          </div>
        }
      />

      {/* Section 1: AI Model Detection Thresholds */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-400" /> AI Detection Sensitivity &amp; Thresholds
          </h3>
          <StatusBadge variant="info" label="3-GATE PIPELINE" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-1.5 text-xs">
              <label className="text-slate-300 font-medium">Human Detection Sensitivity</label>
              <span className="font-bold text-blue-400 font-mono">
                {Math.round(settings.humanConfidenceThreshold * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="0.99"
              step="0.01"
              value={settings.humanConfidenceThreshold}
              onChange={(e) => updateSettings({ humanConfidenceThreshold: Number(e.target.value) })}
              className="w-full accent-blue-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Minimum YOLOv8-Nano confidence score required to detect human presence.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5 text-xs">
              <label className="text-slate-300 font-medium">Loitering Duration Threshold</label>
              <span className="font-bold text-amber-400 font-mono">
                {settings.dwellThresholdSeconds} Seconds
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="60"
              value={settings.dwellThresholdSeconds}
              onChange={(e) => updateSettings({ dwellThresholdSeconds: Number(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 mt-1">Default recommended dwell duration: 20 seconds.</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5 text-xs">
              <label className="text-slate-300 font-medium">Resident Biometric Threshold (ArcFace)</label>
              <span className="font-bold text-emerald-400 font-mono">
                {Math.round(settings.faceConfidenceThreshold * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.6"
              max="0.99"
              step="0.01"
              value={settings.faceConfidenceThreshold}
              onChange={(e) => updateSettings({ faceConfidenceThreshold: Number(e.target.value) })}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 mt-1">Cosine similarity cutoff to verify enrolled resident faces.</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5 text-xs">
              <label className="text-slate-300 font-medium">Video Processing Target FPS</label>
              <span className="font-bold text-slate-200 font-mono">{settings.targetFps} FPS</span>
            </div>
            <input
              type="range"
              min="5"
              max="30"
              value={settings.targetFps}
              onChange={(e) => updateSettings({ targetFps: Number(e.target.value) })}
              className="w-full accent-blue-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 mt-1">Balances inferencing rate with edge processor thermals.</p>
          </div>
        </div>
      </Card>

      {/* Section 2: Alert Delivery Channels */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-400" /> Telegram, WhatsApp &amp; Mobile Push Channels
          </h3>
          <StatusBadge
            variant={settings.telegramEnabled ? 'success' : 'neutral'}
            label={settings.telegramEnabled ? 'ACTIVE' : 'NOT CONFIGURED'}
          />
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3.5 bg-[#080d1a] rounded-xl border border-slate-800">
            <div>
              <p className="font-bold text-white">Telegram Bot API Dispatch</p>
              <p className="text-slate-400 text-[11px]">Instant security alert delivery (&lt;2.0s delivery latency)</p>
            </div>
            <Switch
              checked={settings.telegramEnabled}
              onChange={(checked) => updateSettings({ telegramEnabled: checked })}
            />
          </div>

          <div className="flex items-center justify-between p-3.5 bg-[#080d1a] rounded-xl border border-slate-800">
            <div>
              <p className="font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" /> WhatsApp Business API Alert Delivery
              </p>
              <p className="text-slate-400 text-[11px]">Deliver verified stranger snapshots directly to resident WhatsApp</p>
            </div>
            <Switch checked={whatsappEnabled} onChange={(checked) => setWhatsappEnabled(checked)} />
          </div>

          <div className="flex items-center justify-between p-3.5 bg-[#080d1a] rounded-xl border border-slate-800">
            <div>
              <p className="font-bold text-white flex items-center gap-2">
                <Webhook className="w-4 h-4 text-blue-400" /> Custom Home Automation Webhooks
              </p>
              <p className="text-slate-400 text-[11px]">POST JSON alert payload to local Home Assistant / Hubitat server</p>
            </div>
            <Switch checked={webhookEnabled} onChange={(checked) => setWebhookEnabled(checked)} />
          </div>

          <div className="flex items-center justify-between p-3.5 bg-[#080d1a] rounded-xl border border-slate-800">
            <div>
              <p className="font-bold text-white">Web Push Desktop Notifications</p>
              <p className="text-slate-400 text-[11px]">Browser push alerts when dashboard is open</p>
            </div>
            <Switch
              checked={settings.webPushEnabled}
              onChange={(checked) => updateSettings({ webPushEnabled: checked })}
            />
          </div>

          <div className="flex items-center justify-between p-3.5 bg-[#080d1a] rounded-xl border border-slate-800">
            <div>
              <p className="font-bold text-white">Duplicate Alert Suppression</p>
              <p className="text-slate-400 text-[11px]">Suppress repeated pings for same subject within cooldown period (60s)</p>
            </div>
            <Switch
              checked={settings.duplicateSuppression}
              onChange={(checked) => updateSettings({ duplicateSuppression: checked })}
            />
          </div>
        </div>
      </Card>

      {/* Section 3: Privacy & Edge Architecture */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" /> Privacy &amp; Local Edge Computing
          </h3>
          <StatusBadge variant="success" label="100% LOCAL EDGE" />
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3.5 bg-emerald-950/20 rounded-xl border border-emerald-500/30">
            <div>
              <p className="font-bold text-emerald-300">Local Edge-AI Processing Guarantee</p>
              <p className="text-slate-400 text-[11px]">Zero raw video frames transmitted to external cloud servers</p>
            </div>
            <StatusBadge variant="success" label="ENFORCED" />
          </div>

          <div className="flex items-center justify-between p-3.5 bg-[#080d1a] rounded-xl border border-slate-800">
            <div>
              <p className="font-bold text-white">Night-Time IR Fallback Tracking</p>
              <p className="text-slate-400 text-[11px]">Fallback to temporal line-crossing tracking during low-light IR flare</p>
            </div>
            <Switch
              checked={settings.nightModeIrFallback}
              onChange={(checked) => updateSettings({ nightModeIrFallback: checked })}
            />
          </div>
        </div>
      </Card>
    </div>
  );
};
