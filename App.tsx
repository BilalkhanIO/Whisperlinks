import React, { useState, useEffect, useRef, useCallback } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { Message, SenderType, ConnectionStatus, ChatMood, ChatMode, UserInfo } from './types';
import {
  sendMessageToGemini, streamMessageToGemini, generateSmartReplies,
  initializeChatSession, resetSession, generateSpeech,
} from './services/geminiService';
import { playSound, decodeAndPlayAudio, speakWithBrowser } from './services/audioService';
import { ChatMessage } from './components/ChatMessage';
import { SmartReplies } from './components/SmartReplies';
import { QRCodeModal } from './components/QRCodeModal';
import { ScrollToBottom } from './components/ScrollToBottom';
import { EncryptionEffect } from './components/EncryptionEffect';
import MatrixRain from './components/MatrixRain';
import { SettingsPanel } from './components/SettingsPanel';
import { loadPrefs, savePrefs } from './utils';
import { COMMANDS, MOOD_META } from './constants';
import { LandingPage } from './components/LandingPage';
import { AboutPage, ContactPage, HelpPage, PrivacyPolicy, TermsPage } from './components/ContentPages';
import { Send, Power, Users, Settings, Mic, Loader2, Terminal, QrCode } from 'lucide-react';

const MAX_MSG_LENGTH = 500;
const WHISPER_TTL = 15_000;
const MAX_RECONNECT_ATTEMPTS = 3;

const App: React.FC = () => {
  // ── Navigation ──
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [isInLobby, setIsInLobby] = useState(true);

  // ── Preferences ──
  const [prefs, setPrefs] = useState(loadPrefs());

  // ── Connection ──
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.IDLE);
  const [mode, setMode] = useState<ChatMode>('AI');
  const [peerId, setPeerId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<UserInfo[]>([]);

  // ── Chat ──
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLocalTyping, setIsLocalTyping] = useState(false);
  const [isRemoteTyping, setIsRemoteTyping] = useState(false);
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isWhisperMode, setIsWhisperMode] = useState(false);

  // ── UI ──
  const [showSettings, setShowSettings] = useState(false);
  const [showCommandHints, setShowCommandHints] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showInviteToast, setShowInviteToast] = useState(false);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isListening, setIsListening] = useState(false);

  // ── Refs ──
  const peerRef = useRef<Peer | null>(null);
  const connectionsRef = useRef<Map<string, DataConnection>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isHostRef = useRef<boolean>(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const lastActivityTimeRef = useRef<number>(Date.now());
  const aiTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectHostIdRef = useRef<string | null>(null);

  const hasApiKey = !!process.env.API_KEY;

  // ── Helpers ──
  const getAiName = (mood: ChatMood): string => MOOD_META[mood].name;

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  // ── Effects ──
  useEffect(() => {
    const h = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', h);
    return () => window.removeEventListener('popstate', h);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('join')) setMode('P2P');
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { setShowSettings(false); setShowCommandHints(false); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // Auto-scroll when not scrolled up
  useEffect(() => {
    if (!isScrolledUp) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      setUnreadCount(c => c + 1);
    }
  }, [messages]);

  // Whisper mode expiry cleanup
  useEffect(() => {
    const id = setInterval(() => {
      setMessages(prev => prev.filter(m => !m.expiresAt || m.expiresAt > Date.now()));
    }, 500);
    return () => clearInterval(id);
  }, []);

  // Scroll position tracking
  const handleScrollContainer = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setIsScrolledUp(!atBottom);
    if (atBottom) setUnreadCount(0);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setIsScrolledUp(false);
    setUnreadCount(0);
  };

  // ── Settings ──
  const updatePref = (key: keyof typeof prefs, value: unknown) => {
    const newPrefs = { ...prefs, [key]: value };
    setPrefs(newPrefs);
    savePrefs(newPrefs);
    if (status === ConnectionStatus.CONNECTED && (key === 'mood' || key === 'language')) {
      initializeChatSession(newPrefs.mood, newPrefs.language);
      if (mode === 'P2P' && isHostRef.current) broadcastData({ type: 'sys_update', mood: newPrefs.mood, lang: newPrefs.language });
      addSystemMsg(`RECONFIGURING → [${String(value)}]`);
    }
  };

  // ── Message helpers ──
  const addSystemMsg = (text: string) => {
    if (prefs.sfxEnabled) playSound('message');
    setMessages(p => [...p, { id: Math.random().toString(36), text, sender: SenderType.SYSTEM, timestamp: new Date() }]);
  };

  const addMessage = (text: string, sender: SenderType, username?: string, opts: Partial<Message> = {}) => {
    if (prefs.sfxEnabled) playSound('message');
    setMessages(p => [...p, {
      id: Math.random().toString(36),
      text, sender, username,
      timestamp: new Date(),
      isEncrypted: sender === SenderType.STRANGER && !opts.isStreaming,
      ...opts,
    }]);
  };

  // ── Voice input ──
  const toggleListening = () => {
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const SpeechRecognitionAPI =
      (window as typeof window & { SpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ||
      (window as typeof window & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) { alert("Voice input not supported in this browser."); return; }

    const rec = new SpeechRecognitionAPI();
    rec.continuous = false;
    rec.interimResults = false;
    const langMap: Record<string, string> = { SPANISH: 'es-ES', FRENCH: 'fr-FR', GERMAN: 'de-DE', JAPANESE: 'ja-JP', ARABIC: 'ar-SA', HINDI: 'hi-IN' };
    rec.lang = langMap[prefs.language] || 'en-US';
    rec.onstart = () => { setIsListening(true); if (prefs.sfxEnabled) playSound('send'); };
    rec.onend = () => setIsListening(false);
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const t = e.results[0][0].transcript;
      setInputText(prev => (prev ? prev + ' ' : '') + t);
    };
    recognitionRef.current = rec;
    rec.start();
  };

  // ── Lobby ──
  const handleEnterVoid = (selectedMode: ChatMode) => {
    if (!prefs.username.trim()) return;
    savePrefs(prefs);
    if (prefs.sfxEnabled) playSound('connect');
    setIsInLobby(false);
    setMode(selectedMode);
    const joinParam = new URLSearchParams(window.location.search).get('join');
    if (selectedMode === 'AI') handleConnectAI();
    else joinParam ? initializePeer(false, joinParam) : initializePeer(true);
  };

  // ── P2P ──
  const initializePeer = (isHost: boolean, hostId?: string) => {
    setStatus(ConnectionStatus.SEARCHING);
    isHostRef.current = isHost;
    if (hostId) reconnectHostIdRef.current = hostId;
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
        addSystemMsg('CONNECTING TO SECURE ROOM...');
        setupConnection(peer.connect(hostId));
      }
    });

    peer.on('connection', setupConnection);
    peer.on('error', (err) => {
      if (prefs.sfxEnabled) playSound('error');
      const msgMap: Record<string, string> = {
        'peer-unavailable': 'PEER UNAVAILABLE — INVALID OR EXPIRED LINK',
        'network': 'NETWORK ERROR — CHECK YOUR CONNECTION',
      };
      addSystemMsg(msgMap[err.type] ?? `CONNECTION ERROR: ${err.type?.toUpperCase() ?? 'UNKNOWN'}`);
      setStatus(ConnectionStatus.DISCONNECTED);
      tryAutoReconnect();
    });
  };

  const tryAutoReconnect = useCallback(() => {
    const hostId = reconnectHostIdRef.current;
    if (!hostId || isHostRef.current) return;
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      addSystemMsg(`AUTO-RECONNECT FAILED AFTER ${MAX_RECONNECT_ATTEMPTS} ATTEMPTS`);
      return;
    }
    reconnectAttemptsRef.current++;
    const delay = 2000 * reconnectAttemptsRef.current;
    addSystemMsg(`RECONNECTING… ATTEMPT ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS}`);
    setTimeout(() => initializePeer(false, hostId), delay);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setupConnection = (conn: DataConnection) => {
    connectionsRef.current.set(conn.peer, conn);
    conn.on('open', () => {
      setStatus(ConnectionStatus.CONNECTED);
      reconnectAttemptsRef.current = 0;
      if (prefs.sfxEnabled) playSound('connect');
      conn.send({ type: 'handshake', user: { peerId: peerRef.current?.id, username: prefs.username, isHost: isHostRef.current } });
      if (isHostRef.current) conn.send({ type: 'sys_update', mood: prefs.mood, lang: prefs.language });
    });
    conn.on('data', (data: unknown) => handleDataPacket(data as Record<string, unknown>, conn.peer));
    conn.on('close', () => {
      connectionsRef.current.delete(conn.peer);
      setParticipants(prev => prev.filter(p => p.peerId !== conn.peer));
      if (connectionsRef.current.size === 0 && !isHostRef.current) {
        setStatus(ConnectionStatus.DISCONNECTED);
        tryAutoReconnect();
      }
    });
  };

  const handleDataPacket = (data: Record<string, unknown>, senderPeerId: string) => {
    switch (data.type) {
      case 'handshake':
        setParticipants(prev => {
          const u = data.user as UserInfo;
          if (prev.find(p => p.peerId === u.peerId)) return prev;
          const next = [...prev, u];
          if (isHostRef.current) broadcastData({ type: 'sync_participants', participants: next });
          return next;
        });
        break;
      case 'sync_participants':
        setParticipants(data.participants as UserInfo[]);
        break;
      case 'message':
        setIsRemoteTyping(false);
        addMessage(String(data.text), SenderType.STRANGER, String(data.username));
        lastActivityTimeRef.current = Date.now();
        if (isHostRef.current) {
          broadcastData({ type: 'message', text: data.text, username: data.username }, senderPeerId);
          scheduleSmartResponse(String(data.text), String(data.username));
        }
        break;
      case 'typing':
        setIsRemoteTyping(true);
        lastActivityTimeRef.current = Date.now();
        if (isHostRef.current) scheduleSmartResponse(null, null, true);
        setTimeout(() => setIsRemoteTyping(false), 2000);
        if (isHostRef.current) broadcastData({ type: 'typing' }, senderPeerId);
        break;
      case 'sys_update':
        setPrefs(p => ({ ...p, mood: data.mood as ChatMood, language: data.lang as string }));
        addSystemMsg(`HOST SYNC → [${data.mood}]`);
        break;
      case 'reaction':
        setMessages(prev => prev.map(m => {
          if (m.id !== data.messageId) return m;
          const reactions = { ...(m.reactions ?? {}) };
          const emoji = String(data.emoji);
          const who = String(data.username);
          const users = reactions[emoji] ?? [];
          reactions[emoji] = users.includes(who) ? users.filter(u => u !== who) : [...users, who];
          return { ...m, reactions };
        }));
        break;
    }
  };

  const broadcastData = (data: unknown, excludePeerId?: string) => {
    connectionsRef.current.forEach((conn, pid) => {
      if (pid !== excludePeerId && conn.open) conn.send(data);
    });
  };

  // ── Reaction handler ──
  const handleReact = (messageId: string, emoji: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m;
      const reactions = { ...(m.reactions ?? {}) };
      const users = reactions[emoji] ?? [];
      reactions[emoji] = users.includes(prefs.username)
        ? users.filter(u => u !== prefs.username)
        : [...users, prefs.username];
      return { ...m, reactions };
    }));
    if (mode === 'P2P') broadcastData({ type: 'reaction', messageId, emoji, username: prefs.username });
  };

  // ── AI scheduler (P2P) ──
  const scheduleSmartResponse = useCallback((triggerText: string | null, senderName: string | null, isInterruptionCheck = false) => {
    if (!hasApiKey || mode !== 'P2P' || !isHostRef.current) return;
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    if (triggerText) {
      const lower = triggerText.toLowerCase();
      const aiName = MOOD_META[prefs.mood].name.toLowerCase();
      if (lower.includes('@') || lower.includes(aiName) || lower.includes('bot') || lower.startsWith('/')) {
        triggerGroupAI(triggerText, senderName ?? 'User');
        return;
      }
    }
    const delay = isInterruptionCheck ? 60_000 : 20_000;
    aiTimeoutRef.current = setTimeout(() => {
      if (Date.now() - lastActivityTimeRef.current >= delay) triggerGroupAI("Context Check: Everyone is silent.", "System");
    }, delay);
  }, [prefs.mood, mode, hasApiKey]);

  const triggerGroupAI = async (triggerText: string, senderName: string) => {
    setIsLocalTyping(true);
    broadcastData({ type: 'typing' });
    await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
    try {
      const prompt = senderName === 'System'
        ? "(The group has been silent for a while. Say something to revive the chat.)"
        : `${senderName}: ${triggerText}`;
      const response = await sendMessageToGemini(prompt);
      setIsLocalTyping(false);
      const aiName = getAiName(prefs.mood);
      addMessage(response, SenderType.STRANGER, aiName);
      broadcastData({ type: 'message', text: response, username: aiName });
      lastActivityTimeRef.current = Date.now();
      if (prefs.voiceEnabled) {
        const audio = await generateSpeech(response, prefs.mood);
        if (audio) decodeAndPlayAudio(audio); else speakWithBrowser(response, prefs.mood);
      }
    } catch { setIsLocalTyping(false); }
  };

  // ── AI solo connect ──
  const handleConnectAI = async () => {
    setStatus(ConnectionStatus.SEARCHING);
    resetSession();
    await new Promise(r => setTimeout(r, 1200));
    setStatus(ConnectionStatus.CONNECTED);
    if (prefs.sfxEnabled) playSound('connect');
    if (!hasApiKey) return;
    await initializeChatSession(prefs.mood, prefs.language);
    setIsLocalTyping(true);
    const greeting = await sendMessageToGemini(`(System: New user ${prefs.username} just connected. Greet them briefly in-character.)`);
    setIsLocalTyping(false);
    addMessage(greeting, SenderType.STRANGER, getAiName(prefs.mood));
    const replies = await generateSmartReplies(greeting);
    setSmartReplies(replies);
  };

  // ── Send message + commands ──
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    setInputText('');
    setShowCommandHints(false);
    setSmartReplies([]);

    // ── Commands ──
    if (text.startsWith('/')) {
      const parts = text.split(' ');
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1).join(' ');

      if (cmd === '/clear') { setMessages([]); addSystemMsg('CHAT CLEARED'); return; }

      if (cmd === '/help') {
        addSystemMsg(COMMANDS.map(c => `${c.icon} ${c.cmd} — ${c.desc}`).join('  ·  '));
        return;
      }

      if (cmd === '/whisper') {
        setIsWhisperMode(w => !w);
        addSystemMsg(isWhisperMode ? 'WHISPER MODE OFF — messages persist' : 'WHISPER MODE ON — next messages self-destruct in 15s 👻');
        return;
      }

      if (cmd === '/summary') {
        if (prefs.sfxEnabled) playSound('send');
        const history = messages
          .filter(m => m.sender !== SenderType.SYSTEM)
          .slice(-20)
          .map(m => `${m.username ?? 'User'}: ${m.text}`)
          .join('\n');
        setIsLocalTyping(true);
        const summary = await sendMessageToGemini(`(System: Summarize this conversation in 2-3 concise sentences, stay in character)\n\n${history || 'No messages yet.'}`);
        setIsLocalTyping(false);
        addMessage(summary, SenderType.STRANGER, getAiName(prefs.mood));
        return;
      }

      if (cmd === '/debate') {
        if (!args) { addSystemMsg('Usage: /debate [topic]  e.g. /debate pineapple on pizza'); return; }
        if (prefs.sfxEnabled) playSound('send');
        addSystemMsg(`DEBATE INITIATED: "${args.toUpperCase()}"`);
        setIsLocalTyping(true);
        const forSide = await sendMessageToGemini(`(System: Argue strongly FOR "${args}" in 2-3 sentences. Start with "FOR:" and stay in character.)`);
        addMessage(forSide, SenderType.STRANGER, getAiName(prefs.mood));
        const againstSide = await sendMessageToGemini(`(System: Argue strongly AGAINST "${args}" in 2-3 sentences. Start with "AGAINST:" and stay in character.)`);
        setIsLocalTyping(false);
        addMessage(againstSide, SenderType.STRANGER, getAiName(prefs.mood));
        return;
      }

      if (cmd === '/roast') {
        if (prefs.sfxEnabled) playSound('send');
        const target = args || prefs.username;
        if (mode === 'P2P') { triggerGroupAI(`/roast ${target} — be brutally funny`, prefs.username); return; }
        setIsLocalTyping(true);
        const r = await sendMessageToGemini(`/roast the user "${target}" — make it personal, funny, and savage`);
        setIsLocalTyping(false);
        addMessage(r, SenderType.STRANGER, getAiName(prefs.mood));
        return;
      }

      if (cmd === '/vibe') {
        if (prefs.sfxEnabled) playSound('send');
        if (mode === 'P2P') { triggerGroupAI('/vibe — give a quick vibe-check', prefs.username); return; }
        setIsLocalTyping(true);
        const v = await sendMessageToGemini('Do a quick vibe-check on our conversation. Be brief and in-character.');
        setIsLocalTyping(false);
        addMessage(v, SenderType.STRANGER, getAiName(prefs.mood));
        return;
      }
    }

    // ── Normal message ──
    if (prefs.sfxEnabled) playSound('send');
    const msgOpts: Partial<Message> = {};
    if (replyingTo) { msgOpts.replyTo = { id: replyingTo.id, text: replyingTo.text, username: replyingTo.username }; }
    if (isWhisperMode) { msgOpts.expiresAt = Date.now() + WHISPER_TTL; }
    addMessage(text, SenderType.USER, prefs.username, msgOpts);
    setReplyingTo(null);
    lastActivityTimeRef.current = Date.now();

    if (mode === 'P2P') {
      broadcastData({ type: 'message', text, username: prefs.username });
      if (isHostRef.current) scheduleSmartResponse(text, prefs.username);
    } else {
      // ── Streaming solo AI response ──
      await new Promise(r => setTimeout(r, 600 + Math.random() * 600));
      const streamId = Math.random().toString(36);
      setIsLocalTyping(false);
      setMessages(prev => [...prev, {
        id: streamId, text: '', sender: SenderType.STRANGER,
        username: getAiName(prefs.mood), timestamp: new Date(),
        isEncrypted: false, isStreaming: true,
      }]);
      let fullText = '';
      for await (const chunk of streamMessageToGemini(`${prefs.username}: ${text}`)) {
        fullText += chunk;
        setMessages(prev => prev.map(m => m.id === streamId ? { ...m, text: fullText } : m));
      }
      setMessages(prev => prev.map(m => m.id === streamId ? { ...m, isStreaming: false } : m));

      // Smart replies
      const replies = await generateSmartReplies(fullText);
      setSmartReplies(replies);

      // Voice
      if (prefs.voiceEnabled) {
        const audio = await generateSpeech(fullText, prefs.mood);
        if (audio) decodeAndPlayAudio(audio); else speakWithBrowser(fullText, prefs.mood);
      }
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.length > MAX_MSG_LENGTH) return;
    setInputText(val);
    setShowCommandHints(val === '/' || (val.startsWith('/') && !val.includes(' ')));
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (mode === 'P2P') broadcastData({ type: 'typing' });
  };

  const handleDisconnect = () => {
    if (prefs.sfxEnabled) playSound('error');
    peerRef.current?.destroy();
    reconnectHostIdRef.current = null;
    reconnectAttemptsRef.current = 0;
    setIsInLobby(true);
    setMessages([]);
    setParticipants([]);
    setSmartReplies([]);
    setReplyingTo(null);
    window.history.pushState({}, '', window.location.pathname);
  };

  // ── Content pages ──
  const renderContentPage = () => {
    switch (currentPath) {
      case '/privacy-policy': return <PrivacyPolicy onBack={() => navigateTo('/')} />;
      case '/terms':          return <TermsPage     onBack={() => navigateTo('/')} />;
      case '/contact':        return <ContactPage   onBack={() => navigateTo('/')} />;
      case '/about':          return <AboutPage     onBack={() => navigateTo('/')} />;
      case '/help':           return <HelpPage      onBack={() => navigateTo('/')} />;
      default: return null;
    }
  };

  const contentPage = renderContentPage();
  if (contentPage) return contentPage;

  if (isInLobby) {
    return (
      <LandingPage
        username={prefs.username}
        setUsername={(name) => setPrefs({ ...prefs, username: name })}
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

  const inviteUrl = peerId ? `${window.location.origin}?join=${peerId}` : '';

  return (
    <div className="h-screen w-full bg-void-black text-zinc-200 font-sans flex flex-col relative overflow-hidden">
      <MatrixRain />

      {/* ── Header ── */}
      <header className="px-4 py-3 bg-void-black/90 backdrop-blur-xl border-b border-white/[0.06] flex justify-between items-center z-20 shrink-0">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full shrink-0 ${status === ConnectionStatus.CONNECTED ? 'bg-neon-green animate-pulse' : 'bg-red-500'}`} aria-label={status === ConnectionStatus.CONNECTED ? 'Connected' : 'Disconnected'} />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm text-zinc-200">{mode === 'P2P' ? 'Group Channel' : 'Secure Uplink'}</h2>
              <span className="hidden sm:flex items-center gap-1 bg-void-dark border border-white/8 rounded-full px-2 py-0.5 text-[10px]">
                <span aria-hidden="true">{MOOD_META[prefs.mood].emoji}</span>
                <span className="text-zinc-400 font-mono">{MOOD_META[prefs.mood].name}</span>
              </span>
              {isWhisperMode && <span className="text-[10px] font-mono text-purple-400 animate-pulse">👻 WHISPER</span>}
            </div>
            <div className="flex gap-1.5 text-[10px] font-mono text-zinc-600 mt-0.5">
              <span>{prefs.language.replace('_', ' ')}</span>
              {mode === 'P2P' && <><span>·</span><span>{participants.length} node{participants.length !== 1 ? 's' : ''}</span></>}
            </div>
          </div>
        </div>

        <div className="flex gap-1.5">
          <button onClick={() => setShowSettings(true)} className="p-2 rounded-xl text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-all" aria-label="Settings" title="Settings">
            <Settings size={17} />
          </button>
          {mode === 'P2P' && peerId && (
            <>
              <button
                onClick={() => setShowQR(true)}
                className="p-2 rounded-xl text-zinc-500 hover:text-neon-green hover:bg-neon-green/5 transition-all"
                aria-label="Show QR code" title="QR invite"
              >
                <QrCode size={17} />
              </button>
              <button
                onClick={() => { navigator.clipboard.writeText(inviteUrl); setShowInviteToast(true); setTimeout(() => setShowInviteToast(false), 2500); }}
                className="p-2 rounded-xl text-neon-green hover:bg-neon-green/10 transition-all relative"
                aria-label="Copy invite link" title="Copy link"
              >
                <Users size={17} />
                {showInviteToast && (
                  <div className="absolute top-10 right-0 bg-neon-green text-black text-[10px] px-2.5 py-1 rounded-lg font-bold whitespace-nowrap shadow-lg z-50" role="status">
                    Link copied!
                  </div>
                )}
              </button>
            </>
          )}
          <button onClick={handleDisconnect} className="p-2 rounded-xl text-red-500/70 hover:text-red-400 hover:bg-red-500/10 transition-all" aria-label="Disconnect" title="Disconnect">
            <Power size={17} />
          </button>
        </div>
      </header>

      {/* ── Messages ── */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScrollContainer}
        className="flex-1 overflow-y-auto px-4 pt-4 scroll-smooth z-10"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
      >
        {status === ConnectionStatus.DISCONNECTED && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <p className="text-sm font-bold text-red-400">CONNECTION LOST</p>
            <p className="text-xs text-zinc-600">The peer disconnected or could not be reached.</p>
            <button onClick={handleDisconnect} className="border border-neon-green text-neon-green px-4 py-2 rounded-lg hover:bg-neon-green hover:text-black transition-all text-xs">
              RETURN TO LOBBY
            </button>
          </div>
        )}

        {(status === ConnectionStatus.SEARCHING || status === ConnectionStatus.WAITING_FOR_PEER) && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-500 font-mono text-xs" aria-live="polite">
            <div className="w-8 h-8 border-2 border-neon-green border-t-transparent rounded-full animate-spin" role="status" aria-label="Connecting" />
            <EncryptionEffect text={status === ConnectionStatus.WAITING_FOR_PEER ? 'AWAITING PEER...' : 'ESTABLISHING CONNECTION...'} />
          </div>
        )}

        <div className="max-w-2xl mx-auto flex flex-col justify-end min-h-full pb-4">
          {messages.map(msg => (
            <ChatMessage
              key={msg.id}
              message={msg}
              currentUsername={prefs.username}
              onReact={handleReact}
              onReply={(m) => { setReplyingTo(m); }}
              onExpire={(id) => setMessages(prev => prev.filter(m => m.id !== id))}
            />
          ))}
          {(isLocalTyping || isRemoteTyping) && (
            <div className="text-[10px] text-zinc-600 font-mono animate-pulse ml-10 mb-2" role="status" aria-live="polite">
              {isRemoteTyping ? 'Signal detected…' : `${MOOD_META[prefs.mood].name} is computing…`}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Smart replies ── */}
      {smartReplies.length > 0 && (
        <SmartReplies
          replies={smartReplies}
          onSelect={(r) => { setInputText(r); setSmartReplies([]); }}
          onDismiss={() => setSmartReplies([])}
        />
      )}

      {/* ── Scroll to bottom ── */}
      {isScrolledUp && <ScrollToBottom unreadCount={unreadCount} onClick={scrollToBottom} />}

      {/* ── Input area ── */}
      <div className="bg-void-black/95 backdrop-blur-xl border-t border-white/[0.06] px-4 pt-2 pb-4 shrink-0 z-20">
        <div className="max-w-2xl mx-auto">

          {/* Reply preview */}
          {replyingTo && (
            <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-neon-purple/5 border border-neon-purple/20 rounded-xl">
              <div className="flex-1 min-w-0">
                <p className="text-[9px] text-neon-purple/70 font-mono uppercase tracking-wide">{replyingTo.username ?? 'User'}</p>
                <p className="text-xs text-zinc-400 truncate">{replyingTo.text}</p>
              </div>
              <button onClick={() => setReplyingTo(null)} className="text-zinc-600 hover:text-zinc-300 text-xs shrink-0" aria-label="Cancel reply">✕</button>
            </div>
          )}

          {/* Command hints */}
          {showCommandHints && (
            <div className="mb-2 bg-void-dark border border-white/10 rounded-xl overflow-hidden shadow-xl">
              <div className="px-3 py-2 border-b border-white/5 flex items-center gap-2">
                <Terminal size={10} className="text-neon-green" aria-hidden="true" />
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Commands</span>
              </div>
              {COMMANDS.filter(c => inputText === '/' || c.cmd.startsWith(inputText.toLowerCase())).map(({ cmd, desc, icon }) => (
                <button
                  key={cmd}
                  type="button"
                  onClick={() => { setInputText(cmd + ' '); setShowCommandHints(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
                >
                  <span className="text-sm w-5 text-center" aria-hidden="true">{icon}</span>
                  <span className="font-mono text-sm text-neon-green">{cmd}</span>
                  <span className="text-xs text-zinc-500">{desc}</span>
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex gap-2.5 items-center" aria-label="Message input">
            <button
              type="button"
              onClick={toggleListening}
              className={`p-2.5 rounded-xl transition-all shrink-0 ${isListening ? 'bg-red-500/15 text-red-400 animate-pulse' : 'bg-zinc-900/80 text-zinc-500 hover:text-zinc-300 border border-zinc-800'}`}
              aria-label={isListening ? 'Stop listening' : 'Voice input'}
              aria-pressed={isListening}
            >
              {isListening ? <Loader2 size={18} className="animate-spin" /> : <Mic size={18} />}
            </button>

            <div className="relative flex-1">
              <input
                value={inputText}
                onChange={handleTyping}
                onKeyDown={(e) => e.key === 'Escape' && setShowCommandHints(false)}
                placeholder={
                  isWhisperMode ? '👻 Whisper mode — message self-destructs…' :
                  isListening ? 'Listening…' :
                  'Message or type / for commands'
                }
                className={`w-full bg-zinc-900/80 border rounded-xl px-4 py-2.5 text-sm text-zinc-100 outline-none transition-all placeholder:text-zinc-600 pr-12 ${
                  isWhisperMode ? 'border-purple-500/40 bg-purple-500/5' : 'border-zinc-800 focus:border-zinc-600/80'
                }`}
                aria-label="Message"
                disabled={status !== ConnectionStatus.CONNECTED}
              />
              {inputText.length > MAX_MSG_LENGTH * 0.7 && (
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-mono tabular-nums ${inputText.length >= MAX_MSG_LENGTH ? 'text-red-400' : 'text-yellow-500'}`} aria-live="polite">
                  {MAX_MSG_LENGTH - inputText.length}
                </span>
              )}
            </div>

            <button
              disabled={!inputText.trim() || status !== ConnectionStatus.CONNECTED}
              type="submit"
              className="bg-neon-green text-black p-2.5 rounded-xl hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
              aria-label="Send message"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>

      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        currentLang={prefs.language} setLang={(l) => updatePref('language', l)}
        currentMood={prefs.mood} setMood={(m) => updatePref('mood', m)}
        sfx={prefs.sfxEnabled} toggleSfx={() => updatePref('sfxEnabled', !prefs.sfxEnabled)}
        voice={prefs.voiceEnabled} toggleVoice={() => updatePref('voiceEnabled', !prefs.voiceEnabled)}
      />

      <QRCodeModal url={inviteUrl} isOpen={showQR} onClose={() => setShowQR(false)} />
    </div>
  );
};

export default App;
