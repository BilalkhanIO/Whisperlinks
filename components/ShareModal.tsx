import React, { useState } from 'react';
import { X, Copy, Check, Link2 } from 'lucide-react';

interface ShareModalProps {
  url: string;
  roomName: string;
  shareText: string;
  isOpen: boolean;
  onClose: () => void;
}

const PLATFORMS = [
  {
    name: 'WhatsApp',
    label: 'WhatsApp',
    emoji: '💬',
    hoverClass: 'hover:bg-green-500/10 hover:border-green-500/30 hover:text-green-400',
    getUrl: (text: string, url: string) =>
      `https://wa.me/?text=${encodeURIComponent(text + '\n\n' + url)}`,
  },
  {
    name: 'Telegram',
    label: 'Telegram',
    emoji: '✈️',
    hoverClass: 'hover:bg-sky-500/10 hover:border-sky-500/30 hover:text-sky-400',
    getUrl: (text: string, url: string) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    name: 'Twitter',
    label: 'X / Twitter',
    emoji: '𝕏',
    hoverClass: 'hover:bg-zinc-500/10 hover:border-zinc-400/30 hover:text-zinc-300',
    getUrl: (text: string, url: string) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  },
  {
    name: 'Facebook',
    label: 'Facebook',
    emoji: 'f',
    hoverClass: 'hover:bg-blue-600/10 hover:border-blue-600/30 hover:text-blue-400',
    getUrl: (_: string, url: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    name: 'Email',
    label: 'Email',
    emoji: '✉️',
    hoverClass: 'hover:bg-zinc-500/10 hover:border-zinc-400/30 hover:text-zinc-300',
    getUrl: (text: string, url: string) =>
      `mailto:?subject=${encodeURIComponent('Join me on WhisperLink')}&body=${encodeURIComponent(text + '\n\n' + url)}`,
  },
];

export const ShareModal: React.FC<ShareModalProps> = ({ url, roomName, shareText, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openPlatform = (getUrl: (text: string, url: string) => string) => {
    window.open(getUrl(shareText, url), '_blank', 'noopener,noreferrer,width=600,height=500');
  };

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Share room"
    >
      <div
        className="bg-void-dark border border-white/10 rounded-3xl p-6 flex flex-col gap-5 shadow-2xl w-full max-w-sm animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-zinc-200 text-base">Share Room</h3>
            <p className="text-[11px] text-zinc-500 font-mono mt-0.5 truncate max-w-[200px]">{roomName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-white transition-all"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Message preview */}
        <div className="bg-zinc-900/60 rounded-xl p-3 border border-white/5">
          <p className="text-[11px] text-zinc-400 leading-relaxed">{shareText}</p>
        </div>

        {/* Platform buttons */}
        <div className="grid grid-cols-5 gap-2" role="group" aria-label="Share on platform">
          {PLATFORMS.map(({ name, label, emoji, hoverClass, getUrl }) => (
            <button
              key={name}
              onClick={() => openPlatform(getUrl)}
              className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border border-white/5 text-zinc-500 transition-all ${hoverClass}`}
              aria-label={`Share on ${label}`}
              title={label}
            >
              <span className="text-base leading-none">{emoji}</span>
              <span className="text-[9px] leading-none">{name}</span>
            </button>
          ))}
        </div>

        {/* Copy link row */}
        <div className="flex gap-2 items-center">
          <div className="flex-1 min-w-0 bg-zinc-900/60 border border-white/5 rounded-xl px-3 py-2.5 flex items-center gap-2">
            <Link2 size={12} className="text-zinc-600 shrink-0" aria-hidden="true" />
            <span className="text-[11px] text-zinc-500 font-mono truncate">{url}</span>
          </div>
          <button
            onClick={handleCopy}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 bg-neon-green/10 border border-neon-green/30 rounded-xl text-neon-green text-sm font-medium hover:bg-neon-green/15 transition-all"
            aria-label={copied ? 'Copied' : 'Copy link'}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
};
