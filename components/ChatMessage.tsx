import React, { memo, useState, useEffect } from 'react';
import { Message, SenderType } from '../types';
import { EncryptionEffect } from './EncryptionEffect';
import { ShieldCheck, Copy, Check, CornerUpLeft, Ghost } from 'lucide-react';
import { getInitials } from '../utils';

const REACTION_EMOJIS = ['👍', '😂', '🔥', '❤️', '😮'];

interface ChatMessageProps {
  message: Message;
  currentUsername: string;
  onReact: (messageId: string, emoji: string) => void;
  onReply: (message: Message) => void;
  onExpire: (messageId: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = memo(({
  message, currentUsername, onReact, onReply, onExpire
}) => {
  const [copied, setCopied] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const isUser   = message.sender === SenderType.USER;
  const isSystem = message.sender === SenderType.SYSTEM;
  const timeStr  = message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const initials = getInitials(message.username ?? (isUser ? 'ME' : 'AI'));

  // Whisper countdown
  useEffect(() => {
    if (!message.expiresAt) return;
    const tick = () => {
      const remaining = Math.ceil((message.expiresAt! - Date.now()) / 1000);
      if (remaining <= 0) { onExpire(message.id); return; }
      setCountdown(remaining);
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [message.expiresAt, message.id, onExpire]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalReactions = Object.values(message.reactions ?? {}).reduce((s, a) => s + a.length, 0);

  if (isSystem) {
    return (
      <div className="flex justify-center my-4 animate-in fade-in duration-300" role="status">
        <div className="bg-void-dark/70 backdrop-blur-sm border border-void-gray/60 text-[10px] font-mono text-neon-green/70 px-4 py-1.5 rounded-full flex items-center gap-2">
          <ShieldCheck size={9} aria-hidden="true" />
          <span className="uppercase tracking-widest">{message.text}</span>
        </div>
      </div>
    );
  }

  const isWhisper = !!message.expiresAt;

  return (
    <div
      className={`group flex w-full mb-3 ${isUser ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-200`}
      role="article"
      aria-label={`${isUser ? 'You' : (message.username ?? 'AI')} at ${timeStr}`}
    >
      <div className={`max-w-[85%] sm:max-w-[72%] flex gap-2.5 items-end ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>

        {/* Avatar */}
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold select-none ${
            isUser
              ? 'bg-zinc-700 border border-zinc-600 text-zinc-300'
              : 'bg-gradient-to-br from-neon-purple/25 to-void-dark border border-neon-purple/35 text-neon-purple'
          }`}
          aria-hidden="true"
        >{initials}</div>

        <div className={`flex flex-col min-w-0 gap-1 ${isUser ? 'items-end' : 'items-start'}`}>

          {/* Username */}
          {!isUser && message.username && (
            <span className="text-[10px] text-zinc-500 px-1 font-mono tracking-wider uppercase truncate max-w-[120px]">
              {message.username}
            </span>
          )}

          {/* Reply quote */}
          {message.replyTo && (
            <div className={`flex items-start gap-1.5 max-w-full px-2.5 py-1.5 rounded-lg border-l-2 border-neon-purple/40 bg-neon-purple/5 ${isUser ? 'items-end' : ''}`}>
              <CornerUpLeft size={10} className="text-neon-purple/50 mt-0.5 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                {message.replyTo.username && (
                  <p className="text-[9px] text-neon-purple/70 font-mono uppercase tracking-wide truncate">{message.replyTo.username}</p>
                )}
                <p className="text-[11px] text-zinc-500 truncate max-w-[180px]">{message.replyTo.text}</p>
              </div>
            </div>
          )}

          {/* Bubble row */}
          <div className="flex items-end gap-1.5">

            {/* Action buttons — shown on hover */}
            {isUser && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                <button onClick={() => onReply(message)} className="p-1 rounded text-zinc-600 hover:text-zinc-300 transition-colors" aria-label="Reply" title="Reply">
                  <CornerUpLeft size={11} />
                </button>
                <button onClick={() => setShowReactions(r => !r)} className="p-1 rounded text-zinc-600 hover:text-zinc-300 transition-colors" aria-label="React" title="React">
                  <span className="text-[11px]">+</span>
                </button>
                <button onClick={handleCopy} className="p-1 rounded text-zinc-600 hover:text-zinc-300 transition-colors" aria-label="Copy" title="Copy">
                  {copied ? <Check size={11} className="text-neon-green" /> : <Copy size={11} />}
                </button>
              </div>
            )}

            {/* Main bubble */}
            <div className={`
              relative px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed
              ${isWhisper ? 'border-dashed opacity-90' : ''}
              ${isUser
                ? 'bg-zinc-800 text-zinc-100 rounded-tr-sm border border-zinc-700/70'
                : 'bg-void-dark/90 border border-void-gray/70 text-zinc-200 rounded-tl-sm border-l-[2.5px] border-l-neon-purple/50'}
            `}>
              {/* Whisper badge */}
              {isWhisper && (
                <div className={`flex items-center gap-1 mb-1.5 text-[9px] font-mono ${countdown && countdown <= 5 ? 'text-red-400' : 'text-zinc-500'}`}>
                  <Ghost size={9} aria-hidden="true" />
                  <span>WHISPER · {countdown}s</span>
                </div>
              )}

              {/* Message content */}
              {message.isStreaming ? (
                <span className="whitespace-pre-wrap break-words">
                  {message.text}
                  <span className="inline-block w-0.5 h-3.5 bg-neon-green/80 ml-0.5 animate-[blink_1s_step-end_infinite] align-middle" aria-hidden="true" />
                </span>
              ) : message.isEncrypted ? (
                <div className="font-mono text-neon-green/90 text-xs tracking-wider" aria-label={message.text}>
                  <EncryptionEffect text={message.text} duration={1200} />
                </div>
              ) : (
                <span className="whitespace-pre-wrap break-words">{message.text}</span>
              )}

              <time
                dateTime={message.timestamp.toISOString()}
                className={`block text-[9px] mt-1.5 opacity-30 ${isUser ? 'text-right' : 'text-left'}`}
                aria-hidden="true"
              >{timeStr}</time>
            </div>

            {/* AI side action buttons */}
            {!isUser && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                <button onClick={() => onReply(message)} className="p-1 rounded text-zinc-600 hover:text-zinc-300 transition-colors" aria-label="Reply" title="Reply">
                  <CornerUpLeft size={11} />
                </button>
                <button onClick={() => setShowReactions(r => !r)} className="p-1 rounded text-zinc-600 hover:text-zinc-300 transition-colors" aria-label="React" title="React">
                  <span className="text-[11px]">+</span>
                </button>
                <button onClick={handleCopy} className="p-1 rounded text-zinc-600 hover:text-zinc-300 transition-colors" aria-label="Copy" title="Copy">
                  {copied ? <Check size={11} className="text-neon-green" /> : <Copy size={11} />}
                </button>
              </div>
            )}
          </div>

          {/* Reaction picker */}
          {showReactions && (
            <div className={`flex gap-1 bg-void-dark border border-white/10 rounded-full px-2 py-1 shadow-xl ${isUser ? 'mr-1' : 'ml-1'}`} role="group" aria-label="Choose reaction">
              {REACTION_EMOJIS.map(emoji => {
                const reactors = message.reactions?.[emoji] ?? [];
                const hasReacted = reactors.includes(currentUsername);
                return (
                  <button
                    key={emoji}
                    onClick={() => { onReact(message.id, emoji); setShowReactions(false); }}
                    className={`text-base hover:scale-125 transition-transform p-0.5 rounded-full ${hasReacted ? 'bg-neon-green/20' : ''}`}
                    aria-label={`React with ${emoji}${hasReacted ? ' (remove)' : ''}`}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          )}

          {/* Existing reactions display */}
          {totalReactions > 0 && (
            <div className={`flex flex-wrap gap-1 ${isUser ? 'justify-end' : 'justify-start'}`} role="group" aria-label="Reactions">
              {Object.entries(message.reactions ?? {}).filter(([, users]) => users.length > 0).map(([emoji, users]) => (
                <button
                  key={emoji}
                  onClick={() => onReact(message.id, emoji)}
                  className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border transition-all ${
                    users.includes(currentUsername)
                      ? 'bg-neon-green/15 border-neon-green/40 text-neon-green'
                      : 'bg-void-dark border-white/10 text-zinc-400 hover:border-white/20'
                  }`}
                  aria-label={`${emoji} reaction by ${users.join(', ')}`}
                >
                  <span>{emoji}</span>
                  <span className="font-mono">{users.length}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
