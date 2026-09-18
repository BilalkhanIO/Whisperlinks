import React, { useState, useEffect, useRef, useCallback } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { Message, SenderType, ConnectionStatus, ChatMood, ChatMode, UserInfo, ModerationSettings } from './types';
import {
  sendMessageToGemini, streamMessageToGemini, generateSmartReplies,
  initializeChatSession, resetSession, generateSpeech, executeQuickPrompt,
  requestAiTranslation, requestAiSummary, requestAiTasks, requestAiIdeas
} from './services/geminiService';
import { playSound, decodeAndPlayAudio, speakWithBrowser } from './services/audioService';
import { ChatMessage } from './components/ChatMessage';
import { SmartReplies } from './components/SmartReplies';
import { QRCodeModal } from './components/QRCodeModal';
import { ShareModal } from './components/ShareModal';
import { CodeEntryModal } from './components/CodeEntryModal';
import { useInstallPrompt } from './components/InstallPrompt';
import { ScrollToBottom } from './components/ScrollToBottom';
import { EncryptionEffect } from './components/EncryptionEffect';
import MatrixRain from './components/MatrixRain';
import { SettingsPanel } from './components/SettingsPanel';
import { loadPrefs, savePrefs, getRoomFingerprint } from './utils';
import { COMMANDS, MOOD_META } from './constants';
import { LandingPage } from './components/LandingPage';
import { AboutPage, ContactPage, HelpPage, PrivacyPolicy, TermsPage, SecurityPage, FaqPage } from './components/ContentPages';
import { PanicScreen } from './components/PanicScreen';
import { CommandPalette } from './components/CommandPalette';
import { VoiceRecorder } from './components/VoiceRecorder';
import { LiveVoiceRoom } from './components/LiveVoiceRoom';
import { PollModal } from './components/PollModal';
import { ModerationModal } from './components/ModerationModal';
import { LightboxModal } from './components/LightboxModal';
import { PinLockModal } from './components/PinLockModal';
import { WhisperIdModal } from './components/WhisperIdModal';
import { WhisperIdSetupModal } from './components/WhisperIdSetupModal';
import { ConnectByUsernameModal } from './components/ConnectByUsernameModal';
import { ScreenShareIframeModal } from './components/ScreenShareIframeModal';
import { createVirtualMediaStream, isIframeEmbedded } from './services/virtualMediaService';
import {
  loadActiveWhisperIdentity,
  isAppSessionLocked,
  lockAppSession,
  saveContactToBook,
  registerEphemeralPresence,
  heartbeatEphemeralPresence,
  leaveEphemeralPresence,
  getPeerIdFromWhisperId,
  changeUsername,
  UserIdentity,
} from './services/identityService';
import {
  Send, Power, Settings, Mic, Loader2, Terminal, QrCode, Share2, Download, Save,
  Bot, BotOff, ShieldAlert, Paperclip, BarChart2, Radio, Phone, PhoneOff, Search, Shield,
  User, UserPlus, KeyRound, Lock
} from 'lucide-react';

const MAX_MSG_LENGTH = 500;
const WHISPER_TTL = 15_000;
const MAX_RECONNECT_ATTEMPTS = 3;

const App: React.FC = () => {
  // ── Navigation ──
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [isInLobby, setIsInLobby] = useState(true);

  // ── Preferences ──
  const [prefs, setPrefs] = useState(loadPrefs());
  const prefsRef = useRef(prefs);
  useEffect(() => { prefsRef.current = prefs; }, [prefs]);

  // ── Decentralized Local Identity (WhisperID) & PIN ──
  const [identity, setIdentity] = useState<UserIdentity>(() => ({
    identityId: 'wid_init',
    username: loadPrefs().username || 'CipherGhost',
    whisperId: `${loadPrefs().username || 'CipherGhost'}#000000`,
    shortTag: '000000',
    hexFingerprint: 'INITIALIZING...',
    wordFingerprint: 'INITIALIZING...',
    publicKeySpki: '',
    hasPin: false,
    recoveryPhrase: '',
    privacy: {
      invisibleMode: false,
      whoCanFindMe: 'anyone',
      allowContactRequests: true,
      allowCalls: true,
      allowRoomInvites: true,
    },
    savedContacts: [],
  }));
  const identityRef = useRef(identity);
  useEffect(() => { identityRef.current = identity; }, [identity]);

  const [showPinModal, setShowPinModal] = useState(false);
  const [pinModalMode, setPinModalMode] = useState<'unlock' | 'setup' | 'disable'>('unlock');
  const [showIdentityModal, setShowIdentityModal] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showConnectByUsernameModal, setShowConnectByUsernameModal] = useState(false);
  const [connectModalMode, setConnectModalMode] = useState<'connect' | 'invite'>('connect');

  // Load active cryptographic identity from IndexedDB on startup & check session lock
  useEffect(() => {
    loadActiveWhisperIdentity().then(loaded => {
      setIdentity(loaded);
      if (isAppSessionLocked()) {
        setPinModalMode('unlock');
        setShowPinModal(true);
      }
    });
  }, []);

  // ── Connection ──
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.IDLE);
  const [mode, setMode] = useState<ChatMode>('AI');
  const [peerId, setPeerId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<UserInfo[]>([]);

  // ── Room ──
  const [roomName, setRoomName] = useState<string>('');
  const roomNameRef = useRef<string>('');
  const roomCodeRef = useRef<string>('');
  const [isAiEnabled, setIsAiEnabled] = useState(true);
  const isAiEnabledRef = useRef(true);
  useEffect(() => { isAiEnabledRef.current = isAiEnabled; }, [isAiEnabled]);

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
  const [showShareModal, setShowShareModal] = useState(false);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isListening, setIsListening] = useState(false);

  // ── Panic / Quick Exit ──
  const [isPanicked, setIsPanicked] = useState(false);

  // ── Command Palette & Search ──
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // ── Voice Message Recording ──
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);

  // ── Live Voice Room (WebRTC Audio Stream) ──
  const [isInVoiceCall, setIsInVoiceCall] = useState(false);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [isVirtualVideo, setIsVirtualVideo] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showScreenShareIframeModal, setShowScreenShareIframeModal] = useState(false);
  const [isPttEnabled, setIsPttEnabled] = useState(false);
  const [voiceLocalStream, setVoiceLocalStream] = useState<MediaStream | null>(null);
  const [remoteVoiceStreams, setRemoteVoiceStreams] = useState<{ peerId: string; username: string; stream: MediaStream }[]>([]);
  const voiceLocalStreamRef = useRef<MediaStream | null>(null);
  const virtualMediaCleanupRef = useRef<(() => void) | null>(null);

  // ── Interactive Polls ──
  const [showPollModal, setShowPollModal] = useState(false);

  // ── Room Moderation & Host Policies ──
  const [showModerationModal, setShowModerationModal] = useState(false);
  const [moderationSettings, setModerationSettings] = useState<ModerationSettings>({
    allowFileSharing: true,
    allowVoice: true,
    allowAI: true,
    isLocked: false,
  });

  // ── P2P File & Image Sharing ──
  const [lightboxImage, setLightboxImage] = useState<{ url: string; name?: string } | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Room code gate (guest side) ──
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [codeModalError, setCodeModalError] = useState('');
  const pendingConnRef = useRef<DataConnection | null>(null);

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
  const wrongAttemptsRef = useRef<Map<string, number>>(new Map());

  const hasApiKey = true;
  const { canInstall, triggerInstall } = useInstallPrompt();

  // ── Helpers ──
  const getAiName = (mood: ChatMood): string => MOOD_META[mood].name;

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  // ── Effects ──
  useEffect(() => {
    const titles: Record<string, string> = {
      '/': 'WhisperLink | Private Chat And AI Conversations',
      '/about': 'About WhisperLink: Private P2P Chat',
      '/help': 'WhisperLink Help Center',
      '/privacy-policy': 'WhisperLink Privacy Policy',
      '/terms': 'WhisperLink Terms of Use',
      '/security': 'WhisperLink Security Architecture & Cryptographic Audit',
      '/faq': 'WhisperLink FAQ & Anonymous Guides',
      '/contact': 'Contact WhisperLink',
    };
    document.title = titles[currentPath] || 'WhisperLink';
    let link = document.querySelector("link[rel='canonical']") as HTMLLinkElement;
    if (link) {
      link.href = `https://whisperlinks.app${currentPath === '/' ? '' : currentPath}`;
    }
  }, [currentPath]);

  useEffect(() => {
    const h = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', h);
    return () => window.removeEventListener('popstate', h);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('join')) {
      setMode('P2P');
      const rn = params.get('room');
      if (rn) {
        const decoded = decodeURIComponent(rn);
        roomNameRef.current = decoded;
        setRoomName(decoded);
      }
    }
  }, []);

  // Ephemeral Presence Heartbeat
  useEffect(() => {
    if (!identity.whisperId || identity.privacy?.invisibleMode) return;
    if (peerRef.current && peerRef.current.id) {
      registerEphemeralPresence(identity, peerRef.current.id);
    }
    const interval = setInterval(() => {
      if (peerRef.current && peerRef.current.id && !peerRef.current.destroyed) {
        heartbeatEphemeralPresence(identity.whisperId, peerRef.current.id);
      }
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [identity.whisperId, identity.privacy?.invisibleMode, peerId]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      // Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
        return;
      }
      // Panic Mode shortcut (Alt+P or Ctrl+Shift+X)
      if ((e.altKey && e.key.toLowerCase() === 'p') || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'x')) {
        e.preventDefault();
        setIsPanicked(prev => {
          if (prev) {
            setIsInLobby(true);
            return false;
          } else {
            triggerPanic();
            return true;
          }
        });
        return;
      }
      // Escape closes modals
      if (e.key === 'Escape') {
        setShowSettings(false);
        setShowCommandHints(false);
        setShowCommandPalette(false);
        setShowPollModal(false);
        setShowModerationModal(false);
        setLightboxImage(null);
      }
    };
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
      if (mode === 'P2P' && isHostRef.current) broadcastData({ type: 'sys_update', mood: newPrefs.mood, lang: newPrefs.language, aiEnabled: isAiEnabled });
      addSystemMsg(`RECONFIGURING → [${String(value)}]`);
    }
  };

  const toggleAiEnabled = () => {
    const next = !isAiEnabled;
    setIsAiEnabled(next);
    if (mode === 'P2P' && isHostRef.current) {
      broadcastData({ type: 'sys_update', mood: prefs.mood, lang: prefs.language, aiEnabled: next });
    }
    addSystemMsg(next ? `AI PROCESSING ENABLED` : `AI PROCESSING DISABLED (P2P ONLY)`);
  };

  // ── Message helpers ──
  const addSystemMsg = (text: string) => {
    if (prefsRef.current.sfxEnabled) playSound('message');
    setMessages(p => [...p, { id: Math.random().toString(36), text, sender: SenderType.SYSTEM, timestamp: new Date() }]);
  };

  const addMessage = (text: string, sender: SenderType, username?: string, opts: Partial<Message> = {}) => {
    if (prefsRef.current.sfxEnabled) playSound('message');
    const msg: Message = {
      id: opts.id || crypto.randomUUID(),
      text,
      sender,
      username,
      timestamp: opts.timestamp ? new Date(opts.timestamp) : new Date(),
      isEncrypted: sender === SenderType.STRANGER && !opts.isStreaming,
      status: sender === SenderType.USER && mode === 'P2P' ? 'sent' : undefined,
      ...opts,
    };
    setMessages(p => [...p, msg]);
    return msg;
  };

  const exportChat = () => {
    const text = messages.map(m => {
      const d = m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp);
      const timeLabel = isNaN(d.getTime()) ? '' : d.toLocaleString();
      return `[${timeLabel}] ${m.sender === SenderType.SYSTEM ? 'SYSTEM' : (m.username || 'User')}: ${m.text}`;
    }).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WhisperLink_Chat_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    addSystemMsg('CHAT EXPORTED');
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
    rec.onstart = () => { setIsListening(true); if (prefsRef.current.sfxEnabled) playSound('send'); };
    rec.onend = () => setIsListening(false);
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const t = e.results[0][0].transcript;
      setInputText(prev => (prev ? prev + ' ' : '') + t);
    };
    recognitionRef.current = rec;
    rec.start();
  };

  // ── Lobby ──
  const handleEnterVoid = (selectedMode: ChatMode, roomConfig?: { name: string; code: string }) => {
    if (!prefs.username.trim()) return;
    savePrefs(prefs);
    if (prefs.sfxEnabled) playSound('connect');
    setIsInLobby(false);
    setMode(selectedMode);

    if (selectedMode === 'AI') {
      handleConnectAI();
    } else {
      const joinParam = new URLSearchParams(window.location.search).get('join');
      if (!joinParam) {
        // Host: set room name and code from setup form
        const name = roomConfig?.name || `${prefs.username}'s Room`;
        const code = (roomConfig?.code || '').toUpperCase();
        roomNameRef.current = name;
        roomCodeRef.current = code;
        setRoomName(name);
      }
      // Guest: roomName already set from URL param in the initial useEffect
      joinParam ? initializePeer(false, joinParam) : initializePeer(true);
    }
  };

  // ── P2P ──
  const initializePeer = (isHost: boolean, hostId?: string) => {
    setStatus(ConnectionStatus.SEARCHING);
    isHostRef.current = isHost;
    if (hostId) reconnectHostIdRef.current = hostId;
    if (peerRef.current) peerRef.current.destroy();
    connectionsRef.current.clear();
    wrongAttemptsRef.current.clear();

    const userHandlePeerId = getPeerIdFromWhisperId(identityRef.current.whisperId);
    // If hosting or connecting, register with deterministic unique user handle ID
    let initialPeer: Peer;
    try {
      initialPeer = new Peer(userHandlePeerId);
    } catch {
      initialPeer = new Peer();
    }
    peerRef.current = initialPeer;

    const bindPeerEvents = (peer: Peer) => {
      peer.on('open', (id) => {
        setPeerId(id);
        registerEphemeralPresence(identityRef.current, id);
        setParticipants([{
          peerId: id,
          username: identityRef.current.username,
          whisperId: identityRef.current.whisperId,
          shortTag: identityRef.current.shortTag,
          hexFingerprint: identityRef.current.hexFingerprint,
          isHost,
        }]);
        if (isHost) {
          setStatus(ConnectionStatus.WAITING_FOR_PEER);
          if (hasApiKey) initializeChatSession(prefsRef.current.mood, prefsRef.current.language);
        } else if (hostId) {
          addSystemMsg('CONNECTING TO SECURE ROOM...');
          setupConnection(peer.connect(hostId));
        }
      });

      peer.on('connection', setupConnection);
      peer.on('call', (mediaCall) => {
        if (voiceLocalStreamRef.current) {
          mediaCall.answer(voiceLocalStreamRef.current);
        } else {
          mediaCall.answer();
        }
        mediaCall.on('stream', (remoteStream) => {
          setRemoteVoiceStreams(prev => {
            if (prev.some(r => r.peerId === mediaCall.peer)) return prev;
            const participant = participants.find(p => p.peerId === mediaCall.peer);
            return [...prev, {
              peerId: mediaCall.peer,
              username: (mediaCall.metadata as any)?.username || participant?.username || 'Peer',
              stream: remoteStream
            }];
          });
        });
        mediaCall.on('close', () => {
          setRemoteVoiceStreams(prev => prev.filter(r => r.peerId !== mediaCall.peer));
        });
      });

      peer.on('error', (err) => {
        if (err.type === 'unavailable-id') {
          // If custom user handle ID is already active (e.g. multi-tab), smoothly fallback to auto ID
          const fallbackPeer = new Peer();
          peerRef.current = fallbackPeer;
          bindPeerEvents(fallbackPeer);
          return;
        }

        if (prefsRef.current.sfxEnabled) playSound('error');
        const msgMap: Record<string, string> = {
          'peer-unavailable': 'PEER UNAVAILABLE — INVALID OR EXPIRED LINK',
          'network': 'NETWORK ERROR — CHECK YOUR CONNECTION',
        };
        addSystemMsg(msgMap[err.type] ?? `CONNECTION ERROR: ${err.type?.toUpperCase() ?? 'UNKNOWN'}`);
        setStatus(ConnectionStatus.DISCONNECTED);
        tryAutoReconnect();
      });
    };

    bindPeerEvents(initialPeer);
  };

  const handleDirectConnectToPeer = (targetPeerId: string, targetUsername: string) => {
    // If inside an active room and user is host: invite/add user into the room
    if (!isInLobby && mode === 'P2P' && isHostRef.current) {
      addSystemMsg(`DISPATCHING INVITATION TO @${targetUsername.toUpperCase()}...`);
      const conn = peerRef.current?.connect(targetPeerId);
      if (conn) {
        setupConnection(conn);
        addSystemMsg(`SENT SECURE ROOM UPLINK TO @${targetUsername.toUpperCase()}`);
      }
      return;
    }

    // Connect from Lobby or direct 1v1
    setIsInLobby(false);
    setMode('P2P');
    setRoomName(`Direct Link: @${targetUsername}`);
    addSystemMsg(`CONNECTING DIRECTLY TO @${targetUsername.toUpperCase()}...`);
    initializePeer(false, targetPeerId);
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

  // Called once access is granted (after code verification or if no code)
  const proceedWithConnection = (conn: DataConnection) => {
    setStatus(ConnectionStatus.CONNECTED);
    reconnectAttemptsRef.current = 0;
    if (prefsRef.current.sfxEnabled) playSound('connect');
    conn.send({
      type: 'handshake',
      user: {
        peerId: peerRef.current?.id,
        username: identityRef.current.username,
        whisperId: identityRef.current.whisperId,
        shortTag: identityRef.current.shortTag,
        hexFingerprint: identityRef.current.hexFingerprint,
        isHost: isHostRef.current,
      },
    });
    if (isHostRef.current) {
      conn.send({ type: 'sys_update', mood: prefsRef.current.mood, lang: prefsRef.current.language, aiEnabled: isAiEnabledRef.current });
      conn.send({ type: 'mod_update', settings: moderationSettings });
    }
  };

  const setupConnection = (conn: DataConnection) => {
    connectionsRef.current.set(conn.peer, conn);

    conn.on('open', () => {
      if (isHostRef.current) {
        // Host: announce room info and wait for code verification if needed
        conn.send({
          type: 'room_challenge',
          name: roomNameRef.current,
          hasCode: !!roomCodeRef.current,
        });
        if (!roomCodeRef.current) {
          proceedWithConnection(conn);
        }
        // else: wait for 'code_verify' from guest
      }
      // Guest: wait for 'room_challenge' from host
    });

    conn.on('data', (data: unknown) => handleDataPacket(data as Record<string, unknown>, conn.peer));

    conn.on('close', () => {
      connectionsRef.current.delete(conn.peer);
      setParticipants(prev => prev.filter(p => p.peerId !== conn.peer));

      // Connection closed while guest was entering code → kicked or host left
      if (pendingConnRef.current === conn) {
        pendingConnRef.current = null;
        setShowCodeModal(false);
        setCodeModalError('');
        addSystemMsg('CONNECTION CLOSED — ROOM UNAVAILABLE');
        setIsInLobby(true);
        return;
      }

      if (connectionsRef.current.size === 0 && !isHostRef.current) {
        setStatus(ConnectionStatus.DISCONNECTED);
        tryAutoReconnect();
      }
    });
  };

  const handleDataPacket = (data: Record<string, unknown>, senderPeerId: string) => {
    switch (data.type) {
      case 'room_challenge': {
        // Guest receives this from host
        const name = String(data.name || 'Private Room');
        roomNameRef.current = name;
        setRoomName(name);
        if (data.hasCode) {
          pendingConnRef.current = connectionsRef.current.get(senderPeerId) ?? null;
          setShowCodeModal(true);
        } else {
          const conn = connectionsRef.current.get(senderPeerId);
          if (conn) proceedWithConnection(conn);
        }
        break;
      }
      case 'code_verify': {
        // Host receives this from guest
        if (!isHostRef.current) break;
        const conn = connectionsRef.current.get(senderPeerId);
        if (!conn) break;
        const attempts = (wrongAttemptsRef.current.get(senderPeerId) ?? 0) + 1;
        if (String(data.code).toUpperCase() === roomCodeRef.current) {
          wrongAttemptsRef.current.delete(senderPeerId);
          conn.send({ type: 'code_accepted' });
          proceedWithConnection(conn);
        } else {
          wrongAttemptsRef.current.set(senderPeerId, attempts);
          if (attempts >= 3) {
            conn.send({ type: 'code_rejected', message: 'Too many wrong attempts. Access denied.' });
            setTimeout(() => conn.close(), 500);
          } else {
            conn.send({ type: 'code_rejected', message: `Wrong code — ${3 - attempts} attempt${3 - attempts !== 1 ? 's' : ''} left.` });
          }
        }
        break;
      }
      case 'code_accepted': {
        // Guest receives this — proceed to chat
        setShowCodeModal(false);
        setCodeModalError('');
        const conn = pendingConnRef.current ?? connectionsRef.current.get(senderPeerId);
        if (conn) proceedWithConnection(conn);
        pendingConnRef.current = null;
        break;
      }
      case 'code_rejected': {
        // Guest receives this — show error in code modal
        setCodeModalError(String(data.message || 'Incorrect code. Please try again.'));
        break;
      }
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
      case 'message': {
        setIsRemoteTyping(false);
        const incomingMsg = data.message as Message;
        if (incomingMsg) {
          addMessage(incomingMsg.text, SenderType.STRANGER, incomingMsg.username, {
            id: incomingMsg.id,
            timestamp: incomingMsg.timestamp,
            expiresAt: incomingMsg.expiresAt,
            replyTo: incomingMsg.replyTo
          });
          broadcastData({ type: 'ack', id: incomingMsg.id }, senderPeerId);
        } else {
          addMessage(String(data.text), SenderType.STRANGER, String(data.username));
        }
        lastActivityTimeRef.current = Date.now();
        if (isHostRef.current) {
          if (incomingMsg) {
            broadcastData({ type: 'message', message: incomingMsg }, senderPeerId);
          } else {
            broadcastData({ type: 'message', text: data.text, username: data.username }, senderPeerId);
          }
          scheduleSmartResponse(String(incomingMsg?.text || data.text), String(incomingMsg?.username || data.username));
        }
        break;
      }
      case 'ack': {
        setMessages(prev => prev.map(m => m.id === data.id ? { ...m, status: 'delivered' } : m));
        break;
      }
      case 'typing':
        setIsRemoteTyping(true);
        lastActivityTimeRef.current = Date.now();
        if (isHostRef.current) scheduleSmartResponse(null, null, true);
        setTimeout(() => setIsRemoteTyping(false), 2000);
        if (isHostRef.current) broadcastData({ type: 'typing' }, senderPeerId);
        break;
      case 'sys_update':
        setPrefs(p => ({ ...p, mood: data.mood as ChatMood, language: data.lang as string }));
        if (data.aiEnabled !== undefined) setIsAiEnabled(Boolean(data.aiEnabled));
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
      case 'voice_msg': {
        const incomingVoice = data.message as Message;
        if (incomingVoice) {
          setMessages(prev => {
            if (prev.some(m => m.id === incomingVoice.id)) return prev;
            return [...prev, {
              ...incomingVoice,
              sender: SenderType.STRANGER,
              timestamp: new Date(incomingVoice.timestamp)
            }];
          });
          broadcastData({ type: 'ack', id: incomingVoice.id }, senderPeerId);
          if (isHostRef.current) broadcastData(data, senderPeerId);
          if (prefsRef.current.sfxEnabled) playSound('receive');
        }
        break;
      }
      case 'file_msg': {
        const incomingFile = data.message as Message;
        if (incomingFile) {
          setMessages(prev => {
            if (prev.some(m => m.id === incomingFile.id)) return prev;
            return [...prev, {
              ...incomingFile,
              sender: SenderType.STRANGER,
              timestamp: new Date(incomingFile.timestamp)
            }];
          });
          broadcastData({ type: 'ack', id: incomingFile.id }, senderPeerId);
          if (isHostRef.current) broadcastData(data, senderPeerId);
          if (prefsRef.current.sfxEnabled) playSound('receive');
        }
        break;
      }
      case 'poll_msg': {
        const incomingPoll = data.message as Message;
        if (incomingPoll) {
          setMessages(prev => {
            if (prev.some(m => m.id === incomingPoll.id)) return prev;
            return [...prev, {
              ...incomingPoll,
              sender: SenderType.STRANGER,
              timestamp: new Date(incomingPoll.timestamp)
            }];
          });
          if (isHostRef.current) broadcastData(data, senderPeerId);
          if (prefsRef.current.sfxEnabled) playSound('receive');
        }
        break;
      }
      case 'poll_vote': {
        const { messageId, optionIndex, username } = data as { messageId: string; optionIndex: number; username: string };
        setMessages(prev => prev.map(m => {
          if (m.id !== messageId || !m.pollData) return m;
          const updatedOptions = m.pollData.options.map((opt, idx) => {
            const votesWithoutUser = opt.votes.filter(u => u !== username);
            if (idx === optionIndex) {
              return opt.votes.includes(username)
                ? { ...opt, votes: votesWithoutUser }
                : { ...opt, votes: [...votesWithoutUser, username] };
            }
            return { ...opt, votes: votesWithoutUser };
          });
          return {
            ...m,
            pollData: {
              ...m.pollData,
              options: updatedOptions,
              totalVotes: updatedOptions.reduce((s, o) => s + o.votes.length, 0)
            }
          };
        }));
        if (isHostRef.current) broadcastData(data, senderPeerId);
        break;
      }
      case 'mod_update': {
        if (data.settings) {
          setModerationSettings(data.settings as ModerationSettings);
          addSystemMsg('HOST UPDATED ROOM SECURITY POLICIES');
        }
        break;
      }
      case 'mod_kick': {
        if (data.targetPeerId === peerRef.current?.id) {
          addSystemMsg('YOU WERE REMOVED FROM THIS ROOM BY THE HOST');
          handleDisconnect();
        }
        break;
      }
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
    if (!hasApiKey || mode !== 'P2P' || !isHostRef.current || !isAiEnabledRef.current) return;
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    if (triggerText) {
      const lower = triggerText.toLowerCase();
      const aiName = MOOD_META[prefsRef.current.mood].name.toLowerCase();
      if (lower.includes('@') || lower.includes(aiName) || lower.includes('bot') || lower.startsWith('/')) {
        triggerGroupAI(triggerText, senderName ?? 'User');
        return;
      }
    }
    const delay = isInterruptionCheck ? 60_000 : 20_000;
    aiTimeoutRef.current = setTimeout(() => {
      if (Date.now() - lastActivityTimeRef.current >= delay) triggerGroupAI("Context Check: Everyone is silent.", "System");
    }, delay);
  }, [mode, hasApiKey]);

  const triggerGroupAI = async (triggerText: string, senderName: string) => {
    if (!isAiEnabledRef.current) return;
    setIsLocalTyping(true);
    broadcastData({ type: 'typing' });
    await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
    try {
      const prompt = senderName === 'System'
        ? "(The group has been silent for a while. Say something to revive the chat.)"
        : `${senderName}: ${triggerText}`;
      const response = await sendMessageToGemini(prompt);
      setIsLocalTyping(false);
      const aiName = getAiName(prefsRef.current.mood);
      const newMsg = addMessage(response, SenderType.STRANGER, aiName);
      broadcastData({ type: 'message', message: newMsg });
      lastActivityTimeRef.current = Date.now();
      if (prefsRef.current.voiceEnabled) {
        const audio = await generateSpeech(response, prefsRef.current.mood);
        if (audio) {
          decodeAndPlayAudio(audio, response, prefsRef.current.mood);
        } else {
          speakWithBrowser(response, prefsRef.current.mood);
        }
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

  // ── Panic / Disguise ──
  const triggerPanic = () => {
    if (virtualMediaCleanupRef.current) {
      virtualMediaCleanupRef.current();
      virtualMediaCleanupRef.current = null;
    }
    if (voiceLocalStreamRef.current) {
      voiceLocalStreamRef.current.getTracks().forEach(t => t.stop());
    }
    setVoiceLocalStream(null);
    voiceLocalStreamRef.current = null;
    setIsInVoiceCall(false);
    setIsVideoActive(false);
    setIsVirtualVideo(false);
    setIsScreenSharing(false);
    setRemoteVoiceStreams([]);
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    connectionsRef.current.clear();
    setMessages([]);
    setParticipants([]);
    setIsPanicked(true);
  };

  // ── Live Voice Room ──
  const handleToggleVoiceCall = async () => {
    if (isInVoiceCall) {
      handleLeaveVoiceCall();
      return;
    }
    if (!moderationSettings.allowVoice && !isHostRef.current) {
      addSystemMsg('VOICE CHAT IS DISABLED BY ROOM HOST');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setVoiceLocalStream(stream);
      voiceLocalStreamRef.current = stream;
      setIsInVoiceCall(true);
      setIsVoiceMuted(false);
      if (prefsRef.current.sfxEnabled) playSound('connect');
      addSystemMsg('JOINED LIVE P2P VOICE ROOM 🎙️');

      connectionsRef.current.forEach((conn, pid) => {
        if (!peerRef.current) return;
        const mediaCall = peerRef.current.call(pid, stream, {
          metadata: { username: prefsRef.current.username }
        });
        if (mediaCall) {
          mediaCall.on('stream', (remoteStream) => {
            setRemoteVoiceStreams(prev => {
              if (prev.some(r => r.peerId === pid)) return prev;
              const p = participants.find(part => part.peerId === pid);
              return [...prev, { peerId: pid, username: p?.username || 'Peer', stream: remoteStream }];
            });
          });
          mediaCall.on('close', () => {
            setRemoteVoiceStreams(prev => prev.filter(r => r.peerId !== pid));
          });
        }
      });
    } catch (err: any) {
      console.warn('Microphone access unavailable or denied:', err);
      addSystemMsg('MICROPHONE ACCESS DENIED — CANNOT JOIN VOICE');
    }
  };

  const handleLeaveVoiceCall = () => {
    if (virtualMediaCleanupRef.current) {
      virtualMediaCleanupRef.current();
      virtualMediaCleanupRef.current = null;
    }
    if (voiceLocalStreamRef.current) {
      voiceLocalStreamRef.current.getTracks().forEach(t => t.stop());
    }
    setVoiceLocalStream(null);
    voiceLocalStreamRef.current = null;
    setIsInVoiceCall(false);
    setIsVideoActive(false);
    setIsVirtualVideo(false);
    setIsScreenSharing(false);
    setRemoteVoiceStreams([]);
    addSystemMsg('LEFT VOICE & MEDIA ROOM');
  };

  const handleToggleVoiceMute = () => {
    if (!voiceLocalStreamRef.current) return;
    const tracks = voiceLocalStreamRef.current.getAudioTracks();
    if (tracks.length > 0) {
      const nextMuted = !isVoiceMuted;
      tracks[0].enabled = !nextMuted;
      setIsVoiceMuted(nextMuted);
    }
  };

  const handleToggleVideo = async () => {
    try {
      if (isVideoActive) {
        if (virtualMediaCleanupRef.current) {
          virtualMediaCleanupRef.current();
          virtualMediaCleanupRef.current = null;
        }
        if (voiceLocalStreamRef.current) {
          voiceLocalStreamRef.current.getVideoTracks().forEach(t => {
            t.stop();
            voiceLocalStreamRef.current?.removeTrack(t);
          });
          setVoiceLocalStream(new MediaStream(voiceLocalStreamRef.current.getTracks()));
        }
        setIsVideoActive(false);
        setIsVirtualVideo(false);
        addSystemMsg('CAMERA DISABLED');
      } else {
        let videoStream: MediaStream | null = null;
        let isVirtual = false;

        // Try getting physical camera if available
        try {
          if (navigator.mediaDevices?.getUserMedia) {
            videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
          }
        } catch (mediaErr: any) {
          const errStr = String(mediaErr?.name || mediaErr?.message || mediaErr);
          const isNotFound = errStr.includes('NotFound') || errStr.includes('not found') || errStr.includes('DevicesNotFoundError');
          const isDenied = errStr.includes('NotAllowed') || errStr.includes('Permission');

          console.warn('Physical camera unavailable, engaging virtual avatar stream:', mediaErr);

          if (isDenied) {
            addSystemMsg('CAMERA ACCESS DENIED — ENGAGING ENCRYPTED AVATAR STREAM 🛡️');
          } else if (isNotFound) {
            addSystemMsg('NO PHYSICAL CAMERA DETECTED — ENGAGING ENCRYPTED AVATAR STREAM 🛡️');
          } else {
            addSystemMsg('CAMERA UNAVAILABLE — ENGAGING ENCRYPTED AVATAR STREAM 🛡️');
          }
        }

        // Graceful fallback to virtual encrypted canvas stream when physical webcam is absent or restricted
        if (!videoStream || videoStream.getVideoTracks().length === 0) {
          const virtual = createVirtualMediaStream(prefsRef.current.username || 'User', 'avatar');
          virtualMediaCleanupRef.current = virtual.cleanup;
          videoStream = virtual.stream;
          isVirtual = true;
        }

        const videoTrack = videoStream.getVideoTracks()[0];
        if (voiceLocalStreamRef.current) {
          voiceLocalStreamRef.current.getVideoTracks().forEach(t => {
            t.stop();
            voiceLocalStreamRef.current?.removeTrack(t);
          });
          voiceLocalStreamRef.current.addTrack(videoTrack);
          setVoiceLocalStream(new MediaStream(voiceLocalStreamRef.current.getTracks()));
        } else {
          setVoiceLocalStream(videoStream);
          voiceLocalStreamRef.current = videoStream;
          setIsInVoiceCall(true);
        }

        setIsVideoActive(true);
        setIsVirtualVideo(isVirtual);
        addSystemMsg(isVirtual ? 'ENCRYPTED AVATAR FEED ACTIVE 🛡️' : 'CAMERA ENABLED 📹');

        connectionsRef.current.forEach((conn, pid) => {
          if (!peerRef.current || !voiceLocalStreamRef.current) return;
          peerRef.current.call(pid, voiceLocalStreamRef.current, {
            metadata: { username: prefsRef.current.username, hasVideo: true, isVirtual }
          });
        });
      }
    } catch (err: any) {
      console.warn('Video toggle handled with warning:', err);
      addSystemMsg('UNABLE TO ACTIVATE VIDEO FEED');
    }
  };

  const handleToggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        if (virtualMediaCleanupRef.current) {
          virtualMediaCleanupRef.current();
          virtualMediaCleanupRef.current = null;
        }
        if (voiceLocalStreamRef.current) {
          voiceLocalStreamRef.current.getVideoTracks().forEach(t => {
            t.stop();
            voiceLocalStreamRef.current?.removeTrack(t);
          });
          setVoiceLocalStream(new MediaStream(voiceLocalStreamRef.current.getTracks()));
        }
        setIsScreenSharing(false);
        addSystemMsg('SCREEN SHARING STOPPED');
      } else {
        let displayStream: MediaStream | null = null;
        let isVirtual = false;
        const isEmbedded = isIframeEmbedded();

        try {
          if (!navigator.mediaDevices?.getDisplayMedia) {
            throw new Error('getDisplayMedia unsupported on this platform');
          }
          displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        } catch (screenErr: any) {
          const errStr = String(screenErr?.name || screenErr?.message || screenErr);
          const isPolicyBlocked = errStr.includes('permissions policy') || errStr.includes('display-capture');
          const isCancelled = errStr.includes('NotAllowedError') && !isPolicyBlocked;

          console.warn('Native screen share rejected or blocked:', screenErr);

          if (isPolicyBlocked || isEmbedded) {
            setShowScreenShareIframeModal(true);
            addSystemMsg('SCREEN SHARE POLICY RESTRICTION: Running in embedded preview. Activated Virtual Screen Stream (or open in new tab).');
          } else if (isCancelled) {
            addSystemMsg('SCREEN SHARING CANCELLED');
            return;
          } else {
            addSystemMsg('SCREEN SHARING UNAVAILABLE — USING VIRTUAL DISPLAY 🖥️');
          }
        }

        // Fallback to virtual encrypted presentation display stream when display-capture is restricted
        if (!displayStream || displayStream.getVideoTracks().length === 0) {
          const virtual = createVirtualMediaStream(prefsRef.current.username || 'User', 'screen');
          virtualMediaCleanupRef.current = virtual.cleanup;
          displayStream = virtual.stream;
          isVirtual = true;
        }

        const displayTrack = displayStream.getVideoTracks()[0];
        displayTrack.onended = () => {
          setIsScreenSharing(false);
          addSystemMsg('SCREEN SHARING ENDED');
        };

        if (voiceLocalStreamRef.current) {
          voiceLocalStreamRef.current.getVideoTracks().forEach(t => {
            t.stop();
            voiceLocalStreamRef.current?.removeTrack(t);
          });
          voiceLocalStreamRef.current.addTrack(displayTrack);
          setVoiceLocalStream(new MediaStream(voiceLocalStreamRef.current.getTracks()));
        } else {
          setVoiceLocalStream(displayStream);
          voiceLocalStreamRef.current = displayStream;
          setIsInVoiceCall(true);
        }

        setIsScreenSharing(true);
        setIsVideoActive(false);
        setIsVirtualVideo(false);
        addSystemMsg(isVirtual ? 'VIRTUAL SCREEN STREAM ACTIVE 🖥️' : 'SCREEN SHARING ACTIVE 🖥️');

        connectionsRef.current.forEach((conn, pid) => {
          if (!peerRef.current || !voiceLocalStreamRef.current) return;
          peerRef.current.call(pid, voiceLocalStreamRef.current, {
            metadata: { username: prefsRef.current.username, hasVideo: true, isScreen: true, isVirtual }
          });
        });
      }
    } catch (err: any) {
      console.warn('Screen sharing toggle handled with warning:', err);
      addSystemMsg('SCREEN SHARING CANCELLED OR NOT SUPPORTED');
    }
  };

  const handleTranslateMessage = async (messageId: string, text: string) => {
    try {
      const targetLang = prefs.language || 'ENGLISH';
      addSystemMsg(`TRANSLATING TO ${targetLang.toUpperCase()}...`);
      const translated = await requestAiTranslation(text, targetLang);
      setMessages(prev => prev.map(m => {
        if (m.id === messageId) {
          return {
            ...m,
            translatedText: translated,
            translatedLang: targetLang
          };
        }
        return m;
      }));
    } catch (err) {
      console.warn('Translation error:', err);
      addSystemMsg('TRANSLATION FAILED');
    }
  };

  // ── Voice Message Recording ──
  const handleSendVoiceMessage = (dataUrl: string, duration: number) => {
    setIsRecordingVoice(false);
    if (!moderationSettings.allowVoice && !isHostRef.current) {
      addSystemMsg('VOICE MESSAGES DISABLED BY ROOM HOST');
      return;
    }
    if (prefs.sfxEnabled) playSound('send');
    const msgId = Math.random().toString(36).substring(2);
    const newMsg: Message = {
      id: msgId,
      text: '🎙️ Voice note',
      sender: SenderType.USER,
      username: prefs.username,
      timestamp: new Date(),
      type: 'voice',
      voiceData: { duration, dataUrl },
      expiresAt: isWhisperMode ? Date.now() + WHISPER_TTL : undefined,
      status: 'sent',
    };
    setMessages(prev => [...prev, newMsg]);
    if (mode === 'P2P') {
      broadcastData({ type: 'voice_msg', message: newMsg });
    }
  };

  // ── Interactive Polls ──
  const handleCreatePoll = (question: string, options: string[]) => {
    const pollId = Math.random().toString(36).substring(2);
    const msgId = Math.random().toString(36).substring(2);
    const newMsg: Message = {
      id: msgId,
      text: `📊 Poll: ${question}`,
      sender: SenderType.USER,
      username: prefs.username,
      timestamp: new Date(),
      type: 'poll',
      pollData: {
        id: pollId,
        question,
        options: options.map(o => ({ text: o, votes: [] })),
        creator: prefs.username,
        totalVotes: 0,
      },
      status: 'sent',
    };
    setMessages(prev => [...prev, newMsg]);
    if (prefs.sfxEnabled) playSound('send');
    if (mode === 'P2P') {
      broadcastData({ type: 'poll_msg', message: newMsg });
    }
  };

  const handleVotePoll = (messageId: string, optionIndex: number) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== messageId || !m.pollData) return m;
      const updatedOptions = m.pollData.options.map((opt, idx) => {
        const votesWithoutUser = opt.votes.filter(u => u !== prefs.username);
        if (idx === optionIndex) {
          return opt.votes.includes(prefs.username)
            ? { ...opt, votes: votesWithoutUser }
            : { ...opt, votes: [...votesWithoutUser, prefs.username] };
        }
        return { ...opt, votes: votesWithoutUser };
      });
      return {
        ...m,
        pollData: {
          ...m.pollData,
          options: updatedOptions,
          totalVotes: updatedOptions.reduce((s, o) => s + o.votes.length, 0),
        }
      };
    }));
    if (mode === 'P2P') {
      broadcastData({ type: 'poll_vote', messageId, optionIndex, username: prefs.username });
    }
  };

  // ── P2P File & Image Sharing ──
  const processFileUpload = async (file: File) => {
    if (!moderationSettings.allowFileSharing && !isHostRef.current) {
      addSystemMsg('FILE SHARING IS DISABLED BY ROOM HOST');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      addSystemMsg('FILE EXCEEDS 12MB LIMIT FOR DIRECT P2P TRANSFER');
      return;
    }

    try {
      // Calculate cryptographic SHA-256 hash for end-to-end file integrity verification
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const sha256Hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (!dataUrl) return;

        const isImage = file.type.startsWith('image/');
        const newMsg: Message = {
          id: Math.random().toString(36).substring(2),
          text: isImage ? `📷 Image: ${file.name}` : `📎 File: ${file.name}`,
          sender: SenderType.USER,
          username: prefs.username,
          timestamp: new Date(),
          type: isImage ? 'image' : 'file',
          fileData: {
            name: file.name,
            size: file.size,
            mimeType: file.type,
            dataUrl,
            sha256: sha256Hex,
          },
          expiresAt: isWhisperMode ? Date.now() + WHISPER_TTL : undefined,
          status: 'sent',
        };

        setMessages(prev => [...prev, newMsg]);
        if (prefs.sfxEnabled) playSound('send');
        if (mode === 'P2P') {
          broadcastData({ type: 'file_msg', message: newMsg });
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.warn('File hashing warning:', err);
      addSystemMsg('FILE HASHING FAILED');
    }
  };

  // ── Room Moderation & Host Policies ──
  const handleUpdateModerationSettings = (newSettings: ModerationSettings) => {
    setModerationSettings(newSettings);
    if (mode === 'P2P') {
      broadcastData({ type: 'mod_update', settings: newSettings });
    }
    addSystemMsg('UPDATED ROOM SECURITY POLICIES');
  };

  const handleKickParticipant = (targetPeerId: string, kickUsername: string) => {
    if (mode === 'P2P') {
      broadcastData({ type: 'mod_kick', targetPeerId });
      const conn = connectionsRef.current.get(targetPeerId);
      if (conn) {
        conn.close();
        connectionsRef.current.delete(targetPeerId);
      }
      setParticipants(prev => prev.filter(p => p.peerId !== targetPeerId));
      addSystemMsg(`REMOVED ${kickUsername.toUpperCase()} FROM ROOM`);
    }
  };

  const handleCloseRoom = () => {
    setShowModerationModal(false);
    handleDisconnect();
  };

  // ── AI Quick Actions ──
  const handleRunAiCommand = async (cmd: string) => {
    if (!isAiEnabledRef.current) {
      addSystemMsg('AI IS CURRENTLY DISABLED IN THIS ROOM');
      return;
    }
    const recentChat = messages
      .filter(m => m.sender !== SenderType.SYSTEM && m.text)
      .slice(-25)
      .map(m => `${m.username || 'User'}: ${m.text}`)
      .join('\n');

    setIsLocalTyping(true);
    let prompt = '';
    if (cmd === '/roast') {
      prompt = `Roast this group conversation in a witty, savage, playful way in 2 sentences:\n\n${recentChat || 'No chat history.'}`;
    } else if (cmd === '/vibe') {
      prompt = `Give an accurate vibe check analysis of the mood, energy, and tone of this conversation:\n\n${recentChat || 'No chat history.'}`;
    }

    try {
      let response = '';
      if (cmd === '/summary') {
        response = await requestAiSummary(recentChat);
      } else if (cmd === '/action-items' || cmd === '/tasks') {
        response = await requestAiTasks(recentChat);
      } else if (cmd === '/idea') {
        response = await requestAiIdeas(recentChat);
      } else {
        response = await executeQuickPrompt(prompt);
      }
      setIsLocalTyping(false);
      const aiName = getAiName(prefs.mood);
      const newMsg = addMessage(response, SenderType.STRANGER, aiName);
      if (mode === 'P2P') {
        broadcastData({ type: 'message', message: newMsg });
      }
    } catch {
      setIsLocalTyping(false);
      addSystemMsg('AI GENERATION FAILED');
    }
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

      if (cmd === '/panic') {
        triggerPanic();
        return;
      }

      if (cmd === '/voice') {
        handleToggleVoiceCall();
        return;
      }

      if (cmd === '/poll') {
        setShowPollModal(true);
        return;
      }

      if (cmd === '/action-items' || cmd === '/tasks') {
        await handleRunAiCommand('/action-items');
        return;
      }

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

      if (['/summary', '/debate', '/roast', '/vibe'].includes(cmd) && !isAiEnabledRef.current) {
        addSystemMsg('AI IS CURRENTLY DISABLED IN THIS ROOM');
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
    const newMsg = addMessage(text, SenderType.USER, prefs.username, msgOpts);
    setReplyingTo(null);
    lastActivityTimeRef.current = Date.now();

    if (mode === 'P2P') {
      broadcastData({ type: 'message', message: newMsg });
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
        if (audio) {
          decodeAndPlayAudio(audio, fullText, prefs.mood);
        } else {
          speakWithBrowser(fullText, prefs.mood);
        }
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
    pendingConnRef.current = null;
    setIsInLobby(true);
    setMessages([]);
    setParticipants([]);
    setSmartReplies([]);
    setReplyingTo(null);
    setShowCodeModal(false);
    setCodeModalError('');
    setRoomName('');
    roomNameRef.current = '';
    roomCodeRef.current = '';
    window.history.pushState({}, '', window.location.pathname);
  };

  // ── Share ──
  const inviteUrl = peerId
    ? `${window.location.origin}?join=${peerId}&room=${encodeURIComponent(roomName || 'Private Room')}`
    : '';

  const shareMessage = `🤫 ${prefs.username} invited you to "${roomName || 'a private room'}" on WhisperLink — private P2P encrypted chat, zero logs.`;

  const handleShare = async () => {
    if (!inviteUrl) return;
    const shareData = {
      title: `Join ${roomName || 'a room'} on WhisperLink`,
      text: shareMessage,
      url: inviteUrl,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* user cancelled */ }
    } else {
      setShowShareModal(true);
    }
  };

  // ── Code entry (guest) ──
  const handleCodeSubmit = (code: string) => {
    setCodeModalError('');
    pendingConnRef.current?.send({ type: 'code_verify', code: code.toUpperCase() });
  };

  const handleCodeCancel = () => {
    pendingConnRef.current?.close();
    pendingConnRef.current = null;
    setShowCodeModal(false);
    setCodeModalError('');
    handleDisconnect();
  };

  // ── Content pages ──
  const renderContentPage = () => {
    switch (currentPath) {
      case '/privacy-policy': return <PrivacyPolicy onBack={() => navigateTo('/')} />;
      case '/terms':          return <TermsPage     onBack={() => navigateTo('/')} />;
      case '/contact':        return <ContactPage   onBack={() => navigateTo('/')} />;
      case '/about':          return <AboutPage     onBack={() => navigateTo('/')} />;
      case '/help':           return <HelpPage      onBack={() => navigateTo('/')} />;
      case '/security':       return <SecurityPage  onBack={() => navigateTo('/')} />;
      case '/faq':            return <FaqPage       onBack={() => navigateTo('/')} />;
      default: return null;
    }
  };

  const contentPage = renderContentPage();
  if (contentPage) return contentPage;

  if (isPanicked) {
    return <PanicScreen onRestore={() => { setIsPanicked(false); setIsInLobby(true); }} />;
  }

  if (isInLobby) {
    return (
      <LandingPage
        username={prefs.username}
        setUsername={(name) => {
          setPrefs(prev => ({ ...prev, username: name }));
          changeUsername(name)
            .then(updated => {
              setIdentity(updated);
            })
            .catch(() => {
              setIdentity(prev => ({
                ...prev,
                username: name,
                whisperId: `${name}#${prev.shortTag}`
              }));
            });
        }}
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
        identity={identity}
        onOpenIdentityModal={() => setShowIdentityModal(true)}
        onOpenConnectByUsername={() => {
          setConnectModalMode('connect');
          setShowConnectByUsernameModal(true);
        }}
      />
    );
  }

  return (
    <div className="h-screen w-full bg-void-black text-zinc-200 font-sans flex flex-col relative overflow-hidden">
      <MatrixRain />

      {/* ── Header ── */}
      <header className="px-4 py-3 bg-void-black/90 backdrop-blur-xl border-b border-white/[0.06] flex justify-between items-center z-20 shrink-0">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full shrink-0 ${status === ConnectionStatus.CONNECTED ? 'bg-neon-green animate-pulse' : 'bg-red-500'}`} aria-label={status === ConnectionStatus.CONNECTED ? 'Connected' : 'Disconnected'} />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm text-zinc-200">
                {mode === 'P2P' ? (roomName || 'Group Channel') : 'Secure Uplink'}
              </h2>
              {isInVoiceCall && (
                <span className="flex items-center gap-1 bg-neon-green/10 border border-neon-green/30 text-neon-green rounded-full px-2 py-0.5 text-[10px] font-mono animate-pulse">
                  <Radio size={10} />
                  VOICE ACTIVE
                </span>
              )}
              {isAiEnabled ? (
                <span className="hidden sm:flex items-center gap-1 bg-void-dark border border-white/8 rounded-full px-2 py-0.5 text-[10px]" title="AI Enabled">
                  <span aria-hidden="true">{MOOD_META[prefs.mood].emoji}</span>
                  <span className="text-zinc-400 font-mono">{MOOD_META[prefs.mood].name}</span>
                </span>
              ) : (
                <span className="hidden sm:flex items-center gap-1 bg-void-dark border border-white/8 rounded-full px-2 py-0.5 text-[10px]" title="P2P Only - No AI">
                  <BotOff size={10} className="text-zinc-500" />
                  <span className="text-zinc-500 font-mono">P2P ONLY</span>
                </span>
              )}
              {isWhisperMode && <span className="text-[10px] font-mono text-purple-400 animate-pulse">👻 WHISPER</span>}
            </div>
            <div className="flex gap-1.5 text-[10px] font-mono text-zinc-600 mt-0.5">
              <span>{prefs.language.replace('_', ' ')}</span>
              {mode === 'P2P' && <><span>·</span><span>{participants.length} node{participants.length !== 1 ? 's' : ''}</span></>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Emergency Panic Button */}
          <button
            onClick={triggerPanic}
            className="px-2 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all flex items-center gap-1 text-[11px] font-mono"
            title="Instant Panic & Wipe (Alt+P or Ctrl+Shift+X)"
            aria-label="Emergency Panic Button"
          >
            <ShieldAlert size={14} />
            <span className="hidden md:inline font-bold">PANIC</span>
          </button>

          {/* Quick Command Palette Button */}
          <button
            onClick={() => setShowCommandPalette(true)}
            className="p-2 rounded-xl text-zinc-500 hover:text-neon-green hover:bg-neon-green/5 transition-all"
            title="Command Palette & Search (Ctrl+K)"
            aria-label="Command Palette"
          >
            <Search size={16} />
          </button>

          {/* Add / Invite Peer by Username */}
          {mode === 'P2P' && (
            <button
              onClick={() => {
                setConnectModalMode('invite');
                setShowConnectByUsernameModal(true);
              }}
              className="p-2 rounded-xl text-zinc-500 hover:text-neon-green hover:bg-neon-green/5 transition-all"
              title="Add or Invite Peer by Username"
              aria-label="Add user by username"
            >
              <UserPlus size={16} />
            </button>
          )}

          {/* Live Voice Room Toggle */}
          {mode === 'P2P' && (
            <button
              onClick={handleToggleVoiceCall}
              className={`p-2 rounded-xl transition-all ${
                isInVoiceCall
                  ? 'bg-neon-green/15 text-neon-green border border-neon-green/40 shadow-sm shadow-neon-green/20'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'
              }`}
              title={isInVoiceCall ? "Leave Voice Call" : "Join P2P Live Voice Call"}
              aria-label="Toggle voice room"
            >
              {isInVoiceCall ? <PhoneOff size={16} className="text-neon-green" /> : <Phone size={16} />}
            </button>
          )}

          {/* Decentralized Identity & Local PIN */}
          <button
            onClick={() => setShowIdentityModal(true)}
            className="p-2 rounded-xl text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-all flex items-center gap-1"
            title={`WhisperID: @${identity.whisperId}${identity.hasPin ? ' (PIN Protected)' : ''}`}
            aria-label="Identity & PIN Settings"
          >
            <User size={16} />
            {identity.hasPin && <Lock size={10} className="text-neon-green" />}
          </button>

          {/* Moderation Controls (Host Only) */}
          {mode === 'P2P' && isHostRef.current && (
            <button
              onClick={() => setShowModerationModal(true)}
              className="p-2 rounded-xl text-zinc-500 hover:text-neon-green hover:bg-neon-green/5 transition-all"
              title="Host Moderation & Security Policies"
              aria-label="Moderation controls"
            >
              <Shield size={16} />
            </button>
          )}

          {mode === 'P2P' && isHostRef.current && (
            <button
              onClick={toggleAiEnabled}
              className={`p-2 rounded-xl transition-all ${isAiEnabled ? 'text-neon-green bg-neon-green/5' : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'}`}
              title={isAiEnabled ? "Disable AI for this room" : "Enable AI for this room"}
            >
              {isAiEnabled ? <Bot size={16} /> : <BotOff size={16} />}
            </button>
          )}
          <button
            onClick={exportChat}
            className="p-2 rounded-xl text-zinc-500 hover:text-neon-green hover:bg-neon-green/5 transition-all"
            aria-label="Export chat" title="Export Chat"
          >
            <Save size={16} />
          </button>
          {canInstall && (
            <button
              onClick={triggerInstall}
              className="p-2 rounded-xl text-zinc-500 hover:text-neon-green hover:bg-neon-green/5 transition-all"
              aria-label="Install app" title="Install WhisperLink"
            >
              <Download size={16} />
            </button>
          )}
          <button onClick={() => setShowSettings(true)} className="p-2 rounded-xl text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-all" aria-label="Settings" title="Settings">
            <Settings size={16} />
          </button>
          {mode === 'P2P' && peerId && (
            <>
              <button
                onClick={() => setShowQR(true)}
                className="p-2 rounded-xl text-zinc-500 hover:text-neon-green hover:bg-neon-green/5 transition-all"
                aria-label="Show QR code" title="QR invite"
              >
                <QrCode size={16} />
              </button>
              <button
                onClick={handleShare}
                className="p-2 rounded-xl text-neon-green hover:bg-neon-green/10 transition-all"
                aria-label="Share invite link" title="Share link"
              >
                <Share2 size={16} />
              </button>
            </>
          )}
          <button onClick={handleDisconnect} className="p-2 rounded-xl text-red-500/70 hover:text-red-400 hover:bg-red-500/10 transition-all" aria-label="Disconnect" title="Disconnect">
            <Power size={16} />
          </button>
        </div>
      </header>

      {/* ── Live Voice Room Component ── */}
      {isInVoiceCall && (
        <LiveVoiceRoom
          localStream={voiceLocalStream}
          remoteStreams={remoteVoiceStreams}
          isMuted={isVoiceMuted}
          onToggleMute={handleToggleVoiceMute}
          onLeaveCall={handleLeaveVoiceCall}
          participants={participants}
          currentUsername={prefs.username}
          isVideoActive={isVideoActive}
          isVirtualVideo={isVirtualVideo}
          isScreenSharing={isScreenSharing}
          onToggleVideo={handleToggleVideo}
          onToggleScreenShare={handleToggleScreenShare}
          isPttEnabled={isPttEnabled}
          onTogglePtt={() => setIsPttEnabled(p => !p)}
        />
      )}

      {/* ── Messages ── */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScrollContainer}
        onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDraggingFile(false); }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingFile(false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFileUpload(e.dataTransfer.files[0]);
          }
        }}
        className="flex-1 overflow-y-auto px-4 pt-4 scroll-smooth z-10 relative"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
      >
        {isDraggingFile && (
          <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md border-2 border-dashed border-neon-green flex flex-col items-center justify-center pointer-events-none">
            <Paperclip size={44} className="text-neon-green animate-bounce mb-3" />
            <p className="text-sm font-mono text-neon-green font-bold">DROP FILE TO SEND PEER-TO-PEER</p>
            <p className="text-xs text-zinc-400 mt-1">Direct encrypted binary channel (max 12MB)</p>
          </div>
        )}

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
            {mode === 'P2P' && status === ConnectionStatus.WAITING_FOR_PEER && peerId && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setShowQR(true)}
                  className="flex items-center gap-1.5 border border-white/10 rounded-lg px-3 py-1.5 text-zinc-400 hover:border-neon-green/30 hover:text-neon-green transition-all"
                >
                  <QrCode size={13} /> QR Code
                </button>
                <button
                  onClick={handleShare}
                  className="flex items-center gap-1.5 border border-neon-green/30 rounded-lg px-3 py-1.5 text-neon-green hover:bg-neon-green/5 transition-all"
                >
                  <Share2 size={13} /> Share Link
                </button>
              </div>
            )}
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
              onOpenImage={(url, name) => setLightboxImage({ url, name })}
              onVotePoll={handleVotePoll}
              onTranslateMessage={handleTranslateMessage}
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

          {isRecordingVoice ? (
            <VoiceRecorder
              onSend={handleSendVoiceMessage}
              onCancel={() => setIsRecordingVoice(false)}
            />
          ) : (
            <form onSubmit={handleSendMessage} className="flex gap-2 items-center" aria-label="Message input">
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    processFileUpload(e.target.files[0]);
                  }
                  e.target.value = '';
                }}
                className="hidden"
              />

              {/* Attach File Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={status !== ConnectionStatus.CONNECTED || (!moderationSettings.allowFileSharing && !isHostRef.current)}
                className="p-2.5 rounded-xl bg-zinc-900/80 text-zinc-400 hover:text-neon-green hover:border-zinc-700 border border-zinc-800 transition-all shrink-0 disabled:opacity-40"
                title="Attach File or Image"
                aria-label="Attach File"
              >
                <Paperclip size={17} />
              </button>

              {/* Poll Button */}
              <button
                type="button"
                onClick={() => setShowPollModal(true)}
                disabled={status !== ConnectionStatus.CONNECTED}
                className="p-2.5 rounded-xl bg-zinc-900/80 text-zinc-400 hover:text-neon-green hover:border-zinc-700 border border-zinc-800 transition-all shrink-0 disabled:opacity-40"
                title="Create Poll"
                aria-label="Create Poll"
              >
                <BarChart2 size={17} />
              </button>

              {/* Record Voice Note Button */}
              <button
                type="button"
                onClick={() => setIsRecordingVoice(true)}
                disabled={status !== ConnectionStatus.CONNECTED || (!moderationSettings.allowVoice && !isHostRef.current)}
                className="p-2.5 rounded-xl bg-zinc-900/80 text-zinc-400 hover:text-purple-400 hover:border-zinc-700 border border-zinc-800 transition-all shrink-0 disabled:opacity-40"
                title="Record Voice Note"
                aria-label="Record Voice Note"
              >
                <Radio size={17} />
              </button>

              {/* Speech to text */}
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2.5 rounded-xl transition-all shrink-0 ${isListening ? 'bg-red-500/15 text-red-400 animate-pulse' : 'bg-zinc-900/80 text-zinc-500 hover:text-zinc-300 border border-zinc-800'}`}
                aria-label={isListening ? 'Stop listening' : 'Voice input'}
                aria-pressed={isListening}
                title="Voice Dictation"
              >
                {isListening ? <Loader2 size={17} className="animate-spin" /> : <Mic size={17} />}
              </button>

              <div className="relative flex-1">
                <input
                  value={inputText}
                  onChange={handleTyping}
                  onKeyDown={(e) => e.key === 'Escape' && setShowCommandHints(false)}
                  placeholder={
                    isWhisperMode ? '👻 Whisper mode — message self-destructs…' :
                    isListening ? 'Listening…' :
                    'Message or type / for commands (Ctrl+K for palette)'
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
                <Send size={17} />
              </button>
            </form>
          )}
        </div>
      </div>

      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        currentLang={prefs.language} setLang={(l) => updatePref('language', l)}
        currentMood={prefs.mood} setMood={(m) => updatePref('mood', m)}
        sfx={prefs.sfxEnabled} toggleSfx={() => updatePref('sfxEnabled', !prefs.sfxEnabled)}
        voice={prefs.voiceEnabled} toggleVoice={() => updatePref('voiceEnabled', !prefs.voiceEnabled)}
        isHost={isHostRef.current}
        mode={mode}
        roomFingerprint={mode === 'P2P' && peerId ? getRoomFingerprint([peerId, ...participants.map(p => p.peerId)]) : undefined}
        onClearChat={() => { setMessages([]); addSystemMsg('CHAT CLEARED LOCALLY'); }}
      />

      <QRCodeModal
        url={inviteUrl}
        roomName={roomName || 'Private Room'}
        isOpen={showQR}
        onClose={() => setShowQR(false)}
      />

      <ShareModal
        url={inviteUrl}
        roomName={roomName || 'Private Room'}
        shareText={shareMessage}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />

      {showCodeModal && (
        <CodeEntryModal
          roomName={roomName || 'Private Room'}
          error={codeModalError}
          onSubmit={handleCodeSubmit}
          onCancel={handleCodeCancel}
        />
      )}

      {/* ── Command Palette (Ctrl+K) ── */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onSelectCommand={(cmd) => {
          setShowCommandPalette(false);
          if (cmd === '/panic') { triggerPanic(); return; }
          if (cmd === '/voice') { handleToggleVoiceCall(); return; }
          if (cmd === '/video') { handleToggleVideo(); return; }
          if (cmd === '/screenshare') { handleToggleScreenShare(); return; }
          if (cmd === '/poll') { setShowPollModal(true); return; }
          if (cmd === '/security') { navigateTo('/security'); return; }
          if (cmd === '/faq') { navigateTo('/faq'); return; }
          if (cmd === '/settings') { setShowSettings(true); return; }
          if (cmd === '/export') { exportChat(); return; }
          if (cmd === '/whisper') {
            setIsWhisperMode(w => !w);
            addSystemMsg(isWhisperMode ? 'WHISPER MODE OFF' : 'WHISPER MODE ON 👻');
            return;
          }
          if (cmd === '/clear') { setMessages([]); addSystemMsg('CHAT CLEARED'); return; }
          if (['/summary', '/action-items', '/tasks', '/idea', '/roast', '/vibe'].includes(cmd)) {
            handleRunAiCommand(cmd);
            return;
          }
          setInputText(cmd + ' ');
        }}
        isWhisperMode={isWhisperMode}
        isInVoiceCall={isInVoiceCall}
        onTriggerPanic={triggerPanic}
        onToggleVoiceCall={handleToggleVoiceCall}
        onToggleVideo={handleToggleVideo}
        onToggleScreenShare={handleToggleScreenShare}
        onOpenFilePicker={() => fileInputRef.current?.click()}
        onOpenPollModal={() => setShowPollModal(true)}
        onToggleWhisper={() => {
          setIsWhisperMode(w => !w);
          addSystemMsg(isWhisperMode ? 'WHISPER MODE OFF' : 'WHISPER MODE ON 👻');
        }}
        onRunAiCommand={handleRunAiCommand}
        onExportChat={exportChat}
        onOpenSettings={() => setShowSettings(true)}
        onClearChat={() => { setMessages([]); addSystemMsg('CHAT CLEARED'); }}
        messages={messages}
        onOpenSecurity={() => navigateTo('/security')}
        onOpenFaq={() => navigateTo('/faq')}
      />

      {/* ── Poll Creation Modal ── */}
      <PollModal
        isOpen={showPollModal}
        onClose={() => setShowPollModal(false)}
        onCreatePoll={handleCreatePoll}
      />

      {/* ── Moderation & Policies Modal ── */}
      <ModerationModal
        isOpen={showModerationModal}
        onClose={() => setShowModerationModal(false)}
        moderationSettings={moderationSettings}
        onUpdateSettings={handleUpdateModerationSettings}
        participants={participants}
        onKickParticipant={handleKickParticipant}
        onCloseRoom={handleCloseRoom}
        onOpenAddUser={() => {
          setConnectModalMode('invite');
          setShowConnectByUsernameModal(true);
        }}
        onSaveContact={(saveUsername, savePeerId) => {
          saveContactToBook({
            identityId: `wid_${savePeerId.slice(0, 10)}`,
            whisperId: `${saveUsername}#000000`,
            username: saveUsername,
            publicKey: '',
            shortTag: '000000',
            peerId: savePeerId,
            verified: false,
            isTrusted: false,
            blocked: false,
          }).then(updatedContacts => {
            setIdentity(prev => ({ ...prev, savedContacts: updatedContacts }));
            addSystemMsg(`SAVED @${saveUsername.toUpperCase()} TO CONTACTS`);
          });
        }}
      />

      {/* ── Security PIN Lock Modal ── */}
      <PinLockModal
        isOpen={showPinModal}
        mode={pinModalMode}
        onSuccess={(updatedIdentity) => {
          if (updatedIdentity) {
            setIdentity(updatedIdentity);
          }
          setShowPinModal(false);
          addSystemMsg(
            pinModalMode === 'unlock'
              ? 'VAULT UNLOCKED'
              : pinModalMode === 'setup'
              ? 'SECURITY PIN SET'
              : 'SECURITY PIN REMOVED'
          );
        }}
        onCancel={() => setShowPinModal(false)}
        onPanic={triggerPanic}
      />

      {/* ── WhisperID Cryptographic Identity & Contacts Modal ── */}
      <WhisperIdModal
        isOpen={showIdentityModal}
        onClose={() => setShowIdentityModal(false)}
        identity={identity}
        onUpdateIdentity={(updated) => {
          setIdentity(updated);
          setPrefs(prev => ({ ...prev, username: updated.username }));
        }}
        onOpenPinSetup={() => {
          setPinModalMode('setup');
          setShowPinModal(true);
        }}
        onOpenPinDisable={() => {
          setPinModalMode('disable');
          setShowPinModal(true);
        }}
        onLockSession={() => {
          lockAppSession();
          setShowIdentityModal(false);
          setPinModalMode('unlock');
          setShowPinModal(true);
        }}
        onOpenSetupModal={() => setShowSetupModal(true)}
        onDirectConnectToPeer={(targetPeerId, targetWhisperId) => {
          handleDirectConnectToPeer(targetPeerId, targetWhisperId);
        }}
      />

      {/* ── WhisperID Setup & Mnemonic Recovery Modal ── */}
      <WhisperIdSetupModal
        isOpen={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        onComplete={(newIdentity) => {
          setIdentity(newIdentity);
          setPrefs(prev => ({ ...prev, username: newIdentity.username }));
          addSystemMsg(`ACTIVE WHISPERID: @${newIdentity.whisperId.toUpperCase()}`);
        }}
        initialUsername={identity.username}
      />

      {/* ── Connect / Add User by Username Modal ── */}
      <ConnectByUsernameModal
        isOpen={showConnectByUsernameModal}
        onClose={() => setShowConnectByUsernameModal(false)}
        onConnect={(targetPeerId, targetWhisperId) => {
          handleDirectConnectToPeer(targetPeerId, targetWhisperId);
        }}
        savedContacts={identity.savedContacts}
        mode={connectModalMode}
      />

      {/* ── Screen Share Iframe / Permissions Policy Modal ── */}
      <ScreenShareIframeModal
        isOpen={showScreenShareIframeModal}
        onClose={() => setShowScreenShareIframeModal(false)}
        onOpenStandalone={() => {
          setShowScreenShareIframeModal(false);
          window.open(window.location.href, '_blank');
        }}
      />

      {/* ── Image Lightbox Modal ── */}
      {lightboxImage && (
        <LightboxModal
          imageUrl={lightboxImage.url}
          imageName={lightboxImage.name}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </div>
  );
};

export default App;
