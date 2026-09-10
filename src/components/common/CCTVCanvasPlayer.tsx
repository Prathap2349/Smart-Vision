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

      // Demo mode only: plain dark background (no synthetic corridor)
      if (!isRealCameraMode) {
        ctx.fillStyle = '#070a12';
        ctx.fillRect(0, 0, width, height);
      }

      // Virtual detection zones overlay
      if (overlayToggles.zones) {
        zones.forEach(zone => {
          if (!zone.enabled) return;
          ctx.fillStyle = `${zone.color}15`;
          ctx.strokeStyle = zone.color;
          ctx.lineWidth = 1.5;
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
            ctx.font = '600 10px JetBrains Mono, monospace';
            ctx.fillText(`[ZONE] ${zone.name.toUpperCase()} (DWELL > ${zone.dwellThreshold}s)`, labelX, labelY);
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
          const strokeColor = isThreat ? '#ef4444' : isSafe ? '#10b981' : '#00f0ff';

          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = isThreat ? 2.5 : 1.8;
          ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

          if (overlayToggles.faceRecognition) {
            ctx.strokeStyle = simulatedPerson.faceStatus === 'UNKNOWN' ? '#ef4444' : '#10b981';
            ctx.setLineDash([3, 3]);
            ctx.strokeRect(px - 18, py - 78, 36, 36);
            ctx.setLineDash([]);
            ctx.fillStyle = simulatedPerson.faceStatus === 'UNKNOWN' ? '#ef4444' : '#10b981';
            ctx.font = 'bold 9px JetBrains Mono';
            const faceLabel =
              simulatedPerson.faceStatus === 'UNKNOWN'
                ? 'FACE: UNKNOWN'
                : `FACE: ${simulatedPerson.residentName?.toUpperCase() ?? 'RESIDENT'}`;
            ctx.fillText(faceLabel, px - 30, py - 82);
          }

          if (overlayToggles.aiLabels || overlayToggles.trackIds) {
            ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
            ctx.fillRect(boxX, boxY - 32, boxWidth + 40, 30);
            ctx.strokeStyle = strokeColor;
            ctx.strokeRect(boxX, boxY - 32, boxWidth + 40, 30);
            ctx.fillStyle = '#ffffff';
            ctx.font = '600 10px JetBrains Mono, monospace';
            ctx.fillText(`PERSON ${simulatedPerson.trackId}`, boxX + 6, boxY - 18);
            ctx.fillStyle = strokeColor;
            ctx.font = '500 9px JetBrains Mono, monospace';
            ctx.fillText(
              `DWELL: ${simulatedPerson.dwellSeconds}s | CONF: ${Math.round(simulatedPerson.confidence * 100)}%`,
              boxX + 6,
              boxY - 6
            );
          }
        }
      }

      // HUD overlay
      ctx.fillStyle = 'rgba(7, 10, 18, 0.85)';
      ctx.fillRect(0, 0, width, 36);

      const camLabel = activeCamera?.name ?? cameraId.toUpperCase();
      ctx.fillStyle = '#00f0ff';
      ctx.font = '700 11px Inter, sans-serif';
      ctx.fillText(`${cameraId.toUpperCase()} • ${camLabel.toUpperCase()}`, 12, 22);

      const fps = activeCamera?.fps ?? metrics.fps ?? 0;
      const resolution = activeCamera?.resolution ?? '—';
      const rtspStatus = metrics.rtspStatus ?? 'DISCONNECTED';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText(`${resolution} @ ${fps} FPS | RTSP | ${rtspStatus}`, 240, 22);

      if (isRealCameraMode) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(width - 130, 20, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '600 10px JetBrains Mono';
        ctx.fillText('REC', width - 120, 23);
      }

      const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 10px JetBrains Mono';
      ctx.fillText(timestamp, width - 85, 23);

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
    <div className="relative w-full aspect-video bg-[#070a12] rounded-xl overflow-hidden border border-slate-800 shadow-2xl group">
      {isRealCameraMode && (
        <img
          key={cameraId}
          src={mjpegUrl}
          alt="Live Edge Camera Stream"
          onError={() => setStreamError(true)}
          onLoad={() => setStreamError(false)}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {(showDisconnectedBanner || (isRealCameraMode && streamError) || activeCamera?.status === 'OFFLINE') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#060a14]/92 z-10 p-6 text-center space-y-2">
          <p className="text-rose-500 font-mono font-bold text-sm md:text-base tracking-wide">
            [ NO CAMERA SIGNAL — RTSP STREAM DISCONNECTED ]
          </p>
          <p className="text-xs text-amber-400 max-w-lg font-mono bg-amber-950/50 p-2.5 rounded-lg border border-amber-500/40 shadow-lg">
            ⚠️ No live camera detected — connect an RTSP stream or webcam via the .env configuration to activate detection.
          </p>
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
