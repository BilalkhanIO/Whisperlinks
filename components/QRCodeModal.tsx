import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check } from 'lucide-react';

interface QRCodeModalProps {
  url: string;
  isOpen: boolean;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ url, isOpen, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = React.useState(false);

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
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

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
        <div className="flex justify-between items-center w-full">
          <h3 className="font-bold text-zinc-200 text-base">Scan to Join</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-white transition-all" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="p-3 bg-[#09090b] rounded-2xl border border-white/5">
          <canvas ref={canvasRef} className="block rounded-xl" aria-label="QR code" />
        </div>

        <div className="w-full">
          <p className="text-[10px] text-zinc-600 font-mono text-center break-all mb-3 leading-relaxed">{url}</p>
          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-neon-green/10 border border-neon-green/30 rounded-xl text-neon-green text-sm font-medium hover:bg-neon-green/15 transition-all"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
      </div>
    </div>
  );
};
