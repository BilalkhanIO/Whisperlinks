import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { Message, SenderType, ConnectionStatus, ChatMood, ChatMode, ChatLanguage, UserInfo } from './types';
import { sendMessageToGemini, sendMessageStreaming, initializeChatSession, resetSession } from './services/geminiService';
import { ChatMessage } from './components/ChatMessage';
import { EncryptionEffect } from './components/EncryptionEffect';
import { TypingBubble } from './components/TypingBubble';
import { MoodPicker } from './components/MoodPicker';
import { LanguagePicker } from './components/LanguagePicker';
import { QuickCommands } from './components/QuickCommands';
import { getMoodConfig, getLanguageConfig } from './constants';
import { Send, Power, Terminal, Shield, UserPlus, Copy, Users, Bot, Sparkles, Menu, X } from 'lucide-react';

// ─── SOUND FX (tiny inline beeps) ────────────────────────────
const playSound = (type: 'send' | 'receive' | 'connect') => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const freqs = { send: 880, receive: 660, connect: 440 };
    osc.frequency.value = freqs[type];
    osc.type = 'sine';
    gain.gain.value = 0.03;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) { /* silent fail */ }
};

const App: React.FC = () => {
  // --- STATE ---
  const [username, setUsername] = useState('');
  const [isInLobby, setIsInLobby] = useState(true);

  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.IDLE);
  const [mode, setMode] = useState<ChatMode>('AI');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [mood, setMood] = useState<ChatMood>('FUNNY');
  const [language, setLanguage] = useState<ChatLanguage>('EN');
  const [showInviteToast, setShowInviteToast] = useState(false);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [showCommands, setShowCommands] = useState(false);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Participant State
  const [participants, setParticipants] = useState<UserInfo[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);

  // --- REFS ---
  const peerRef = useRef<Peer | null>(null);
  const connectionsRef = useRef<Map<string, DataConnection>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isHostRef = useRef<boolean>(false);
  const moodRef = useRef<ChatMood>('FUNNY');
  const languageRef = useRef<ChatLanguage>('EN');
  const usernameRef = useRef<string>('');
  const lastAiTriggerRef = useRef<number>(0);
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamingMsgIdRef = useRef<string | null>(null);
  const groupInactivityRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const groupPeriodicRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastGroupMsgRef = useRef<{ text: string; sender: string }>({ text: '', sender: '' });
  const aiRespondingRef = useRef<boolean>(false);

  const hasApiKey = !!process.env.API_KEY;
  const moodConfig = useMemo(() => getMoodConfig(mood), [mood]);
  const langConfig = useMemo(() => getLanguageConfig(language), [language]);

  // --- EFFECTS ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('join')) setMode('P2P');
  }, []);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  // --- MESSAGE HELPERS ---

  const addMessage = useCallback((text: string, sender: SenderType, msgUsername?: string) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    setMessages((prev) => [...prev, {
      id,
      text,
      sender,
      username: msgUsername,
      timestamp: new Date(),
      isEncrypted: sender === SenderType.STRANGER
    }]);
    return id;
  }, []);

  /** Create or update a streaming message in-place */
  const upsertStreamingMessage = useCallback((id: string, text: string, sender: SenderType, msgUsername?: string) => {
    setMessages(prev => {
      const idx = prev.findIndex(m => m.id === id);
      if (idx === -1) {
        return [...prev, { id, text, sender, username: msgUsername, timestamp: new Date(), isEncrypted: false, isStreaming: true }];
      }
      const updated = [...prev];
      updated[idx] = { ...updated[idx], text, isStreaming: true };
      return updated;
    });
  }, []);

  const finalizeStreamingMessage = useCallback((id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, isStreaming: false } : m));
  }, []);

  // --- LOBBY HANDLERS ---

  const handleEnterVoid = (selectedMode: ChatMode) => {
    if (!username.trim()) return;

    setIsInLobby(false);
    setMode(selectedMode);
    usernameRef.current = username;

    const params = new URLSearchParams(window.location.search);
    const joinParam = params.get('join');

    if (selectedMode === 'AI') {
      handleConnectAI();
    } else {
      joinParam ? initializePeer(false, joinParam) : initializePeer(true);
    }
  };

  // --- P2P LOGIC ---

  const initializePeer = (isHost: boolean, hostId?: string) => {
    setStatus(ConnectionStatus.SEARCHING);
    isHostRef.current = isHost;

    if (peerRef.current) peerRef.current.destroy();
    connectionsRef.current.clear();

    const peer = new Peer();
    peerRef.current = peer;

    peer.on('open', (id) => {
      setPeerId(id);
      setParticipants([{ peerId: id, username: usernameRef.current, isHost }]);

      if (isHost) {
        setStatus(ConnectionStatus.WAITING_FOR_PEER);
        addMessage(`SECURE ROOM CREATED`, SenderType.SYSTEM);

        if (hasApiKey) {
          initializeChatSession('', mood, language, usernameRef.current)
            .catch(() => console.log("AI init deferred"));
        }
      } else if (hostId) {
        addMessage(`CONNECTING TO SECURE ROOM...`, SenderType.SYSTEM);
        const conn = peer.connect(hostId);
        setupConnection(conn);
      }
    });

    peer.on('connection', (conn) => setupConnection(conn));

    peer.on('error', (err) => {
      console.error('Peer error:', err);
      if (err.type === 'peer-unavailable') {
        addMessage(`ERROR: ROOM NOT FOUND`, SenderType.SYSTEM);
      }
      if (!connectionsRef.current.size && !isHostRef.current) {
        setStatus(ConnectionStatus.DISCONNECTED);
      }
    });
  };

  const setupConnection = (conn: DataConnection) => {
    connectionsRef.current.set(conn.peer, conn);

    conn.on('open', () => {
      setStatus(ConnectionStatus.CONNECTED);
      if (soundEnabled) playSound('connect');

      // Start group AI timers when P2P connects
      if (hasApiKey && isHostRef.current) startGroupTimers();

      conn.send({
        type: 'handshake',
        user: { peerId: peerRef.current?.id, username: usernameRef.current, isHost: isHostRef.current }
      });

      if (isHostRef.current) {
        conn.send({ type: 'mood_update', mood: moodRef.current });
        conn.send({ type: 'language_update', language: languageRef.current });
      }
    });

    conn.on('data', (data: any) => handleDataPacket(data, conn.peer));

    conn.on('close', () => {
      addMessage(`USER DISCONNECTED`, SenderType.SYSTEM);
      connectionsRef.current.delete(conn.peer);
      setParticipants(prev => prev.filter(p => p.peerId !== conn.peer));
      if (connectionsRef.current.size === 0 && !isHostRef.current) {
        setStatus(ConnectionStatus.DISCONNECTED);
      }
    });
  };

  const handleDataPacket = (data: any, senderPeerId: string) => {
    switch (data.type) {
      case 'handshake': {
        const newUser = data.user;
        setParticipants(prev => {
          if (prev.find(p => p.peerId === newUser.peerId)) return prev;
          const newList = [...prev, newUser];
          if (isHostRef.current) {
            broadcastData({ type: 'sync_participants', participants: newList });
          }
          return newList;
        });
        break;
      }
      case 'sync_participants':
        setParticipants(data.participants);
        break;

      case 'message':
        setIsTyping(false);
        addMessage(data.text, SenderType.STRANGER, data.username);
        if (soundEnabled) playSound('receive');
        if (isHostRef.current) {
          broadcastData({ type: 'message', text: data.text, username: data.username }, senderPeerId);
          triggerGroupAI(data.text, data.username);
        }
        break;

      case 'typing':
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 2000);
        if (isHostRef.current) {
          broadcastData({ type: 'typing' }, senderPeerId);
        }
        break;

      case 'mood_update': {
        setMood(data.mood);
        moodRef.current = data.mood;
        const mc = getMoodConfig(data.mood);
        addMessage(`HOST → ${mc.name.toUpperCase()} MODE ${mc.icon}`, SenderType.SYSTEM);
        break;
      }
      case 'language_update': {
        setLanguage(data.language);
        languageRef.current = data.language;
        const lc = getLanguageConfig(data.language);
        addMessage(`LANGUAGE → ${lc.label.toUpperCase()} ${lc.flag}`, SenderType.SYSTEM);
        break;
      }
    }
  };

  const broadcastData = (data: any, excludePeerId?: string) => {
    connectionsRef.current.forEach((conn, pid) => {
      if (pid !== excludePeerId && conn.open) conn.send(data);
    });
  };

  // --- AI LOGIC ---

  /**
   * AI MESSAGE MEMORY:
   * - The Gemini Chat session maintains full conversation history.
   * - Every message sent to AI is prefixed with "Username: message"
   *   so the AI always knows WHO said what.
   * - In P2P mode, all group messages flow through the AI with attribution.
   *
   * GROUP AI TRIGGER RULES:
   * 1. ALWAYS trigger on commands (/roast, /fact, /topic)
   * 2. ALWAYS trigger on mentions (bot keywords)
   * 3. Auto-jump after 30s of group SILENCE (no new messages)
   * 4. Auto-jump every 60s even if group is active
   */

  const stopGroupTimers = () => {
    if (groupInactivityRef.current) { clearTimeout(groupInactivityRef.current); groupInactivityRef.current = null; }
    if (groupPeriodicRef.current) { clearInterval(groupPeriodicRef.current); groupPeriodicRef.current = null; }
  };

  const startGroupTimers = () => {
    stopGroupTimers();

    // 30s inactivity timer — if nobody talks for 30s, AI jumps in
    groupInactivityRef.current = setTimeout(() => {
      if (!aiRespondingRef.current) {
        fireGroupAI(lastGroupMsgRef.current.text || 'The group has been quiet...', lastGroupMsgRef.current.sender || 'system', true);
      }
    }, 30000);

    // 60s periodic timer — AI jumps in every 60s regardless
    groupPeriodicRef.current = setInterval(() => {
      if (!aiRespondingRef.current) {
        fireGroupAI('', '', true);
      }
    }, 60000);
  };

  // Clean up timers on unmount or mode change
  useEffect(() => {
    return () => stopGroupTimers();
  }, []);

  /** Actually fire an AI response in group mode */
  const fireGroupAI = async (triggerText: string, senderName: string, isAutoJump: boolean = false) => {
    if (!hasApiKey || aiRespondingRef.current) return;
    aiRespondingRef.current = true;

    const delay = isAutoJump ? 500 : (400 + Math.random() * 400);

    setTimeout(async () => {
      setIsTyping(true);
      broadcastData({ type: 'typing' });

      try {
        let prompt: string;

        if (isAutoJump && !triggerText) {
          // Periodic jump-in — AI comments on the conversation naturally
          prompt = `[SYSTEM: The group has been chatting. Jump into the conversation naturally with a comment, joke, or observation. Be brief.]`;
        } else {
          prompt = `${senderName}: ${triggerText}`;
        }

        const lower = (triggerText || '').toLowerCase();
        if (lower.startsWith('/roast')) prompt += " [SYSTEM: ROAST THIS USER MERCILESSLY]";
        else if (lower.startsWith('/topic')) prompt += " [SYSTEM: SUGGEST A WILD TOPIC]";
        else if (lower.startsWith('/fact')) prompt += " [SYSTEM: FACT-CHECK THIS. Start with [VERIFIED], [FALSE], [UNVERIFIED], or [MISLEADING]]";

        const response = await sendMessageToGemini(prompt);

        setIsTyping(false);
        const persona = getMoodConfig(moodRef.current).persona;
        addMessage(response, SenderType.STRANGER, persona);
        broadcastData({ type: 'message', text: response, username: persona });
        if (soundEnabled) playSound('receive');

        lastAiTriggerRef.current = Date.now();
      } catch (e) {
        setIsTyping(false);
      } finally {
        aiRespondingRef.current = false;
        // Reset the inactivity timer after AI responds
        if (groupInactivityRef.current) clearTimeout(groupInactivityRef.current);
        groupInactivityRef.current = setTimeout(() => {
          if (!aiRespondingRef.current) {
            fireGroupAI('', '', true);
          }
        }, 30000);
      }
    }, delay);
  };

  /** Decide if group AI should trigger based on message content */
  const triggerGroupAI = (triggerText: string, senderName: string) => {
    if (!hasApiKey) return;

    // Store last message for inactivity context
    lastGroupMsgRef.current = { text: triggerText, sender: senderName };

    // Reset the 30s inactivity timer on every new message
    if (groupInactivityRef.current) clearTimeout(groupInactivityRef.current);
    groupInactivityRef.current = setTimeout(() => {
      if (!aiRespondingRef.current) {
        fireGroupAI(triggerText, senderName, true);
      }
    }, 30000);

    const lower = triggerText.toLowerCase();
    const isCommand = lower.startsWith('/roast') || lower.startsWith('/topic') || lower.startsWith('/fact');

    const keywords = ['lala', 'ghamgeen', 'savage', 'zen', 'factbot', 'khan', 'oye', 'bot', 'ai', 'chup', 'kaisa', 'hello', 'hi', 'bhai', 'yaara', 'bro'];
    const isMention = keywords.some(k => lower.includes(k));

    // Trigger immediately on commands or mentions
    if (isCommand || isMention) {
      fireGroupAI(triggerText, senderName);
    }
  };

  const handleConnectAI = async () => {
    setStatus(ConnectionStatus.SEARCHING);
    resetSession();

    // Fast connection animation
    let step = 0;
    const interval = setInterval(() => {
      if (step >= 2) {
        clearInterval(interval);
        setStatus(ConnectionStatus.CONNECTED);
        if (soundEnabled) playSound('connect');

        if (!hasApiKey) {
          addMessage("ERROR: API KEY NOT FOUND", SenderType.SYSTEM);
          return;
        }

        // Initialize with mood, language, and username for personalized context
        initializeChatSession('', mood, language, usernameRef.current);

        const mc = getMoodConfig(mood);
        setMessages([
          { id: 'sys-1', text: `CONNECTED TO VOID NETWORK`, sender: SenderType.SYSTEM, timestamp: new Date() },
          { id: 'sys-2', text: `${mc.persona} entered the chat ${mc.icon}`, sender: SenderType.SYSTEM, timestamp: new Date() }
        ]);

        // Stream the greeting for instant feel
        setTimeout(async () => {
          setIsTyping(true);
          try {
            const greetingPrompt = `Greet ${usernameRef.current} in your unique style. Be punchy. 1-2 sentences max.`;
            const streamId = Date.now().toString(36) + 'greet';
            streamingMsgIdRef.current = streamId;

            setIsTyping(false);

            await sendMessageStreaming(greetingPrompt, (chunk) => {
              upsertStreamingMessage(streamId, chunk, SenderType.STRANGER, mc.persona);
            });

            finalizeStreamingMessage(streamId);
            if (soundEnabled) playSound('receive');
          } catch (e) {
            setIsTyping(false);
          }
        }, 800);
      }
      step++;
    }, 400);
  };

  // --- GENERAL HANDLERS ---

  const handleDisconnect = () => {
    peerRef.current?.destroy();
    connectionsRef.current.clear();
    stopGroupTimers();
    setStatus(ConnectionStatus.DISCONNECTED);
    setIsInLobby(true);
    setMessages([]);
    setParticipants([]);
    window.history.pushState({}, '', window.location.pathname);
  };

  const handleMoodChange = async (newMood: ChatMood) => {
    if (mode === 'P2P' && !isHostRef.current) return;

    setMood(newMood);
    moodRef.current = newMood;
    setShowMoodPicker(false);

    if (mode === 'P2P' && isHostRef.current) {
      broadcastData({ type: 'mood_update', mood: newMood });
    }

    if (status === ConnectionStatus.CONNECTED) {
      const mc = getMoodConfig(newMood);
      addMessage(`⚡ ${mc.name.toUpperCase()} MODE ${mc.icon}`, SenderType.SYSTEM);
      resetSession();
      if (hasApiKey) {
        await initializeChatSession('', newMood, language, usernameRef.current);
      }
    }
  };

  const handleLanguageChange = async (newLang: ChatLanguage) => {
    if (mode === 'P2P' && !isHostRef.current) return;

    setLanguage(newLang);
    languageRef.current = newLang;

    if (mode === 'P2P' && isHostRef.current) {
      broadcastData({ type: 'language_update', language: newLang });
    }

    if (status === ConnectionStatus.CONNECTED) {
      const lc = getLanguageConfig(newLang);
      addMessage(`🌐 ${lc.label.toUpperCase()} ${lc.flag}`, SenderType.SYSTEM);
      resetSession();
      if (hasApiKey) {
        await initializeChatSession('', mood, newLang, usernameRef.current);
      }
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    const userMsg = inputText.trim();
    setInputText('');
    setShowCommands(false);
    addMessage(userMsg, SenderType.USER, usernameRef.current);
    if (soundEnabled) playSound('send');

    // Refocus input for mobile
    requestAnimationFrame(() => inputRef.current?.focus());

    if (mode === 'P2P') {
      broadcastData({ type: 'message', text: userMsg, username: usernameRef.current });
      if (isHostRef.current) triggerGroupAI(userMsg, usernameRef.current);
    }

    if (mode === 'AI' && status === ConnectionStatus.CONNECTED) {
      const lower = userMsg.toLowerCase();

      if (lower.startsWith('/mood')) {
        setShowMoodPicker(true);
        return;
      }
      if (lower.startsWith('/lang')) {
        addMessage("Use the language selector above to switch 🌐", SenderType.SYSTEM);
        return;
      }

      // === SOLO AI: RESPOND INSTANTLY TO EVERY MESSAGE ===
      // No delay, no mention check — this is a 1-on-1 conversation
      setIsTyping(true);

      try {
        // Always prefix with username so AI remembers who is talking
        let prompt = `${usernameRef.current}: ${userMsg}`;

        if (lower.startsWith('/roast')) prompt += " [SYSTEM: ROAST ME BRUTALLY]";
        if (lower.startsWith('/fact')) prompt += " [SYSTEM: FACT-CHECK THIS. Start with [VERIFIED], [FALSE], [UNVERIFIED], or [MISLEADING]]";
        if (lower.startsWith('/topic')) prompt += " [SYSTEM: SUGGEST A WILD TOPIC]";

        const streamId = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
        streamingMsgIdRef.current = streamId;
        setIsTyping(false);

        await sendMessageStreaming(prompt, (chunk) => {
          upsertStreamingMessage(streamId, chunk, SenderType.STRANGER, moodConfig.persona);
        });

        finalizeStreamingMessage(streamId);
        if (soundEnabled) playSound('receive');
      } catch (error) {
        setIsTyping(false);
        addMessage("⚡ Connection hiccup... try again!", SenderType.SYSTEM);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);
    setShowCommands(val === '/');

    if (mode === 'P2P' && connectionsRef.current) {
      if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
      typingDebounceRef.current = setTimeout(() => {
        broadcastData({ type: 'typing' });
      }, 300);
    }
  };

  const handleCommandSelect = (cmd: string) => {
    setInputText(cmd);
    setShowCommands(false);
    inputRef.current?.focus();
  };

  // --- RENDER: LOBBY ---

  if (isInLobby) {
    return (
      <div className="h-screen-safe w-full bg-void-black text-zinc-200 font-sans relative overflow-hidden flex flex-col">
        <div className="flex flex-col items-center justify-center h-full px-4 py-6 text-center overflow-y-auto">
          {/* Logo */}
          <div className="relative mb-5 animate-fade-in">
            <div className="absolute -inset-3 rounded-full blur-2xl opacity-15 animate-pulse" style={{ background: moodConfig.accentHex }} />
            <div className="relative bg-void-dark p-4 rounded-full border border-void-gray/50 shadow-2xl">
              <Shield size={36} className="text-zinc-100" />
            </div>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-300 to-zinc-600 mb-0.5 animate-fade-in">
            WhisperLink
          </h1>
          <p className="text-zinc-700 text-[10px] mb-5 font-mono tracking-[0.3em] animate-fade-in">NOVA v4.0</p>

          <div className="w-full max-w-sm space-y-4 animate-slide-up">
            {/* Codename */}
            <input
              type="text"
              placeholder="ENTER CODENAME..."
              className="w-full bg-void-dark border border-void-gray/50 text-center text-zinc-100 px-4 py-3 rounded-xl focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/20 outline-none font-mono uppercase tracking-widest transition-all text-sm"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={12}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && username.trim() && handleEnterVoid('AI')}
            />

            {/* Language */}
            <div className="space-y-1.5">
              <label className="text-[9px] text-zinc-700 font-mono tracking-[0.2em] uppercase">Language</label>
              <LanguagePicker selected={language} onSelect={setLanguage} />
            </div>

            {/* Mood */}
            <div className="space-y-1.5">
              <label className="text-[9px] text-zinc-700 font-mono tracking-[0.2em] uppercase">Mood</label>
              <MoodPicker selected={mood} onSelect={setMood} />
            </div>

            {/* Persona preview */}
            <div className="flex items-center justify-center gap-2 py-1.5 text-zinc-600">
              <span className="text-sm">{moodConfig.icon}</span>
              <span className="text-[10px] font-mono">You'll chat with <strong className="text-zinc-400">{moodConfig.persona}</strong></span>
            </div>

            {/* Mode buttons */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => handleEnterVoid('AI')}
                disabled={!username.trim()}
                className="flex flex-col items-center justify-center p-3.5 bg-zinc-900/50 border border-zinc-800/50 rounded-xl hover:bg-zinc-800/50 hover:border-zinc-700 disabled:opacity-30 transition-all group active:scale-95"
              >
                <Bot size={22} className="mb-1.5 text-neon-purple group-hover:scale-110 transition-transform duration-150" />
                <span className="text-[10px] font-bold text-zinc-500 tracking-wider">SOLO (AI)</span>
              </button>
              <button
                onClick={() => handleEnterVoid('P2P')}
                disabled={!username.trim()}
                className="flex flex-col items-center justify-center p-3.5 bg-zinc-900/50 border border-zinc-800/50 rounded-xl hover:bg-zinc-800/50 hover:border-zinc-700 disabled:opacity-30 transition-all group active:scale-95"
              >
                <Users size={22} className="mb-1.5 text-neon-green group-hover:scale-110 transition-transform duration-150" />
                <span className="text-[10px] font-bold text-zinc-500 tracking-wider">GROUP (P2P)</span>
              </button>
            </div>

            {!hasApiKey && <div className="text-red-500/80 text-[10px] font-mono">⚠️ API_KEY MISSING</div>}
          </div>
        </div>
        <BgGrid />
      </div>
    );
  }

  // --- RENDER: LOADING ---

  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center h-full gap-5 px-6">
      {status === ConnectionStatus.WAITING_FOR_PEER ? (
        <div className="flex flex-col items-center gap-3 max-w-sm text-center animate-fade-in">
          <div className="w-14 h-14 rounded-full flex items-center justify-center animate-pulse" style={{ backgroundColor: `${moodConfig.accentHex}12` }}>
            <Users size={28} style={{ color: moodConfig.accentHex }} />
          </div>
          <h2 className="text-lg font-bold text-white">Room Secure</h2>
          <p className="text-zinc-500 text-xs">Share link to invite agents</p>

          <button
            onClick={() => {
              if (peerId) {
                navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?join=${peerId}`);
                setShowInviteToast(true);
                setTimeout(() => setShowInviteToast(false), 2500);
              }
            }}
            className="flex items-center gap-2 bg-void-gray/50 hover:bg-zinc-700/50 px-4 py-2.5 rounded-xl border border-zinc-600/50 transition-all active:scale-95 mt-1"
          >
            <span className="font-mono text-[11px] tracking-wider" style={{ color: moodConfig.accentHex }}>{peerId ? 'COPY LINK' : '...'}</span>
            <Copy size={13} className="text-zinc-400" />
          </button>
          {showInviteToast && <span className="text-[11px] animate-fade-in" style={{ color: moodConfig.accentHex }}>✓ Copied</span>}
        </div>
      ) : (
        <div className="text-center animate-fade-in">
          <div className="font-mono text-xs tracking-widest mb-3" style={{ color: moodConfig.accentHex }}>
            <EncryptionEffect
              text={status === ConnectionStatus.DISCONNECTED ? "UPLINK SEVERED" : "ESTABLISHING HANDSHAKE..."}
              duration={1500}
            />
          </div>
          <div className="w-40 h-[2px] bg-void-gray rounded-full overflow-hidden mx-auto">
            <div className="h-full animate-progress-indeterminate w-1/3 rounded-full" style={{ backgroundColor: moodConfig.accentHex }} />
          </div>
        </div>
      )}
    </div>
  );

  // --- RENDER: MAIN CHAT ---

  return (
    <div className="h-screen-safe w-full bg-void-black text-zinc-200 font-sans relative overflow-hidden flex flex-col">

      {/* HEADER */}
      {status === ConnectionStatus.CONNECTED && (
        <header className="w-full z-20 px-3 py-2 bg-void-black/95 backdrop-blur-xl border-b border-white/[0.04] safe-top shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <button onClick={() => setShowSidebar(true)} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors md:hidden active:scale-90">
                <Menu size={17} />
              </button>
              <div className="flex items-center gap-1.5">
                <span className="text-base">{moodConfig.icon}</span>
                <div className="flex flex-col">
                  <span className="font-bold text-xs text-white tracking-wide leading-none">{moodConfig.persona.toUpperCase()}</span>
                  <span className="font-mono text-[8px] flex items-center gap-1 mt-0.5" style={{ color: moodConfig.accentHex }}>
                    <span className="w-1 h-1 rounded-full animate-pulse inline-block" style={{ backgroundColor: moodConfig.accentHex }} />
                    {langConfig.flag} ONLINE
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-1 items-center">
              <div className="hidden sm:flex">
                <LanguagePicker selected={language} onSelect={handleLanguageChange} compact />
              </div>

              {(mode === 'AI' || isHostRef.current) && (
                <button onClick={() => setShowMoodPicker(!showMoodPicker)}
                  className="p-1.5 rounded-full transition-all bg-void-dark border border-zinc-800/50 hover:border-zinc-600 active:scale-90"
                  style={{ color: moodConfig.accentHex }}>
                  <Sparkles size={14} />
                </button>
              )}

              {/* Sound toggle */}
              <button onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-1.5 rounded-full transition-all bg-void-dark border border-zinc-800/50 hover:border-zinc-600 active:scale-90 text-[11px] ${soundEnabled ? 'text-zinc-400' : 'text-zinc-700'}`}>
                {soundEnabled ? '🔊' : '🔇'}
              </button>

              <button onClick={() => setShowSidebar(!showSidebar)} className="hidden md:flex p-1.5 text-zinc-500 hover:text-white transition-colors bg-void-dark rounded-full border border-zinc-800/50">
                <Users size={14} />
              </button>

              <button onClick={handleDisconnect} className="p-1.5 text-red-400/80 hover:bg-red-400/10 transition-colors bg-void-dark rounded-full border border-zinc-800/50 active:scale-90">
                <Power size={14} />
              </button>
            </div>
          </div>

          {/* Mood picker dropdown */}
          {showMoodPicker && (
            <div className="mt-1.5 p-1.5 bg-zinc-900/95 backdrop-blur-xl rounded-xl border border-zinc-800/50 animate-slide-up">
              <MoodPicker selected={mood} onSelect={handleMoodChange} compact />
            </div>
          )}

          {/* Mobile extras row */}
          <div className="flex items-center gap-1.5 mt-1.5 sm:hidden overflow-x-auto no-scrollbar">
            <LanguagePicker selected={language} onSelect={handleLanguageChange} compact />
            <div className="w-px h-3 bg-zinc-800/50 shrink-0" />
            <div className="flex items-center gap-1 px-2 py-0.5 bg-white/[0.03] rounded-full shrink-0">
              <Terminal size={9} className="text-zinc-600" />
              <span className="text-[8px] text-zinc-600 font-mono">/roast /fact /topic</span>
            </div>
          </div>
        </header>
      )}

      {/* SIDEBAR */}
      {showSidebar && <div className="fixed inset-0 bg-black/40 z-25 md:hidden" onClick={() => setShowSidebar(false)} />}
      <div className={`fixed inset-y-0 right-0 w-60 bg-zinc-900/95 backdrop-blur-xl border-l border-white/[0.06] transform transition-transform duration-200 z-30 ${showSidebar ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-3 flex justify-between items-center border-b border-white/[0.04]">
          <h3 className="font-bold text-xs tracking-wider flex items-center gap-1.5"><Users size={12} /> AGENTS</h3>
          <button onClick={() => setShowSidebar(false)} className="text-zinc-600 hover:text-white active:scale-90"><X size={16} /></button>
        </div>
        <div className="p-3 space-y-2">
          {participants.map(p => (
            <div key={p.peerId} className="flex items-center gap-2.5 p-2 rounded-lg bg-white/[0.03]">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-600 flex items-center justify-center font-bold text-[10px]">
                {p.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium">{p.username} {p.peerId === peerId && <span className="text-zinc-600">(You)</span>}</span>
                <span className="text-[9px] text-zinc-600 font-mono">{p.isHost ? 'HOST' : 'AGENT'}</span>
              </div>
            </div>
          ))}
          {mode === 'AI' && (
            <div className="flex items-center gap-2.5 p-2 rounded-lg border" style={{ backgroundColor: `${moodConfig.accentHex}06`, borderColor: `${moodConfig.accentHex}20` }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm" style={{ backgroundColor: `${moodConfig.accentHex}15`, color: moodConfig.accentHex }}>
                {moodConfig.icon}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium">{moodConfig.persona}</span>
                <span className="text-[9px] font-mono" style={{ color: moodConfig.accentHex }}>AI · REMEMBERS CONTEXT</span>
              </div>
            </div>
          )}
        </div>
        {mode === 'P2P' && (
          <div className="absolute bottom-3 left-3 right-3">
            <button
              onClick={() => {
                if (peerId) navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?join=${peerId}`);
              }}
              className="w-full py-2.5 text-black font-bold rounded-lg text-[11px] flex items-center justify-center gap-1.5 hover:opacity-90 transition-all active:scale-95"
              style={{ backgroundColor: moodConfig.accentHex }}
            >
              <UserPlus size={13} /> INVITE
            </button>
          </div>
        )}
      </div>

      {/* MESSAGES */}
      <div className="flex-1 relative overflow-hidden flex flex-col">
        {(status === ConnectionStatus.SEARCHING || status === ConnectionStatus.WAITING_FOR_PEER || status === ConnectionStatus.DISCONNECTED) ? renderLoading() : (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto px-2.5 md:px-4 scroll-smooth overscroll-contain">
              <div className="max-w-3xl mx-auto flex flex-col justify-end min-h-full pb-3 pt-1">
                {messages.map((msg) => (
                  <ChatMessage key={msg.id} message={msg} />
                ))}

                {isTyping && (
                  <TypingBubble persona={moodConfig.persona} accentHex={moodConfig.accentHex} />
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* INPUT */}
            <div className="p-2.5 md:p-3 bg-void-black/95 backdrop-blur-xl border-t border-white/[0.04] safe-bottom relative shrink-0">
              <QuickCommands onSelect={handleCommandSelect} visible={showCommands} />

              <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex gap-2 items-end">
                <div className="relative flex-1 bg-zinc-900/40 rounded-2xl border border-white/[0.06] focus-within:border-zinc-600 focus-within:bg-zinc-900/60 transition-all">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={handleInputChange}
                    placeholder={`Message ${mode === 'P2P' ? 'Group' : moodConfig.persona}...`}
                    className="w-full bg-transparent text-zinc-200 px-3.5 py-2.5 outline-none placeholder:text-zinc-700 font-sans text-[13px]"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="p-2.5 text-black rounded-full hover:scale-105 disabled:opacity-25 disabled:scale-100 transition-all active:scale-90"
                  style={{
                    backgroundColor: inputText.trim() ? moodConfig.accentHex : '#3f3f46',
                    boxShadow: inputText.trim() ? `0 2px 16px ${moodConfig.accentHex}25` : 'none'
                  }}
                >
                  <Send size={16} className={inputText.trim() ? "translate-x-[1px]" : ""} />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      <BgGrid />
    </div>
  );
};

// Extracted to avoid re-creation
const BgGrid = React.memo(() => (
  <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.015]" style={{
    backgroundImage: `linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)`,
    backgroundSize: '40px 40px'
  }} />
));
BgGrid.displayName = 'BgGrid';

export default App;