import React from 'react';
import { Monitor, ExternalLink, X, ShieldAlert, Sparkles } from 'lucide-react';

interface ScreenShareIframeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenStandalone: () => void;
}

export const ScreenShareIframeModal: React.FC<ScreenShareIframeModalProps> = ({
  isOpen,
  onClose,
  onOpenStandalone
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label="Screen Share Notice"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-void-dark border border-white/15 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Monitor size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold font-mono text-zinc-100">Screen Sharing Notice</h3>
              <span className="text-[11px] font-mono text-zinc-400">Browser Permissions Policy</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 p-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="text-xs font-mono text-zinc-300 space-y-2 bg-void-black/50 p-3.5 rounded-xl border border-white/5">
          <div className="flex items-start gap-2 text-amber-400">
            <ShieldAlert size={15} className="shrink-0 mt-0.5" />
            <span>Embedded Preview Restriction</span>
          </div>
          <p className="text-zinc-400 leading-relaxed">
            Web browsers disallow full screen capture (<code className="text-zinc-200">getDisplayMedia</code>)
            inside embedded iframe previews for sandbox protection.
          </p>
          <div className="flex items-center gap-1.5 text-neon-green pt-1">
            <Sparkles size={13} className="shrink-0" />
            <span>Virtual Encrypted Display Stream is active!</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-1 font-mono text-xs">
          <button
            type="button"
            onClick={onOpenStandalone}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-colors"
          >
            <ExternalLink size={14} />
            <span>Open in New Tab for Full Screen Share</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 transition-colors"
          >
            Continue with Virtual Stream
          </button>
        </div>
      </div>
    </div>
  );
};
