import React, { useRef, useEffect, useState } from 'react';
import { useSecurity } from '../../context/SecurityContext';
import { API_BASE } from '../../services/api';

interface CCTVCanvasPlayerProps {
  cameraId?: string;
}

export const CCTVCanvasPlayer: React.FC<CCTVCanvasPlayerProps> = ({ cameraId: cameraIdProp }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const {
    simulatedPerson,
    overlayToggles,
    finalDecision,
    zones,
    isRealCameraMode,
    isSimulating,
    cameras,
    metrics,
    setDeviceCameraModalOpen,
  } = useSecurity();
  const [streamError, setStreamError] = useState(false);

  const activeCamera = cameras.find(c => c.id === cameraIdProp) ?? cameras[0];
  const cameraId = cameraIdProp ?? activeCamera?.id ?? 'cam-01';
  const mjpegUrl = `${API_BASE}/cameras/${cameraId}/mjpeg`;
  const showDemoOverlay = !isRealCameraMode && isSimulating && simulatedPerson.active;
  const showDisconnectedBanner =
    streamError || (isRealCameraMode && activeCamera?.status === 'OFFLINE' && streamError);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Demo mode only: plain clean dark background
      if (!isRealCameraMode) {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, width, height);
      }

      // Virtual detection zones overlay
      if (overlayToggles.zones) {
        zones.forEach(zone => {
          if (!zone.enabled) return;
          ctx.fillStyle = `${zone.color}20`;
          ctx.strokeStyle = zone.color;
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);

          ctx.beginPath();
          zone.polygonPoints.forEach((pt, idx) => {
            const px = (pt.x / 100) * width;
            const py = (pt.y / 100) * height;
            if (idx === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.setLineDash([]);

          if (zone.polygonPoints.length > 0) {
            const labelX = (zone.polygonPoints[0].x / 100) * width + 8;
            const labelY = (zone.polygonPoints[0].y / 100) * height + 18;
            ctx.fillStyle = zone.color;
            ctx.font = '600 11px Inter, sans-serif';
            ctx.fillText(`${zone.name} (${zone.dwellThreshold}s rule)`, labelX, labelY);
          }
        });
      }

      // Demo simulation overlay only — real mode uses backend MJPEG bbox drawing
      if (showDemoOverlay && simulatedPerson.active) {
        const px = (simulatedPerson.x / 100) * width;
        const py = (simulatedPerson.y / 100) * height;
        const boxWidth = 90;
        const boxHeight = 150;
        const boxX = px - boxWidth / 2;
        const boxY = py - 80;

        if (overlayToggles.boundingBoxes) {
          const isThreat = finalDecision === 'VERIFIED_THREAT';
          const isSafe = finalDecision === 'SAFE_RESIDENT';
          const strokeColor = isThreat ? '#ef4444' : isSafe ? '#10b981' : '#3b82f6';

          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = isThreat ? 2.5 : 2;
          ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

          if (overlayToggles.faceRecognition) {
            ctx.strokeStyle = simulatedPerson.faceStatus === 'UNKNOWN' ? '#ef4444' : '#10b981';
            ctx.setLineDash([3, 3]);
            ctx.strokeRect(px - 18, py - 78, 36, 36);
            ctx.setLineDash([]);
            ctx.fillStyle = simulatedPerson.faceStatus === 'UNKNOWN' ? '#ef4444' : '#10b981';
            ctx.font = 'bold 10px Inter, sans-serif';
            const faceLabel =
              simulatedPerson.faceStatus === 'UNKNOWN'
                ? 'Unrecognized'
                : `${simulatedPerson.residentName ?? 'Household'}`;
            ctx.fillText(faceLabel, px - 28, py - 82);
          }

          if (overlayToggles.aiLabels || overlayToggles.trackIds) {
            ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
            ctx.fillRect(boxX, boxY - 30, boxWidth + 30, 26);
            ctx.strokeStyle = strokeColor;
            ctx.strokeRect(boxX, boxY - 30, boxWidth + 30, 26);
            ctx.fillStyle = '#ffffff';
            ctx.font = '600 11px Inter, sans-serif';
            ctx.fillText(`Person • ${simulatedPerson.dwellSeconds}s`, boxX + 6, boxY - 13);
          }
        }
      }

      // Consumer Clean Top HUD overlay
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.fillRect(0, 0, width, 32);

      const camLabel = activeCamera?.name ?? 'Camera';
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 11px Inter, sans-serif';
      ctx.fillText(`● LIVE — ${camLabel}`, 12, 20);

      const timeString = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '500 11px Inter, sans-serif';
      ctx.fillText(timeString, width - 90, 20);

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [
    simulatedPerson,
    overlayToggles,
    finalDecision,
    zones,
    isRealCameraMode,
    isSimulating,
    showDemoOverlay,
    activeCamera,
    cameraId,
    metrics,
  ]);

  return (
    <div className="relative w-full aspect-video bg-slate-950 rounded-2xl overflow-hidden group">
      {isRealCameraMode && (
        <img
          key={cameraId}
          src={mjpegUrl}
          alt="Live Camera Stream"
          onError={() => setStreamError(true)}
          onLoad={() => setStreamError(false)}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {(showDisconnectedBanner || (isRealCameraMode && streamError) || activeCamera?.status === 'OFFLINE') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 z-10 p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/100/20 text-amber-400 flex items-center justify-center text-xl">
            📷
          </div>
          <div>
            <h3 className="text-white font-bold text-sm md:text-base">Camera Not Connected</h3>
            <p className="text-xs text-text-muted max-w-md mt-1 leading-relaxed">
              No live camera feed detected. Connect an RTSP IP camera in settings or test directly with your computer webcam.
            </p>
          </div>
          <button
            onClick={() => setDeviceCameraModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500/100 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            Test Webcam Feed
          </button>
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={960}
        height={540}
        className="absolute inset-0 w-full h-full object-cover block pointer-events-none z-20"
      />
    </div>
  );
};
