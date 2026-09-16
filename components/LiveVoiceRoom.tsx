import React, { useState, useEffect } from 'react';
import { Mic, MicOff, PhoneOff, Users, Radio } from 'lucide-react';
import { UserInfo } from '../types';

interface LiveVoiceRoomProps {
  localStream: MediaStream | null;
  remoteStreams: { peerId: string; username: string; stream: MediaStream }[];
  isMuted: boolean;
  onToggleMute: () => void;
  onLeaveCall: () => void;
  participants: UserInfo[];
  currentUsername: string;
}

export const LiveVoiceRoom: React.FC<LiveVoiceRoomProps> = ({
  localStream,
  remoteStreams,
  isMuted,
  onToggleMute,
  onLeaveCall,
  participants,
  currentUsername
}) => {
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration(d => d + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const totalInVoice = 1 + remoteStreams.length;

  return (
    <div className="w-full bg-void-dark/95 border-b border-neon-green/25 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-lg backdrop-blur-md z-15 animate-in slide-in-from-top-2 duration-200">
      {/* Hidden audio tags for remote streams to ensure audio plays */}
      <div className="hidden" aria-hidden="true">
        {remoteStreams.map(rs => (
          <audio
            key={rs.peerId}
            autoPlay
            ref={(el) => {
              if (el && el.srcObject !== rs.stream) {
                el.srcObject = rs.stream;
              }
            }}
          />
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-neon-green"></span>
          </span>
          <span className="font-mono text-xs text-neon-green font-semibold tracking-wider flex items-center gap-1.5">
            <Radio size={14} className="animate-pulse" />
            LIVE VOICE ROOM
          </span>
        </div>

        <span className="text-[11px] font-mono text-zinc-400 bg-void-black/60 px-2 py-0.5 rounded-full border border-white/5">
          {formatDuration(callDuration)}
        </span>

        <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-400">
          <Users size={12} className="text-zinc-500" />
          <span>{totalInVoice} active</span>
        </div>
      </div>

      {/* Voice Participants Badges */}
      <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto max-w-sm py-0.5">
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono border ${
          isMuted ? 'bg-zinc-800/80 border-zinc-700 text-zinc-400' : 'bg-neon-green/10 border-neon-green/30 text-neon-green'
        }`}>
          {isMuted ? <MicOff size={10} className="text-red-400" /> : <Mic size={10} className="text-neon-green animate-pulse" />}
          <span className="truncate max-w-[70px]">You</span>
        </div>

        {remoteStreams.map(rs => (
          <div
            key={rs.peerId}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-neon-purple/10 border border-neon-purple/30 text-zinc-300"
          >
            <Mic size={10} className="text-neon-purple" />
            <span className="truncate max-w-[80px]">{rs.username}</span>
          </div>
        ))}
      </div>

      {/* Call Actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleMute}
          className={`px-3 py-1.5 rounded-xl font-mono text-xs flex items-center gap-1.5 border transition-all ${
            isMuted
              ? 'bg-red-500/20 border-red-500/50 text-red-300 hover:bg-red-500/30'
              : 'bg-zinc-800 border-white/10 text-zinc-200 hover:bg-zinc-700'
          }`}
          title={isMuted ? "Unmute microphone" : "Mute microphone"}
        >
          {isMuted ? <MicOff size={13} className="text-red-400" /> : <Mic size={13} className="text-neon-green" />}
          <span>{isMuted ? 'Muted' : 'Mute'}</span>
        </button>

        <button
          type="button"
          onClick={onLeaveCall}
          className="px-3 py-1.5 rounded-xl font-mono text-xs bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5 shadow-lg shadow-red-600/20 transition-all"
          title="Leave voice call"
        >
          <PhoneOff size={13} />
          <span>Leave</span>
        </button>
      </div>
    </div>
  );
};
