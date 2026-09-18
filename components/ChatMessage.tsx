import React, { memo, useState, useEffect, useRef, useMemo } from 'react';
import { Message, SenderType } from '../types';
import { EncryptionEffect } from './EncryptionEffect';
import {
  ShieldCheck, Copy, Check, CheckCheck, CornerUpLeft, Ghost,
  Play, Pause, Download, FileText, BarChart2, CheckCircle2,  Languages
} from 'lucide-react';
import { getInitials } from '../utils';

const REACTION_EMOJIS = ['👍', '😂', '🔥', '❤️', '😮'];

interface ChatMessageProps {
  message: Message;
  currentUsername: string;
  onReact: (messageId: string, emoji: string) => void;
  onReply: (message: Message) => void;
  onExpire: (messageId: string) => void;
  onOpenImage?: (imageUrl: string, imageName?: string) => void;
  onVotePoll?: (messageId: string, optionIndex: number) => void;
  onTranslateMessage?: (messageId: string, text: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = memo(({
  message,
  currentUsername,
  onReact,
  onReply,
  onExpire,
  onOpenImage,
  onVotePoll,
  onTranslateMessage
}) => {
  const [copied, setCopied] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Audio player state for voice messages
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isUser   = message.sender === SenderType.USER;
  const isSystem = message.sender === SenderType.SYSTEM;
  const dateObj = useMemo(() => {
    try {
      const d = message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp);
      return isNaN(d.getTime()) ? new Date() : d;
    } catch {
      return new Date();
    }
  }, [message.timestamp]);
  const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

  // Handle audio playback
  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.playbackRate = playbackRate;
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlayingAudio(true))
          .catch(err => {
            console.warn('Audio play interrupted or not allowed:', err);
            setIsPlayingAudio(false);
          });
      } else {
        setIsPlayingAudio(true);
      }
    }
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 1.5, 2];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message.text || '');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (e) {
      console.warn('Clipboard write failed:', e);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || isNaN(bytes) || bytes < 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatAudioTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
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
      <div className={`max-w-[88%] sm:max-w-[76%] flex gap-2.5 items-end ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>

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
            <span className="text-[10px] text-zinc-500 px-1 font-mono tracking-wider uppercase truncate max-w-[140px]">
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
                {onTranslateMessage && (
                  <button onClick={() => onTranslateMessage(message.id, message.text)} className="p-1 rounded text-zinc-600 hover:text-cyan-400 transition-colors" aria-label="Translate" title="Translate message">
                    <Languages size={11} />
                  </button>
                )}
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
              relative px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed max-w-full overflow-hidden
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

              {/* 1. Voice Message Card */}
              {message.type === 'voice' && message.voiceData ? (
                <div className="min-w-[210px] sm:min-w-[250px] py-1">
                  <audio
                    ref={audioRef}
                    src={message.voiceData.dataUrl}
                    onEnded={() => { setIsPlayingAudio(false); setAudioProgress(0); }}
                    onTimeUpdate={() => {
                      if (audioRef.current) {
                        setAudioProgress((audioRef.current.currentTime / audioRef.current.duration) * 100 || 0);
                      }
                    }}
                    className="hidden"
                  />

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={togglePlayAudio}
                      className="w-8 h-8 rounded-full bg-neon-purple/20 text-neon-purple hover:bg-neon-purple/30 flex items-center justify-center transition-colors shrink-0"
                    >
                      {isPlayingAudio ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mb-1">
                        <div
                          className="bg-neon-purple h-full transition-all"
                          style={{ width: `${audioProgress}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                        <span>
                          {audioRef.current?.currentTime ? formatAudioTime(audioRef.current.currentTime) : '0:00'}
                        </span>
                        <span>{formatAudioTime(message.voiceData.duration)}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={cyclePlaybackRate}
                      className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-white/5 hover:bg-white/10 text-zinc-400 transition-colors"
                      title="Playback speed"
                    >
                      {playbackRate}x
                    </button>
                  </div>
                </div>
              ) : message.type === 'image' && message.fileData ? (
                /* 2. Image Message */
                <div className="space-y-1.5">
                  <div
                    onClick={() => onOpenImage && onOpenImage(message.fileData!.dataUrl, message.fileData!.name)}
                    className="cursor-pointer rounded-xl overflow-hidden border border-white/10 max-h-64 group/img relative"
                  >
                    <img
                      src={message.fileData.dataUrl}
                      alt={message.fileData.name}
                      className="w-full h-auto object-cover max-h-64 transition-transform group-hover/img:scale-102"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-[10px] font-mono text-white bg-black/60 px-2 py-1 rounded-md">
                        Click to view
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 px-0.5">
                    <span className="truncate max-w-[180px]">{message.fileData.name}</span>
                    <span>{formatFileSize(message.fileData.size)}</span>
                  </div>
                  {message.fileData.sha256 && (
                    <div className="flex items-center gap-1 text-[9px] font-mono text-emerald-400/90 px-0.5">
                      <ShieldCheck size={10} className="text-emerald-400 shrink-0" />
                      <span className="truncate" title={`SHA-256 Digest: ${message.fileData.sha256}`}>
                        SHA-256: {message.fileData.sha256.slice(0, 12)}...{message.fileData.sha256.slice(-6)} ✓
                      </span>
                    </div>
                  )}
                </div>
              ) : message.type === 'file' && message.fileData ? (
                /* 3. Document / File Card */
                <div className="space-y-1">
                  <div className="flex items-center gap-3 p-2 rounded-xl bg-void-black/40 border border-white/10 min-w-[200px]">
                    <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400">
                      <FileText size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono font-medium text-zinc-200 truncate">{message.fileData.name}</p>
                      <p className="text-[10px] font-mono text-zinc-500">{formatFileSize(message.fileData.size)}</p>
                    </div>
                    <a
                      href={message.fileData.dataUrl}
                      download={message.fileData.name}
                      className="p-2 text-zinc-400 hover:text-neon-green hover:bg-white/5 rounded-lg transition-colors"
                      title="Download file"
                    >
                      <Download size={15} />
                    </a>
                  </div>
                  {message.fileData.sha256 && (
                    <div className="flex items-center gap-1 text-[9px] font-mono text-emerald-400/90 px-1">
                      <ShieldCheck size={10} className="text-emerald-400 shrink-0" />
                      <span className="truncate" title={`SHA-256 Digest: ${message.fileData.sha256}`}>
                        SHA-256: {message.fileData.sha256.slice(0, 12)}...{message.fileData.sha256.slice(-6)} ✓
                      </span>
                    </div>
                  )}
                </div>
              ) : message.type === 'poll' && message.pollData ? (
                /* 4. Interactive Poll */
                <div className="space-y-2.5 min-w-[220px] sm:min-w-[280px]">
                  <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold pb-1 border-b border-white/5">
                    <BarChart2 size={15} />
                    <span>{message.pollData.question}</span>
                  </div>

                  <div className="space-y-1.5">
                    {message.pollData.options.map((opt, idx) => {
                      const hasVoted = opt.votes.includes(currentUsername);
                      const totalVotes = message.pollData!.options.reduce((s, o) => s + o.votes.length, 0);
                      const pct = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => onVotePoll && onVotePoll(message.id, idx)}
                          className={`w-full text-left p-2 rounded-xl border relative overflow-hidden transition-all ${
                            hasVoted
                              ? 'border-amber-500/50 bg-amber-500/10'
                              : 'border-white/5 bg-void-black/40 hover:border-white/15'
                          }`}
                        >
                          {/* Progress fill bar */}
                          <div
                            className="absolute left-0 top-0 bottom-0 bg-amber-500/15 pointer-events-none transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />

                          <div className="relative flex items-center justify-between text-xs z-10">
                            <div className="flex items-center gap-1.5 min-w-0 pr-2">
                              {hasVoted && <CheckCircle2 size={13} className="text-amber-400 shrink-0" />}
                              <span className={`font-medium truncate ${hasVoted ? 'text-amber-200' : 'text-zinc-200'}`}>
                                {opt.text}
                              </span>
                            </div>
                            <span className="font-mono text-[10px] text-zinc-400 shrink-0">
                              {opt.votes.length} ({pct}%)
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="text-[10px] font-mono text-zinc-500 text-right">
                    {message.pollData.options.reduce((s, o) => s + o.votes.length, 0)} total votes
                  </div>
                </div>
              ) : (
                /* 5. Standard Text Message */
                <>
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

                  {message.translatedText && (
                    <div className="mt-2 pt-1.5 border-t border-white/10 text-xs text-cyan-200">
                      <div className="flex items-center gap-1 text-[9px] font-mono text-cyan-400 mb-0.5">
                        <Languages size={10} />
                        <span>TRANSLATION ({message.translatedLang || 'AUTO'})</span>
                      </div>
                      <p className="italic font-sans">{message.translatedText}</p>
                    </div>
                  )}
                </>
              )}

              {/* Status and timestamp */}
              <div className={`flex items-center gap-1 mt-1.5 opacity-35 ${isUser ? 'justify-end' : 'justify-start'}`}>
                <time
                  dateTime={dateObj.toISOString()}
                  className="block text-[9px]"
                  aria-hidden="true"
                >{timeStr}</time>
                {isUser && message.status === 'sent' && <Check size={10} />}
                {isUser && message.status === 'delivered' && <CheckCheck size={10} className="text-neon-green" />}
              </div>
            </div>

            {/* AI / Peer side action buttons */}
            {!isUser && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                <button onClick={() => onReply(message)} className="p-1 rounded text-zinc-600 hover:text-zinc-300 transition-colors" aria-label="Reply" title="Reply">
                  <CornerUpLeft size={11} />
                </button>
                {onTranslateMessage && (
                  <button onClick={() => onTranslateMessage(message.id, message.text)} className="p-1 rounded text-zinc-600 hover:text-cyan-400 transition-colors" aria-label="Translate" title="Translate message">
                    <Languages size={11} />
                  </button>
                )}
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
