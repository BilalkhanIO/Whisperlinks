import React, { useState, useRef, useEffect } from 'react';
import { Lock, X, AlertCircle } from 'lucide-react';

interface CodeEntryModalProps {
  roomName: string;
  error: string;
  onSubmit: (code: string) => void;
  onCancel: () => void;
}

export const CodeEntryModal: React.FC<CodeEntryModalProps> = ({ roomName, error, onSubmit, onCancel }) => {
  const [code, setCode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onCancel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) onSubmit(code.trim());
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Enter room code"
    >
      <div className="bg-void-dark border border-white/10 rounded-3xl p-7 flex flex-col gap-5 shadow-2xl max-w-xs w-full animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-neon-green/10 border border-neon-green/20 rounded-xl flex items-center justify-center shrink-0">
              <Lock size={16} className="text-neon-green" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-200 text-sm">Room Locked</h3>
              <p className="text-[10px] text-zinc-500 font-mono truncate max-w-[140px]">{roomName}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-white transition-all"
            aria-label="Cancel"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <p className="text-xs text-zinc-400 text-center leading-relaxed">
            This room requires a join code.<br />Ask the host for the code.
          </p>
          <input
            ref={inputRef}
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
            placeholder="ENTER CODE"
            className="w-full bg-zinc-900/80 border border-zinc-700/80 text-center py-3.5 rounded-xl text-zinc-100 font-mono tracking-[0.3em] text-lg outline-none focus:border-neon-green/60 transition-all placeholder:text-zinc-600 placeholder:tracking-normal placeholder:text-sm"
            aria-label="Join code"
            autoComplete="off"
            spellCheck={false}
          />
          {error && (
            <div className="flex items-center gap-1.5 text-red-400 text-xs">
              <AlertCircle size={12} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <button
            type="submit"
            disabled={!code.trim()}
            className="w-full py-3 bg-neon-green text-black font-bold rounded-xl hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm"
          >
            Join Room
          </button>
        </form>
      </div>
    </div>
  );
};
