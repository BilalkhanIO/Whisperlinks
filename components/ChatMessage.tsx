import React, { memo } from 'react';
import { Message, SenderType } from '../types';
import { EncryptionEffect } from './EncryptionEffect';
import { User, Globe, ShieldCheck, BrainCircuit } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
}

// Memoized for performance preference
export const ChatMessage: React.FC<ChatMessageProps> = memo(({ message }) => {
  const isUser = message.sender === SenderType.USER;
  const isSystem = message.sender === SenderType.SYSTEM;
  
  if (isSystem) {
    return (
      <div className="flex justify-center my-3 opacity-75 animate-in fade-in duration-300">
        <div className="bg-void-dark/80 backdrop-blur-sm border border-void-gray text-[10px] font-mono text-neon-green/80 px-3 py-1 rounded-full flex items-center gap-2">
          <ShieldCheck size={10} />
          <span className="uppercase tracking-widest">{message.text}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex w-full mb-3 ${isUser ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-200`}>
      <div className={`max-w-[85%] sm:max-w-[70%] flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border shadow-lg ${
            isUser 
            ? 'bg-zinc-800 border-zinc-700 text-zinc-400' 
            : 'bg-gradient-to-br from-neon-purple/20 to-void-dark border-neon-purple/30 text-neon-purple'
        }`}>
            {isUser ? <User size={14} /> : message.username === 'TruthBot' ? <BrainCircuit size={14} /> : <Globe size={14} />}
        </div>

        <div className={`flex flex-col min-w-0 ${isUser ? 'items-end' : 'items-start'}`}>
            {/* Username Label */}
            {!isUser && message.username && (
                <span className="text-[10px] text-zinc-500 ml-1 mb-0.5 font-mono tracking-wide uppercase truncate max-w-[150px]">
                    {message.username}
                </span>
            )}

            {/* Bubble */}
            <div className={`
              relative px-3 py-2.5 rounded-2xl text-sm leading-relaxed shadow-md
              ${isUser 
                ? 'bg-zinc-800 text-zinc-100 rounded-tr-none border border-zinc-700' 
                : 'bg-void-dark border border-void-gray text-zinc-300 rounded-tl-none'}
            `}>
              {message.isEncrypted ? (
                <div className="font-mono text-neon-green text-xs tracking-widest opacity-80">
                  <EncryptionEffect text={message.text} duration={1200} />
                </div>
              ) : (
                <span className="whitespace-pre-wrap break-words">{message.text}</span>
              )}
              
              <div className={`text-[9px] mt-1 opacity-40 flex gap-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
                <span>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
});