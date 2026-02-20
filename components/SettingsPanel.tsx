import React from 'react';
import { ChatLanguage, ChatMood } from '../types';
import { LANGUAGE_PROMPTS, MOOD_INSTRUCTIONS } from '../constants';
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
  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className={`fixed inset-x-0 bottom-0 z-50 bg-void-dark border-t border-void-gray rounded-t-3xl shadow-2xl transform transition-transform duration-300 ease-out max-h-[85vh] overflow-y-auto ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="p-6 space-y-6">
          
          {/* Header */}
          <div className="flex justify-between items-center pb-4 border-b border-white/5">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Settings className="text-neon-green" /> Configuration
            </h2>
            <button onClick={onClose} className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700">
              <X size={20} />
            </button>
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-2 gap-4">
             <button onClick={toggleSfx} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${sfx ? 'bg-neon-green/10 border-neon-green text-neon-green' : 'bg-zinc-900 border-zinc-700 text-zinc-500'}`}>
                <Volume2 size={24} />
                <span className="text-xs font-bold">SFX: {sfx ? 'ON' : 'OFF'}</span>
             </button>
             <button onClick={toggleVoice} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${voice ? 'bg-neon-purple/10 border-neon-purple text-neon-purple' : 'bg-zinc-900 border-zinc-700 text-zinc-500'}`}>
                <Mic size={24} />
                <span className="text-xs font-bold">VOICE: {voice ? 'ON' : 'OFF'}</span>
             </button>
          </div>

          {/* Languages */}
          <div>
            <h3 className="text-sm font-mono text-zinc-400 mb-3 uppercase tracking-wider">Communication Protocol</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.keys(LANGUAGE_PROMPTS).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLang(lang as ChatLanguage)}
                  className={`p-3 rounded-lg text-sm font-medium border transition-all flex items-center gap-2 ${currentLang === lang ? 'bg-zinc-100 text-black border-white' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600'}`}
                >
                  <span>{getFlag(lang as ChatLanguage)}</span>
                  {lang.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Moods */}
          <div>
            <h3 className="text-sm font-mono text-zinc-400 mb-3 uppercase tracking-wider">AI Personality Core</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.keys(MOOD_INSTRUCTIONS).map((m) => (
                <button
                  key={m}
                  onClick={() => setMood(m as ChatMood)}
                  className={`p-3 rounded-lg text-sm font-bold border transition-all text-left ${currentMood === m ? 'bg-gradient-to-r from-neon-green/20 to-transparent border-neon-green text-neon-green' : 'bg-zinc-900 text-zinc-400 border-zinc-800'}`}
                >
                  {m.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
          
          <div className="h-6"></div> {/* Safe area */}
          
          <div className="text-center text-[10px] text-zinc-600 pt-4 border-t border-white/5">
            <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">Privacy Policy</a>
            <span className="mx-2">•</span>
            <span>AdSense Enabled</span>
          </div>
        </div>
      </div>
    </>
  );
};