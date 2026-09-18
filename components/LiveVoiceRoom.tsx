import React, { useState, useEffect, useRef } from 'react';
import {
  Mic, MicOff, PhoneOff, Users, Radio, Video, VideoOff,
  Monitor, Volume2, ShieldCheck, Maximize2, Minimize2
} from 'lucide-react';
import { UserInfo } from '../types';

export interface RemoteMediaStream {
  peerId: string;
  username: string;
  stream: MediaStream;
  hasVideo?: boolean;
}

interface LiveVoiceRoomProps {
  localStream: MediaStream | null;
  remoteStreams: RemoteMediaStream[];
  isMuted: boolean;
  onToggleMute: () => void;
  onLeaveCall: () => void;
  participants: UserInfo[];
  currentUsername: string;
  isVideoActive?: boolean;
  isScreenSharing?: boolean;
  onToggleVideo?: () => void;
  onToggleScreenShare?: () => void;
  isPttEnabled?: boolean;
  onTogglePtt?: () => void;
  isVirtualVideo?: boolean;
}

export const LiveVoiceRoom: React.FC<LiveVoiceRoomProps> = ({
  localStream,
  remoteStreams,
  isMuted,
  onToggleMute,
  onLeaveCall,
  participants,
  currentUsername,
  isVideoActive = false,
  isScreenSharing = false,
  onToggleVideo,
  onToggleScreenShare,
  isPttEnabled = false,
  onTogglePtt,
  isVirtualVideo = false
}) => {
  const [callDuration, setCallDuration] = useState(0);
  const [volumes, setVolumes] = useState<Record<string, number>>({});
  const [showVideoGrid, setShowVideoGrid] = useState(true);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  // Call timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration(d => d + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync local stream video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isVideoActive, isScreenSharing]);

  // Push-to-Talk spacebar handling
  useEffect(() => {
    if (!isPttEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setIsSpacePressed(true);
        if (isMuted) onToggleMute();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setIsSpacePressed(false);
        if (!isMuted) onToggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPttEnabled, isMuted, onToggleMute]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleVolumeChange = (peerId: string, val: number) => {
    setVolumes(prev => ({ ...prev, [peerId]: val }));
  };

  const totalInCall = 1 + remoteStreams.length;
  const anyVideoFeed = isVideoActive || isScreenSharing || remoteStreams.some(r => {
    const tracks = r.stream.getVideoTracks();
    return tracks.length > 0 && tracks[0].enabled;
  });

  return (
    <div className="w-full bg-void-dark/95 border-b border-neon-green/20 shadow-xl backdrop-blur-lg z-20 transition-all duration-200">
      {/* ── Top Bar ── */}
      <div className="px-4 py-2 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Status & Duration */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-neon-green" />
            </span>
            <span className="font-mono text-xs text-neon-green font-semibold tracking-wider flex items-center gap-1.5">
              <Radio size={14} className="animate-pulse" />
              {isScreenSharing ? 'SCREEN SHARE LIVE' : isVideoActive ? 'LIVE VIDEO CALL' : 'LIVE VOICE ROOM'}
            </span>
          </div>

          <span className="text-[11px] font-mono text-zinc-400 bg-void-black/60 px-2 py-0.5 rounded-full border border-white/5">
            {formatDuration(callDuration)}
          </span>

          <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-400">
            <Users size={12} className="text-zinc-500" />
            <span>{totalInCall} active</span>
          </div>

          <div className="hidden lg:flex items-center gap-1 text-[10px] font-mono text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
            <ShieldCheck size={11} />
            <span>DTLS-SRTP E2EE</span>
          </div>
        </div>

        {/* Center: Push to Talk Indicator */}
        {isPttEnabled && (
          <div className={`hidden md:flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-0.5 rounded-full border transition-all ${
            isSpacePressed
              ? 'bg-neon-green/20 border-neon-green text-neon-green animate-pulse'
              : 'bg-zinc-800/80 border-zinc-700 text-zinc-400'
          }`}>
            <span>HOLD SPACE TO TALK</span>
            <kbd className="bg-black/40 px-1.5 py-0.2 rounded text-[10px] border border-white/10 font-sans">SPACE</kbd>
          </div>
        )}

        {/* Right: Controls & Call Actions */}
        <div className="flex items-center gap-2">
          {/* Push-to-Talk Toggle */}
          {onTogglePtt && (
            <button
              type="button"
              onClick={onTogglePtt}
              className={`hidden sm:flex px-2 py-1 rounded-lg text-[11px] font-mono border transition-all ${
                isPttEnabled
                  ? 'bg-neon-green/15 border-neon-green/40 text-neon-green'
                  : 'bg-void-black/50 border-white/10 text-zinc-400 hover:text-zinc-200'
              }`}
              title={isPttEnabled ? "Disable Push-to-Talk mode" : "Enable Push-to-Talk mode (Hold Space to Speak)"}
            >
              PTT {isPttEnabled ? 'ON' : 'OFF'}
            </button>
          )}

          {/* Mute Button */}
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
            <span className="hidden sm:inline">{isMuted ? 'Muted' : 'Mute'}</span>
          </button>

          {/* Camera Video Toggle */}
          {onToggleVideo && (
            <button
              type="button"
              onClick={onToggleVideo}
              className={`px-3 py-1.5 rounded-xl font-mono text-xs flex items-center gap-1.5 border transition-all ${
                isVideoActive
                  ? 'bg-neon-green/20 border-neon-green/50 text-neon-green hover:bg-neon-green/30'
                  : 'bg-zinc-800 border-white/10 text-zinc-300 hover:bg-zinc-700'
              }`}
              title={isVideoActive ? "Turn off camera" : "Turn on camera"}
            >
              {isVideoActive ? <Video size={13} className="text-neon-green" /> : <VideoOff size={13} className="text-zinc-400" />}
              <span className="hidden sm:inline">{isVideoActive ? 'Cam On' : 'Cam'}</span>
            </button>
          )}

          {/* Screen Share Toggle */}
          {onToggleScreenShare && (
            <button
              type="button"
              onClick={onToggleScreenShare}
              className={`px-3 py-1.5 rounded-xl font-mono text-xs flex items-center gap-1.5 border transition-all ${
                isScreenSharing
                  ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 hover:bg-blue-500/30'
                  : 'bg-zinc-800 border-white/10 text-zinc-300 hover:bg-zinc-700'
              }`}
              title={isScreenSharing ? "Stop sharing screen" : "Share screen"}
            >
              <Monitor size={13} className={isScreenSharing ? "text-blue-400" : "text-zinc-400"} />
              <span className="hidden sm:inline">{isScreenSharing ? 'Sharing' : 'Share'}</span>
            </button>
          )}

          {/* Toggle Video Grid View (if video is active) */}
          {anyVideoFeed && (
            <button
              type="button"
              onClick={() => setShowVideoGrid(!showVideoGrid)}
              className="p-1.5 rounded-lg border border-white/10 text-zinc-400 hover:text-zinc-200 transition-colors"
              title={showVideoGrid ? "Minimize video panel" : "Maximize video panel"}
            >
              {showVideoGrid ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          )}

          {/* Leave Call */}
          <button
            type="button"
            onClick={onLeaveCall}
            className="px-3 py-1.5 rounded-xl font-mono text-xs bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5 shadow-lg shadow-red-600/20 transition-all ml-1"
            title="Leave voice and video call"
          >
            <PhoneOff size={13} />
            <span>Leave</span>
          </button>
        </div>
      </div>

      {/* ── Audio Stream Elements for Remote Peers ── */}
      <div className="hidden" aria-hidden="true">
        {remoteStreams.map(rs => (
          <audio
            key={`audio-${rs.peerId}`}
            autoPlay
            ref={(el) => {
              if (el) {
                if (el.srcObject !== rs.stream) el.srcObject = rs.stream;
                if (volumes[rs.peerId] !== undefined) el.volume = volumes[rs.peerId];
              }
            }}
          />
        ))}
      </div>

      {/* ── Video Stream Grid (Shown when camera or screen sharing is active) ── */}
      {anyVideoFeed && showVideoGrid && (
        <div className="px-4 pb-3 pt-1 border-t border-white/5 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-64 overflow-y-auto p-1">
            {/* Local Video Tile */}
            {(isVideoActive || isScreenSharing) && (
              <div className="relative aspect-video rounded-xl overflow-hidden bg-black/60 border border-neon-green/30 shadow-md flex items-center justify-center">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${!isScreenSharing && !isVirtualVideo ? '-scale-x-100' : ''}`}
                />
                <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/70 px-2 py-0.5 rounded-md border border-white/10 text-[10px] font-mono text-zinc-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                  <span>You {isScreenSharing ? '(Screen)' : isVirtualVideo ? '(Avatar)' : ''}</span>
                </div>
              </div>
            )}

            {/* Remote Video Tiles */}
            {remoteStreams.map(rs => {
              const videoTracks = rs.stream.getVideoTracks();
              const hasVideo = videoTracks.length > 0 && videoTracks[0].enabled;

              return (
                <div
                  key={`video-${rs.peerId}`}
                  className="relative aspect-video rounded-xl overflow-hidden bg-void-black border border-white/10 shadow-md flex items-center justify-center"
                >
                  {hasVideo ? (
                    <video
                      autoPlay
                      playsInline
                      ref={(el) => {
                        if (el && el.srcObject !== rs.stream) {
                          el.srcObject = rs.stream;
                        }
                      }}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1 text-zinc-500">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-xs font-mono text-zinc-300">
                        {rs.username.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-[10px] font-mono">{rs.username} (Audio)</span>
                    </div>
                  )}

                  <div className="absolute bottom-2 left-2 flex items-center justify-between right-2 bg-black/70 px-2 py-0.5 rounded-md border border-white/10 text-[10px] font-mono text-zinc-200">
                    <span className="truncate max-w-[90px]">{rs.username}</span>
                    <div className="flex items-center gap-1.5">
                      <Volume2 size={11} className="text-zinc-400" />
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        defaultValue="1"
                        onChange={(e) => handleVolumeChange(rs.peerId, parseFloat(e.target.value))}
                        className="w-12 h-1 accent-neon-green cursor-pointer"
                        title="Adjust participant volume"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
