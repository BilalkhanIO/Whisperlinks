import React from 'react';
import { Sparkles } from 'lucide-react';

interface SmartRepliesProps {
  replies: string[];
  onSelect: (reply: string) => void;
  onDismiss: () => void;
}

export const SmartReplies: React.FC<SmartRepliesProps> = ({ replies, onSelect, onDismiss }) => {
  if (!replies.length) return null;

  return (
    <div className="flex flex-wrap gap-2 items-center px-4 py-2 animate-in slide-in-from-bottom-2 duration-200" role="group" aria-label="Suggested replies">
      <Sparkles size={12} className="text-neon-purple/60 shrink-0" aria-hidden="true" />
      {replies.map((reply, i) => (
        <button
          key={i}
          onClick={() => onSelect(reply)}
          className="text-xs px-3 py-1.5 rounded-full bg-neon-purple/10 border border-neon-purple/25 text-neon-purple/90 hover:bg-neon-purple/20 hover:border-neon-purple/50 transition-all"
          aria-label={`Quick reply: ${reply}`}
        >
          {reply}
        </button>
      ))}
      <button
        onClick={onDismiss}
        className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors ml-1"
        aria-label="Dismiss suggestions"
      >
        ✕
      </button>
    </div>
  );
};
