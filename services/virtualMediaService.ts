/**
 * Virtual Media Stream Service
 * Provides fallback canvas streams (animated cryptographic avatar and presentation canvas)
 * when physical cameras are not attached, or when display-capture permissions
 * are restricted inside embedded iframes.
 */

export const isIframeEmbedded = (): boolean => {
  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch {
    return true;
  }
};

export const hasVideoInputDevice = async (): Promise<boolean> => {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return false;
    }
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some(d => d.kind === 'videoinput');
  } catch {
    return false;
  }
};

export const createVirtualMediaStream = (
  username: string,
  mode: 'avatar' | 'screen' = 'avatar'
): { stream: MediaStream; cleanup: () => void } => {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');

  let animFrameId: number;
  let t = 0;

  const draw = () => {
    if (!ctx) return;
    t += 0.04;

    // Background gradient
    const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    if (mode === 'screen') {
      bgGradient.addColorStop(0, '#090d16');
      bgGradient.addColorStop(1, '#05070c');
    } else {
      bgGradient.addColorStop(0, '#0c1017');
      bgGradient.addColorStop(1, '#06080c');
    }
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle Grid pattern
    ctx.strokeStyle = mode === 'screen' ? 'rgba(59, 130, 246, 0.08)' : 'rgba(0, 255, 102, 0.08)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    if (mode === 'screen') {
      // ── Presentation / Whiteboard Fallback ──
      // Outer HUD frame
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

      // Corner brackets
      const len = 15;
      ctx.lineWidth = 4;
      // Top-left
      ctx.beginPath(); ctx.moveTo(25, 25 + len); ctx.lineTo(25, 25); ctx.lineTo(25 + len, 25); ctx.stroke();
      // Top-right
      ctx.beginPath(); ctx.moveTo(canvas.width - 25 - len, 25); ctx.lineTo(canvas.width - 25, 25); ctx.lineTo(canvas.width - 25, 25 + len); ctx.stroke();
      // Bottom-left
      ctx.beginPath(); ctx.moveTo(25, canvas.height - 25 - len); ctx.lineTo(25, canvas.height - 25); ctx.lineTo(25 + len, canvas.height - 25); ctx.stroke();
      // Bottom-right
      ctx.beginPath(); ctx.moveTo(canvas.width - 25 - len, canvas.height - 25); ctx.lineTo(canvas.width - 25, canvas.height - 25); ctx.lineTo(canvas.width - 25, canvas.height - 25 - len); ctx.stroke();

      // Screen icon
      ctx.fillStyle = '#60a5fa';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('🖥️ WHISPERLINK VIRTUAL DISPLAY', centerX, centerY - 50);

      ctx.fillStyle = '#93c5fd';
      ctx.font = '13px monospace';
      ctx.fillText(`Shared by: ${username || 'Anonymous User'}`, centerX, centerY - 20);

      // Dynamic animated data stream lines
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(80, centerY + 10, canvas.width - 160, 90);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.strokeRect(80, centerY + 10, canvas.width - 160, 90);

      // Simulated oscilloscope / telemetry line
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < canvas.width - 180; i += 6) {
        const px = 90 + i;
        const py = centerY + 55 + Math.sin(t * 3 + i * 0.05) * 20 * Math.cos(t + i * 0.02);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '11px monospace';
      ctx.fillText('Live Peer Data Channel Active • E2E Encrypted Stream', centerX, centerY + 125);
    } else {
      // ── Virtual Cryptographic Avatar ──
      // Pulsing radar rings
      const ringCount = 3;
      for (let i = 0; i < ringCount; i++) {
        const radius = 55 + ((t * 25 + i * 40) % 90);
        const alpha = Math.max(0, 1 - radius / 140) * 0.45;
        ctx.strokeStyle = `rgba(0, 255, 102, ${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(centerX, centerY - 25, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Central avatar node
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(centerX, centerY - 25, 48, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#00ff66';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Initial or avatar glyph
      ctx.fillStyle = '#00ff66';
      ctx.font = 'bold 30px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const initial = (username || 'U').trim().charAt(0).toUpperCase();
      ctx.fillText(initial, centerX, centerY - 25);

      // User Label
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#f1f5f9';
      ctx.font = 'bold 16px monospace';
      ctx.fillText(username || 'Anonymous User', centerX, centerY + 55);

      // Status badge
      ctx.fillStyle = '#00ff66';
      ctx.font = '11px monospace';
      ctx.fillText('• SECURE AVATAR STREAM •', centerX, centerY + 78);

      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.fillText('Webcam-Free Encrypted Mode Active', centerX, centerY + 96);
    }

    animFrameId = requestAnimationFrame(draw);
  };

  draw();

  const stream = canvas.captureStream(30);

  // Hook track stops to kill animation
  const cleanup = () => {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    stream.getTracks().forEach(track => {
      try {
        track.stop();
      } catch {
        // ignore
      }
    });
  };

  stream.getVideoTracks().forEach(track => {
    track.addEventListener('ended', cleanup);
  });

  return { stream, cleanup };
};
