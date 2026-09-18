import React, { useState, useEffect, useRef } from 'react';
import {
  Search, ShieldAlert, Phone, PhoneOff, Paperclip, BarChart2,
  Ghost, Bot, Sparkles, Download, Settings, Trash2, X,  CornerDownLeft,
  Video, Monitor, Shield, HelpCircle, Lightbulb
} from 'lucide-react';
import { Message } from '../types';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCommand?: (cmd: string) => void;
  onTriggerPanic?: () => void;
  onToggleVoiceCall?: () => void;
  isInVoiceCall?: boolean;
  isInVoice?: boolean;
  onOpenFilePicker?: () => void;
  onOpenPollModal?: () => void;
  onToggleWhisper?: () => void;
  isWhisperMode?: boolean;
  onRunAiCommand?: (cmd: string) => void;
  onExportChat?: () => void;
  onOpenSettings?: () => void;
  onClearChat?: () => void;
  messages?: Message[];
  onSelectMessage?: (msgId: string) => void;
  onToggleVideo?: () => void;
  onToggleScreenShare?: () => void;
  onOpenSecurity?: () => void;
  onOpenFaq?: () => void;
}

interface PaletteAction {
  id: string;
  category: 'Actions' | 'AI Commands' | 'Documentation' | 'Messages';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
  badge?: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectCommand,
  onTriggerPanic,
  onToggleVoiceCall,
  isInVoiceCall,
  isInVoice,
  onOpenFilePicker,
  onOpenPollModal,
  onToggleWhisper,
  isWhisperMode = false,
  onRunAiCommand,
  onExportChat,
  onOpenSettings,
  onClearChat,
  messages = [],
  onSelectMessage,
  onToggleVideo,
  onToggleScreenShare,
  onOpenSecurity,
  onOpenFaq
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeInVoice = isInVoiceCall ?? isInVoice ?? false;

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const dispatch = (cmd: string, fallbackFn?: () => void) => {
    if (fallbackFn) {
      fallbackFn();
    } else if (onSelectCommand) {
      onSelectCommand(cmd);
    }
    onClose();
  };

  const baseActions: PaletteAction[] = [
    {
      id: 'panic',
      category: 'Actions',
      title: 'Panic Exit (Instant Wipe & Disguise)',
      subtitle: 'Instantly wipe memory and switch to spreadsheet or code disguise',
      icon: <ShieldAlert className="text-red-400" size={16} />,
      badge: 'Alt+P',
      action: () => dispatch('/panic', onTriggerPanic)
    },
    {
      id: 'voice',
      category: 'Actions',
      title: activeInVoice ? 'Leave Live Voice Room' : 'Start / Join Live Voice Room',
      subtitle: 'Encrypted peer-to-peer browser voice call',
      icon: activeInVoice ? <PhoneOff className="text-red-400" size={16} /> : <Phone className="text-neon-green" size={16} />,
      badge: 'P2P',
      action: () => dispatch('/voice', onToggleVoiceCall)
    },
    {
      id: 'video',
      category: 'Actions',
      title: 'Toggle Live Camera Video',
      subtitle: 'Enable or disable peer-to-peer camera feed in call',
      icon: <Video className="text-neon-green" size={16} />,
      action: () => dispatch('/video', onToggleVideo)
    },
    {
      id: 'screenshare',
      category: 'Actions',
      title: 'Toggle Screen Sharing',
      subtitle: 'Stream your screen or window to peers via WebRTC',
      icon: <Monitor className="text-blue-400" size={16} />,
      action: () => dispatch('/screenshare', onToggleScreenShare)
    },
    {
      id: 'file',
      category: 'Actions',
      title: 'Send File / Image via P2P Drop',
      subtitle: 'Direct browser-to-browser encrypted transfer with SHA-256 integrity',
      icon: <Paperclip className="text-blue-400" size={16} />,
      action: () => dispatch('/file', onOpenFilePicker)
    },
    {
      id: 'poll',
      category: 'Actions',
      title: 'Create Interactive Poll',
      subtitle: 'Poll participants with synchronized live voting',
      icon: <BarChart2 className="text-amber-400" size={16} />,
      action: () => dispatch('/poll', onOpenPollModal)
    },
    {
      id: 'whisper',
      category: 'Actions',
      title: isWhisperMode ? 'Disable Whisper Mode' : 'Enable Whisper Mode (15s Burn)',
      subtitle: 'Messages self-destruct after viewing',
      icon: <Ghost className={isWhisperMode ? 'text-neon-purple' : 'text-zinc-400'} size={16} />,
      badge: isWhisperMode ? 'ACTIVE' : undefined,
      action: () => dispatch('/whisper', onToggleWhisper)
    },
    {
      id: 'ai-summary',
      category: 'AI Commands',
      title: '/summary - Conversation Summary',
      subtitle: 'Generate concise highlights and key discussion topics',
      icon: <Sparkles className="text-yellow-400" size={16} />,
      action: () => {
        if (onRunAiCommand) onRunAiCommand('/summary');
        else dispatch('/summary');
      }
    },
    {
      id: 'ai-action-items',
      category: 'AI Commands',
      title: '/tasks - Extract Tasks & Decisions',
      subtitle: 'Identify decisions, action items, and next steps',
      icon: <Bot className="text-neon-green" size={16} />,
      action: () => {
        if (onRunAiCommand) onRunAiCommand('/tasks');
        else dispatch('/tasks');
      }
    },
    {
      id: 'ai-idea',
      category: 'AI Commands',
      title: '/idea - Brainstorm Creative Angles',
      subtitle: 'AI sparks innovative perspectives and discussion starters',
      icon: <Lightbulb className="text-amber-300" size={16} />,
      action: () => {
        if (onRunAiCommand) onRunAiCommand('/idea');
        else dispatch('/idea');
      }
    },
    {
      id: 'ai-roast',
      category: 'AI Commands',
      title: '/roast - AI Persona Roast',
      subtitle: 'Lively playful roast of current chat history',
      icon: <Sparkles className="text-red-400" size={16} />,
      action: () => {
        if (onRunAiCommand) onRunAiCommand('/roast');
        else dispatch('/roast');
      }
    },
    {
      id: 'ai-vibe',
      category: 'AI Commands',
      title: '/vibe - Emotional Room Check',
      subtitle: 'AI analyzes the room vibe & group dynamics',
      icon: <Bot className="text-cyan-400" size={16} />,
      action: () => {
        if (onRunAiCommand) onRunAiCommand('/vibe');
        else dispatch('/vibe');
      }
    },
    {
      id: 'security-audit',
      category: 'Documentation',
      title: 'Security Architecture & Cryptographic Audit',
      subtitle: 'Inspect zero-knowledge, Web Crypto P-256, and DTLS-SRTP specifications',
      icon: <Shield className="text-neon-green" size={16} />,
      action: () => dispatch('/security', onOpenSecurity)
    },
    {
      id: 'faq-page',
      category: 'Documentation',
      title: 'Frequently Asked Questions & FAQ',
      subtitle: 'Read anonymous communication guides and backup recovery instructions',
      icon: <HelpCircle className="text-cyan-400" size={16} />,
      action: () => dispatch('/faq', onOpenFaq)
    },
    {
      id: 'export',
      category: 'Actions',
      title: 'Export Chat Log (TXT)',
      subtitle: 'Download complete chat transcript securely',
      icon: <Download className="text-zinc-300" size={16} />,
      action: () => dispatch('/export', onExportChat)
    },
    {
      id: 'settings',
      category: 'Actions',
      title: 'Open Settings & Diagnostics',
      subtitle: 'Voice, SFX, room fingerprint, WebRTC diagnostics',
      icon: <Settings className="text-zinc-400" size={16} />,
      action: () => dispatch('/settings', onOpenSettings)
    },
    {
      id: 'clear',
      category: 'Actions',
      title: 'Clear Local Chat History',
      subtitle: 'Wipe messages from current local screen',
      icon: <Trash2 className="text-red-400" size={16} />,
      action: () => dispatch('/clear', onClearChat)
    }
  ];

  const q = query.toLowerCase().trim();
  let matchedItems: PaletteAction[] = [];

  if (!q) {
    matchedItems = baseActions;
  } else {
    const actionMatches = baseActions.filter(a =>
      a.title.toLowerCase().includes(q) ||
      (a.subtitle && a.subtitle.toLowerCase().includes(q))
    );

    const messageMatches: PaletteAction[] = messages
      .filter(m => m.text && m.text.toLowerCase().includes(q))
      .slice(-5)
      .reverse()
      .map(m => ({
        id: `msg-${m.id}`,
        category: 'Messages',
        title: m.text.length > 60 ? m.text.substring(0, 60) + '...' : m.text,
        subtitle: `${m.username || 'User'} • ${(() => {
          try {
            const d = m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp);
            return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          } catch {
            return '';
          }
        })()}`,
        icon: <Search className="text-neon-purple" size={15} />,
        action: () => {
          if (onSelectMessage) onSelectMessage(m.id);
          onClose();
        }
      }));

    matchedItems = [...actionMatches, ...messageMatches];
  }

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, matchedItems.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + matchedItems.length) % Math.max(1, matchedItems.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (matchedItems[selectedIndex]) {
          matchedItems[selectedIndex].action();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, matchedItems, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
    >
      <div className="w-full max-w-xl bg-void-dark border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]">
        {/* Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10 bg-void-black/40">
          <Search size={18} className="text-neon-green shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or search messages (e.g. /summary, /idea, /voice)..."
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 outline-none font-mono"
            aria-label="Search actions and messages"
          />
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 bg-white/5 border border-white/10 rounded">
            ESC to close
          </kbd>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 p-1 sm:hidden">
            <X size={16} />
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {matchedItems.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-zinc-500">
              No matching commands or messages found for &quot;{query}&quot;
            </div>
          ) : (
            matchedItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors font-mono ${
                    isSelected ? 'bg-white/10 border border-white/15' : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-black/40 border border-white/5 shrink-0">
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-zinc-100 truncate">{item.title}</span>
                        {item.badge && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-neon-green/10 text-neon-green border border-neon-green/20">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <p className="text-[11px] text-zinc-400 truncate">{item.subtitle}</p>
                      )}
                    </div>
                  </div>
                  {isSelected && (
                    <CornerDownLeft size={13} className="text-neon-green shrink-0 ml-2" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-white/5 bg-void-black/60 flex items-center justify-between text-[11px] font-mono text-zinc-500">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
          </div>
          <span>WhisperLink Command System</span>
        </div>
      </div>
    </div>
  );
};
