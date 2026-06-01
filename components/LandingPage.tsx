import React from 'react';
import { Bot, Shield, Zap, Globe, Mic, Cpu, Users, ChevronDown, Settings as SettingsIcon } from 'lucide-react';
import MatrixRain from './MatrixRain';
import { SettingsPanel } from './SettingsPanel';
import { ChatMode, ChatLanguage, ChatMood } from '../types';
import { MOOD_META } from '../constants';

interface LandingPageProps {
  username: string;
  setUsername: (name: string) => void;
  onEnter: (mode: ChatMode) => void;
  onNavigate: (path: string) => void;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  hasApiKey: boolean;
  currentLang: ChatLanguage;
  setLang: (l: ChatLanguage) => void;
  currentMood: ChatMood;
  setMood: (m: ChatMood) => void;
  sfx: boolean;
  toggleSfx: () => void;
  voice: boolean;
  toggleVoice: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  username, setUsername, onEnter, onNavigate, showSettings, setShowSettings, hasApiKey,
  currentLang, setLang, currentMood, setMood, sfx, toggleSfx, voice, toggleVoice
}) => {
  const currentPersona = MOOD_META[currentMood];

  return (
    <div className="min-h-screen w-full bg-void-black text-zinc-200 font-sans flex flex-col relative overflow-x-hidden">

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-5 py-12">
        <MatrixRain />

        <div className="z-10 w-full max-w-sm flex flex-col items-center gap-6">

          {/* Glass card */}
          <div className="w-full bg-white/[0.025] backdrop-blur-2xl border border-white/[0.07] rounded-3xl p-8 shadow-2xl animate-slide-up">

            {/* Logo icon with glow */}
            <div className="flex justify-center mb-7">
              <div className="relative animate-float">
                <div className="absolute -inset-3 bg-neon-green/10 rounded-3xl blur-xl animate-glow" />
                <div className="relative bg-void-dark p-5 rounded-2xl border border-neon-green/20 shadow-lg">
                  <Bot size={52} className="text-zinc-100" aria-hidden="true" />
                </div>
                {/* Active persona badge */}
                <div className="absolute -bottom-2 -right-2 bg-void-dark border border-white/10 rounded-full px-2 py-0.5 flex items-center gap-1">
                  <span className="text-xs">{currentPersona.emoji}</span>
                  <span className="text-[10px] font-mono text-zinc-400">{currentPersona.name}</span>
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="text-center mb-7 animate-slide-up delay-100">
              <h1 className="text-4xl font-black tracking-tight text-white leading-none">WHISPERLINK</h1>
              <p className="text-[11px] font-mono text-neon-green/80 tracking-[0.25em] mt-2 uppercase">Secure Neural Uplink v4.0</p>
            </div>

            {/* Input */}
            <div className="relative mb-4 animate-slide-up delay-200">
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && username.trim() && onEnter('AI')}
                placeholder="Enter your codename"
                maxLength={12}
                className="w-full bg-zinc-900/80 border border-zinc-700/80 text-center py-3.5 rounded-xl text-zinc-100 font-mono tracking-widest outline-none focus:border-neon-green/60 focus:bg-zinc-900 transition-all placeholder:text-zinc-600 placeholder:tracking-normal placeholder:font-sans text-sm"
                aria-label="Your codename"
                aria-describedby="codename-hint"
              />
              <span
                id="codename-hint"
                className={`absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-mono ${username.length >= 10 ? 'text-yellow-500' : 'text-zinc-700'}`}
                aria-live="polite"
              >
                {username.length}/12
              </span>
            </div>

            {/* CTA buttons */}
            <div className="grid grid-cols-2 gap-3 animate-slide-up delay-300">
              <button
                onClick={() => onEnter('AI')}
                disabled={!username.trim()}
                className="group relative bg-zinc-100 text-black py-3.5 rounded-xl font-bold hover:bg-white disabled:opacity-40 transition-all flex flex-col items-center gap-0.5 overflow-hidden"
                aria-label="Start solo AI chat"
              >
                <span className="text-sm">Solo Link</span>
                <span className="text-[10px] font-normal opacity-50">AI Companion</span>
              </button>
              <button
                onClick={() => onEnter('P2P')}
                disabled={!username.trim()}
                className="group relative bg-neon-green text-black py-3.5 rounded-xl font-bold hover:bg-green-400 disabled:opacity-40 transition-all flex flex-col items-center gap-0.5"
                aria-label="Start group P2P chat"
              >
                <span className="text-sm">Group Link</span>
                <span className="text-[10px] font-normal opacity-60">P2P Encrypted</span>
              </button>
            </div>

            {/* Settings + API key warning */}
            <div className="flex items-center justify-center gap-4 mt-5 animate-slide-up delay-400">
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors text-xs"
                aria-label="Open settings"
              >
                <SettingsIcon size={13} aria-hidden="true" />
                Configure
              </button>
              {!hasApiKey && (
                <span className="text-red-400 text-[10px] bg-red-900/20 px-2.5 py-1 rounded-full border border-red-500/20">
                  ⚠ API KEY MISSING
                </span>
              )}
            </div>
          </div>

          {/* Scroll hint */}
          <button
            onClick={() => document.getElementById('personas')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex flex-col items-center gap-1 text-zinc-600 hover:text-zinc-400 transition-colors animate-bounce mt-2"
            aria-label="Scroll to learn more"
          >
            <span className="text-[10px] font-mono tracking-widest">EXPLORE</span>
            <ChevronDown size={14} />
          </button>
        </div>
      </section>

      {/* ── PERSONA SHOWCASE ── */}
      <section id="personas" className="relative z-10 py-16 border-t border-white/5 bg-void-black">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-10">
            <p className="text-[11px] font-mono text-neon-green/60 tracking-widest uppercase mb-2">Neural Core</p>
            <h2 className="text-2xl font-bold text-zinc-200">Choose Your AI Persona</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
            {(Object.entries(MOOD_META) as [ChatMood, typeof MOOD_META[ChatMood]][]).map(([mood, meta]) => (
              <button
                key={mood}
                onClick={() => { setMood(mood); setShowSettings(false); }}
                className={`flex-shrink-0 w-40 bg-void-dark/80 border rounded-2xl p-5 text-left transition-all hover:-translate-y-1 ${
                  currentMood === mood
                    ? 'border-neon-green/50 bg-neon-green/5'
                    : 'border-white/5 hover:border-white/15'
                }`}
                aria-label={`Select ${meta.name} persona`}
                aria-pressed={currentMood === mood}
              >
                <span className="text-3xl block mb-3" aria-hidden="true">{meta.emoji}</span>
                <p className={`font-bold text-sm mb-1 ${currentMood === mood ? 'text-neon-green' : 'text-zinc-200'}`}>
                  {meta.name}
                </p>
                <p className="text-[11px] text-zinc-500 leading-snug">{meta.tagline}</p>
                {currentMood === mood && (
                  <div className="mt-2 text-[9px] font-mono text-neon-green/60 uppercase tracking-wider">Active</div>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="relative z-10 py-20 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Capabilities</p>
            <h2 className="text-3xl font-bold text-zinc-100">Built Different</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Shield size={24} />} iconBg="bg-neon-green/10 text-neon-green"
              title="P2P Encryption"
              desc="Direct browser-to-browser WebRTC. Your messages never touch a central server."
            />
            <FeatureCard
              icon={<Cpu size={24} />} iconBg="bg-neon-purple/10 text-neon-purple"
              title="Neural AI Core"
              desc="Powered by Gemini 1.5 Flash. Context-aware conversations with 5 adaptive personalities."
            />
            <FeatureCard
              icon={<Zap size={24} />} iconBg="bg-yellow-500/10 text-yellow-400"
              title="Zero Persistence"
              desc="Once the tab closes, the conversation ceases to exist. No logs, no history."
            />
            <FeatureCard
              icon={<Globe size={24} />} iconBg="bg-blue-500/10 text-blue-400"
              title="8 Languages"
              desc="Real-time multilingual support — Spanish, Japanese, Arabic, and more."
            />
            <FeatureCard
              icon={<Mic size={24} />} iconBg="bg-red-500/10 text-red-400"
              title="Voice I/O"
              desc="Speak your messages, hear AI responses in character-specific synthesized voices."
            />
            <FeatureCard
              icon={<Users size={24} />} iconBg="bg-orange-500/10 text-orange-400"
              title="Group Dynamics"
              desc="Invite friends to a secure lobby. AI joins as moderator or chaotic participant."
            />
          </div>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section className="relative z-10 bg-void-dark/40 py-20 border-y border-white/5">
        <div className="max-w-3xl mx-auto px-6 text-center space-y-6">
          <h2 className="text-2xl font-bold text-zinc-100">The WhisperLink Protocol</h2>
          <p className="text-zinc-400 leading-relaxed">
            WhisperLink is designed as a sanctuary for digital communication. By leveraging
            <span className="text-neon-green"> Peer-to-Peer</span> technology, your private chats remain strictly between participants.
            Integrated with Google's <span className="text-neon-purple">Gemini AI</span>, it's an intelligent companion that adapts to your needs without compromising privacy.
          </p>
          <p className="text-zinc-500 leading-relaxed text-sm">
            Aimed at short, purposeful conversations — study groups, collaborative planning, language practice, and temporary rooms that should not become permanent social archives.
          </p>
        </div>
      </section>

      {/* ── USE CASES ── */}
      <section className="relative z-10 py-20 border-b border-white/5">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold">When People Use It</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <FeatureCard icon={<Bot size={22} />} iconBg="bg-neon-purple/10 text-neon-purple"
              title="Private AI Drafting"
              desc="Sketch ideas, rehearse conversations, refine wording, or translate short passages — no account needed." />
            <FeatureCard icon={<Users size={22} />} iconBg="bg-orange-500/10 text-orange-400"
              title="Temporary Group Rooms"
              desc="Open a room for a one-off discussion, then let the session disappear naturally when the tab closes." />
            <FeatureCard icon={<Shield size={22} />} iconBg="bg-neon-green/10 text-neon-green"
              title="Low-Retention Chats"
              desc="Designed for conversations that benefit from reduced persistence — brainstorming, quick support, lightweight moderation." />
            <FeatureCard icon={<Globe size={22} />} iconBg="bg-blue-500/10 text-blue-400"
              title="Language Practice"
              desc="Switch languages and use AI mode for vocabulary drills, pronunciation support, or informal conversation practice." />
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="relative z-10 py-20 border-b border-white/5">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold">FAQ</h2>
          </div>
          <div className="space-y-0 divide-y divide-white/5">
            <FAQItem q="Is my data stored?" a="No. Messages live only in your device's RAM and are wiped instantly when the session ends." />
            <FAQItem q="How does AI work securely?" a="Only the specific text prompt is sent to Gemini. No personal identifiers or P2P logs are transmitted unless you share them." />
            <FAQItem q="Can I chat with multiple people?" a="Yes. Group Link generates a unique session ID. Share it with trusted peers to establish a group room." />
            <FAQItem q="Is it free?" a="WhisperLink is currently free to use as a research preview of secure, AI-enhanced communication." />
          </div>
        </div>
      </section>

      {/* ── GUIDES ── */}
      <section className="relative z-10 bg-void-dark/40 py-20 border-b border-white/5">
        <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-3 gap-8">
          <div>
            <h2 className="text-2xl font-bold mb-3">Guides &amp; Policies</h2>
            <p className="text-zinc-400 text-sm leading-relaxed">Review how the product works, how support requests are handled, and our legal pages.</p>
          </div>
          <div className="md:col-span-2 grid sm:grid-cols-2 gap-3">
            {[
              { path: '/about',          title: 'How It Works',    desc: 'Solo Link, Group Link, and product design goals.' },
              { path: '/help',           title: 'Help Center',     desc: 'Setup steps, troubleshooting, safe-use recommendations.' },
              { path: '/privacy-policy', title: 'Privacy Policy',  desc: 'What data is processed, what stays local, what third parties handle.' },
              { path: '/terms',          title: 'Terms & Contact', desc: 'Usage expectations, service limits, and support contact details.' },
            ].map(({ path, title, desc }) => (
              <button
                key={path}
                onClick={() => onNavigate(path)}
                className="text-left bg-zinc-900/50 border border-white/5 rounded-2xl p-5 hover:border-neon-green/30 transition-all group"
              >
                <p className="font-semibold text-zinc-200 group-hover:text-white transition-colors">{title}</p>
                <p className="text-sm text-zinc-500 mt-1.5 leading-relaxed">{desc}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 border-t border-white/5 bg-void-black py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2.5">
            <Bot size={18} className="text-zinc-600" aria-hidden="true" />
            <span className="font-bold text-zinc-400 text-sm tracking-wide">WHISPERLINK</span>
          </div>
          <nav className="flex gap-6 text-sm text-zinc-600" aria-label="Footer navigation">
            {[
              { label: 'Privacy', path: '/privacy-policy' },
              { label: 'Terms',   path: '/terms' },
              { label: 'Contact', path: '/contact' },
              { label: 'Help',    path: '/help' },
            ].map(({ label, path }) => (
              <button key={path} onClick={() => onNavigate(path)} className="hover:text-zinc-300 transition-colors">
                {label}
              </button>
            ))}
          </nav>
          <p className="text-[11px] text-zinc-700 font-mono">SYSTEM STATUS: ONLINE</p>
        </div>
      </footer>

      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        currentLang={currentLang} setLang={setLang}
        currentMood={currentMood} setMood={setMood}
        sfx={sfx} toggleSfx={toggleSfx}
        voice={voice} toggleVoice={toggleVoice}
      />
    </div>
  );
};

const FeatureCard = ({ icon, iconBg, title, desc }: { icon: React.ReactNode; iconBg: string; title: string; desc: string }) => (
  <div className="bg-zinc-900/40 p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-all hover:-translate-y-0.5 group">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${iconBg}`} aria-hidden="true">
      {icon}
    </div>
    <h3 className="text-base font-bold mb-2 text-zinc-200 group-hover:text-white transition-colors">{title}</h3>
    <p className="text-zinc-500 text-sm leading-relaxed">{desc}</p>
  </div>
);

const FAQItem = ({ q, a }: { q: string; a: string }) => (
  <div className="py-5">
    <h3 className="text-base font-semibold text-zinc-200 mb-2">{q}</h3>
    <p className="text-zinc-500 text-sm leading-relaxed">{a}</p>
  </div>
);
