import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, Share2, Download } from 'lucide-react';

interface QRCodeModalProps {
  url: string;
  roomName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ url, roomName, isOpen, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && canvasRef.current && url) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 200,
        margin: 2,
        color: { dark: '#22c55e', light: '#09090b' },
      });
    }
  }, [isOpen, url]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const canvas = canvasRef.current;
    const shareText = `🤫 Join "${roomName}" on WhisperLink — private P2P encrypted chat, zero logs.`;

    if (navigator.share) {
      // Try sharing QR image + URL
      if (canvas && typeof navigator.canShare === 'function') {
        const blob = await new Promise<Blob | null>(resolve =>
          canvas.toBlob(resolve, 'image/png')
        );
        if (blob) {
          const file = new File([blob], 'whisperlink-invite.png', { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({ files: [file], title: `Join ${roomName}`, text: shareText });
              return;
            } catch { /* fall through to URL share */ }
          }
        }
      }
      // URL-only share fallback
      try {
        await navigator.share({ title: `Join ${roomName} on WhisperLink`, text: shareText, url });
      } catch { /* user cancelled */ }
    } else {
      // Desktop: download QR as PNG
      if (canvas) {
        const link = document.createElement('a');
        link.download = `whisperlink-${roomName.replace(/\s+/g, '-').toLowerCase()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    }
  };

  if (!isOpen) return null;

  const canNativeShare = typeof navigator.share === 'function';

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="QR code invite"
    >
      <div
        className="bg-void-dark border border-white/10 rounded-3xl p-7 flex flex-col items-center gap-5 shadow-2xl max-w-xs w-full animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center w-full">
          <div>
            <h3 className="font-bold text-zinc-200 text-base">Scan to Join</h3>
            <p className="text-[11px] text-zinc-500 font-mono mt-0.5 truncate max-w-[160px]">{roomName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-white transition-all"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* QR canvas */}
        <div className="p-3 bg-[#09090b] rounded-2xl border border-white/5">
          <canvas ref={canvasRef} className="block rounded-xl" aria-label="QR code for room invite" />
        </div>

        {/* URL */}
        <p className="text-[10px] text-zinc-600 font-mono text-center break-all leading-relaxed w-full">{url}</p>

        {/* Actions */}
        <div className="flex gap-2.5 w-full">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-neon-green/10 border border-neon-green/30 rounded-xl text-neon-green text-sm font-medium hover:bg-neon-green/15 transition-all"
            aria-label={copied ? 'Copied' : 'Copy link'}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-zinc-300 text-sm font-medium hover:bg-white/[0.08] hover:border-white/20 transition-all"
            aria-label={canNativeShare ? 'Share QR code' : 'Download QR code'}
            title={canNativeShare ? 'Share' : 'Download QR'}
          >
            {canNativeShare ? <Share2 size={14} /> : <Download size={14} />}
            {canNativeShare ? 'Share' : 'Save QR'}
          </button>
        </div>
      </div>
    </div>
  );
};
