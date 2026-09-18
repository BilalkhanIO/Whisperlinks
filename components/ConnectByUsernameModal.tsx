import React, { useState, useEffect } from 'react';
import {
  UserPlus, Search, Phone, Check,  X, Loader2,  BookOpen,
  Radio,  Star
} from 'lucide-react';
import {
  
  lookupEphemeralPeers,
  getPeerIdFromWhisperId,
} from '../services/identityService';
import { StoredContact } from '../services/whisperDb';

interface ConnectByUsernameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (peerId: string, whisperId: string) => void;
  savedContacts: StoredContact[];
  mode?: 'connect' | 'invite'; // 'connect' = call/join, 'invite' = add to active room
}

export const ConnectByUsernameModal: React.FC<ConnectByUsernameModalProps> = ({
  isOpen,
  onClose,
  onConnect,
  savedContacts,
  mode = 'connect',
}) => {
  const [inputQuery, setInputQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{
    whisperId: string;
    username: string;
    identityId: string;
    peerId: string;
    isExactMatch: boolean;
  }>>([]);
  const [searchDone, setSearchDone] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setInputQuery('');
      setSearchResults([]);
      setSearchDone(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = inputQuery.trim();
    if (!query) return;

    setIsSearching(true);
    setSearchDone(false);

    try {
      const results = await lookupEphemeralPeers(query);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
      setSearchDone(true);
    }
  };

  const handleDirectConnect = (targetPeerId?: string, targetWhisperId?: string) => {
    const whisperId = targetWhisperId || inputQuery.trim();
    const peerId = targetPeerId || getPeerIdFromWhisperId(whisperId);
    onConnect(peerId, whisperId);
    onClose();
  };

  const handleSelectContact = (c: StoredContact) => {
    const peerId = c.peerId || getPeerIdFromWhisperId(c.whisperId);
    onConnect(peerId, c.whisperId);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-void-dark border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green">
              <UserPlus size={20} />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                {mode === 'invite' ? 'Invite Peer to Room' : 'Connect via WhisperID'}
              </h3>
              <p className="text-[11px] font-mono text-zinc-500">
                Ephemeral rendezvous discovery • Zero server database
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-zinc-300 rounded-xl hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSearch} className="space-y-3">
          <div>
            <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
              Username Alias or Whisper ID
            </label>
            <div className="relative">
              <input
                type="text"
                value={inputQuery}
                onChange={e => {
                  setInputQuery(e.target.value);
                  setSearchDone(false);
                }}
                placeholder="e.g. bilal or bilal#A7F3D9"
                className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-4 py-3 text-sm font-mono text-white placeholder:text-zinc-600 outline-none focus:border-neon-green transition-all"
                autoFocus
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-mono">
                WhisperID
              </span>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={!inputQuery.trim() || isSearching}
              className="px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 text-xs font-mono border border-white/5 transition-colors flex items-center justify-center gap-1.5"
            >
              {isSearching ? (
                <>
                  <Loader2 size={13} className="animate-spin text-neon-green" />
                  <span>Discovering...</span>
                </>
              ) : (
                <>
                  <Search size={13} />
                  <span>Search Online</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleDirectConnect()}
              disabled={!inputQuery.trim()}
              className="flex-1 py-3 rounded-xl bg-neon-green hover:bg-green-400 disabled:opacity-40 text-black font-bold text-xs font-mono transition-all flex items-center justify-center gap-2 shadow-lg shadow-neon-green/10"
            >
              <Phone size={14} />
              <span>{mode === 'invite' ? 'Send Room Invite' : 'Direct Connect'}</span>
            </button>
          </div>
        </form>

        {/* Ephemeral Discovery Search Results */}
        {searchDone && (
          <div className="space-y-2 animate-in fade-in">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1">
              <Radio size={12} className="text-neon-green animate-pulse" />
              Active Online Nodes ({searchResults.length}):
            </span>

            {searchResults.length === 0 ? (
              <div className="p-3.5 bg-zinc-900/50 rounded-xl border border-white/5 text-xs font-mono text-zinc-400">
                <p>No active node registered with that alias right now.</p>
                <p className="text-[11px] text-zinc-500 mt-1">
                  You can still press &quot;Direct Connect&quot; if your peer is waiting with that exact Whisper ID.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5 border border-white/5 rounded-xl bg-zinc-900/60 max-h-40 overflow-y-auto">
                {searchResults.map((node, i) => (
                  <div
                    key={i}
                    className="p-2.5 flex items-center justify-between hover:bg-white/5 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-mono font-bold text-white">@{node.username}</span>
                        <span className="text-[10px] font-mono text-neon-green">
                          #{node.whisperId.split('#')[1] || ''}
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-neon-green ml-1" title="Online now" />
                      </div>
                      <p className="text-[10px] font-mono text-zinc-500">
                        Peer: {node.peerId.slice(0, 18)}...
                      </p>
                    </div>

                    <button
                      onClick={() => handleDirectConnect(node.peerId, node.whisperId)}
                      className="px-3 py-1.5 rounded-lg bg-neon-green text-black font-bold text-xs font-mono hover:bg-green-400 transition-colors flex items-center gap-1"
                    >
                      <Phone size={12} />
                      <span>{mode === 'invite' ? 'Invite' : 'Connect'}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Saved Contacts Quick-Pick */}
        {savedContacts.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-white/5">
            <p className="text-[11px] font-mono text-zinc-400 flex items-center gap-1">
              <BookOpen size={12} className="text-neon-green" />
              Quick Connect to Saved Contacts:
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {savedContacts.filter(c => !c.blocked).map(c => (
                <button
                  key={c.identityId}
                  type="button"
                  onClick={() => handleSelectContact(c)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/60 text-xs font-mono flex items-center gap-1 transition-colors"
                >
                  <span className="text-neon-green font-bold">@{c.username}</span>
                  <span className="text-zinc-500 text-[10px]">#{c.shortTag}</span>
                  {c.verified && <Check size={10} className="text-neon-green" />}
                  {c.isTrusted && <Star size={10} className="fill-amber-400 text-amber-400" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Informative Note */}
        <div className="p-3 bg-zinc-900/40 rounded-xl border border-white/5 text-[11px] font-mono text-zinc-500 leading-normal">
          💡 <span className="text-zinc-400">Temporary Rendezvous:</span> The server caches presence for only 5 minutes to facilitate signaling. No user accounts, passwords, or contacts are stored on the server.
        </div>
      </div>
    </div>
  );
};
