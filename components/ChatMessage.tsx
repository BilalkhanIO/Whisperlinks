import React from 'react';
import { Message, SenderType } from '../types';
import { EncryptionEffect } from './EncryptionEffect';
import { User, Globe, ShieldCheck } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.sender === SenderType.USER;
  const isSystem = message.sender === SenderType.SYSTEM;

  if (isSystem) {
    return (
      <div className="flex justify-center my-4 opacity-75">
        <div className="bg-void-dark border border-void-gray text-xs font-mono text-neon-green/80 px-3 py-1 rounded-full flex items-center gap-2">
          <ShieldCheck size={12} />
          <span className="uppercase tracking-wider">{message.text}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] md:max-w-[70%] flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-zinc-800 text-zinc-400' : 'bg-neon-purple/20 text-neon-purple'}`}>
          {isUser ? <User size={16} /> : <Globe size={16} />}
        </div>

        {/* Bubble */}
        <div className={`
          relative px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-lg
          ${isUser 
            ? 'bg-zinc-800 text-zinc-100 rounded-tr-none' 
            : 'bg-void-dark border border-void-gray text-zinc-300 rounded-tl-none'}
        `}>
          {message.isEncrypted ? (
            <div className="font-mono text-neon-green text-xs tracking-widest opacity-80">
              <EncryptionEffect text={message.text} duration={1500} />
            </div>
          ) : (
            <span className="whitespace-pre-wrap">{message.text}</span>
          )}
          
          <div className={`text-[10px] mt-1 opacity-40 flex gap-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <span>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </div>
    </div>
  );
};