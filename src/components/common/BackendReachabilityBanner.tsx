import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { API_BASE, api } from '../../services/api';
import { useSecurity } from '../../context/SecurityContext';

export const BackendReachabilityBanner: React.FC = () => {
  const { setIsRealCameraMode, setOperatingMode } = useSecurity();
  const [reachable, setReachable] = useState<boolean | null>(null);
  const [retrying, setRetrying] = useState(false);

  const checkBackend = useCallback(async (manual = false) => {
    if (manual) setRetrying(true);
    const health = await api.getHealth();
    const online = health.status !== 'OFFLINE' && health.edgeStatus !== 'OFFLINE';
    setReachable(online);
    if (online && manual) {
      setOperatingMode('LIVE_CCTV');
      setIsRealCameraMode(true);
    } else if (!online) {
      setOperatingMode('OFFLINE');
      setIsRealCameraMode(false);
    }
    if (manual) setRetrying(false);
  }, [setIsRealCameraMode, setOperatingMode]);

  useEffect(() => {
    void checkBackend();
    const interval = window.setInterval(() => void checkBackend(), 10000);
    return () => window.clearInterval(interval);
  }, [checkBackend]);

  if (reachable !== false) return null;

  return (
    <div role="status" className="mx-4 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-amber-100 sm:mx-6">
      <div className="flex min-w-0 items-start gap-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">Backend not reachable · Demo/offline mode</p>
          <p className="mt-0.5 break-all text-xs text-amber-100/75">
            Configured API: {API_BASE ?? 'not configured'} · Camera detections are unavailable; demo content is simulated.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => void checkBackend(true)}
        disabled={retrying}
        className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-amber-300/30 px-3 py-2 text-xs font-semibold hover:bg-amber-200/10 disabled:opacity-60"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${retrying ? 'animate-spin' : ''}`} />
        {retrying ? 'Checking…' : 'Retry'}
      </button>
    </div>
  );
};
