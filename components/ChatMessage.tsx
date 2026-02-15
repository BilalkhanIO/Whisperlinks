import React from 'react';
import { Message, SenderType } from '../types';
import { EncryptionEffect } from './EncryptionEffect';
import { User, Globe, ShieldCheck, Bot } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.sender === SenderType.USER;
  const isSystem = message.sender === SenderType.SYSTEM;
  const isStranger = message.sender === SenderType.STRANGER;

  if (isSystem) {
    return (
      <div className="flex justify-center my-4 opacity-75">
        <div className="bg-void-dark border border-void-gray text-xs font-mono text-neon-green/80 px-3 py-1 rounded-full flex items-center gap-2 shadow-[0_0_10px_rgba(34,197,94,0.1)]">
          <ShieldCheck size={12} />
          <span className="uppercase tracking-wider">{message.text}</span>
        </div>
      </div>
    );
  }

  // Determine Avatar
  const renderAvatar = () => {
    if (isUser) return <div className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center shrink-0 border border-zinc-700"><User size={16} /></div>;
    // Distinguish AI from Human Peers visually if possible, though 'STRANGER' covers both in types currently.
    // In this app logic, STRANGER is usually AI in AI mode, or Human in P2P. 
    // We can check if username is "Lala" or "Ghamgeen" or "AI" roughly, but let's keep it generic "Globe" for peer/AI mystery.
    return <div className="w-8 h-8 rounded-full bg-neon-purple/20 text-neon-purple flex items-center justify-center shrink-0 border border-neon-purple/30"><Globe size={16} /></div>;
  };

  return (
    <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] md:max-w-[70%] flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {renderAvatar()}

        <div className="flex flex-col min-w-0">
            {/* Username Label */}
            {!isUser && message.username && (
                <span className="text-[10px] text-zinc-500 ml-1 mb-1 font-mono tracking-wide uppercase">
                    {message.username}
                </span>
            )}

            {/* Bubble */}
            <div className={`
              relative px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-lg backdrop-blur-sm
              ${isUser 
                ? 'bg-zinc-800 text-zinc-100 rounded-tr-none border border-zinc-700' 
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
    </div>
  );
};