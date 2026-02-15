import React, { useState, useEffect, useRef } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { Message, SenderType, ConnectionStatus, ChatMood, ChatMode, UserInfo } from './types';
import { sendMessageToGemini, initializeChatSession, resetSession } from './services/geminiService';
import { ChatMessage } from './components/ChatMessage';
import { EncryptionEffect } from './components/EncryptionEffect';
import { LOADING_MESSAGES, FUNNY_INSTRUCTION, SAD_INSTRUCTION } from './constants';
import { Send, Power, RefreshCw, Lock, Terminal, Shield, Globe, UserPlus, Smile, Frown, Copy, Users, Bot, Sparkles, ChevronRight, Menu, X } from 'lucide-react';

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
  const [showInviteToast, setShowInviteToast] = useState(false);
  const [peerId, setPeerId] = useState<string | null>(null);
  
  // Participant State
  const [participants, setParticipants] = useState<UserInfo[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);

  // --- REFS ---
  const peerRef = useRef<Peer | null>(null);
  const connectionsRef = useRef<Map<string, DataConnection>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isHostRef = useRef<boolean>(false);
  const moodRef = useRef<ChatMood>('FUNNY'); 
  const usernameRef = useRef<string>('');
  const lastAiTriggerRef = useRef<number>(0);

  const hasApiKey = !!process.env.API_KEY;

  // --- EFFECTS ---

  useEffect(() => {
    // Check for join parameter
    const params = new URLSearchParams(window.location.search);
    const joinParam = params.get('join');
    
    if (joinParam) {
      setMode('P2P');
      // We don't init peer yet, wait for username
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

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
          // If joining via link
          if (joinParam) {
              initializePeer(false, joinParam);
          } else {
              // Creating new room
              initializePeer(true);
          }
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
      
      // Add myself to participants
      setParticipants([{ peerId: id, username: usernameRef.current, isHost }]);
      
      if (isHost) {
        setStatus(ConnectionStatus.WAITING_FOR_PEER);
        addMessage(`SECURE ROOM CREATED. ID: ${id}`, SenderType.SYSTEM);
        
        if (hasApiKey) {
           initializeChatSession(mood === 'FUNNY' ? FUNNY_INSTRUCTION : SAD_INSTRUCTION)
             .catch(() => console.log("AI init deferred"));
        }
      } else if (hostId) {
        addMessage(`CONNECTING TO SECURE ROOM...`, SenderType.SYSTEM);
        const conn = peer.connect(hostId);
        setupConnection(conn);
      }
    });

    peer.on('connection', (conn) => {
      // Incoming connection (I am Host)
      setupConnection(conn);
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);
      if (err.type === 'peer-unavailable') {
         addMessage(`ERROR: Room not found or Host is offline.`, SenderType.SYSTEM);
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
      
      // HANDSHAKE: Send my details to the new peer
      conn.send({ 
          type: 'handshake', 
          user: { peerId: peerRef.current?.id, username: usernameRef.current, isHost: isHostRef.current } 
      });
      
      // If I am Host, sync Mood
      if (isHostRef.current) {
         conn.send({ type: 'mood_update', mood: moodRef.current });
      }
    });

    conn.on('data', (data: any) => {
      handleDataPacket(data, conn.peer);
    });

    conn.on('close', () => {
      addMessage(`USER DISCONNECTED.`, SenderType.SYSTEM);
      connectionsRef.current.delete(conn.peer);
      
      // Remove from participant list
      setParticipants(prev => prev.filter(p => p.peerId !== conn.peer));
      
      if (connectionsRef.current.size === 0 && !isHostRef.current) {
        setStatus(ConnectionStatus.DISCONNECTED);
      }
    });
  };

  const handleDataPacket = (data: any, senderPeerId: string) => {
      switch (data.type) {
          case 'handshake':
              // New user info received
              const newUser = data.user;
              setParticipants(prev => {
                  if (prev.find(p => p.peerId === newUser.peerId)) return prev;
                  const newList = [...prev, newUser];
                  
                  // If I am Host, broadcast this full list to everyone so they are in sync
                  if (isHostRef.current) {
                      broadcastData({ type: 'sync_participants', participants: newList });
                  }
                  return newList;
              });
              if (!isHostRef.current) {
                  // If I am guest, I just send my info back if I haven't (already done in open, but good for redundancy)
              }
              break;
            
          case 'sync_participants':
              // Host sent full list
              setParticipants(data.participants);
              break;

          case 'message':
              setIsTyping(false);
              addMessage(data.text, SenderType.STRANGER, data.username);
              
              // If Host, relay
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

          case 'mood_update':
              setMood(data.mood);
              moodRef.current = data.mood;
              addMessage(data.mood === 'FUNNY' ? "⚠️ SYSTEM: HOST ENABLED CHAOS MODE" : "⚠️ SYSTEM: HOST ENABLED SAD HOURS", SenderType.SYSTEM);
              break;
      }
  };

  const broadcastData = (data: any, excludePeerId?: string) => {
    connectionsRef.current.forEach((conn, peerId) => {
      if (peerId !== excludePeerId && conn.open) {
        conn.send(data);
      }
    });
  };

  // --- AI LOGIC ---

  const triggerGroupAI = async (triggerText: string, senderName: string) => {
    if (!hasApiKey) return;
    
    const lower = triggerText.toLowerCase();
    
    // COMMANDS
    const isRoast = lower.startsWith('/roast');
    const isTopic = lower.startsWith('/topic');
    
    const keywords = ['lala', 'ghamgeen', 'khan', 'oye', 'bot', 'ai', 'chup', 'kaisa', 'hello', 'hi'];
    const isMention = keywords.some(k => lower.includes(k));
    
    const now = Date.now();
    const timeSinceLastReply = now - lastAiTriggerRef.current;
    
    // Aggressive trigger for commands, standard for mentions/random
    const shouldTrigger = isRoast || isTopic || isMention || (timeSinceLastReply > 20000 && Math.random() < 0.05);

    if (shouldTrigger) {
       lastAiTriggerRef.current = now;
       const delay = 1500 + Math.random() * 1000;
       
       setTimeout(async () => {
           setIsTyping(true);
           broadcastData({ type: 'typing' });

           try {
               let promptWithContext = `${senderName}: ${triggerText}`;
               
               if (isRoast) {
                   promptWithContext += " (SYSTEM COMMAND: ROAST THIS USER OR THE GROUP MERCILESSLY)";
               } else if (isTopic) {
                   promptWithContext += " (SYSTEM COMMAND: SUGGEST A WEIRD TOPIC TO DISCUSS)";
               }

               const response = await sendMessageToGemini(promptWithContext);
               
               setIsTyping(false);
               const aiName = mood === 'FUNNY' ? 'Lala' : 'Ghamgeen';
               
               addMessage(response, SenderType.STRANGER, aiName);
               broadcastData({ type: 'message', text: response, username: aiName });
               
               lastAiTriggerRef.current = Date.now();
           } catch (e) {
               setIsTyping(false);
           }
       }, delay);
    }
  };

  const handleConnectAI = async () => {
    setStatus(ConnectionStatus.SEARCHING);
    resetSession();
    
    let step = 0;
    const interval = setInterval(() => {
      if (step >= 3) {
        clearInterval(interval);
        setStatus(ConnectionStatus.CONNECTED);
        
        if (!hasApiKey) {
           addMessage("ERROR: API KEY NOT FOUND.", SenderType.SYSTEM);
           return;
        }

        initializeChatSession(mood === 'FUNNY' ? FUNNY_INSTRUCTION : SAD_INSTRUCTION);

        setMessages([
          { id: '1', text: `CONNECTED TO VOID NETWORK`, sender: SenderType.SYSTEM, timestamp: new Date() },
          { id: '2', text: mood === 'FUNNY' ? "Lala entered the chat." : "Ghamgeen entered the chat.", sender: SenderType.SYSTEM, timestamp: new Date() }
        ]);
        
        setTimeout(async () => {
           setIsTyping(true);
           try {
             const greetingPrompt = mood === 'FUNNY' 
                ? `Greet the user ${usernameRef.current} loudly.`
                : `Greet the user ${usernameRef.current} with a deep sigh.`;
             
             const response = await sendMessageToGemini(greetingPrompt);
             setIsTyping(false);
             addMessage(response, SenderType.STRANGER, mood === 'FUNNY' ? 'Lala' : 'Ghamgeen');
           } catch (e) { setIsTyping(false); }
        }, 1500);
      }
      step++;
    }, 800);
  };

  // --- GENERAL HANDLERS ---

  const handleDisconnect = () => {
    peerRef.current?.destroy();
    connectionsRef.current.clear();
    setStatus(ConnectionStatus.DISCONNECTED);
    setIsInLobby(true); // Back to Lobby
    setMessages([]);
    setParticipants([]);
    window.history.pushState({}, '', window.location.pathname);
  };

  const toggleMood = async () => {
    if (mode === 'P2P' && !isHostRef.current) return;

    const newMood = mood === 'FUNNY' ? 'SAD' : 'FUNNY';
    setMood(newMood);
    moodRef.current = newMood; 
    
    if (mode === 'P2P' && isHostRef.current) {
        broadcastData({ type: 'mood_update', mood: newMood });
    }
    
    if (status === ConnectionStatus.CONNECTED) {
        addMessage(newMood === 'FUNNY' ? "⚠️ SYSTEM: ENTERING CHAOS MODE" : "⚠️ SYSTEM: ENTERING SAD HOURS", SenderType.SYSTEM);
        resetSession();
        const instruction = newMood === 'FUNNY' ? FUNNY_INSTRUCTION : SAD_INSTRUCTION;
        if (hasApiKey) await initializeChatSession(instruction);
    }
  };

  const addMessage = (text: string, sender: SenderType, username?: string) => {
    setMessages((prev) => [...prev, {
      id: Date.now().toString() + Math.random().toString(),
      text,
      sender,
      username,
      timestamp: new Date(),
      isEncrypted: sender === SenderType.STRANGER
    }]);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    const userMsg = inputText.trim();
    setInputText('');
    addMessage(userMsg, SenderType.USER, usernameRef.current);

    if (mode === 'P2P') {
      broadcastData({ type: 'message', text: userMsg, username: usernameRef.current });
      if (isHostRef.current) triggerGroupAI(userMsg, usernameRef.current);
    }
    
    if (mode === 'AI' && status === ConnectionStatus.CONNECTED) {
      setIsTyping(true);
      
      // Check for commands in AI mode too
      const isRoast = userMsg.toLowerCase().startsWith('/roast');
      
      setTimeout(async () => {
        try {
          let prompt = userMsg;
          if (isRoast) prompt += " (ROAST ME)";
          const response = await sendMessageToGemini(prompt);
          setIsTyping(false);
          addMessage(response, SenderType.STRANGER, mood === 'FUNNY' ? 'Lala' : 'Ghamgeen');
        } catch (error) {
          setIsTyping(false);
        }
      }, 1000);
    }
  };

  // --- RENDERERS ---

  const renderLobby = () => (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center animate-in fade-in zoom-in duration-500">
           <div className="relative mb-8">
              <div className="absolute -inset-1 rounded-full bg-neon-green blur opacity-20 animate-pulse"></div>
              <div className="relative bg-void-dark p-6 rounded-full border border-void-gray shadow-2xl">
                <Shield size={48} className="text-zinc-100" />
              </div>
            </div>
            
            <h1 className="text-4xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-500 mb-2">
              WhisperLink
            </h1>
            <p className="text-zinc-500 mb-8 max-w-xs">
                Enter your alias to access the encrypted Void network.
            </p>

            <div className="w-full max-w-xs space-y-4">
                <input 
                    type="text" 
                    placeholder="ENTER CODENAME..." 
                    className="w-full bg-void-dark border border-void-gray text-center text-zinc-100 px-4 py-3 rounded-xl focus:border-neon-green outline-none font-mono uppercase tracking-widest transition-all"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    maxLength={12}
                    autoFocus
                />
                
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => handleEnterVoid('AI')}
                        disabled={!username.trim()}
                        className="flex flex-col items-center justify-center p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 hover:border-zinc-700 disabled:opacity-50 transition-all group"
                    >
                        <Bot size={24} className="mb-2 text-neon-purple group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold text-zinc-400">SOLO (AI)</span>
                    </button>
                    <button
                        onClick={() => handleEnterVoid('P2P')}
                        disabled={!username.trim()}
                        className="flex flex-col items-center justify-center p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 hover:border-zinc-700 disabled:opacity-50 transition-all group"
                    >
                        <Users size={24} className="mb-2 text-neon-green group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold text-zinc-400">GROUP (P2P)</span>
                    </button>
                </div>
                
                {!hasApiKey && <div className="text-red-500 text-[10px]">⚠️ API KEY MISSING</div>}
            </div>
      </div>
  );

  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center h-full gap-6">
      {status === ConnectionStatus.WAITING_FOR_PEER ? (
         <div className="flex flex-col items-center gap-4 max-w-md px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-neon-green/10 flex items-center justify-center animate-pulse">
                <Users size={32} className="text-neon-green" />
            </div>
            <h2 className="text-xl font-bold text-white">Room Secure</h2>
            <p className="text-zinc-400 text-sm">Invite agents to your frequency.</p>
            
            <button 
              onClick={() => {
                  if (peerId) {
                      const url = `${window.location.origin}${window.location.pathname}?join=${peerId}`;
                      navigator.clipboard.writeText(url);
                      setShowInviteToast(true);
                      setTimeout(() => setShowInviteToast(false), 3000);
                  }
              }}
              className="flex items-center gap-2 bg-void-gray hover:bg-zinc-700 px-4 py-3 rounded-xl border border-zinc-600 transition-all active:scale-95 mt-2"
            >
               <span className="font-mono text-xs text-neon-green tracking-wider">{peerId ? 'COPY UPLINK' : 'GENERATING...'}</span>
               <Copy size={14} className="text-zinc-300" />
            </button>
            {showInviteToast && <span className="text-xs text-neon-green animate-pulse">Link copied to clipboard</span>}
         </div>
      ) : (
        <div className="text-center">
          <div className="font-mono text-neon-green text-sm tracking-widest mb-4">
            <EncryptionEffect 
              text={status === ConnectionStatus.DISCONNECTED ? "UPLINK SEVERED" : "ESTABLISHING HANDSHAKE..."} 
              duration={2000} 
            />
          </div>
          <div className="w-48 h-0.5 bg-void-gray rounded-full overflow-hidden mx-auto">
            <div className="h-full bg-neon-green animate-progress-indeterminate w-1/3 rounded-full"></div>
          </div>
        </div>
      )}
    </div>
  );

  if (isInLobby) {
      return (
        <div className="h-screen w-full bg-void-black text-zinc-200 font-sans selection:bg-neon-green/30 relative overflow-hidden flex flex-col">
            {renderLobby()}
        </div>
      );
  }

  return (
    <div className="h-screen w-full bg-void-black text-zinc-200 font-sans selection:bg-neon-green/30 relative overflow-hidden flex flex-col">
      
      {/* HEADER */}
      {status === ConnectionStatus.CONNECTED && (
        <header className="absolute top-0 w-full z-20 px-4 py-3 flex justify-between items-center bg-void-black/80 backdrop-blur-md border-b border-white/5">
          <div className="flex items-center gap-3">
             <div onClick={() => setShowSidebar(true)} className="p-2 -ml-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors md:hidden">
                 <Menu size={20} />
             </div>
             <div className="flex flex-col">
                 <span className="font-bold text-sm text-white tracking-wide">{mood === 'FUNNY' ? 'LALA' : 'GHAMGEEN'}</span>
                 <span className="font-mono text-[10px] text-neon-green flex items-center gap-1">
                     <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse"></span>
                     ONLINE
                 </span>
             </div>
          </div>
          
          <div className="flex gap-2">
              {/* Commands Hint */}
              <div className="hidden md:flex items-center gap-2 mr-4 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                  <Terminal size={12} className="text-zinc-500" />
                  <span className="text-[10px] text-zinc-500 font-mono">/roast /topic</span>
              </div>

              {(mode === 'AI' || isHostRef.current) && (
                   <button onClick={toggleMood} className={`p-2 rounded-full transition-colors bg-void-dark ${mood === 'FUNNY' ? 'text-neon-green hover:bg-neon-green/10' : 'text-blue-400 hover:bg-blue-400/10'}`}>
                       {mood === 'FUNNY' ? <Smile size={18} /> : <Frown size={18} />}
                   </button>
              )}
              
              {/* Desktop Participant Toggle (Just shows list on side really) */}
              <button onClick={() => setShowSidebar(!showSidebar)} className="hidden md:flex p-2 text-zinc-400 hover:text-white transition-colors bg-void-dark rounded-full">
                  <Users size={18} />
              </button>

              <button onClick={handleDisconnect} className="p-2 text-red-400 hover:bg-red-400/10 transition-colors bg-void-dark rounded-full">
                <Power size={18} />
              </button>
          </div>
        </header>
      )}

      {/* SIDEBAR (Participants) */}
      <div className={`fixed inset-y-0 right-0 w-64 bg-zinc-900 border-l border-white/10 transform transition-transform duration-300 z-30 ${showSidebar ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-4 flex justify-between items-center border-b border-white/5">
              <h3 className="font-bold text-sm tracking-wider flex items-center gap-2"><Users size={14} /> AGENTS</h3>
              <button onClick={() => setShowSidebar(false)} className="text-zinc-500 hover:text-white"><X size={18} /></button>
          </div>
          <div className="p-4 space-y-3">
              {participants.map(p => (
                  <div key={p.peerId} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-600 flex items-center justify-center font-bold text-xs">
                          {p.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                          <span className="text-sm font-medium">{p.username} {p.peerId === peerId && '(You)'}</span>
                          <span className="text-[10px] text-zinc-500 font-mono">{p.isHost ? 'HOST' : 'AGENT'}</span>
                      </div>
                  </div>
              ))}
              {mode === 'AI' && (
                   <div className="flex items-center gap-3 p-2 rounded-lg bg-neon-purple/5 border border-neon-purple/20">
                      <div className="w-8 h-8 rounded-full bg-neon-purple/20 text-neon-purple flex items-center justify-center">
                          <Bot size={16} />
                      </div>
                      <div className="flex flex-col">
                          <span className="text-sm font-medium">{mood === 'FUNNY' ? 'Lala' : 'Ghamgeen'}</span>
                          <span className="text-[10px] text-neon-purple font-mono">AI CONSTRUCT</span>
                      </div>
                   </div>
              )}
          </div>
          {/* Invite Link in Sidebar */}
          {mode === 'P2P' && (
              <div className="absolute bottom-4 left-4 right-4">
                  <button 
                    onClick={() => {
                        if (peerId) {
                            const url = `${window.location.origin}${window.location.pathname}?join=${peerId}`;
                            navigator.clipboard.writeText(url);
                        }
                    }}
                    className="w-full py-3 bg-neon-green text-black font-bold rounded-lg text-xs flex items-center justify-center gap-2 hover:bg-green-400 transition-colors"
                  >
                      <UserPlus size={14} /> INVITE OTHERS
                  </button>
              </div>
          )}
      </div>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 relative overflow-hidden flex flex-col">
         {(status === ConnectionStatus.SEARCHING || status === ConnectionStatus.WAITING_FOR_PEER || status === ConnectionStatus.DISCONNECTED) ? renderLoading() : (
             <div className="flex flex-col h-full pt-16">
              <div className="flex-1 overflow-y-auto px-4 scroll-smooth">
                <div className="max-w-3xl mx-auto flex flex-col justify-end min-h-full pb-4">
                  {messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} />
                  ))}
                  
                  {isTyping && (
                     <div className="flex w-full mb-4 justify-start animate-pulse opacity-50">
                      <div className="flex flex-row gap-3 items-center">
                         <div className="w-8 h-8 rounded-full bg-void-dark flex items-center justify-center shrink-0 border border-void-gray">
                            <span className="text-xs">...</span>
                         </div>
                         <span className="text-xs text-zinc-500 font-mono">Construct is typing...</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* INPUT */}
              <div className="p-4 bg-void-black/80 backdrop-blur-xl border-t border-white/5 sticky bottom-0 z-10">
                <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex gap-3 items-end">
                  <div className="relative flex-1 bg-zinc-900/50 rounded-2xl border border-white/10 focus-within:border-zinc-500 focus-within:bg-zinc-900 transition-all">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => {
                          setInputText(e.target.value);
                          if (mode === 'P2P' && connectionsRef.current) {
                              broadcastData({ type: 'typing' });
                          }
                      }}
                      placeholder={`Message ${mode === 'P2P' ? 'Group' : 'Void'}...`}
                      className="w-full bg-transparent text-zinc-200 px-4 py-3 outline-none placeholder:text-zinc-600 font-sans"
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className={`p-3 text-black rounded-full hover:scale-105 disabled:opacity-50 disabled:scale-100 transition-all shadow-lg ${mood === 'FUNNY' ? 'bg-neon-green shadow-neon-green/20' : 'bg-blue-400 shadow-blue-400/20'}`}
                  >
                    <Send size={20} className={inputText.trim() ? "translate-x-0.5" : ""} />
                  </button>
                </form>
              </div>
            </div>
         )}
      </div>

      {/* BG Effect */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }}></div>
    </div>
  );
};

export default App;