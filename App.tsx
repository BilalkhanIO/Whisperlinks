import React, { useState, useEffect, useRef } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { Message, SenderType, ConnectionStatus, ChatMood, ChatMode } from './types';
import { sendMessageToGemini, initializeChatSession, resetSession } from './services/geminiService';
import { ChatMessage } from './components/ChatMessage';
import { EncryptionEffect } from './components/EncryptionEffect';
import { LOADING_MESSAGES, FUNNY_INSTRUCTION, SAD_INSTRUCTION } from './constants';
import { Send, Power, RefreshCw, Lock, Terminal, Shield, Globe, UserPlus, Smile, Frown, Copy, Users, Bot, Sparkles } from 'lucide-react';

const App: React.FC = () => {
  // State
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.IDLE);
  const [mode, setMode] = useState<ChatMode>('AI');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [mood, setMood] = useState<ChatMood>('FUNNY');
  const [showInviteToast, setShowInviteToast] = useState(false);
  const [peerId, setPeerId] = useState<string | null>(null);
  
  // Refs for P2P
  const peerRef = useRef<Peer | null>(null);
  // Store multiple connections for Group Chat (Star Topology: Host <-> Many Guests)
  const connectionsRef = useRef<Map<string, DataConnection>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isHostRef = useRef<boolean>(false);
  const moodRef = useRef<ChatMood>('FUNNY'); // Ref to track mood for callbacks/sync
  
  // AI Control Refs
  const lastAiTriggerRef = useRef<number>(0);

  // Check API Key
  const hasApiKey = !!process.env.API_KEY;

  useEffect(() => {
    // Check for join parameter on mount
    const params = new URLSearchParams(window.location.search);
    const joinParam = params.get('join');
    
    if (joinParam) {
      setMode('P2P');
      initializePeer(false, joinParam);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // --- P2P LOGIC ---
  const initializePeer = (isHost: boolean, hostId?: string) => {
    setStatus(ConnectionStatus.SEARCHING);
    isHostRef.current = isHost;
    
    // Clean up old peer
    if (peerRef.current) peerRef.current.destroy();
    connectionsRef.current.clear();

    const peer = new Peer();
    peerRef.current = peer;

    peer.on('open', (id) => {
      console.log('My Peer ID:', id);
      setPeerId(id);
      
      if (isHost) {
        setStatus(ConnectionStatus.WAITING_FOR_PEER);
        addMessage(`SECURE ROOM CREATED. ID: ${id}`, SenderType.SYSTEM);
        addMessage(`Waiting for participants...`, SenderType.SYSTEM);
        
        // Initialize AI silently for the Host so it's ready to jump in
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
      // Handle incoming connection
      addMessage(`NEW ENCRYPTED CONNECTION RECEIVED.`, SenderType.SYSTEM);
      setupConnection(conn);
      
      // Sync current mood to new guest when they join
      conn.on('open', () => {
         if (isHostRef.current) {
             conn.send({ type: 'mood_update', mood: moodRef.current });
         }
      });
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);
      // Ignore some non-critical errors or retry
      if (err.type === 'peer-unavailable') {
         addMessage(`ERROR: Room not found or Host is offline.`, SenderType.SYSTEM);
      } else {
         addMessage(`CONNECTION ERROR: ${err.type}`, SenderType.SYSTEM);
      }
      if (!connectionsRef.current.size) {
         setStatus(ConnectionStatus.DISCONNECTED);
      }
    });
  };

  const setupConnection = (conn: DataConnection) => {
    // Add to connections map
    connectionsRef.current.set(conn.peer, conn);

    conn.on('open', () => {
      setStatus(ConnectionStatus.CONNECTED);
      setMode('P2P');
    });

    conn.on('data', (data: any) => {
      if (data.type === 'message') {
        setIsTyping(false);
        // Display the message
        addMessage(data.text, SenderType.STRANGER);

        // If I am Host, relay this message to everyone else
        if (isHostRef.current) {
          broadcastData({ type: 'message', text: data.text }, conn.peer);
          // TRIGGER AI CHECK (Pass the sender's Peer ID)
          triggerGroupAI(data.text, conn.peer);
        }
      } else if (data.type === 'typing') {
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 2000);
        
        // Relay typing status to others if Host
        if (isHostRef.current) {
            broadcastData({ type: 'typing' }, conn.peer);
        }
      } else if (data.type === 'mood_update') {
          // Received mood update from Host
          setMood(data.mood);
          moodRef.current = data.mood;
          addMessage(data.mood === 'FUNNY' ? "⚠️ SYSTEM: HOST ENABLED CHAOS MODE" : "⚠️ SYSTEM: HOST ENABLED SAD HOURS", SenderType.SYSTEM);
      }
    });

    conn.on('close', () => {
      addMessage(`A PEER DISCONNECTED.`, SenderType.SYSTEM);
      connectionsRef.current.delete(conn.peer);
      if (connectionsRef.current.size === 0 && !isHostRef.current) {
        setStatus(ConnectionStatus.DISCONNECTED);
      }
    });
  };

  const broadcastData = (data: any, excludePeerId?: string) => {
    connectionsRef.current.forEach((conn, peerId) => {
      if (peerId !== excludePeerId && conn.open) {
        conn.send(data);
      }
    });
  };

  const broadcastMessage = (text: string) => {
      broadcastData({ type: 'message', text });
  };

  const broadcastTyping = () => {
      broadcastData({ type: 'typing' });
  };

  // --- AI LOGIC (GROUP & SOLO) ---
  
  const triggerGroupAI = async (triggerText: string, senderId: string) => {
    if (!hasApiKey) return;
    
    // KEYWORDS THAT TRIGGER AI (Immediate trigger)
    const lower = triggerText.toLowerCase();
    const keywords = ['lala', 'ghamgeen', 'khan', 'oye', 'bot', 'ai', 'chup', 'kaisa', 'hello', 'hi'];
    const isMention = keywords.some(k => lower.includes(k));
    
    // RANDOM INTERVENTION LOGIC
    // 1. Check cooldown: Don't random trigger if AI spoke in last 20 seconds
    const now = Date.now();
    const timeSinceLastReply = now - lastAiTriggerRef.current;
    const cooldownMs = 20000; 

    // 2. Chance: 5% chance if cooldown passed
    const randomChance = 0.05; 
    const isRandom = (timeSinceLastReply > cooldownMs) && (Math.random() < randomChance);

    if (isMention || isRandom) {
       // Reset cooldown timer immediately so we don't double trigger
       lastAiTriggerRef.current = now;

       // Delay for realism (Human-like typing speed)
       const delay = 1500 + Math.random() * 2000;
       
       setTimeout(async () => {
           // Show typing on Host
           setIsTyping(true);
           // Show typing to Guests (as if a user is typing)
           broadcastTyping();

           try {
               // Contextual Prompt: Include User ID so AI knows who is who
               // We slice the ID to make it short and readable: "User a1b2"
               const shortId = senderId.slice(0, 5);
               const promptWithContext = `[User ${shortId}]: ${triggerText}`;

               const response = await sendMessageToGemini(promptWithContext);
               
               setIsTyping(false);
               
               // Host sees AI message
               addMessage(response, SenderType.STRANGER);
               
               // Guests see AI message (sent as a regular message from Host)
               broadcastMessage(response);
               
               // Update timestamp again after sending
               lastAiTriggerRef.current = Date.now();
               
           } catch (e) {
               console.error("AI Group Error", e);
               setIsTyping(false);
           }
       }, delay);
    }
  };

  const handleConnectAI = async () => {
    setMode('AI');
    setStatus(ConnectionStatus.SEARCHING);
    resetSession();
    
    let step = 0;
    const interval = setInterval(() => {
      if (step >= 3) {
        clearInterval(interval);
        setStatus(ConnectionStatus.CONNECTED);
        
        if (!hasApiKey) {
           addMessage("ERROR: API KEY NOT FOUND. PLEASE CONFIGURE VERCEL ENV VARIABLES.", SenderType.SYSTEM);
           return;
        }

        const instruction = mood === 'FUNNY' ? FUNNY_INSTRUCTION : SAD_INSTRUCTION;
        initializeChatSession(instruction).catch(err => {
            console.error(err);
            addMessage("FAILED TO CONNECT TO AI SERVERS.", SenderType.SYSTEM);
        });

        setMessages([
          {
            id: 'sys-1',
            text: `CONNECTED TO VOID NETWORK`,
            sender: SenderType.SYSTEM,
            timestamp: new Date()
          },
          {
            id: 'stranger-init',
            text: mood === 'FUNNY' ? "Lala entered the chat." : "Ghamgeen entered the chat.",
            sender: SenderType.SYSTEM,
            timestamp: new Date()
          }
        ]);
        
        setTimeout(async () => {
           setIsTyping(true);
           try {
             const greetingPrompt = mood === 'FUNNY' 
                ? "Start the conversation with a loud, funny Roman Urdu/Pashto greeting."
                : "Start the conversation with a deep, heavy sigh and a sad Roman Urdu/Pashto line.";
             
             const response = await sendMessageToGemini(greetingPrompt);
             setIsTyping(false);
             addMessage(response, SenderType.STRANGER);
           } catch (e) {
             setIsTyping(false);
           }
        }, 1500);
      }
      step++;
    }, 800);
  };

  // --- GENERAL HANDLERS ---

  const handleCreateRoom = () => {
    setMode('P2P');
    setMessages([]);
    initializePeer(true);
  };

  const handleDisconnect = () => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    connectionsRef.current.clear();
    
    setStatus(ConnectionStatus.DISCONNECTED);
    window.history.pushState({}, '', window.location.pathname); // Clear URL
    
    setTimeout(() => {
      setMessages([]);
      setStatus(ConnectionStatus.IDLE);
      setPeerId(null);
    }, 2000);
  };

  const handleCopyInvite = () => {
    if (!peerId) return;
    const baseUrl = window.location.href.split('?')[0];
    const inviteUrl = `${baseUrl}?join=${peerId}`;
    
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setShowInviteToast(true);
      setTimeout(() => setShowInviteToast(false), 3000);
    });
  };

  const toggleMood = async () => {
    // Only AI mode or P2P Host can toggle
    if (mode === 'P2P' && !isHostRef.current) return;

    const newMood = mood === 'FUNNY' ? 'SAD' : 'FUNNY';
    setMood(newMood);
    moodRef.current = newMood; // Update ref for sync
    
    // Broadcast mood change if P2P Host
    if (mode === 'P2P' && isHostRef.current) {
        broadcastData({ type: 'mood_update', mood: newMood });
    }
    
    // If we are connected (AI or P2P Host), update the session and react
    if (status === ConnectionStatus.CONNECTED) {
        addMessage(newMood === 'FUNNY' ? "⚠️ SYSTEM: ENTERING CHAOS MODE" : "⚠️ SYSTEM: ENTERING SAD HOURS", SenderType.SYSTEM);
        
        // Reset and re-init with new persona
        resetSession();
        const instruction = newMood === 'FUNNY' ? FUNNY_INSTRUCTION : SAD_INSTRUCTION;
        
        if (hasApiKey) {
            await initializeChatSession(instruction);
            
            // If in AI mode, react immediately. 
            // If in P2P mode, wait for next trigger or react now? 
            // Let's react now to show the change.
            if (mode === 'AI' || isHostRef.current) {
                setIsTyping(true);
                // Broadcast typing in P2P
                if (mode === 'P2P') broadcastTyping();

                const reactionPrompt = newMood === 'FUNNY' 
                    ? "The mood has changed to FUNNY. React loudly." 
                    : "The mood has changed to SAD. React with a sigh.";
                
                try {
                    const response = await sendMessageToGemini(reactionPrompt);
                    setIsTyping(false);
                    addMessage(response, SenderType.STRANGER);
                    if (mode === 'P2P') broadcastMessage(response);
                } catch(e) {
                    setIsTyping(false);
                }
            }
        }
    }
  };

  const addMessage = (text: string, sender: SenderType) => {
    setMessages((prev) => [...prev, {
      id: Date.now().toString() + Math.random().toString(),
      text,
      sender,
      timestamp: new Date(),
    }]);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    const userMsg = inputText.trim();
    setInputText('');
    addMessage(userMsg, SenderType.USER);

    // P2P SEND
    if (mode === 'P2P') {
      // Send to all connected peers
      broadcastMessage(userMsg);
      // Trigger AI if Host
      if (isHostRef.current) {
          // Identify myself as 'HOST' to the AI
          triggerGroupAI(userMsg, 'HOST');
      }
    }
    
    // AI SEND (Solo Mode)
    if (mode === 'AI' && status === ConnectionStatus.CONNECTED) {
      setIsTyping(true);
      const typingDelay = Math.random() * 1500 + 500; 

      setTimeout(async () => {
        try {
          const response = await sendMessageToGemini(userMsg);
          setIsTyping(false);
          addMessage(response, SenderType.STRANGER);
        } catch (error) {
          setIsTyping(false);
          addMessage("Signal dropped... (Check API Key)", SenderType.SYSTEM);
        }
      }, typingDelay);
    }
  };

  const handleInputTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (mode === 'P2P') {
       connectionsRef.current.forEach(conn => {
         if (conn.open) conn.send({ type: 'typing' });
       });
    }
  };

  // --- RENDERERS ---

  const renderIdle = () => (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center space-y-8 animate-in fade-in duration-700">
      <div className="relative">
        <div className="absolute -inset-1 rounded-full bg-neon-green blur opacity-20 animate-pulse"></div>
        <div className="relative bg-void-dark p-6 rounded-full border border-void-gray">
          <Lock size={48} className="text-zinc-100" />
        </div>
      </div>
      
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-500">
          WhisperLink
        </h1>
        <p className="text-zinc-500 max-w-sm mx-auto">
          Encrypted Channels. <br/>
          <span className="text-neon-purple text-sm">Chat with AI or Invite Humans.</span>
        </p>
        {!hasApiKey && (
          <div className="p-2 bg-red-900/30 border border-red-800 rounded text-red-400 text-xs mt-4">
             ⚠️ API KEY MISSING. AI MODE WILL FAIL.
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">
         {/* Enter Void (AI) */}
         <button
          onClick={handleConnectAI}
          className="group relative w-full px-8 py-4 bg-zinc-100 text-black font-semibold rounded-xl hover:bg-white hover:scale-105 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
        >
          <span className="flex items-center justify-center gap-2">
            <Bot size={18} />
            ENTER THE VOID (AI)
          </span>
        </button>
        
        {/* Create Room (P2P) */}
        <button
          onClick={handleCreateRoom}
          className="w-full px-8 py-4 bg-void-dark border border-void-gray text-zinc-300 font-semibold rounded-xl hover:bg-void-gray hover:text-white transition-all duration-300"
        >
          <span className="flex items-center justify-center gap-2">
            <Users size={18} />
            CREATE SECURE ROOM
          </span>
        </button>
      </div>
    </div>
  );

  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center h-full gap-6">
       {/* If waiting for peer (HOST) */}
      {status === ConnectionStatus.WAITING_FOR_PEER ? (
         <div className="flex flex-col items-center gap-4 max-w-md px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-neon-green/10 flex items-center justify-center animate-pulse">
                <Users size={32} className="text-neon-green" />
            </div>
            <h2 className="text-xl font-bold text-white">Room Created</h2>
            <p className="text-zinc-400 text-sm">Share this secure link to invite others.</p>
            
            <button 
              onClick={handleCopyInvite}
              className="flex items-center gap-2 bg-void-gray hover:bg-zinc-700 px-4 py-2 rounded-lg border border-zinc-600 transition-all active:scale-95"
            >
               <span className="font-mono text-xs text-neon-green">{peerId ? 'LINK READY' : 'GENERATING...'}</span>
               <Copy size={14} className="text-zinc-300" />
            </button>
            {showInviteToast && <span className="text-xs text-neon-green animate-pulse">Copied to clipboard!</span>}
            <div className="text-zinc-500 text-xs mt-4">
               Waiting for incoming connections... ({connectionsRef.current.size} connected)
            </div>
         </div>
      ) : (
        <>
          <div className="font-mono text-neon-green text-sm tracking-widest mb-4 text-center">
            <EncryptionEffect 
              text={status === ConnectionStatus.DISCONNECTED ? "CONNECTION TERMINATED" : (mode === 'P2P' ? "ESTABLISHING PEER LINK..." : LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)])} 
              duration={2000} 
            />
          </div>
          <div className="w-64 h-1 bg-void-gray rounded-full overflow-hidden">
            <div className="h-full bg-neon-green animate-progress-indeterminate w-1/2 rounded-full"></div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="h-screen w-full bg-void-black text-zinc-200 font-sans selection:bg-neon-green/30 relative overflow-hidden flex flex-col">
      {/* Header */}
      {status === ConnectionStatus.CONNECTED && (
        <header className="absolute top-0 w-full z-20 px-6 py-4 flex justify-between items-center bg-gradient-to-b from-void-black to-transparent pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto bg-void-black/50 backdrop-blur-sm p-2 rounded-full border border-white/5">
             <div className={`w-2 h-2 rounded-full animate-pulse ${mode === 'P2P' ? 'bg-blue-500' : 'bg-neon-green'}`}></div>
             <span className="font-mono text-xs text-zinc-300 tracking-widest opacity-90">
                 {mode === 'P2P' ? `ENCRYPTED_PEER (${connectionsRef.current.size + 1})` : (mood === 'FUNNY' ? "LALA_ONLINE" : "SAD_HOURS")}
             </span>
          </div>
          
          <div className="flex gap-2 pointer-events-auto">
              {/* Mood Toggle allowed in P2P too now */}
              {(mode === 'AI' || (mode === 'P2P' && isHostRef.current)) && (
                   <button
                   type="button"
                   onClick={toggleMood}
                   className={`p-2 rounded-full transition-colors bg-void-dark/50 ${mood === 'FUNNY' ? 'text-neon-green hover:bg-neon-green/10' : 'text-blue-400 hover:bg-blue-400/10'}`}
                   title="Toggle Persona (Lala/Ghamgeen)"
               >
                   {mood === 'FUNNY' ? <Smile size={18} /> : <Frown size={18} />}
               </button>
              )}

              {mode === 'P2P' && (
                  <button 
                  onClick={handleCopyInvite}
                  className="p-2 text-zinc-400 hover:text-neon-purple transition-colors bg-void-dark/50 rounded-full"
                  title="Copy Link"
               >
                 <UserPlus size={18} />
               </button>
              )}
              <button 
                 onClick={handleDisconnect}
                 className="p-2 text-zinc-600 hover:text-red-400 transition-colors bg-void-dark/50 rounded-full"
                 title="Disconnect"
              >
                <Power size={18} />
              </button>
          </div>
        </header>
      )}

      {/* Main Content */}
      <div className="flex-1 relative overflow-hidden">
         {status === ConnectionStatus.IDLE && renderIdle()}
         {(status === ConnectionStatus.SEARCHING || status === ConnectionStatus.WAITING_FOR_PEER || status === ConnectionStatus.DISCONNECTED) && renderLoading()}
         
         {status === ConnectionStatus.CONNECTED && (
             <div className="flex flex-col h-full bg-void-black pt-16">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 scroll-smooth">
                <div className="max-w-2xl mx-auto flex flex-col justify-end min-h-full pb-4">
                  {messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} />
                  ))}
                  
                  {isTyping && (
                     <div className="flex w-full mb-4 justify-start animate-pulse">
                      <div className="flex flex-row gap-3">
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${mode === 'AI' ? 'bg-neon-purple/20 text-neon-purple' : 'bg-blue-500/20 text-blue-500'}`}>
                            {mode === 'AI' ? <Globe size={16} /> : <Users size={16} />}
                         </div>
                         <div className="bg-void-dark border border-void-gray px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-1">
                            <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></div>
                            <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce delay-100"></div>
                            <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce delay-200"></div>
                         </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Input */}
              <div className="p-4 bg-void-black/90 backdrop-blur-md border-t border-void-gray sticky bottom-0 z-10">
                <form 
                  onSubmit={handleSendMessage}
                  className="max-w-2xl mx-auto flex gap-3 items-end"
                >
                  <div className="relative flex-1 bg-void-dark rounded-2xl border border-void-gray focus-within:border-zinc-500 focus-within:ring-1 focus-within:ring-zinc-500 transition-all">
                    <input
                      type="text"
                      value={inputText}
                      onChange={handleInputTyping}
                      placeholder={mode === 'P2P' ? "Send secure message..." : (mood === 'FUNNY' ? "Say something crazy..." : "Share your pain...")}
                      className="w-full bg-transparent text-zinc-200 px-4 py-3 outline-none placeholder:text-zinc-600"
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className={`p-3 text-black rounded-full hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_10px_rgba(255,255,255,0.1)] mb-0.5 ${mode === 'AI' && mood === 'FUNNY' ? 'bg-neon-green' : 'bg-zinc-100'}`}
                  >
                    <Send size={20} className={inputText.trim() ? "translate-x-0.5" : ""} />
                  </button>
                </form>
                <div className="text-center mt-2">
                   <span className="text-[10px] text-zinc-600 flex items-center justify-center gap-1">
                     <Shield size={10} /> 
                     {mode === 'P2P' ? (
                        <>P2P Encrypted {isHostRef.current && hasApiKey && <span className="text-neon-purple">• AI Active</span>}</>
                     ) : 'AI Simulation Active'}
                   </span>
                </div>
              </div>
            </div>
         )}
      </div>

      {/* Background Matrix/Grid Effect (Subtle) */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }}></div>
    </div>
  );
};

export default App;