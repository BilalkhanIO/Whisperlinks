import React from 'react';
import { Message, SenderType } from '../types';
import { EncryptionEffect } from './EncryptionEffect';
import { User, Globe, ShieldCheck, CheckCircle, XCircle, AlertTriangle, HelpCircle } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
}

const parseFactCheckVerdict = (text: string): { verdict: string; content: string } | null => {
  const verdictMatch = text.match(/^\[(VERIFIED|FALSE|UNVERIFIED|MISLEADING)\]\s*/i);
  if (verdictMatch) {
    return {
      verdict: verdictMatch[1].toUpperCase(),
      content: text.slice(verdictMatch[0].length),
    };
  }
  return null;
};

const VERDICT_CONFIG: Record<string, { icon: React.ReactNode; bg: string; text: string; label: string }> = {
  VERIFIED: { icon: <CheckCircle size={13} />, bg: 'bg-emerald-500/15 border-emerald-500/30', text: 'text-emerald-400', label: '✅ Verified' },
  FALSE: { icon: <XCircle size={13} />, bg: 'bg-red-500/15 border-red-500/30', text: 'text-red-400', label: '❌ False' },
  UNVERIFIED: { icon: <HelpCircle size={13} />, bg: 'bg-amber-500/15 border-amber-500/30', text: 'text-amber-400', label: '⚠️ Unverified' },
  MISLEADING: { icon: <AlertTriangle size={13} />, bg: 'bg-orange-500/15 border-orange-500/30', text: 'text-orange-400', label: '⚡ Misleading' },
};

const VerdictBadge: React.FC<{ verdict: string }> = React.memo(({ verdict }) => {
  const c = VERDICT_CONFIG[verdict] || VERDICT_CONFIG.UNVERIFIED;
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${c.bg} ${c.text} mb-2`}>
      {c.icon}
      <span>{c.label}</span>
    </div>
  );
});
VerdictBadge.displayName = 'VerdictBadge';

export const ChatMessage: React.FC<ChatMessageProps> = React.memo(({ message }) => {
  const isUser = message.sender === SenderType.USER;
  const isSystem = message.sender === SenderType.SYSTEM;

  if (isSystem) {
    return (
      <div className="flex justify-center my-2.5 animate-fade-in">
        <div className="bg-void-dark/80 border border-void-gray/50 text-[10px] font-mono text-zinc-500 px-3 py-1.5 rounded-full flex items-center gap-1.5 max-w-[90%] text-center backdrop-blur-sm">
          <ShieldCheck size={10} className="text-neon-green/60 shrink-0" />
          <span className="uppercase tracking-wider truncate">{message.text}</span>
        </div>
      </div>
    );
  }

  const factCheck = !isUser ? parseFactCheckVerdict(message.text) : null;
  const displayText = factCheck ? factCheck.content : message.text;

  return (
    <div className={`flex w-full mb-2.5 animate-msg-in ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] md:max-w-[70%] flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>

        {/* Avatar */}
        {isUser ? (
          <div className="w-7 h-7 rounded-full bg-zinc-800/80 text-zinc-500 flex items-center justify-center shrink-0 border border-zinc-700/50 text-[10px] font-bold mt-0.5">
            {(message.username || 'U').charAt(0).toUpperCase()}
          </div>
        ) : (
          <div className="w-7 h-7 rounded-full bg-neon-purple/15 text-neon-purple flex items-center justify-center shrink-0 border border-neon-purple/20 mt-0.5">
            <Globe size={13} />
          </div>
        )}

        <div className="flex flex-col min-w-0">
          {/* Username */}
          {!isUser && message.username && (
            <span className="text-[9px] text-zinc-600 ml-1 mb-0.5 font-mono tracking-wide uppercase">
              {message.username}
            </span>
          )}

          {/* Bubble */}
          <div className={`
            relative px-3.5 py-2.5 text-[13px] leading-relaxed backdrop-blur-sm
            ${isUser
              ? 'bg-zinc-800/90 text-zinc-100 rounded-2xl rounded-tr-md border border-zinc-700/50'
              : factCheck
                ? 'bg-void-dark/90 border border-amber-500/25 text-zinc-300 rounded-2xl rounded-tl-md shadow-[0_0_20px_rgba(251,191,36,0.05)]'
                : 'bg-void-dark/90 border border-void-gray/50 text-zinc-300 rounded-2xl rounded-tl-md'}
          `}>
            {factCheck && <VerdictBadge verdict={factCheck.verdict} />}

            {message.isEncrypted && !message.isStreaming ? (
              <div className="font-mono text-neon-green text-xs tracking-widest opacity-80">
                <EncryptionEffect text={displayText} duration={800} />
              </div>
            ) : (
              <span className="whitespace-pre-wrap break-words">{displayText}</span>
            )}

            {/* Streaming cursor */}
            {message.isStreaming && (
              <span className="inline-block w-0.5 h-4 bg-neon-green ml-0.5 animate-blink align-text-bottom" />
            )}

            <div className={`text-[9px] mt-1 opacity-30 ${isUser ? 'text-right' : 'text-left'}`}>
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

ChatMessage.displayName = 'ChatMessage';