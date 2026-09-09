import React, { useRef, useEffect } from 'react';
import { useSecurity } from '../../context/SecurityContext';

export const CCTVCanvasPlayer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { simulatedPerson, overlayToggles, finalDecision, zones } = useSecurity();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      // 1. Draw Simulated Corridor Environment
      // Background gradient (Dark corridor with ambient night lighting)
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#0a0f1d');
      bgGrad.addColorStop(0.5, '#121a2e');
      bgGrad.addColorStop(1, '#080c17');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Draw corridor perspective walls & ceiling
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.lineWidth = 1.5;

      // Vanishing point perspective lines
      ctx.beginPath();
      // Left wall line
      ctx.moveTo(0, height * 0.1);
      ctx.lineTo(width * 0.35, height * 0.4);
      ctx.moveTo(0, height * 0.9);
      ctx.lineTo(width * 0.35, height * 0.7);

      // Right wall line
      ctx.moveTo(width, height * 0.1);
      ctx.lineTo(width * 0.65, height * 0.4);
      ctx.moveTo(width, height * 0.9);
      ctx.lineTo(width * 0.65, height * 0.7);

      // Back wall box
      ctx.strokeRect(width * 0.35, height * 0.4, width * 0.3, height * 0.3);
      ctx.stroke();

      // Draw door frame at back of corridor
      ctx.fillStyle = '#060a14';
      ctx.fillRect(width * 0.42, height * 0.45, width * 0.16, height * 0.25);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
      ctx.strokeRect(width * 0.42, height * 0.45, width * 0.16, height * 0.25);

      // Floor grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      for (let i = 1; i <= 6; i++) {
        const y = height * (0.7 + i * 0.04);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Ceiling lights glow
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      ctx.arc(width * 0.5, height * 0.15, 12, 0, Math.PI * 2);
      ctx.fill();

      // 2. Draw Virtual Detection Zones if toggled ON
      if (overlayToggles.zones) {
        zones.forEach(zone => {
          if (!zone.enabled) return;
          ctx.fillStyle = `${zone.color}15`; // semi transparent fill
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
          ctx.setLineDash([]); // reset dash

          // Draw Zone Label
          if (zone.polygonPoints.length > 0) {
            const labelX = (zone.polygonPoints[0].x / 100) * width + 8;
            const labelY = (zone.polygonPoints[0].y / 100) * height + 18;
            ctx.fillStyle = zone.color;
            ctx.font = '600 10px JetBrains Mono, monospace';
            ctx.fillText(`[ZONE] ${zone.name.toUpperCase()} (DWELL > ${zone.dwellThreshold}s)`, labelX, labelY);
          }
        });
      }

      // 3. Draw Tracked Human Subject if active
      if (simulatedPerson.active) {
        const px = (simulatedPerson.x / 100) * width;
        const py = (simulatedPerson.y / 100) * height;

        // Draw human silhouette figure
        ctx.fillStyle = simulatedPerson.faceStatus === 'UNKNOWN' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)';
        // Head
        ctx.beginPath();
        ctx.arc(px, py - 60, 14, 0, Math.PI * 2);
        ctx.fill();
        // Body torso
        ctx.fillRect(px - 16, py - 44, 32, 45);
        // Legs
        ctx.fillRect(px - 14, py + 1, 12, 35);
        ctx.fillRect(px + 2, py + 1, 12, 35);

        // Bounding Box
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

          // Draw corner target accents
          const cornerLen = 12;
          ctx.lineWidth = 3;
          // Top-left
          ctx.beginPath();
          ctx.moveTo(boxX, boxY + cornerLen);
          ctx.lineTo(boxX, boxY);
          ctx.lineTo(boxX + cornerLen, boxY);
          ctx.stroke();
          // Top-right
          ctx.beginPath();
          ctx.moveTo(boxX + boxWidth - cornerLen, boxY);
          ctx.lineTo(boxX + boxWidth, boxY);
          ctx.lineTo(boxX + boxWidth, boxY + cornerLen);
          ctx.stroke();
          // Bottom-left
          ctx.beginPath();
          ctx.moveTo(boxX, boxY + boxHeight - cornerLen);
          ctx.lineTo(boxX, boxY + boxHeight);
          ctx.lineTo(boxX + cornerLen, boxY + boxHeight);
          ctx.stroke();
          // Bottom-right
          ctx.beginPath();
          ctx.moveTo(boxX + boxWidth - cornerLen, boxY + boxHeight);
          ctx.lineTo(boxX + boxWidth, boxY + boxHeight);
          ctx.lineTo(boxX + boxWidth, boxY + boxHeight - cornerLen);
          ctx.stroke();

          // Face recognition box around head
          if (overlayToggles.faceRecognition) {
            ctx.strokeStyle = simulatedPerson.faceStatus === 'UNKNOWN' ? '#ef4444' : '#10b981';
            ctx.setLineDash([3, 3]);
            ctx.strokeRect(px - 18, py - 78, 36, 36);
            ctx.setLineDash([]);

            ctx.fillStyle = simulatedPerson.faceStatus === 'UNKNOWN' ? '#ef4444' : '#10b981';
            ctx.font = 'bold 9px JetBrains Mono';
            ctx.fillText(
              simulatedPerson.faceStatus === 'UNKNOWN' ? 'FACE: UNKNOWN' : 'FACE: ARUN KUMAR',
              px - 30,
              py - 82
            );
          }

          // Labels & Metadata Tags
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

      // 4. CCTV Top/Bottom HUD Overlay
      // Top bar gradient
      ctx.fillStyle = 'rgba(7, 10, 18, 0.85)';
      ctx.fillRect(0, 0, width, 36);

      // Camera title
      ctx.fillStyle = '#00f0ff';
      ctx.font = '700 11px Inter, sans-serif';
      ctx.fillText('CAM-01 • RESIDENTIAL CORRIDOR', 12, 22);

      // Stream Metadata
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText('1920x1080 @ 10.2 FPS | RTSP H.264 | EDGE AI: ONLINE', 240, 22);

      // REC indicator dot
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(width - 130, 20, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 10px JetBrains Mono';
      ctx.fillText('REC', width - 120, 23);

      // Live Timestamp
      const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
      ctx.fillText(timestamp, width - 85, 23);

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [simulatedPerson, overlayToggles, finalDecision, zones]);

  return (
    <div className="relative w-full aspect-video bg-[#070a12] rounded-xl overflow-hidden border border-slate-800 shadow-2xl group">
      <canvas
        ref={canvasRef}
        width={960}
        height={540}
        className="w-full h-full object-cover block"
      />
    </div>
  );
};
