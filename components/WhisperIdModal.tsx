import React, { useState, useEffect } from 'react';
import {
  User, Shield, ShieldCheck, Lock, Unlock, KeyRound, Copy, Check, Plus, Trash2,
  Phone, UserPlus, X, QrCode, Download, Share2, Star, Eye, EyeOff, AlertTriangle,
  Radio, BookOpen, Settings, ExternalLink, RefreshCw, Ban
} from 'lucide-react';
import QRCode from 'qrcode';
import {
  UserIdentity,
  changeUsername,
  updatePrivacySettings,
  saveContactToBook,
  removeContactFromBook,
  toggleTrustContact,
  toggleBlockContact,
  parseWhisperId,
  getPeerIdFromWhisperId,
} from '../services/identityService';
import { StoredContact } from '../services/whisperDb';
import { ContactVerificationModal } from './ContactVerificationModal';

interface WhisperIdModalProps {
  isOpen: boolean;
  onClose: () => void;
  identity: UserIdentity;
  onUpdateIdentity: (updated: UserIdentity) => void;
  onOpenPinSetup: () => void;
  onOpenPinDisable: () => void;
  onLockSession: () => void;
  onOpenSetupModal?: () => void;
  onDirectConnectToPeer?: (peerId: string, whisperId: string) => void;
}

export const WhisperIdModal: React.FC<WhisperIdModalProps> = ({
  isOpen,
  onClose,
  identity,
  onUpdateIdentity,
  onOpenPinSetup,
  onOpenPinDisable,
  onLockSession,
  onOpenSetupModal,
  onDirectConnectToPeer,
}) => {
  const [activeTab, setActiveTab] = useState<'id' | 'qr' | 'contacts' | 'privacy'>('id');
  const [copiedId, setCopiedId] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPhrase, setCopiedPhrase] = useState(false);
  const [showPhrase, setShowPhrase] = useState(false);

  // Username Editing
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState(identity.username);

  // QR Code
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Contacts
  const [contactSearch, setContactSearch] = useState('');
  const [newContactInput, setNewContactInput] = useState('');
  const [newContactNickname, setNewContactNickname] = useState('');
  const [contactError, setContactError] = useState('');
  const [contactSuccess, setContactSuccess] = useState('');

  // Verification Modal
  const [verifyingContact, setVerifyingContact] = useState<StoredContact | null>(null);

  // Generate QR Code on open
  useEffect(() => {
    if (isOpen) {
      const connectUrl = `${window.location.origin}${window.location.pathname}#connect=${encodeURIComponent(identity.whisperId)}`;
      QRCode.toDataURL(connectUrl, {
        width: 280,
        margin: 2,
        color: {
          dark: '#00ff66',
          light: '#0a0a0a',
        },
      })
        .then(setQrDataUrl)
        .catch(err => console.warn('QR generation error:', err));
    }
  }, [isOpen, identity.whisperId]);

  if (!isOpen) return null;

  const handleCopyWhisperId = () => {
    navigator.clipboard.writeText(identity.whisperId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyInviteLink = () => {
    const connectUrl = `${window.location.origin}${window.location.pathname}#connect=${encodeURIComponent(identity.whisperId)}`;
    navigator.clipboard.writeText(connectUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyPhrase = () => {
    navigator.clipboard.writeText(identity.recoveryPhrase);
    setCopiedPhrase(true);
    setTimeout(() => setCopiedPhrase(false), 2000);
  };

  const handleSaveUsername = async () => {
    const trimmed = usernameInput.trim().replace(/^@/, '');
    if (!trimmed) return;
    try {
      const updated = await changeUsername(trimmed);
      onUpdateIdentity(updated);
      setIsEditingUsername(false);
    } catch (e) {
      console.warn('Failed to update username:', e);
    }
  };

  const handleToggleInvisibleMode = async () => {
    const nextInvisible = !identity.privacy.invisibleMode;
    const updated = await updatePrivacySettings({ invisibleMode: nextInvisible });
    onUpdateIdentity(updated);
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError('');
    setContactSuccess('');

    if (!newContactInput.trim()) {
      setContactError('Enter a Whisper ID (e.g. ahmed#82KD31)');
      return;
    }

    const { username, tag, whisperId, peerId } = parseWhisperId(newContactInput);
    if (!username) {
      setContactError('Invalid format');
      return;
    }

    const shortTag = tag || '000000';
    const updatedContacts = await saveContactToBook({
      identityId: `wid_${shortTag.toLowerCase()}_${username.toLowerCase()}`,
      whisperId,
      username,
      publicKey: '',
      shortTag,
      peerId,
      nickname: newContactNickname.trim() || undefined,
      verified: false,
      isTrusted: false,
      blocked: false,
    });

    onUpdateIdentity({ ...identity, savedContacts: updatedContacts });
    setNewContactInput('');
    setNewContactNickname('');
    setContactSuccess(`Added @${whisperId} to local contacts!`);
    setTimeout(() => setContactSuccess(''), 2500);
  };

  const handleRemoveContact = async (identityId: string) => {
    const updated = await removeContactFromBook(identityId);
    onUpdateIdentity({ ...identity, savedContacts: updated });
  };

  const handleToggleBlock = async (identityId: string, currentBlocked: boolean) => {
    const updated = await toggleBlockContact(identityId, !currentBlocked);
    onUpdateIdentity({ ...identity, savedContacts: updated });
  };

  const filteredContacts = identity.savedContacts.filter(c => {
    if (!contactSearch.trim()) return true;
    const q = contactSearch.toLowerCase();
    return (
      c.username.toLowerCase().includes(q) ||
      c.whisperId.toLowerCase().includes(q) ||
      (c.nickname && c.nickname.toLowerCase().includes(q))
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-void-dark border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">WhisperID</h3>
                <span className="text-[10px] font-mono text-neon-green bg-neon-green/10 px-2 py-0.5 rounded border border-neon-green/30">
                  Zero-Server Crypto ID
                </span>
              </div>
              <p className="text-[11px] font-mono text-zinc-500">Your identity. Your device. Your connections.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-zinc-300 rounded-xl hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex rounded-xl bg-zinc-900 p-1 border border-white/5 text-xs font-mono">
          <button
            onClick={() => setActiveTab('id')}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              activeTab === 'id' ? 'bg-neon-green text-black font-bold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Identity
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
              activeTab === 'qr' ? 'bg-neon-green text-black font-bold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <QrCode size={13} />
            <span>QR & Invite</span>
          </button>
          <button
            onClick={() => setActiveTab('contacts')}
            className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
              activeTab === 'contacts' ? 'bg-neon-green text-black font-bold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <BookOpen size={13} />
            <span>Contacts ({identity.savedContacts.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
              activeTab === 'privacy' ? 'bg-neon-green text-black font-bold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Settings size={13} />
            <span>Security</span>
          </button>
        </div>

        {/* ── TAB 1: IDENTITY ── */}
        {activeTab === 'id' && (
          <div className="space-y-4 animate-in fade-in">
            {/* Primary Whisper ID Card */}
            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                  Human-Readable Alias & Cryptographic Tag
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  ECDSA P-256
                </span>
              </div>

              <div className="flex items-center justify-between bg-black/40 p-3.5 rounded-xl border border-white/5">
                {isEditingUsername ? (
                  <div className="flex items-center gap-2 flex-1 mr-2">
                    <span className="text-zinc-500 font-mono">@</span>
                    <input
                      type="text"
                      value={usernameInput}
                      onChange={e => setUsernameInput(e.target.value.replace(/[^a-zA-Z0-9_\-\.]/g, '').slice(0, 16))}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1 text-sm font-mono text-white outline-none focus:border-neon-green flex-1"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveUsername}
                      className="px-3 py-1 bg-neon-green text-black font-bold text-xs rounded-lg hover:bg-green-400"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditingUsername(false)}
                      className="px-2 py-1 text-zinc-400 text-xs hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-bold font-mono text-white">@{identity.username}</span>
                      <span className="text-sm font-mono text-neon-green font-semibold">#{identity.shortTag}</span>
                    </div>
                    <button
                      onClick={() => { setUsernameInput(identity.username); setIsEditingUsername(true); }}
                      className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300 underline mt-0.5 block"
                    >
                      Change Username Alias
                    </button>
                  </div>
                )}

                <button
                  onClick={handleCopyWhisperId}
                  className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-all flex items-center gap-1.5 text-xs font-mono"
                  title="Copy Whisper ID"
                >
                  {copiedId ? <Check size={14} className="text-neon-green" /> : <Copy size={14} />}
                  <span>{copiedId ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <p className="text-[11px] font-mono text-zinc-400 leading-relaxed">
                💡 Changing your username alias never breaks existing contacts. Your real cryptographic identity is anchored to your local private key.
              </p>
            </div>

            {/* Public Fingerprint & Verification Codes */}
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
                Cryptographic Fingerprints (Public)
              </span>

              <div className="space-y-2 font-mono">
                <div className="flex items-center justify-between text-xs bg-black/30 p-2.5 rounded-lg border border-white/5">
                  <span className="text-zinc-500 text-[11px]">Safety Number:</span>
                  <span className="text-white font-bold tracking-wider">{identity.hexFingerprint}</span>
                </div>
                <div className="flex items-center justify-between text-xs bg-black/30 p-2.5 rounded-lg border border-white/5">
                  <span className="text-zinc-500 text-[11px]">Safety Words:</span>
                  <span className="text-neon-green font-semibold">{identity.wordFingerprint}</span>
                </div>
              </div>
            </div>

            {/* 12-Word Recovery Phrase Drawer */}
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-zinc-300">
                  <KeyRound size={16} className="text-amber-400" />
                  <span className="text-xs font-bold font-mono">12-Word Recovery Phrase</span>
                </div>
                <button
                  onClick={() => setShowPhrase(!showPhrase)}
                  className="text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1"
                >
                  {showPhrase ? <EyeOff size={13} /> : <Eye size={13} />}
                  <span>{showPhrase ? 'Hide' : 'Reveal'}</span>
                </button>
              </div>

              {showPhrase ? (
                <div className="space-y-3 pt-1 animate-in fade-in">
                  <div className="p-3 bg-black/60 rounded-xl border border-amber-500/20 grid grid-cols-3 gap-2 font-mono text-xs">
                    {identity.recoveryPhrase.split(' ').map((w, i) => (
                      <div key={i} className="flex items-center gap-1 text-zinc-400">
                        <span className="text-zinc-600 text-[10px]">{i + 1}.</span>
                        <span className="text-white font-semibold">{w}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-amber-300/80">
                      ⚠️ Never share this phrase. It can restore your keys.
                    </span>
                    <button
                      onClick={handleCopyPhrase}
                      className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-300 flex items-center gap-1"
                    >
                      {copiedPhrase ? <Check size={12} className="text-neon-green" /> : <Copy size={12} />}
                      <span>{copiedPhrase ? 'Copied' : 'Copy Words'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] font-mono text-zinc-500">
                  Your identity lives on this browser. Save your 12 words to restore this identity if browser data is cleared.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 2: QR & INVITE ── */}
        {activeTab === 'qr' && (
          <div className="space-y-4 animate-in fade-in text-center flex flex-col items-center">
            <p className="text-xs font-mono text-zinc-400">
              Share your WhisperID QR code for instant zero-trust peer connection.
            </p>

            {/* QR Card */}
            <div className="p-4 bg-zinc-950 border border-neon-green/30 rounded-3xl shadow-xl flex flex-col items-center gap-3">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR for ${identity.whisperId}`}
                  className="w-56 h-56 rounded-2xl border border-white/10"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-zinc-600 font-mono text-xs">
                  Generating QR...
                </div>
              )}
              <div className="font-mono">
                <p className="text-base font-bold text-white">@{identity.whisperId}</p>
                <p className="text-[11px] text-zinc-500">{identity.hexFingerprint}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 w-full max-w-sm">
              <button
                onClick={handleCopyInviteLink}
                className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-mono flex items-center justify-center gap-1.5 transition-colors border border-white/5"
              >
                {copiedLink ? <Check size={14} className="text-neon-green" /> : <Share2 size={14} />}
                <span>{copiedLink ? 'Link Copied' : 'Copy Link'}</span>
              </button>

              {qrDataUrl && (
                <a
                  href={qrDataUrl}
                  download={`whisperid-${identity.username}.png`}
                  className="flex-1 py-3 rounded-xl bg-neon-green/10 hover:bg-neon-green/20 text-neon-green text-xs font-mono font-bold flex items-center justify-center gap-1.5 border border-neon-green/30 transition-colors"
                >
                  <Download size={14} />
                  <span>Save QR Image</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 3: CONTACTS (LOCAL ADDRESS BOOK) ── */}
        {activeTab === 'contacts' && (
          <div className="space-y-4 animate-in fade-in">
            {/* Quick Add Form */}
            <form onSubmit={handleAddContact} className="p-3.5 rounded-2xl bg-zinc-900/70 border border-white/5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                  Add Contact by Whisper ID
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newContactInput}
                  onChange={e => setNewContactInput(e.target.value)}
                  placeholder="e.g. ahmed#82KD31"
                  className="flex-1 bg-black/60 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder:text-zinc-600 outline-none focus:border-neon-green"
                />
                <button
                  type="submit"
                  className="px-3 py-2 rounded-xl bg-neon-green text-black font-bold text-xs font-mono flex items-center gap-1 hover:bg-green-400 transition-colors"
                >
                  <UserPlus size={14} />
                  <span>Add</span>
                </button>
              </div>

              {contactSuccess && (
                <p className="text-[11px] font-mono text-neon-green">{contactSuccess}</p>
              )}
              {contactError && (
                <p className="text-[11px] font-mono text-red-400">{contactError}</p>
              )}
            </form>

            {/* Search Filter */}
            {identity.savedContacts.length > 3 && (
              <input
                type="text"
                value={contactSearch}
                onChange={e => setContactSearch(e.target.value)}
                placeholder="Search saved contacts..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder:text-zinc-600 outline-none focus:border-neon-green"
              />
            )}

            {/* Contacts List */}
            <div className="divide-y divide-white/5 border border-white/5 rounded-2xl bg-zinc-900/40 max-h-56 overflow-y-auto">
              {filteredContacts.length === 0 ? (
                <p className="p-6 text-xs font-mono text-zinc-500 text-center">
                  No contacts found. Add peers by their Whisper ID to connect securely in 1 click.
                </p>
              ) : (
                filteredContacts.map(contact => (
                  <div key={contact.identityId} className="p-3 flex items-center justify-between hover:bg-white/5 transition-colors">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold font-mono text-white">@{contact.username}</span>
                        <span className="text-[10px] font-mono text-neon-green/90">#{contact.shortTag}</span>
                        {contact.verified && (
                          <span title="Verified Cryptographic Identity" className="text-neon-green">
                            <Check size={12} />
                          </span>
                        )}
                        {contact.isTrusted && (
                          <span title="Trusted Contact" className="text-amber-400">
                            <Star size={11} className="fill-amber-400" />
                          </span>
                        )}
                        {contact.blocked && (
                          <span className="text-[9px] font-mono text-red-400 bg-red-950/40 px-1.5 rounded">
                            BLOCKED
                          </span>
                        )}
                      </div>
                      {contact.nickname && (
                        <p className="text-[10px] text-zinc-400 mt-0.5">{contact.nickname}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Verify Button */}
                      <button
                        onClick={() => setVerifyingContact(contact)}
                        className="p-1.5 text-zinc-400 hover:text-neon-green rounded-lg hover:bg-white/5 transition-colors"
                        title="Verify Identity Fingerprints"
                      >
                        <ShieldCheck size={14} />
                      </button>

                      {/* Connect Button */}
                      {onDirectConnectToPeer && !contact.blocked && (
                        <button
                          onClick={() => {
                            onClose();
                            const targetPeerId = contact.peerId || getPeerIdFromWhisperId(contact.whisperId);
                            onDirectConnectToPeer(targetPeerId, contact.whisperId);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-neon-green text-black font-bold text-[11px] font-mono hover:bg-green-400 transition-colors flex items-center gap-1"
                        >
                          <Phone size={11} />
                          <span>Call</span>
                        </button>
                      )}

                      {/* Block Toggle */}
                      <button
                        onClick={() => handleToggleBlock(contact.identityId, contact.blocked)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          contact.blocked ? 'text-red-400 hover:text-zinc-300' : 'text-zinc-500 hover:text-red-400'
                        }`}
                        title={contact.blocked ? 'Unblock Contact' : 'Block Contact'}
                      >
                        <Ban size={13} />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleRemoveContact(contact.identityId)}
                        className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg transition-colors"
                        title="Delete contact"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── TAB 4: SECURITY & PRIVACY ── */}
        {activeTab === 'privacy' && (
          <div className="space-y-4 animate-in fade-in">
            {/* PIN Lock Management */}
            <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-zinc-200">
                  <KeyRound size={16} className={identity.hasPin ? 'text-neon-green' : 'text-zinc-500'} />
                  <span className="text-xs font-bold font-mono">Local Vault PIN Protection</span>
                </div>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    identity.hasPin
                      ? 'bg-neon-green/10 text-neon-green border-neon-green/30'
                      : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                  }`}
                >
                  {identity.hasPin ? 'AES-GCM ENCRYPTED' : 'DISABLED'}
                </span>
              </div>

              <p className="text-xs text-zinc-400 font-mono leading-relaxed">
                {identity.hasPin
                  ? 'Your private key is encrypted with PBKDF2 + AES-GCM in IndexedDB. Sessions require your PIN to unlock.'
                  : 'Add a 4 to 6 digit security PIN to encrypt your local private key and protect your sessions.'}
              </p>

              <div className="flex gap-2 pt-1">
                {identity.hasPin ? (
                  <>
                    <button
                      onClick={onOpenPinDisable}
                      className="flex-1 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono border border-white/5 transition-colors"
                    >
                      Change / Remove PIN
                    </button>
                    <button
                      onClick={onLockSession}
                      className="py-2 px-3 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 text-xs font-mono border border-red-900/40 transition-colors flex items-center gap-1.5"
                    >
                      <Lock size={13} />
                      <span>Lock Vault</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={onOpenPinSetup}
                    className="w-full py-2.5 px-4 rounded-xl bg-neon-green/10 hover:bg-neon-green/20 text-neon-green text-xs font-bold font-mono border border-neon-green/30 transition-colors flex items-center justify-center gap-2"
                  >
                    <Lock size={14} />
                    <span>Set Private Security PIN</span>
                  </button>
                )}
              </div>
            </div>

            {/* Invisible Mode */}
            <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-zinc-200">
                  <Radio size={16} className={identity.privacy.invisibleMode ? 'text-zinc-500' : 'text-neon-green'} />
                  <span className="text-xs font-bold font-mono">Invisible Mode</span>
                </div>
                <button
                  onClick={handleToggleInvisibleMode}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    identity.privacy.invisibleMode ? 'bg-neon-green' : 'bg-zinc-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-black transition-transform absolute top-1 ${
                      identity.privacy.invisibleMode ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              <p className="text-xs text-zinc-400 font-mono leading-relaxed">
                {identity.privacy.invisibleMode
                  ? 'Active. You do NOT broadcast presence to the ephemeral discovery registry. Existing contacts can still connect directly using your Whisper ID.'
                  : 'Disabled. Your temporary presence is advertised in public search by username for up to 5 minutes while online.'}
              </p>
            </div>

            {/* Re-create or Restore Identity Trigger */}
            {onOpenSetupModal && (
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-500">Device Recovery:</span>
                <button
                  onClick={() => {
                    onClose();
                    onOpenSetupModal();
                  }}
                  className="text-neon-green hover:underline flex items-center gap-1"
                >
                  <RefreshCw size={12} />
                  <span>Restore or Reset Identity</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer Zero-Server Guarantee */}
        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
          <span>Storage: Local IndexedDB (WhisperDB)</span>
          <span className="text-neon-green">100% Client-Side Privacy</span>
        </div>
      </div>

      {/* Verification Submodal */}
      <ContactVerificationModal
        isOpen={!!verifyingContact}
        onClose={() => setVerifyingContact(null)}
        contact={verifyingContact}
        onUpdated={(updated) => {
          onUpdateIdentity({ ...identity, savedContacts: updated });
          const refreshed = updated.find(c => c.identityId === verifyingContact?.identityId);
          setVerifyingContact(refreshed || null);
        }}
      />
    </div>
  );
};
