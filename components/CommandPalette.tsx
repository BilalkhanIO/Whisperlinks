import React, { useState, useEffect, useRef } from 'react';
import {
  Search, ShieldAlert, Phone, PhoneOff, Paperclip, BarChart2,
  Ghost, Bot, Sparkles, Download, Settings, Trash2, X, ArrowRight, CornerDownLeft
} from 'lucide-react';
import { Message } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerPanic: () => void;
  onToggleVoiceCall: () => void;
  isInVoiceCall: boolean;
  onOpenFilePicker: () => void;
  onOpenPollModal: () => void;
  onToggleWhisper: () => void;
  isWhisperMode: boolean;
  onRunAiCommand: (cmd: string) => void;
  onExportChat: () => void;
  onOpenSettings: () => void;
  onClearChat: () => void;
  messages: Message[];
  onSelectMessage?: (msgId: string) => void;
}

interface PaletteAction {
  id: string;
  category: 'Actions' | 'AI Commands' | 'Messages';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
  badge?: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onTriggerPanic,
  onToggleVoiceCall,
  isInVoiceCall,
  onOpenFilePicker,
  onOpenPollModal,
  onToggleWhisper,
  isWhisperMode,
  onRunAiCommand,
  onExportChat,
  onOpenSettings,
  onClearChat,
  messages,
  onSelectMessage
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build items based on query
  const baseActions: PaletteAction[] = [
    {
      id: 'panic',
      category: 'Actions',
      title: 'Panic Exit (Instant Wipe & Disguise)',
      subtitle: 'Instantly wipe memory and switch to spreadsheet or code disguise',
      icon: <ShieldAlert className="text-red-400" size={16} />,
      badge: 'Alt+P',
      action: onTriggerPanic
    },
    {
      id: 'voice',
      category: 'Actions',
      title: isInVoiceCall ? 'Leave Live Voice Room' : 'Start / Join Live Voice Room',
      subtitle: 'Encrypted peer-to-peer browser voice call',
      icon: isInVoiceCall ? <PhoneOff className="text-red-400" size={16} /> : <Phone className="text-neon-green" size={16} />,
      badge: 'P2P',
      action: onToggleVoiceCall
    },
    {
      id: 'file',
      category: 'Actions',
      title: 'Send File / Image via P2P Drop',
      subtitle: 'Direct browser-to-browser encrypted transfer',
      icon: <Paperclip className="text-blue-400" size={16} />,
      action: onOpenFilePicker
    },
    {
      id: 'poll',
      category: 'Actions',
      title: 'Create Interactive Poll',
      subtitle: 'Poll participants with synchronized live voting',
      icon: <BarChart2 className="text-amber-400" size={16} />,
      action: onOpenPollModal
    },
    {
      id: 'whisper',
      category: 'Actions',
      title: isWhisperMode ? 'Disable Whisper Mode' : 'Enable Whisper Mode (15s Burn)',
      subtitle: 'Messages self-destruct after viewing',
      icon: <Ghost className={isWhisperMode ? 'text-neon-purple' : 'text-zinc-400'} size={16} />,
      badge: isWhisperMode ? 'ACTIVE' : undefined,
      action: onToggleWhisper
    },
    {
      id: 'ai-summary',
      category: 'AI Commands',
      title: '/summary - Conversation Summary',
      subtitle: 'Generate concise highlights and key discussion topics',
      icon: <Sparkles className="text-yellow-400" size={16} />,
      action: () => onRunAiCommand('/summary')
    },
    {
      id: 'ai-action-items',
      category: 'AI Commands',
      title: '/action-items - Extract Tasks & Decisions',
      subtitle: 'Identify decisions and assignable action items',
      icon: <Bot className="text-neon-green" size={16} />,
      action: () => onRunAiCommand('/action-items')
    },
    {
      id: 'ai-roast',
      category: 'AI Commands',
      title: '/roast - AI Persona Roast',
      subtitle: 'Lively savage roast of current chat history',
      icon: <Sparkles className="text-red-400" size={16} />,
      action: () => onRunAiCommand('/roast')
    },
    {
      id: 'ai-vibe',
      category: 'AI Commands',
      title: '/vibe - Emotional Room Check',
      subtitle: 'AI analyzes the room vibe & group dynamics',
      icon: <Bot className="text-cyan-400" size={16} />,
      action: () => onRunAiCommand('/vibe')
    },
    {
      id: 'export',
      category: 'Actions',
      title: 'Export Chat Log (TXT)',
      subtitle: 'Download complete chat transcript securely',
      icon: <Download className="text-zinc-300" size={16} />,
      action: onExportChat
    },
    {
      id: 'settings',
      category: 'Actions',
      title: 'Open Settings & Diagnostics',
      subtitle: 'Voice, SFX, room fingerprint, WebRTC diagnostics',
      icon: <Settings className="text-zinc-400" size={16} />,
      action: onOpenSettings
    },
    {
      id: 'clear',
      category: 'Actions',
      title: 'Clear Local Chat History',
      subtitle: 'Wipe messages from current local screen',
      icon: <Trash2 className="text-red-400" size={16} />,
      action: onClearChat
    }
  ];

  // Filter actions or search messages if query provided
  const q = query.toLowerCase().trim();

  let matchedItems: PaletteAction[] = [];

  if (!q) {
    matchedItems = baseActions;
  } else {
    // Check actions first
    const actionMatches = baseActions.filter(a =>
      a.title.toLowerCase().includes(q) ||
      (a.subtitle && a.subtitle.toLowerCase().includes(q))
    );

    // Also search messages
    const messageMatches: PaletteAction[] = messages
      .filter(m => m.text && m.text.toLowerCase().includes(q))
      .slice(-5)
      .reverse()
      .map(m => ({
        id: `msg-${m.id}`,
        category: 'Messages',
        title: m.text.length > 60 ? m.text.substring(0, 60) + '...' : m.text,
        subtitle: `${m.username || 'User'} • ${new Date(m.timestamp).toLocaleTimeString()}`,
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
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, matchedItems, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center pt-20 px-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-void-dark border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10 bg-void-black/40">
          <Search size={18} className="text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            placeholder="Type a command or search messages (e.g. /summary, voice, panic)..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-zinc-100 placeholder:text-zinc-500 font-mono"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-zinc-500 hover:text-zinc-300 rounded"
            >
              <X size={14} />
            </button>
          )}
          <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-zinc-500 border border-white/10 rounded">
            ESC to close
          </span>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-white/[0.04]">
          {matchedItems.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs font-mono">
              No actions or messages match "{query}"
            </div>
          ) : (
            matchedItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-neon-purple/15 text-white border border-neon-purple/40'
                      : 'text-zinc-300 hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg shrink-0 ${isSelected ? 'bg-neon-purple/20' : 'bg-void-black/60 border border-white/5'}`}>
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-xs truncate">{item.title}</span>
                        {item.badge && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-white/10 text-zinc-300">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <p className="text-[11px] text-zinc-500 truncate mt-0.5">{item.subtitle}</p>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-neon-purple shrink-0 pl-2">
                      <span>Execute</span>
                      <CornerDownLeft size={11} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 border-t border-white/10 bg-void-black/60 flex items-center justify-between text-[10px] font-mono text-zinc-500">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
          </div>
          <span>WhisperLink Command Palette</span>
        </div>
      </div>
    </div>
  );
};
