import React, { useState, useEffect, useRef, useCallback } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { Message, SenderType, ConnectionStatus, ChatMood, ChatMode, UserInfo } from './types';
import { sendMessageToGemini, initializeChatSession, resetSession, generateSpeech } from './services/geminiService';
import { playSound, decodeAndPlayAudio } from './services/audioService';
import { ChatMessage } from './components/ChatMessage';
import { EncryptionEffect } from './components/EncryptionEffect';
import MatrixRain from './components/MatrixRain';
import { SettingsPanel } from './components/SettingsPanel';
import { loadPrefs, savePrefs } from './utils';
import { Send, Power, Users, Settings, Mic, Loader2 } from 'lucide-react';

import { LandingPage } from './components/LandingPage';
import { AboutPage, ContactPage, HelpPage, PrivacyPolicy, TermsPage } from './components/ContentPages';

const App: React.FC = () => {
  // --- STATE ---
  const [prefs, setPrefs] = useState(loadPrefs());
  const [isInLobby, setIsInLobby] = useState(true);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showSettings) setShowSettings(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSettings]);

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  const renderContentPage = () => {
    switch (currentPath) {
      case '/privacy-policy':
        return <PrivacyPolicy onBack={() => navigateTo('/')} />;
      case '/terms':
        return <TermsPage onBack={() => navigateTo('/')} />;
      case '/contact':
        return <ContactPage onBack={() => navigateTo('/')} />;
      case '/about':
        return <AboutPage onBack={() => navigateTo('/')} />;
      case '/help':
        return <HelpPage onBack={() => navigateTo('/')} />;
      default:
        return null;
    }
  };

  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.IDLE);
  const [mode, setMode] = useState<ChatMode>('AI');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  
  // Smart AI State
  const [isLocalTyping, setIsLocalTyping] = useState(false);
  const [isRemoteTyping, setIsRemoteTyping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInviteToast, setShowInviteToast] = useState(false);
  const [peerId, setPeerId] = useState<string | null>(null);
  
  // Voice Input State
  const [isListening, setIsListening] = useState(false);
  
  // Participants
  const [participants, setParticipants] = useState<UserInfo[]>([]);

  // --- REFS ---
  const peerRef = useRef<Peer | null>(null);
  const connectionsRef = useRef<Map<string, DataConnection>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isHostRef = useRef<boolean>(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  // Intelligent Timing Refs
  const lastActivityTimeRef = useRef<number>(Date.now());
  const aiTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const hasApiKey = !!process.env.API_KEY;

  const getAiName = (mood: ChatMood): string => {
    const names: Record<ChatMood, string> = {
      FUNNY: 'Lala',
      SAD: 'Ghamgeen',
      FACT_CHECK: 'Verifier',
      FLIRTY: 'Rizzler',
      ANGRY: 'Krodh',
    };
    return names[mood];
  };

  // --- INITIALIZATION ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('join')) setMode('P2P');
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLocalTyping, isRemoteTyping]);

  // --- SETTINGS HANDLERS ---
  const updatePref = (key: keyof typeof prefs, value: any) => {
    const newPrefs = { ...prefs, [key]: value };
    setPrefs(newPrefs);
    savePrefs(newPrefs);
    
    // If connected, reinitalize AI context
    if (status === ConnectionStatus.CONNECTED && (key === 'mood' || key === 'language')) {
       initializeChatSession(newPrefs.mood, newPrefs.language);
       
       if (mode === 'P2P' && isHostRef.current) {
          // Sync with peers if host
          broadcastData({ type: 'sys_update', mood: newPrefs.mood, lang: newPrefs.language });
       }
       addMessage(`SYSTEM: RECONFIGURING TO [${newPrefs.mood}] IN [${newPrefs.language}]`, SenderType.SYSTEM);
    }
  };

  // --- VOICE INPUT HANDLER ---
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognitionAPI = (window as typeof window & { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition
      || (window as typeof window & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      alert("Voice input is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    
    // Map internal language enum to BCP 47 language tag
    let langTag = 'en-US';
    switch (prefs.language) {
        case 'SPANISH': langTag = 'es-ES'; break;
        case 'FRENCH': langTag = 'fr-FR'; break;
        case 'GERMAN': langTag = 'de-DE'; break;
        case 'JAPANESE': langTag = 'ja-JP'; break;
        case 'ARABIC': langTag = 'ar-SA'; break;
        case 'HINDI': langTag = 'hi-IN'; break;
        // Fallback for Roman Urdu/Pashto to English or Hindi as approximate
        case 'ROMAN_URDU': langTag = 'en-US'; break; 
        default: langTag = 'en-US';
    }
    recognition.lang = langTag;

    recognition.onstart = () => {
      setIsListening(true);
      if (prefs.sfxEnabled) playSound('send'); // Small blip to indicate start
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setInputText(prev => (prev ? prev + ' ' : '') + transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // --- LOBBY LOGIC ---
  const handleEnterVoid = (selectedMode: ChatMode) => {
      if (!prefs.username.trim()) return;
      savePrefs(prefs); // Persist name
      
      if (prefs.sfxEnabled) playSound('connect');
      setIsInLobby(false);
      setMode(selectedMode);
      
      const params = new URLSearchParams(window.location.search);
      const joinParam = params.get('join');

      if (selectedMode === 'AI') {
          handleConnectAI();
      } else {
          joinParam ? initializePeer(false, joinParam) : initializePeer(true);
      }
  };

  // --- P2P NETWORK LOGIC ---
  const initializePeer = (isHost: boolean, hostId?: string) => {
    setStatus(ConnectionStatus.SEARCHING);
    isHostRef.current = isHost;
    if (peerRef.current) peerRef.current.destroy();
    connectionsRef.current.clear();

    const peer = new Peer();
    peerRef.current = peer;

    peer.on('open', (id) => {
      setPeerId(id);
      setParticipants([{ peerId: id, username: prefs.username, isHost }]);
      
      if (isHost) {
        setStatus(ConnectionStatus.WAITING_FOR_PEER);
        if (hasApiKey) initializeChatSession(prefs.mood, prefs.language);
      } else if (hostId) {
        addMessage(`CONNECTING TO SECURE ROOM...`, SenderType.SYSTEM);
        const conn = peer.connect(hostId);
        setupConnection(conn);
      }
    });

    peer.on('connection', setupConnection);
    peer.on('error', (err) => {
       if (prefs.sfxEnabled) playSound('error');
       const msg = err.type === 'peer-unavailable'
         ? 'PEER UNAVAILABLE — INVALID OR EXPIRED LINK'
         : err.type === 'network'
         ? 'NETWORK ERROR — CHECK YOUR CONNECTION'
         : `CONNECTION ERROR: ${err.type?.toUpperCase() ?? 'UNKNOWN'}`;
       addMessage(msg, SenderType.SYSTEM);
       setStatus(ConnectionStatus.DISCONNECTED);
    });
  };

  const setupConnection = (conn: DataConnection) => {
    connectionsRef.current.set(conn.peer, conn);

    conn.on('open', () => {
      setStatus(ConnectionStatus.CONNECTED);
      if (prefs.sfxEnabled) playSound('connect');
      
      conn.send({ 
          type: 'handshake', 
          user: { peerId: peerRef.current?.id, username: prefs.username, isHost: isHostRef.current } 
      });
      
      if (isHostRef.current) {
         conn.send({ type: 'sys_update', mood: prefs.mood, lang: prefs.language });
      }
    });

    conn.on('data', (data: any) => handleDataPacket(data, conn.peer));
    
    conn.on('close', () => {
      connectionsRef.current.delete(conn.peer);
      setParticipants(prev => prev.filter(p => p.peerId !== conn.peer));
      if (connectionsRef.current.size === 0 && !isHostRef.current) setStatus(ConnectionStatus.DISCONNECTED);
    });
  };

  const handleDataPacket = (data: any, senderPeerId: string) => {
      switch (data.type) {
          case 'handshake':
              setParticipants(prev => {
                  if (prev.find(p => p.peerId === data.user.peerId)) return prev;
                  const newList = [...prev, data.user];
                  if (isHostRef.current) broadcastData({ type: 'sync_participants', participants: newList });
                  return newList;
              });
              break;
          case 'sync_participants': setParticipants(data.participants); break;
          case 'message':
              setIsRemoteTyping(false);
              addMessage(data.text, SenderType.STRANGER, data.username);
              lastActivityTimeRef.current = Date.now(); // Update activity
              
              if (isHostRef.current) {
                  broadcastData({ type: 'message', text: data.text, username: data.username }, senderPeerId);
                  // Trigger smart AI analysis
                  scheduleSmartResponse(data.text, data.username); 
              }
              break;
          case 'typing':
              setIsRemoteTyping(true);
              lastActivityTimeRef.current = Date.now(); // Typing counts as activity
              // If remote typing, reschedule AI to be polite (1 minute wait)
              if (isHostRef.current) scheduleSmartResponse(null, null, true);
              
              setTimeout(() => setIsRemoteTyping(false), 2000);
              if (isHostRef.current) broadcastData({ type: 'typing' }, senderPeerId);
              break;
          case 'sys_update':
              setPrefs(p => ({ ...p, mood: data.mood, language: data.lang }));
              addMessage(`SYSTEM: HOST SYNC [${data.mood}]`, SenderType.SYSTEM);
              break;
      }
  };

  const broadcastData = (data: any, excludePeerId?: string) => {
    connectionsRef.current.forEach((conn, peerId) => {
      if (peerId !== excludePeerId && conn.open) conn.send(data);
    });
  };

  // --- SMART AI BRAIN ---

  // Main scheduler for the AI
  const scheduleSmartResponse = useCallback((triggerText: string | null, senderName: string | null, isInterruptionCheck: boolean = false) => {
    if (!hasApiKey || mode !== 'P2P' || !isHostRef.current) return;
    
    // Clear existing timer
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);

    // 1. Direct Trigger Check (Immediate)
    if (triggerText) {
        const lower = triggerText.toLowerCase();
        const aiName = prefs.mood === 'FUNNY' ? 'lala' : 'ai';
        const isMention = lower.includes('@') || lower.includes(aiName) || lower.includes('bot') || lower.startsWith('/');
        
        if (isMention) {
             triggerGroupAI(triggerText, senderName || 'User');
             return;
        }
    }

    // 2. Calculated Delay based on Activity
    // If users are typing (Interruption Check), wait 60s. If quiet, wait 20s.
    const delay = (isInterruptionCheck || isRemoteTyping) ? 60000 : 20000;

    aiTimeoutRef.current = setTimeout(() => {
        // Double check activity before firing
        const timeSince = Date.now() - lastActivityTimeRef.current;
        if (timeSince >= delay) {
            triggerGroupAI("Context Check: Everyone is silent.", "System");
        }
    }, delay);

  }, [prefs.mood, isRemoteTyping, mode, hasApiKey]);


  const triggerGroupAI = async (triggerText: string, senderName: string) => {
    setIsLocalTyping(true);
    broadcastData({ type: 'typing' });

    // Randomize delay for realism
    const delay = 1000 + Math.random() * 2000;

    setTimeout(async () => {
        try {
            // Context-Aware Prompt
            let prompt = `${senderName}: ${triggerText}`;
            if (senderName === 'System') prompt = "(The group has been silent for a while. Say something to revive the chat.)";
            
            const response = await sendMessageToGemini(prompt);
            
            setIsLocalTyping(false);
            const aiName = getAiName(prefs.mood);
            addMessage(response, SenderType.STRANGER, aiName);
            broadcastData({ type: 'message', text: response, username: aiName });
            
            lastActivityTimeRef.current = Date.now(); // AI spoke, reset clock
            
            if (prefs.voiceEnabled) {
                const audio = await generateSpeech(response, prefs.mood);
                if (audio) decodeAndPlayAudio(audio);
            }
        } catch (e) {
            setIsLocalTyping(false);
        }
    }, delay);
  };

  const handleConnectAI = async () => {
    setStatus(ConnectionStatus.SEARCHING);
    resetSession();
    setTimeout(async () => {
        setStatus(ConnectionStatus.CONNECTED);
        if (prefs.sfxEnabled) playSound('connect');
        if (hasApiKey) {
            await initializeChatSession(prefs.mood, prefs.language);
            
            // Initial Greeting
            setIsLocalTyping(true);
            const greeting = await sendMessageToGemini(`(System: New user ${prefs.username} joined. Greet them.)`);
            setIsLocalTyping(false);
            
            const aiName = getAiName(prefs.mood);
            addMessage(greeting, SenderType.STRANGER, aiName);
        }
    }, 1500);
  };

  // --- UI HANDLERS ---
  const addMessage = (text: string, sender: SenderType, username?: string) => {
    if (prefs.sfxEnabled) playSound('message');
    setMessages(p => [...p, {
      id: Math.random().toString(36),
      text,
      sender,
      username,
      timestamp: new Date(),
      isEncrypted: sender === SenderType.STRANGER
    }]);
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;
    
    if (prefs.sfxEnabled) playSound('send');
    const text = inputText.trim();
    setInputText('');
    addMessage(text, SenderType.USER, prefs.username);
    lastActivityTimeRef.current = Date.now();

    if (mode === 'P2P') {
        broadcastData({ type: 'message', text, username: prefs.username });
        if (isHostRef.current) scheduleSmartResponse(text, prefs.username);
    } else {
        // Solo Mode
        setIsLocalTyping(true);
        setTimeout(async () => {
            const res = await sendMessageToGemini(`${prefs.username}: ${text}`);
            setIsLocalTyping(false);
            const aiName = getAiName(prefs.mood);
            addMessage(res, SenderType.STRANGER, aiName);
            if (prefs.voiceEnabled) {
                const audio = await generateSpeech(res, prefs.mood);
                if (audio) decodeAndPlayAudio(audio);
            }
        }, 1000 + Math.random() * 1000);
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    if (mode === 'P2P') {
        broadcastData({ type: 'typing' }); // Send single ping
        // Debounce actual logic updates if needed
    }
  };

  const handleDisconnect = () => {
    if (prefs.sfxEnabled) playSound('error');
    peerRef.current?.destroy();
    setIsInLobby(true);
    setMessages([]);
    setParticipants([]);
    window.history.pushState({}, '', window.location.pathname);
  };

  // --- RENDER ---
  const contentPage = renderContentPage();
  if (contentPage) return contentPage;

  if (isInLobby) {
    return (
      <LandingPage 
        username={prefs.username}
        setUsername={(name) => setPrefs({...prefs, username: name})}
        onEnter={handleEnterVoid}
        onNavigate={navigateTo}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        hasApiKey={hasApiKey}
        currentLang={prefs.language}
        setLang={(l) => updatePref('language', l)}
        currentMood={prefs.mood}
        setMood={(m) => updatePref('mood', m)}
        sfx={prefs.sfxEnabled}
        toggleSfx={() => updatePref('sfxEnabled', !prefs.sfxEnabled)}
        voice={prefs.voiceEnabled}
        toggleVoice={() => updatePref('voiceEnabled', !prefs.voiceEnabled)}
      />
    );
  }

  return (
    <div className="h-screen w-full bg-void-black text-zinc-200 font-sans flex flex-col relative overflow-hidden">
      <MatrixRain />
      
      {/* Header */}
      <header className="px-4 py-3 bg-void-black/80 backdrop-blur border-b border-white/5 flex justify-between items-center z-20">
         <div className="flex items-center gap-3">
             <div
               className={`w-2 h-2 rounded-full ${status === ConnectionStatus.CONNECTED ? 'bg-neon-green animate-pulse' : 'bg-red-500'}`}
               aria-label={status === ConnectionStatus.CONNECTED ? 'Connected' : 'Disconnected'}
             />
             <div>
                <h2 className="font-bold text-sm tracking-wide">{mode === 'P2P' ? 'GROUP CHANNEL' : 'SECURE UPLINK'}</h2>
                <div className="flex gap-2 text-[10px] font-mono text-zinc-500" aria-label={`Mood: ${prefs.mood}, Language: ${prefs.language}`}>
                    <span>{prefs.mood}</span>
                    <span className="text-zinc-700">|</span>
                    <span>{prefs.language}</span>
                    {mode === 'P2P' && (
                      <>
                        <span className="text-zinc-700">|</span>
                        <span aria-label={`${participants.length} participants`}>{participants.length} NODE{participants.length === 1 ? '' : 'S'}</span>
                      </>
                    )}
                </div>
             </div>
         </div>
         <div className="flex gap-2">
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 bg-zinc-900 rounded-full text-zinc-400 hover:text-white transition-colors"
              aria-label="Open settings"
              title="Settings"
            >
                <Settings size={18} />
            </button>
            {mode === 'P2P' && (
                <button
                    onClick={() => {
                        if (peerId) {
                            navigator.clipboard.writeText(`${window.location.origin}?join=${peerId}`);
                            setShowInviteToast(true);
                            setTimeout(() => setShowInviteToast(false), 2000);
                        }
                    }}
                    className="p-2 bg-zinc-900 rounded-full text-neon-green hover:bg-neon-green/10 transition-colors relative"
                    aria-label="Copy invite link"
                    title="Copy invite link"
                >
                    <Users size={18} />
                    {showInviteToast && (
                      <div className="absolute top-10 right-0 bg-neon-green text-black text-[10px] px-2 py-1 rounded font-bold whitespace-nowrap" role="status">
                        LINK COPIED
                      </div>
                    )}
                </button>
            )}
            <button
              onClick={handleDisconnect}
              className="p-2 bg-red-500/10 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-colors"
              aria-label="Disconnect and return to lobby"
              title="Disconnect"
            >
                <Power size={18} />
            </button>
         </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-20 scroll-smooth z-10" role="log" aria-label="Chat messages" aria-live="polite">
         {status === ConnectionStatus.DISCONNECTED && (
             <div className="flex flex-col items-center justify-center h-full text-zinc-500 font-mono text-xs gap-4">
                 <div className="text-red-400 text-center">
                   <p className="text-sm font-bold mb-2">CONNECTION LOST</p>
                   <p className="text-xs text-zinc-600 mb-4">The peer disconnected or could not be reached.</p>
                   <button
                     onClick={handleDisconnect}
                     className="border border-neon-green text-neon-green px-4 py-2 rounded-lg hover:bg-neon-green hover:text-black transition-all text-xs"
                   >
                     RETURN TO LOBBY
                   </button>
                 </div>
             </div>
         )}
         {(status === ConnectionStatus.SEARCHING || status === ConnectionStatus.WAITING_FOR_PEER) && (
             <div className="flex flex-col items-center justify-center h-full text-zinc-500 font-mono text-xs gap-4" aria-live="polite">
                 <div className="w-8 h-8 border-2 border-neon-green border-t-transparent rounded-full animate-spin" role="status" aria-label="Connecting…"></div>
                 <EncryptionEffect text={status === ConnectionStatus.WAITING_FOR_PEER ? 'AWAITING PEER...' : 'ESTABLISHING CONNECTION...'} />
             </div>
         )}

         <div className="max-w-2xl mx-auto flex flex-col justify-end min-h-full">
            {messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
            {(isLocalTyping || isRemoteTyping) && (
                <div className="text-[10px] text-zinc-600 font-mono animate-pulse ml-4 mb-4" role="status" aria-live="polite">
                    {isRemoteTyping ? 'Signal detected...' : 'Computing...'}
                </div>
            )}
            <div ref={messagesEndRef} />
         </div>
      </div>

      {/* Input Area */}
      <div className="bg-void-black/90 backdrop-blur-xl border-t border-white/10 p-4 sticky bottom-0 z-20">
         <form onSubmit={handleSendMessage} className="max-w-2xl mx-auto flex gap-3 items-center" role="search" aria-label="Message input">

            {/* Mic Button */}
            <button
                type="button"
                onClick={toggleListening}
                className={`p-3 rounded-xl transition-all ${isListening ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}
                aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                aria-pressed={isListening}
                title={isListening ? 'Stop listening' : 'Voice input'}
            >
                {isListening ? <Loader2 size={20} className="animate-spin" aria-hidden="true" /> : <Mic size={20} aria-hidden="true" />}
            </button>

            <input
                value={inputText}
                onChange={handleTyping}
                placeholder={isListening ? "Listening..." : "Broadcast message..."}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 outline-none focus:border-zinc-600 transition-all placeholder:text-zinc-600"
                aria-label="Message"
                disabled={status !== ConnectionStatus.CONNECTED}
            />
            <button
              disabled={!inputText.trim() || status !== ConnectionStatus.CONNECTED}
              type="submit"
              className="bg-neon-green text-black p-3 rounded-xl hover:scale-105 disabled:opacity-50 disabled:scale-100 transition-all"
              aria-label="Send message"
              title="Send"
            >
                <Send size={20} aria-hidden="true" />
            </button>
         </form>
      </div>

      <SettingsPanel 
          isOpen={showSettings} 
          onClose={() => setShowSettings(false)}
          currentLang={prefs.language}
          setLang={(l) => updatePref('language', l)}
          currentMood={prefs.mood}
          setMood={(m) => updatePref('mood', m)}
          sfx={prefs.sfxEnabled}
          toggleSfx={() => updatePref('sfxEnabled', !prefs.sfxEnabled)}
          voice={prefs.voiceEnabled}
          toggleVoice={() => updatePref('voiceEnabled', !prefs.voiceEnabled)}
      />
    </div>
  );
};

export default App;
