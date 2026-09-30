import React, { useState } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Switch } from '../components/ui/Switch';
import {
  Sliders,
  Bell,
  Shield,
  Cpu,
  MessageSquare,
  Webhook,
  Sparkles,
  Lock,
  Camera,
  Layers,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings } = useSecurity();
  const [whatsappEnabled, setWhatsappEnabled] = useState<boolean>(true);
  const [webhookEnabled, setWebhookEnabled] = useState<boolean>(false);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <SectionHeader
        title="Settings &amp; Preferences"
        subtitle="Configure smart notifications, camera detection sensitivity, and privacy safeguards"
        icon={<Sliders className="w-5 h-5" />}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge variant="success" label="Saved &amp; Active" />
          </div>
        }
      />

      {/* Section 1: Notifications */}
      <Card className="space-y-4 bg-aurora-surface/90 border-white/10 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-300" /> Notifications
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Choose how and when Smart Vision should notify your phone.
            </p>
          </div>
          <StatusBadge
            variant={settings.telegramEnabled ? 'success' : 'neutral'}
            label={settings.telegramEnabled ? 'Active' : 'Muted'}
          />
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3.5 bg-aurora-elevated/70 rounded-xl border border-white/10">
            <div>
              <p className="font-bold text-text-primary">Telegram Bot Notifications</p>
              <p className="text-text-muted text-[11px] mt-0.5">
                Receive instant security snapshots directly to your Telegram chat (&lt;1.5s latency).
              </p>
            </div>
            <Switch
              checked={settings.telegramEnabled}
              onChange={(checked) => updateSettings({ telegramEnabled: checked })}
            />
          </div>

          <div className="flex items-center justify-between p-3.5 bg-aurora-elevated/70 rounded-xl border border-white/10">
            <div>
              <p className="font-bold text-text-primary flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-300" /> WhatsApp Message Alerts
              </p>
              <p className="text-text-muted text-[11px] mt-0.5">
                Deliver verified stranger snapshots directly to your WhatsApp number.
              </p>
            </div>
            <Switch checked={whatsappEnabled} onChange={(checked) => setWhatsappEnabled(checked)} />
          </div>

          <div className="flex items-center justify-between p-3.5 bg-aurora-elevated/70 rounded-xl border border-white/10">
            <div>
              <p className="font-bold text-text-primary">Desktop Web Push Notifications</p>
              <p className="text-text-muted text-[11px] mt-0.5">
                Show popup notifications on your computer when the dashboard is open.
              </p>
            </div>
            <Switch
              checked={settings.webPushEnabled}
              onChange={(checked) => updateSettings({ webPushEnabled: checked })}
            />
          </div>

          <div className="flex items-center justify-between p-3.5 bg-aurora-elevated/70 rounded-xl border border-white/10">
            <div>
              <p className="font-bold text-text-primary">Smart Alert Snooze</p>
              <p className="text-text-muted text-[11px] mt-0.5">
                Suppress repeated alerts for the same person within a 60-second cooldown period.
              </p>
            </div>
            <Switch
              checked={settings.duplicateSuppression}
              onChange={(checked) => updateSettings({ duplicateSuppression: checked })}
            />
          </div>
        </div>
      </Card>

      {/* Section 2: Security & Stay Rules */}
      <Card className="space-y-4 bg-aurora-surface/90 border-white/10 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-300" /> Detection Sensitivity
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Customize how long an unfamiliar person can stay before triggering an alert.
            </p>
          </div>
          <StatusBadge variant="info" label="Smart Thresholds" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
          <div>
            <div className="flex items-center justify-between mb-1.5 text-xs">
              <label className="text-text-secondary font-semibold">Stay Duration Threshold</label>
              <span className="font-bold text-amber-300">
                {settings.dwellThresholdSeconds} Seconds
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="60"
              value={settings.dwellThresholdSeconds}
              onChange={(e) => updateSettings({ dwellThresholdSeconds: Number(e.target.value) })}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <p className="text-[11px] text-text-muted mt-1">
              Recommended: 20 seconds. Shorter triggers quicker notices for fast drop-offs.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5 text-xs">
              <label className="text-text-secondary font-semibold">Movement Detection Sensitivity</label>
              <span className="font-bold text-blue-300">
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
              className="w-full accent-blue-600 cursor-pointer"
            />
            <p className="text-[11px] text-text-muted mt-1">
              Minimum AI confidence required to distinguish human motion from animals or wind.
            </p>
          </div>
        </div>
      </Card>

      {/* Section 3: Privacy */}
      <Card className="space-y-4 bg-aurora-surface/90 border-white/10 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-300" /> Privacy &amp; Data Storage
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Manage how camera video and facial recognition data are stored and protected.
            </p>
          </div>
          <StatusBadge variant="success" label="100% Local" />
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3.5 bg-emerald-500/10 rounded-xl border border-emerald-400/20">
            <div>
              <p className="font-bold text-emerald-900">100% Local Video Processing</p>
              <p className="text-emerald-300 text-[11px] mt-0.5">
                Your camera video is analyzed locally on your device. Zero raw video is ever uploaded to public clouds.
              </p>
            </div>
            <StatusBadge variant="success" label="Enforced" size="sm" />
          </div>

          <div className="flex items-center justify-between p-3.5 bg-aurora-elevated/70 rounded-xl border border-white/10">
            <div>
              <p className="font-bold text-text-primary">Night-Time Infrared Enhancement</p>
              <p className="text-text-muted text-[11px] mt-0.5">
                Automatically adjusts low-light tracking during night-time infrared glare.
              </p>
            </div>
            <Switch
              checked={settings.nightModeIrFallback}
              onChange={(checked) => updateSettings({ nightModeIrFallback: checked })}
            />
          </div>
        </div>
      </Card>

      {/* Section 4: Advanced */}
      <Card className="space-y-4 bg-aurora-surface/90 border-white/10 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Cpu className="w-4 h-4 text-text-secondary" /> Advanced Integrations
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Connect Smart Vision with local smart home hubs like Home Assistant or Hubitat.
            </p>
          </div>
          <StatusBadge variant="neutral" label="Optional" />
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3.5 bg-aurora-elevated/70 rounded-xl border border-white/10">
            <div>
              <p className="font-bold text-text-primary flex items-center gap-2">
                <Webhook className="w-4 h-4 text-blue-300" /> Home Assistant Webhook Trigger
              </p>
              <p className="text-text-muted text-[11px] mt-0.5">
                Automatically turn on outdoor lights or siren when a security threat is confirmed.
              </p>
            </div>
            <Switch checked={webhookEnabled} onChange={(checked) => setWebhookEnabled(checked)} />
          </div>
        </div>
      </Card>
    </div>
  );
};
