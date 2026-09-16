import React, { useState } from 'react';
import { ShieldCheck, Star, Check, X, Copy, Lock, AlertTriangle, UserCheck } from 'lucide-react';
import { StoredContact, verifyContactIdentity, toggleTrustContact } from '../services/identityService';

interface ContactVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: StoredContact | null;
  onUpdated: (updatedContacts: StoredContact[]) => void;
}

export const ContactVerificationModal: React.FC<ContactVerificationModalProps> = ({
  isOpen,
  onClose,
  contact,
  onUpdated,
}) => {
  const [copied, setCopied] = useState(false);
  const [successNote, setSuccessNote] = useState('');

  if (!isOpen || !contact) return null;

  const hexFingerprint =
    contact.hexFingerprint ||
    `${contact.shortTag.slice(0, 4)}-${contact.shortTag.slice(4, 6)}XX-XXXX-XXXX`;
  const wordFingerprint = contact.wordFingerprint || `CRYPTO NODE #${contact.shortTag}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(`${contact.whisperId}\nFingerprint: ${hexFingerprint}\nSafety Words: ${wordFingerprint}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = async () => {
    const updated = await verifyContactIdentity(contact.identityId);
    onUpdated(updated);
    setSuccessNote('Identity verified successfully!');
    setTimeout(() => {
      setSuccessNote('');
      onClose();
    }, 1200);
  };

  const handleToggleTrust = async () => {
    const nextTrust = !contact.isTrusted;
    const updated = await toggleTrustContact(contact.identityId, nextTrust);
    onUpdated(updated);
    setSuccessNote(nextTrust ? 'Marked as Trusted Contact!' : 'Removed from Trusted Contacts.');
    setTimeout(() => setSuccessNote(''), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
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
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Cryptographic Verification</h3>
              <p className="text-[11px] font-mono text-zinc-500">Zero-Trust Peer Authentication</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-zinc-300 rounded-xl hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contact Info Banner */}
        <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white font-mono">@{contact.username}</span>
              <span className="text-xs font-mono text-neon-green/90 font-semibold">#{contact.shortTag}</span>
              {contact.verified && (
                <span className="flex items-center gap-1 text-[10px] text-neon-green bg-neon-green/10 px-2 py-0.5 rounded border border-neon-green/20">
                  <Check size={10} /> Verified
                </span>
              )}
              {contact.isTrusted && (
                <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                  <Star size={10} className="fill-amber-400" /> Trusted
                </span>
              )}
            </div>
            <p className="text-[11px] font-mono text-zinc-500 mt-1">ID: {contact.identityId.slice(0, 20)}...</p>
          </div>

          <button
            onClick={handleCopy}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors flex items-center gap-1 text-xs font-mono"
            title="Copy verification fingerprints"
          >
            {copied ? <Check size={14} className="text-neon-green" /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {/* Fingerprints Comparison Box */}
        <div className="space-y-3">
          <div className="p-3.5 rounded-xl bg-black/50 border border-white/5 space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
              Safety Number (Hex Fingerprint)
            </span>
            <p className="text-sm font-mono font-bold text-white tracking-widest break-all">
              {hexFingerprint}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-black/50 border border-white/5 space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
              Human-Readable Safety Words
            </span>
            <p className="text-xs font-mono font-bold text-neon-green tracking-wider">
              {wordFingerprint}
            </p>
          </div>
        </div>

        {/* Informative Guidance */}
        <div className="p-3.5 bg-zinc-900/40 rounded-xl border border-white/5 text-[11px] font-mono text-zinc-400 space-y-1">
          <p className="font-semibold text-zinc-300">💡 Verification Procedure:</p>
          <p className="leading-relaxed text-zinc-400">
            Compare these safety numbers with @{contact.username} in person, over a voice call, or via a trusted channel. If the numbers match exactly, no one is intercepting or impersonating your peer.
          </p>
        </div>

        {successNote && (
          <p className="text-xs font-mono text-neon-green p-2 bg-neon-green/10 border border-neon-green/20 rounded-xl text-center">
            {successNote}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={handleToggleTrust}
            className={`flex-1 py-3 px-3 rounded-xl border text-xs font-mono flex items-center justify-center gap-1.5 transition-all ${
              contact.isTrusted
                ? 'bg-amber-400/10 border-amber-400/30 text-amber-300 hover:bg-amber-400/20'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-white/5'
            }`}
          >
            <Star size={14} className={contact.isTrusted ? 'fill-amber-400 text-amber-400' : ''} />
            <span>{contact.isTrusted ? 'Trusted Contact' : 'Mark as Trusted'}</span>
          </button>

          <button
            type="button"
            onClick={handleVerify}
            className="flex-1 py-3 px-3 rounded-xl bg-neon-green hover:bg-green-400 text-black font-bold text-xs font-mono transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-neon-green/10"
          >
            <UserCheck size={14} />
            <span>{contact.verified ? 'Re-Verify Identity' : 'Verify Identity ✓'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
