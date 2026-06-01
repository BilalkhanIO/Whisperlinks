import React, { useEffect, useRef } from 'react';
import { ChatLanguage, ChatMood } from '../types';
import { LANGUAGE_PROMPTS, MOOD_META } from '../constants';
import { getFlag } from '../utils';
import { X, Settings, Volume2, Mic } from 'lucide-react';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: ChatLanguage;
  setLang: (l: ChatLanguage) => void;
  currentMood: ChatMood;
  setMood: (m: ChatMood) => void;
  sfx: boolean;
  toggleSfx: () => void;
  voice: boolean;
  toggleVoice: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen, onClose, currentLang, setLang, currentMood, setMood, sfx, toggleSfx, voice, toggleVoice
}) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) closeButtonRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`fixed inset-x-0 bottom-0 z-50 bg-void-dark border-t border-white/8 rounded-t-3xl shadow-2xl transform transition-transform duration-300 ease-out max-h-[90vh] overflow-y-auto ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        aria-hidden={!isOpen}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-zinc-700 rounded-full" />
        </div>

        <div className="p-6 space-y-7">

          {/* Header */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold flex items-center gap-2.5">
              <Settings size={18} className="text-neon-green" aria-hidden="true" />
              Configuration
            </h2>
            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="p-2 bg-zinc-800/80 rounded-full hover:bg-zinc-700 transition-colors"
              aria-label="Close settings"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          {/* Audio toggles */}
          <div>
            <p className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest mb-3">Audio</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={toggleSfx}
                className={`p-4 rounded-2xl border flex items-center gap-3 transition-all ${sfx ? 'bg-neon-green/8 border-neon-green/50 text-neon-green' : 'bg-zinc-900/60 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                aria-pressed={sfx}
                aria-label={`Sound effects ${sfx ? 'on' : 'off'}`}
              >
                <Volume2 size={20} aria-hidden="true" />
                <div className="text-left">
                  <p className="text-xs font-bold">SFX</p>
                  <p className="text-[10px] opacity-60">{sfx ? 'Enabled' : 'Disabled'}</p>
                </div>
              </button>
              <button
                onClick={toggleVoice}
                className={`p-4 rounded-2xl border flex items-center gap-3 transition-all ${voice ? 'bg-neon-purple/8 border-neon-purple/50 text-neon-purple' : 'bg-zinc-900/60 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                aria-pressed={voice}
                aria-label={`Voice output ${voice ? 'on' : 'off'}`}
              >
                <Mic size={20} aria-hidden="true" />
                <div className="text-left">
                  <p className="text-xs font-bold">Voice</p>
                  <p className="text-[10px] opacity-60">{voice ? 'Enabled' : 'Disabled'}</p>
                </div>
              </button>
            </div>
          </div>

          {/* AI Personality */}
          <div>
            <p className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest mb-3" id="mood-label">AI Personality</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" role="radiogroup" aria-labelledby="mood-label">
              {(Object.entries(MOOD_META) as [ChatMood, typeof MOOD_META[ChatMood]][]).map(([m, meta]) => (
                <button
                  key={m}
                  onClick={() => setMood(m)}
                  className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all text-left ${
                    currentMood === m
                      ? `bg-neon-green/8 border-neon-green/50`
                      : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                  }`}
                  role="radio"
                  aria-checked={currentMood === m}
                >
                  <span className="text-2xl shrink-0" aria-hidden="true">{meta.emoji}</span>
                  <div className="min-w-0">
                    <p className={`text-sm font-bold ${currentMood === m ? 'text-neon-green' : 'text-zinc-200'}`}>
                      {meta.name}
                    </p>
                    <p className={`text-[11px] truncate ${currentMood === m ? 'text-neon-green/70' : 'text-zinc-500'}`}>
                      {meta.tagline}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div>
            <p className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest mb-3" id="lang-label">Language</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-labelledby="lang-label">
              {Object.keys(LANGUAGE_PROMPTS).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLang(lang as ChatLanguage)}
                  className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-all flex items-center gap-2 ${
                    currentLang === lang
                      ? 'bg-zinc-100 text-black border-white'
                      : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:border-zinc-600'
                  }`}
                  role="radio"
                  aria-checked={currentLang === lang}
                >
                  <span aria-hidden="true">{getFlag(lang as ChatLanguage)}</span>
                  <span className="truncate text-[12px]">{lang.replace('_', ' ')}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pb-2 text-center text-[10px] text-zinc-700 pt-4 border-t border-white/5">
            <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">Privacy Policy</a>
            <span className="mx-2" aria-hidden="true">·</span>
            <a href="/help" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">Help Center</a>
          </div>
        </div>
      </div>
    </>
  );
};
