import React from 'react';
import { Shield, Lock, Unlock, UserX, FileUp, Mic, Bot, X, AlertTriangle, UserPlus, BookmarkPlus } from 'lucide-react';
import { UserInfo, ModerationSettings } from '../types';

interface ModerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: UserInfo[];
  moderationSettings: ModerationSettings;
  onUpdateSettings: (newSettings: Partial<ModerationSettings>) => void;
  onKickParticipant: (peerId: string, username: string) => void;
  onCloseRoom: () => void;
  onOpenAddUser?: () => void;
  onSaveContact?: (username: string, peerId: string) => void;
}

export const ModerationModal: React.FC<ModerationModalProps> = ({
  isOpen,
  onClose,
  participants,
  moderationSettings,
  onUpdateSettings,
  onKickParticipant,
  onCloseRoom,
  onOpenAddUser,
  onSaveContact
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-void-dark border border-white/10 rounded-2xl p-6 shadow-2xl space-y-6 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2 text-zinc-100">
            <Shield className="text-neon-green" size={20} />
            <div>
              <h3 className="font-semibold text-sm">Room Moderation & Host Controls</h3>
              <p className="text-[11px] text-zinc-500">Manage participants and cryptographic room permissions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-zinc-300 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Room Permissions */}
        <div className="space-y-3">
          <p className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            Room Policies
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Lock Room */}
            <button
              onClick={() => onUpdateSettings({ isLocked: !moderationSettings.isLocked })}
              className={`p-3 rounded-xl border flex items-center justify-between text-left transition-all ${
                moderationSettings.isLocked
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                  : 'bg-void-black border-white/5 text-zinc-400 hover:border-white/10'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {moderationSettings.isLocked ? <Lock size={16} className="text-amber-400" /> : <Unlock size={16} />}
                <div>
                  <p className="text-xs font-semibold">Lock Room</p>
                  <p className="text-[10px] opacity-70">
                    {moderationSettings.isLocked ? 'New peers rejected' : 'Open to join'}
                  </p>
                </div>
              </div>
            </button>

            {/* AI Assistant */}
            <button
              onClick={() => onUpdateSettings({ allowAI: !moderationSettings.allowAI })}
              className={`p-3 rounded-xl border flex items-center justify-between text-left transition-all ${
                moderationSettings.allowAI
                  ? 'bg-neon-green/10 border-neon-green/40 text-neon-green'
                  : 'bg-void-black border-white/5 text-zinc-500 hover:border-white/10'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Bot size={16} />
                <div>
                  <p className="text-xs font-semibold">AI Assistant</p>
                  <p className="text-[10px] opacity-70">
                    {moderationSettings.allowAI ? 'AI active' : 'AI disabled'}
                  </p>
                </div>
              </div>
            </button>

            {/* File Sharing */}
            <button
              onClick={() => onUpdateSettings({ allowFileSharing: !moderationSettings.allowFileSharing })}
              className={`p-3 rounded-xl border flex items-center justify-between text-left transition-all ${
                moderationSettings.allowFileSharing
                  ? 'bg-blue-500/10 border-blue-500/40 text-blue-300'
                  : 'bg-void-black border-white/5 text-zinc-500 hover:border-white/10'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileUp size={16} />
                <div>
                  <p className="text-xs font-semibold">P2P File Drop</p>
                  <p className="text-[10px] opacity-70">
                    {moderationSettings.allowFileSharing ? 'Files allowed' : 'Files blocked'}
                  </p>
                </div>
              </div>
            </button>

            {/* Voice Rooms */}
            <button
              onClick={() => onUpdateSettings({ allowVoice: !moderationSettings.allowVoice })}
              className={`p-3 rounded-xl border flex items-center justify-between text-left transition-all ${
                moderationSettings.allowVoice
                  ? 'bg-neon-purple/10 border-neon-purple/40 text-neon-purple'
                  : 'bg-void-black border-white/5 text-zinc-500 hover:border-white/10'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Mic size={16} />
                <div>
                  <p className="text-xs font-semibold">Voice Calls</p>
                  <p className="text-[10px] opacity-70">
                    {moderationSettings.allowVoice ? 'Voice rooms enabled' : 'Voice blocked'}
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Connected Participants */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
              Active Peers ({participants.length})
            </p>
            {onOpenAddUser && (
              <button
                type="button"
                onClick={onOpenAddUser}
                className="px-2.5 py-1 rounded-lg bg-neon-green/10 hover:bg-neon-green/20 text-neon-green border border-neon-green/30 text-xs font-mono flex items-center gap-1 transition-colors"
                title="Add peer by username handle"
              >
                <UserPlus size={12} />
                <span>Add User</span>
              </button>
            )}
          </div>

          <div className="divide-y divide-white/5 border border-white/5 bg-void-black/60 rounded-xl overflow-hidden">
            {participants.length === 0 ? (
              <p className="p-4 text-xs font-mono text-zinc-500 text-center">No other peers connected yet.</p>
            ) : (
              participants.map(p => (
                <div key={p.peerId} className="p-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-medium text-zinc-200 truncate">{p.username}</span>
                      {p.isHost && (
                        <span className="px-1.5 py-0.5 text-[9px] font-mono bg-neon-green/20 text-neon-green rounded border border-neon-green/40">
                          HOST
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500 truncate block">
                      Handle: @{p.username} · ID: {p.peerId.slice(0, 14)}...
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {onSaveContact && (
                      <button
                        onClick={() => onSaveContact(p.username, p.peerId)}
                        className="p-1.5 text-zinc-400 hover:text-neon-green hover:bg-white/5 rounded-lg transition-colors"
                        title="Save to local contacts"
                      >
                        <BookmarkPlus size={14} />
                      </button>
                    )}

                    {!p.isHost && (
                      <button
                        onClick={() => onKickParticipant(p.peerId, p.username)}
                        className="px-2.5 py-1 text-xs font-mono text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-1 transition-all"
                        title="Remove peer from room"
                      >
                        <UserX size={13} />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Terminate Room */}
        <div className="pt-2 border-t border-white/5">
          <button
            onClick={onCloseRoom}
            className="w-full p-3 rounded-xl border border-red-900/40 bg-red-950/20 text-red-400 hover:bg-red-900/40 hover:border-red-800 transition-all font-mono text-xs flex items-center justify-center gap-2"
          >
            <AlertTriangle size={15} />
            <span>Terminate Room & Disconnect All Peers</span>
          </button>
        </div>
      </div>
    </div>
  );
};
