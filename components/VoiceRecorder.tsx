import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Send, Play, Pause, AlertCircle } from 'lucide-react';

interface VoiceRecorderProps {
  onSend: (audioDataUrl: string, duration: number) => void;
  onCancel: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSend, onCancel }) => {
  const [isRecording, setIsRecording] = useState(true);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let active = true;

    async function startRecording() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!active) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;

        const recorder = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
        });
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = () => {
          const mimeType = recorder.mimeType || 'audio/webm';
          const blob = new Blob(audioChunksRef.current, { type: mimeType });
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);

          // Convert to base64 dataUrl for WebRTC transfer
          const reader = new FileReader();
          reader.onloadend = () => {
            if (reader.result) {
              (recorder as any)._base64Data = reader.result as string;
            }
          };
          reader.readAsDataURL(blob);
        };

        recorder.start(100);
        setIsRecording(true);

        timerRef.current = setInterval(() => {
          setDuration(d => d + 1);
        }, 1000);
      } catch (err: any) {
        console.error('Microphone error:', err);
        setError('Microphone access denied or unavailable.');
        setIsRecording(false);
      }
    }

    startRecording();

    return () => {
      active = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, []);

  const handleStop = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    setIsRecording(false);
  };

  const handleTogglePlay = () => {
    if (!audioPlayerRef.current || !audioUrl) return;
    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleConfirmSend = () => {
    const base64 = (mediaRecorderRef.current as any)?._base64Data;
    if (base64) {
      onSend(base64, Math.max(1, duration));
    } else if (audioChunksRef.current.length > 0) {
      // Fallback
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          onSend(reader.result as string, Math.max(1, duration));
        }
      };
      reader.readAsDataURL(blob);
    } else {
      onCancel();
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className="flex items-center justify-between p-3 bg-red-950/30 border border-red-900/40 rounded-2xl text-xs text-red-400">
        <div className="flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1 bg-red-900/30 hover:bg-red-900/50 rounded-lg text-red-300 transition-colors"
        >
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-void-dark/95 border border-neon-purple/40 rounded-2xl shadow-xl animate-in fade-in duration-200">
      <div className="flex items-center gap-3">
        {isRecording ? (
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <span className="font-mono text-xs text-red-400 font-semibold tracking-wider">REC</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleTogglePlay}
            className="p-1.5 rounded-full bg-neon-purple/20 text-neon-purple hover:bg-neon-purple/30 transition-colors"
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
          </button>
        )}

        <div className="flex items-center gap-2 font-mono text-xs text-zinc-300">
          <span>{formatTime(duration)}</span>
          <div className="hidden sm:flex items-center gap-0.5 h-4">
            {[4, 8, 14, 6, 12, 16, 10, 5, 12, 8, 14, 6, 10].map((h, i) => (
              <span
                key={i}
                className={`w-0.5 rounded-full transition-all ${
                  isRecording ? 'bg-neon-purple animate-pulse' : 'bg-zinc-600'
                }`}
                style={{
                  height: isRecording ? `${Math.max(4, (h * ((duration % 3) + 1)) % 18)}px` : `${h}px`,
                  animationDelay: `${i * 80}ms`
                }}
              />
            ))}
          </div>
        </div>

        {audioUrl && (
          <audio
            ref={audioPlayerRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
          title="Discard recording"
        >
          <Trash2 size={16} />
        </button>

        {isRecording ? (
          <button
            type="button"
            onClick={handleStop}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10 rounded-xl text-xs font-mono flex items-center gap-1.5 transition-all"
            title="Stop & review"
          >
            <Square size={12} className="fill-current text-red-400" />
            <span>Done</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleConfirmSend}
            className="px-3.5 py-1.5 bg-neon-purple hover:bg-neon-purple/90 text-white rounded-xl text-xs font-mono font-semibold flex items-center gap-1.5 shadow-lg shadow-neon-purple/20 transition-all"
            title="Send voice message"
          >
            <Send size={12} />
            <span>Send</span>
          </button>
        )}
      </div>
    </div>
  );
};
