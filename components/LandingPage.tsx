import React from 'react';
import { Bot, Shield, Zap, Globe, Mic, Cpu, Users } from 'lucide-react';
import MatrixRain from './MatrixRain';
import { SettingsPanel } from './SettingsPanel';
import { ChatMode, ChatLanguage, ChatMood } from '../types';

interface LandingPageProps {
  username: string;
  setUsername: (name: string) => void;
  onEnter: (mode: ChatMode) => void;
  onNavigate: (path: string) => void;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  hasApiKey: boolean;
  // Settings props passthrough
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
  return (
    <div className="min-h-screen w-full bg-void-black text-zinc-200 font-sans flex flex-col relative overflow-x-hidden">
      {/* Hero Section */}
      <div className="relative min-h-screen flex flex-col items-center justify-center p-6">
        <MatrixRain />
        
        <div className="z-10 w-full max-w-md flex flex-col items-center gap-8 animate-in zoom-in duration-500 mb-12">
           <div className="bg-void-dark p-8 rounded-3xl border border-void-gray shadow-2xl relative group hover:border-neon-green/50 transition-colors">
              <div className="absolute -inset-1 bg-neon-green/20 rounded-3xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
              <Bot size={64} className="text-zinc-100 relative z-10" />
           </div>

           <div className="text-center space-y-2">
             <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-zinc-500">WHISPERLINK</h1>
             <p className="text-sm font-mono text-neon-green tracking-[0.3em]">SECURE NEURAL UPLINK v4.0</p>
           </div>

           <div className="w-full space-y-4 bg-void-dark/50 p-6 rounded-2xl border border-white/5 backdrop-blur-sm">
              <input 
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ENTER CODENAME"
                maxLength={12}
                className="w-full bg-zinc-900/80 border border-zinc-700 text-center py-4 rounded-xl text-zinc-100 font-mono tracking-widest outline-none focus:border-neon-green focus:bg-zinc-900 transition-all placeholder:text-zinc-600"
              />
              
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => onEnter('AI')} disabled={!username} className="bg-zinc-100 text-black py-4 rounded-xl font-bold hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex flex-col items-center gap-1">
                    <span>SOLO LINK</span>
                    <span className="text-[10px] font-normal opacity-60">AI COMPANION</span>
                 </button>
                 <button onClick={() => onEnter('P2P')} disabled={!username} className="bg-neon-green text-black py-4 rounded-xl font-bold hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex flex-col items-center gap-1">
                    <span>GROUP LINK</span>
                    <span className="text-[10px] font-normal opacity-60">P2P ENCRYPTED</span>
                 </button>
              </div>
           </div>

           <div className="flex gap-4">
              <button onClick={() => setShowSettings(true)} className="text-zinc-500 hover:text-white transition-colors text-xs font-mono border-b border-transparent hover:border-zinc-500 pb-0.5">
                 CONFIGURE PROTOCOLS
              </button>
           </div>
           
           {!hasApiKey && <div className="text-red-500 text-[10px] bg-red-900/20 px-3 py-1 rounded border border-red-500/20">⚠️ API KEY DISCONNECTED</div>}
        </div>

        <div className="absolute bottom-10 animate-bounce text-zinc-600">
          <p className="text-xs font-mono">SCROLL FOR INTEL</p>
        </div>
      </div>

      {/* Content Sections for AdSense/SEO */}
      <div className="relative z-10 bg-void-black border-t border-white/5">
        
        {/* Features Grid */}
        <section className="max-w-6xl mx-auto px-6 py-24">
          <h2 className="text-3xl font-bold text-center mb-16 text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-500">ADVANCED CAPABILITIES</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Shield className="text-neon-green" size={32} />}
              title="P2P Encryption"
              desc="Direct browser-to-browser connection using WebRTC. Your messages never touch a central server."
            />
            <FeatureCard 
              icon={<Cpu className="text-neon-purple" size={32} />}
              title="Neural AI Core"
              desc="Powered by Gemini 1.5 Flash. Experience context-aware conversations with adaptive personalities."
            />
            <FeatureCard 
              icon={<Zap className="text-yellow-500" size={32} />}
              title="Ephemeral Data"
              desc="Zero persistence. Once the tab closes, the conversation ceases to exist. No logs, no history."
            />
            <FeatureCard 
              icon={<Globe className="text-blue-500" size={32} />}
              title="Global Translation"
              desc="Real-time multi-language support. Chat in Spanish, French, Japanese, and more seamlessly."
            />
            <FeatureCard 
              icon={<Mic className="text-red-500" size={32} />}
              title="Voice Synthesis"
              desc="Full duplex voice interface. Speak to the AI and hear responses in character-specific voices."
            />
            <FeatureCard 
              icon={<Users className="text-orange-500" size={32} />}
              title="Group Dynamics"
              desc="Invite friends to a secure lobby. The AI participates as a moderator or chaotic element."
            />
          </div>
        </section>

        {/* About Section */}
        <section className="bg-void-dark/50 py-24 border-y border-white/5">
          <div className="max-w-4xl mx-auto px-6 text-center space-y-8">
            <h2 className="text-3xl font-bold">THE WHISPERLINK PROTOCOL</h2>
            <p className="text-zinc-400 leading-relaxed text-lg">
              WhisperLink is designed as a sanctuary for digital communication. In an era of surveillance and data mining, 
              we provide a tool that respects the ephemeral nature of human conversation. By leveraging 
              <span className="text-neon-green"> Peer-to-Peer (P2P)</span> technology, we ensure that your private chats remain strictly between participants.
            </p>
            <p className="text-zinc-400 leading-relaxed text-lg">
              Integrated with Google's advanced <span className="text-neon-purple">Gemini AI</span>, WhisperLink isn't just a chat tool—it's an intelligent 
              companion. Whether you need a debate partner, a translator, or just a secure space to brainstorm, 
              the Neural Core adapts to your needs without compromising your privacy.
            </p>
            <p className="text-zinc-400 leading-relaxed text-lg">
              The product is aimed at short, purposeful conversations rather than endless feeds. That makes it useful for
              study groups, collaborative planning, language practice, and temporary rooms that should not turn into another
              permanent social network archive.
            </p>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-6 py-24">
          <h2 className="text-3xl font-bold text-center mb-16">WHEN PEOPLE USE IT</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <FeatureCard
              icon={<Bot className="text-neon-purple" size={32} />}
              title="Private AI Drafting"
              desc="Use Solo Link to sketch ideas, rehearse difficult conversations, refine wording, or translate short passages without setting up an account system."
            />
            <FeatureCard
              icon={<Users className="text-orange-500" size={32} />}
              title="Temporary Group Rooms"
              desc="Open a room for a one-off discussion, planning session, or friend group conversation, then let the session disappear naturally when the tab closes."
            />
            <FeatureCard
              icon={<Shield className="text-neon-green" size={32} />}
              title="Low-Retention Chats"
              desc="The interface is designed for conversations that benefit from reduced persistence. That matters for brainstorming, lightweight moderation, and quick support exchanges."
            />
            <FeatureCard
              icon={<Globe className="text-blue-500" size={32} />}
              title="Language Practice"
              desc="Switch between supported languages and use the AI mode for vocabulary drills, pronunciation support, or informal conversation practice."
            />
          </div>
        </section>

        {/* FAQ Section */}
        <section className="max-w-4xl mx-auto px-6 py-24">
          <h2 className="text-3xl font-bold text-center mb-16">OPERATIONAL FAQ</h2>
          <div className="space-y-6">
            <FAQItem 
              q="Is my data stored?" 
              a="No. WhisperLink operates on a zero-knowledge principle. Messages are stored only in your device's RAM and are wiped instantly upon session termination." 
            />
            <FAQItem 
              q="How does the AI work securely?" 
              a="When you interact with the AI, only the specific text prompt is sent to the Gemini API. No personal identifiers or P2P chat logs are transmitted unless explicitly shared by you in the prompt." 
            />
            <FAQItem 
              q="Can I chat with multiple people?" 
              a="Yes. The Group Link mode allows you to generate a unique session ID. Share this with trusted peers to establish a mesh network for group communication." 
            />
            <FAQItem 
              q="Is it free?" 
              a="WhisperLink is currently free to use as a research preview of secure, AI-enhanced communication protocols." 
            />
          </div>
        </section>

        <section className="bg-void-dark/50 py-24 border-y border-white/5">
          <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
              <h2 className="text-3xl font-bold">GUIDES AND POLICIES</h2>
              <p className="text-zinc-400 mt-4 leading-relaxed">
                Review how the product works, how support requests are handled, and the legal pages that explain privacy and
                acceptable use.
              </p>
            </div>
            <div className="md:col-span-2 grid sm:grid-cols-2 gap-4">
              <button onClick={() => onNavigate('/about')} className="text-left bg-zinc-900/60 border border-white/5 rounded-2xl p-5 hover:border-neon-green/40 transition-colors">
                <p className="font-bold text-white">How It Works</p>
                <p className="text-sm text-zinc-400 mt-2">Detailed explanation of Solo Link, Group Link, and product design goals.</p>
              </button>
              <button onClick={() => onNavigate('/help')} className="text-left bg-zinc-900/60 border border-white/5 rounded-2xl p-5 hover:border-neon-green/40 transition-colors">
                <p className="font-bold text-white">Help Center</p>
                <p className="text-sm text-zinc-400 mt-2">Setup steps, troubleshooting, and safe-use recommendations.</p>
              </button>
              <button onClick={() => onNavigate('/privacy-policy')} className="text-left bg-zinc-900/60 border border-white/5 rounded-2xl p-5 hover:border-neon-green/40 transition-colors">
                <p className="font-bold text-white">Privacy Policy</p>
                <p className="text-sm text-zinc-400 mt-2">What data is processed, what stays local, and what third parties handle.</p>
              </button>
              <button onClick={() => onNavigate('/terms')} className="text-left bg-zinc-900/60 border border-white/5 rounded-2xl p-5 hover:border-neon-green/40 transition-colors">
                <p className="font-bold text-white">Terms And Contact</p>
                <p className="text-sm text-zinc-400 mt-2">Usage expectations, service limits, and support contact details.</p>
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 bg-void-black py-12">
          <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <Bot className="text-zinc-500" />
              <span className="font-bold text-zinc-300">WHISPERLINK</span>
            </div>
            <div className="flex gap-8 text-sm text-zinc-500">
              <button onClick={() => onNavigate('/privacy-policy')} className="hover:text-neon-green transition-colors">Privacy Policy</button>
              <button onClick={() => onNavigate('/terms')} className="hover:text-neon-green transition-colors">Terms of Service</button>
              <button onClick={() => onNavigate('/contact')} className="hover:text-neon-green transition-colors">Contact</button>
              <button onClick={() => onNavigate('/help')} className="hover:text-neon-green transition-colors">Help</button>
            </div>
            <div className="text-xs text-zinc-700 font-mono">
              SYSTEM STATUS: ONLINE
            </div>
          </div>
        </footer>
      </div>

      <SettingsPanel 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)}
        currentLang={currentLang}
        setLang={setLang}
        currentMood={currentMood}
        setMood={setMood}
        sfx={sfx}
        toggleSfx={toggleSfx}
        voice={voice}
        toggleVoice={toggleVoice}
      />
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
  <div className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-all hover:-translate-y-1">
    <div className="mb-4">{icon}</div>
    <h3 className="text-xl font-bold mb-2 text-zinc-200">{title}</h3>
    <p className="text-zinc-400 text-sm leading-relaxed">{desc}</p>
  </div>
);

const FAQItem = ({ q, a }: { q: string, a: string }) => (
  <div className="border-b border-white/5 pb-6">
    <h3 className="text-lg font-bold text-zinc-200 mb-2">{q}</h3>
    <p className="text-zinc-400">{a}</p>
  </div>
);
