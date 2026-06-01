import React from 'react';
import { ChevronDown } from 'lucide-react';

interface ScrollToBottomProps {
  unreadCount: number;
  onClick: () => void;
}

export const ScrollToBottom: React.FC<ScrollToBottomProps> = ({ unreadCount, onClick }) => (
  <button
    onClick={onClick}
    className="fixed bottom-24 right-5 z-30 flex items-center gap-1.5 bg-void-dark border border-white/15 rounded-full shadow-xl px-3 py-2 hover:border-neon-green/40 transition-all animate-in slide-in-from-bottom-2 duration-200 group"
    aria-label={`Scroll to bottom${unreadCount > 0 ? `, ${unreadCount} new messages` : ''}`}
  >
    {unreadCount > 0 && (
      <span className="bg-neon-green text-black text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
        {unreadCount > 99 ? '99+' : unreadCount}
      </span>
    )}
    <ChevronDown size={15} className="text-zinc-400 group-hover:text-neon-green transition-colors" aria-hidden="true" />
  </button>
);
