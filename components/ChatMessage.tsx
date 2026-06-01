import React, { memo, useState } from 'react';
import { Message, SenderType } from '../types';
import { EncryptionEffect } from './EncryptionEffect';
import { ShieldCheck, Copy, Check } from 'lucide-react';
import { getInitials } from '../utils';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = memo(({ message }) => {
  const [copied, setCopied] = useState(false);
  const isUser   = message.sender === SenderType.USER;
  const isSystem = message.sender === SenderType.SYSTEM;
  const timeStr  = message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const initials = getInitials(message.username ?? (isUser ? 'ME' : 'AI'));

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

  return (
    <div
      className={`group flex w-full mb-3 ${isUser ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-200`}
      role="article"
      aria-label={`${isUser ? 'You' : (message.username ?? 'AI')} at ${timeStr}`}
    >
      <div className={`max-w-[85%] sm:max-w-[72%] flex gap-2.5 items-end ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>

        {/* Initials avatar */}
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold select-none ${
            isUser
              ? 'bg-zinc-700 border border-zinc-600 text-zinc-300'
              : 'bg-gradient-to-br from-neon-purple/25 to-void-dark border border-neon-purple/35 text-neon-purple'
          }`}
          aria-hidden="true"
        >
          {initials}
        </div>

        <div className={`flex flex-col min-w-0 gap-0.5 ${isUser ? 'items-end' : 'items-start'}`}>

          {/* Username label (AI/peer only) */}
          {!isUser && message.username && (
            <span className="text-[10px] text-zinc-500 px-1 font-mono tracking-wider uppercase truncate max-w-[120px]">
              {message.username}
            </span>
          )}

          {/* Bubble row */}
          <div className="flex items-end gap-1.5">

            {/* Copy button — left for user msg, right for AI */}
            {isUser && (
              <button
                onClick={handleCopy}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-zinc-600 hover:text-zinc-300"
                aria-label="Copy message"
                title="Copy"
              >
                {copied
                  ? <Check size={11} className="text-neon-green" />
                  : <Copy size={11} />
                }
              </button>
            )}

            {/* Bubble */}
            <div className={`
              relative px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed
              ${isUser
                ? 'bg-zinc-800 text-zinc-100 rounded-tr-sm border border-zinc-700/70'
                : 'bg-void-dark/90 border border-void-gray/70 text-zinc-200 rounded-tl-sm border-l-[2.5px] border-l-neon-purple/50'}
            `}>
              {message.isEncrypted ? (
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
              >
                {timeStr}
              </time>
            </div>

            {!isUser && (
              <button
                onClick={handleCopy}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-zinc-600 hover:text-zinc-300"
                aria-label="Copy message"
                title="Copy"
              >
                {copied
                  ? <Check size={11} className="text-neon-green" />
                  : <Copy size={11} />
                }
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
