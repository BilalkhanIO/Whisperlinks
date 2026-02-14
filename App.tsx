import React, { useState, useEffect, useRef } from 'react';
import { Message, SenderType, ConnectionStatus, ChatMood } from './types';
import { sendMessageToGemini, initializeChatSession, resetSession } from './services/geminiService';
import { ChatMessage } from './components/ChatMessage';
import { EncryptionEffect } from './components/EncryptionEffect';
import { LOADING_MESSAGES, FUNNY_INSTRUCTION, SAD_INSTRUCTION } from './constants';
import { Send, Power, RefreshCw, Lock, Terminal, Shield, Globe, UserPlus, Smile, Frown, Copy } from 'lucide-react';

const App: React.FC = () => {
  // State
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.IDLE);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [mood, setMood] = useState<ChatMood>('FUNNY');
  const [showInviteToast, setShowInviteToast] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check for join parameter on mount
    const params = new URLSearchParams(window.location.search);
    const joinParam = params.get('join');
    if (joinParam) {
      setJoinRoomId(joinParam);
    }
  }, []);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Handlers
  const handleConnect = async () => {
    setStatus(ConnectionStatus.SEARCHING);
    resetSession();
    
    // Simulate connection sequence
    let step = 0;
    const interval = setInterval(() => {
      if (step >= 3) {
        clearInterval(interval);
        setStatus(ConnectionStatus.CONNECTED);
        
        // Initialize with current mood
        const instruction = mood === 'FUNNY' ? FUNNY_INSTRUCTION : SAD_INSTRUCTION;
        initializeChatSession(instruction);

        // Add initial system message
        const roomCode = joinRoomId || Math.random().toString(36).substring(7).toUpperCase();
        setMessages([
          {
            id: 'sys-1',
            text: `CONNECTED TO ENCRYPTED ROOM: ${roomCode}`,
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
        
        // Trigger initial greeting from AI after a delay
        setTimeout(async () => {
           setIsTyping(true);
           try {
             const greetingPrompt = mood === 'FUNNY' 
                ? "Start the conversation with a loud, funny Roman Urdu/Pashto greeting like a chaotic friend entering a room."
                : "Start the conversation with a deep, heavy sigh and a sad Roman Urdu/Pashto line about loneliness.";
             
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

  const handleDisconnect = () => {
    setStatus(ConnectionStatus.DISCONNECTED);
    // Clear URL param without refresh
    window.history.pushState({}, '', window.location.pathname);
    setJoinRoomId(null);
    
    setTimeout(() => {
      setMessages([]);
      setStatus(ConnectionStatus.IDLE);
    }, 2000);
  };

  const handleInvite = () => {
    // Generate a valid URL that points to the current app
    const roomId = joinRoomId || Math.random().toString(36).substring(7);
    const baseUrl = window.location.href.split('?')[0];
    const inviteUrl = `${baseUrl}?join=${roomId}`;
    
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setShowInviteToast(true);
      setTimeout(() => setShowInviteToast(false), 3000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      // Fallback or error handling if clipboard fails (rare in secure contexts)
    });
  };

  const toggleMood = async () => {
    const newMood = mood === 'FUNNY' ? 'SAD' : 'FUNNY';
    setMood(newMood);
    
    // If connected, we need to re-initialize or prompt the change contextually
    if (status === ConnectionStatus.CONNECTED) {
        // We'll add a system message indicating the vibe shift
        addMessage(newMood === 'FUNNY' ? "⚠️ VIBE SHIFT: ENTERING CHAOS MODE" : "⚠️ VIBE SHIFT: ENTERING SAD HOURS", SenderType.SYSTEM);
        
        // Re-initialize logic would be ideal, but for seamless chat, we can try just sending a steering message next time.
        // Or better, re-init session silently.
        const instruction = newMood === 'FUNNY' ? FUNNY_INSTRUCTION : SAD_INSTRUCTION;
        await initializeChatSession(instruction);
        
        // Trigger a reaction to the mood change
        setIsTyping(true);
        const reactionPrompt = newMood === 'FUNNY' 
            ? "The mood has changed to FUNNY. React to this change loudly in Roman Urdu/Pashto." 
            : "The mood has changed to SAD. React to this change with a deep sigh in Roman Urdu/Pashto.";
        
        const response = await sendMessageToGemini(reactionPrompt);
        setIsTyping(false);
        addMessage(response, SenderType.STRANGER);
    }
  };

  const addMessage = (text: string, sender: SenderType) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      sender,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || status !== ConnectionStatus.CONNECTED) return;

    const userMsg = inputText.trim();
    setInputText('');
    addMessage(userMsg, SenderType.USER);

    setIsTyping(true);
    
    // Random delay for realism
    const typingDelay = Math.random() * 1500 + 500; 

    setTimeout(async () => {
      try {
        const response = await sendMessageToGemini(userMsg);
        setIsTyping(false);
        addMessage(response, SenderType.STRANGER);
      } catch (error) {
        setIsTyping(false);
        addMessage("Signal dropped...", SenderType.SYSTEM);
      }
    }, typingDelay);
  };

  // Render Logic
  const renderContent = () => {
    if (status === ConnectionStatus.IDLE) {
      return (
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
              Secret group chat. Anonymous. 
              <br/>
              <span className="text-neon-purple text-sm">Powered by Chaotic AI</span>
            </p>
            {joinRoomId && (
              <div className="mt-4 p-2 bg-neon-green/10 border border-neon-green/30 rounded text-neon-green text-xs font-mono">
                INVITE CODE DETECTED: {joinRoomId}
              </div>
            )}
          </div>

          <div className="flex gap-4">
             <button
              onClick={handleConnect}
              className="group relative px-8 py-4 bg-zinc-100 text-black font-semibold rounded-full hover:bg-white hover:scale-105 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
            >
              <span className="flex items-center gap-2">
                <Terminal size={18} />
                {joinRoomId ? "JOIN GROUP" : "START CHAT"}
              </span>
            </button>
            
            <button
                onClick={toggleMood}
                className={`px-4 py-4 rounded-full border transition-all hover:scale-105 ${mood === 'FUNNY' ? 'bg-neon-green/10 border-neon-green text-neon-green' : 'bg-blue-500/10 border-blue-500 text-blue-400'}`}
                title="Toggle Vibe"
            >
                {mood === 'FUNNY' ? <Smile size={24} /> : <Frown size={24} />}
            </button>
          </div>
          
          <div className="text-xs text-zinc-600 font-mono">
             MODE: {mood === 'FUNNY' ? "LALA (FUNNY/ROAST)" : "GHAMGEEN (SAD/EMO)"}
          </div>

        </div>
      );
    }

    if (status === ConnectionStatus.SEARCHING || status === ConnectionStatus.DISCONNECTED) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="font-mono text-neon-green text-sm tracking-widest mb-4">
            <EncryptionEffect 
              text={status === ConnectionStatus.DISCONNECTED ? "TERMINATING CONNECTION..." : LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]} 
              duration={2000} 
            />
          </div>
          <div className="w-64 h-1 bg-void-gray rounded-full overflow-hidden">
            <div className="h-full bg-neon-green animate-progress-indeterminate w-1/2 rounded-full"></div>
          </div>
        </div>
      );
    }

    // CONNECTED STATE
    return (
      <div className="flex flex-col h-full bg-void-black">
        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 scroll-smooth">
          <div className="max-w-2xl mx-auto flex flex-col justify-end min-h-full pb-4">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            
            {isTyping && (
               <div className="flex w-full mb-4 justify-start animate-pulse">
                <div className="flex flex-row gap-3">
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${mood === 'FUNNY' ? 'bg-neon-purple/20 text-neon-purple' : 'bg-blue-900/40 text-blue-400'}`}>
                      <Globe size={16} />
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

        {/* Invite Toast */}
        {showInviteToast && (
            <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-neon-green text-black px-4 py-2 rounded-full text-sm font-bold shadow-lg animate-bounce z-50 flex items-center gap-2 pointer-events-none">
                <Copy size={14} />
                Link Copied! Share with friends.
            </div>
        )}

        {/* Input Area */}
        <div className="p-4 bg-void-black/90 backdrop-blur-md border-t border-void-gray sticky bottom-0 z-10">
          <form 
            onSubmit={handleSendMessage}
            className="max-w-2xl mx-auto flex gap-3 items-end"
          >
             <button
              type="button"
              onClick={handleDisconnect}
              className="p-3 rounded-full text-zinc-500 hover:text-red-500 hover:bg-void-dark transition-colors mb-0.5"
              title="Disconnect"
            >
              <Power size={20} />
            </button>
            
            <button
                type="button"
                onClick={toggleMood}
                className={`p-3 rounded-full transition-colors mb-0.5 ${mood === 'FUNNY' ? 'text-neon-green hover:bg-neon-green/10' : 'text-blue-400 hover:bg-blue-400/10'}`}
                title={mood === 'FUNNY' ? "Switch to Sad" : "Switch to Funny"}
            >
                {mood === 'FUNNY' ? <Smile size={20} /> : <Frown size={20} />}
            </button>

            <div className="relative flex-1 bg-void-dark rounded-2xl border border-void-gray focus-within:border-zinc-500 focus-within:ring-1 focus-within:ring-zinc-500 transition-all">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={mood === 'FUNNY' ? "Say something crazy..." : "Share your pain..."}
                className="w-full bg-transparent text-zinc-200 px-4 py-3 outline-none placeholder:text-zinc-600"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={!inputText.trim()}
              className={`p-3 text-black rounded-full hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_10px_rgba(255,255,255,0.1)] mb-0.5 ${mood === 'FUNNY' ? 'bg-neon-green' : 'bg-zinc-100'}`}
            >
              <Send size={20} className={inputText.trim() ? "translate-x-0.5" : ""} />
            </button>
          </form>
          <div className="text-center mt-2">
             <span className="text-[10px] text-zinc-600 flex items-center justify-center gap-1">
               <Shield size={10} /> Encrypted • Pashto/Urdu Supported
             </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen w-full bg-void-black text-zinc-200 font-sans selection:bg-neon-green/30 relative overflow-hidden">
      {/* Header (Only visible when connected) */}
      {status === ConnectionStatus.CONNECTED && (
        <header className="absolute top-0 w-full z-20 px-6 py-4 flex justify-between items-center bg-gradient-to-b from-void-black to-transparent pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
             <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse"></div>
             <span className="font-mono text-xs text-neon-green tracking-widest opacity-80">
                 {mood === 'FUNNY' ? "LALA_ONLINE" : "SAD_HOURS"}
             </span>
          </div>
          
          <div className="flex gap-2 pointer-events-auto">
             <button 
                 onClick={handleInvite}
                 className="p-2 text-zinc-400 hover:text-neon-purple transition-colors bg-void-dark/50 rounded-full"
                 title="Invite a Friend"
              >
                <UserPlus size={18} />
              </button>
              <button 
                 onClick={handleConnect}
                 className="p-2 text-zinc-600 hover:text-zinc-300 transition-colors"
                 title="New Chat"
              >
                <RefreshCw size={18} />
              </button>
          </div>
        </header>
      )}

      {renderContent()}
      
      {/* Background Matrix/Grid Effect (Subtle) */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }}></div>
    </div>
  );
};

export default App;