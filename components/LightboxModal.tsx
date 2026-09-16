import React from 'react';
import { X, Download, Copy, Check } from 'lucide-react';

interface LightboxModalProps {
  imageUrl: string | null;
  imageName?: string;
  onClose: () => void;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({ imageUrl, imageName, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  if (!imageUrl) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = imageName || `whisperlink_image_${Date.now()}.png`;
    a.click();
  };

  const handleCopy = async () => {
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy image', err);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
        {/* Top bar controls */}
        <div className="w-full flex items-center justify-between pb-3 text-zinc-300">
          <span className="font-mono text-xs truncate max-w-xs">{imageName || 'Encrypted Image'}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="p-2 bg-void-dark border border-white/10 rounded-xl hover:bg-white/10 text-zinc-300 transition-colors"
              title="Copy image"
            >
              {copied ? <Check size={16} className="text-neon-green" /> : <Copy size={16} />}
            </button>
            <button
              onClick={handleDownload}
              className="p-2 bg-void-dark border border-white/10 rounded-xl hover:bg-white/10 text-zinc-300 transition-colors"
              title="Download image"
            >
              <Download size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-void-dark border border-white/10 rounded-xl hover:bg-white/10 text-zinc-300 transition-colors"
              title="Close viewer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Image Display */}
        <div className="rounded-2xl overflow-hidden border border-white/10 bg-void-black shadow-2xl">
          <img
            src={imageUrl}
            alt={imageName || "Shared media"}
            className="max-h-[80vh] w-auto object-contain select-none"
          />
        </div>
      </div>
    </div>
  );
};
