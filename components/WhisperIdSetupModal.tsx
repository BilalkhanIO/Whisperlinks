import React, { useState } from 'react';
import {
  Shield, KeyRound, Sparkles, Check, Copy, AlertTriangle, ArrowRight, RefreshCw, X, Eye, EyeOff, Lock
} from 'lucide-react';
import {
  createWhisperIdentity,
  restoreWhisperIdentityFromPhrase,
  UserIdentity
} from '../services/identityService';

interface WhisperIdSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (identity: UserIdentity) => void;
  initialUsername?: string;
}

export const WhisperIdSetupModal: React.FC<WhisperIdSetupModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  initialUsername = '',
}) => {
  const [tab, setTab] = useState<'create' | 'restore'>('create');
  const [username, setUsername] = useState(initialUsername || 'CipherGhost');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [usePin, setUsePin] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Restore State
  const [restorePhrase, setRestorePhrase] = useState('');
  const [restoreUsername, setRestoreUsername] = useState('');
  const [restorePin, setRestorePin] = useState('');

  // Step 2: Show Recovery Phrase during creation
  const [createdIdentity, setCreatedIdentity] = useState<UserIdentity | null>(null);
  const [phraseCopied, setPhraseCopied] = useState(false);
  const [confirmedSaved, setConfirmedSaved] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanName = username.trim().replace(/^@/, '');
    if (!cleanName) {
      setErrorMsg('Please choose a username alias');
      return;
    }

    if (usePin) {
      if (pin.length < 4 || pin.length > 6) {
        setErrorMsg('PIN must be 4 to 6 numeric digits');
        return;
      }
      if (pin !== confirmPin) {
        setErrorMsg('PINs do not match');
        return;
      }
    }

    setIsLoading(true);
    try {
      const identity = await createWhisperIdentity(cleanName, usePin ? pin : undefined);
      setCreatedIdentity(identity);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to generate cryptographic identity');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinishCreate = () => {
    if (!createdIdentity) return;
    onComplete(createdIdentity);
    onClose();
  };

  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const words = restorePhrase.trim().split(/\s+/);
    if (words.length < 12) {
      setErrorMsg('Please enter all 12 words of your recovery phrase');
      return;
    }

    setIsLoading(true);
    try {
      const identity = await restoreWhisperIdentityFromPhrase(
        restorePhrase,
        restoreUsername.trim() || undefined,
        restorePin.trim() || undefined
      );
      onComplete(identity);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to restore identity from phrase');
    } finally {
      setIsLoading(false);
    }
  };

  const copyPhrase = () => {
    if (!createdIdentity) return;
    navigator.clipboard.writeText(createdIdentity.recoveryPhrase);
    setPhraseCopied(true);
    setTimeout(() => setPhraseCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-void-dark border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green">
              <Shield size={20} />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">WhisperID Security Setup</h3>
              <p className="text-[11px] font-mono text-zinc-500">Your identity. Your device. Zero server storage.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-zinc-300 rounded-xl hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* View Mode: Step 2 Showing Recovery Phrase */}
        {createdIdentity ? (
          <div className="space-y-4 animate-in fade-in">
            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-neon-green/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase text-neon-green tracking-wider font-semibold">
                  Identity Generated
                </span>
                <p className="text-xl font-mono font-black text-white">@{createdIdentity.whisperId}</p>
                <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
                  Fingerprint: {createdIdentity.hexFingerprint}
                </p>
              </div>
            </div>

            {/* Recovery Phrase Warning Box */}
            <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs font-mono">
                <AlertTriangle size={15} />
                <span>SAVE YOUR 12-WORD RECOVERY PHRASE</span>
              </div>
              <p className="text-xs text-amber-200/80 leading-relaxed font-mono">
                ⚠️ WhisperLink does not store your keys or passwords. If you clear browser data or switch devices, this recovery phrase is the <strong>only way</strong> to restore your cryptographic identity and contacts.
              </p>
            </div>

            {/* 12-Word Grid */}
            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                  Secret Recovery Phrase
                </span>
                <button
                  type="button"
                  onClick={copyPhrase}
                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-mono flex items-center gap-1 transition-colors"
                >
                  {phraseCopied ? <Check size={13} className="text-neon-green" /> : <Copy size={13} />}
                  <span>{phraseCopied ? 'Copied' : 'Copy All'}</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {createdIdentity.recoveryPhrase.split(' ').map((word, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-white/5 font-mono text-xs"
                  >
                    <span className="text-zinc-600 text-[10px]">{idx + 1}.</span>
                    <span className="text-white font-bold">{word}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Checkbox confirmation */}
            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-900/50 border border-white/5 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmedSaved}
                onChange={e => setConfirmedSaved(e.target.checked)}
                className="w-4 h-4 rounded text-neon-green focus:ring-neon-green/40 border-zinc-700 bg-zinc-800"
              />
              <span className="text-xs font-mono text-zinc-300 select-none">
                I have saved my 12-word recovery phrase somewhere secure.
              </span>
            </label>

            <button
              type="button"
              disabled={!confirmedSaved}
              onClick={handleFinishCreate}
              className="w-full py-3.5 rounded-xl bg-neon-green hover:bg-green-400 disabled:opacity-40 text-black font-bold text-sm font-mono transition-all flex items-center justify-center gap-2 shadow-lg shadow-neon-green/10"
            >
              <span>Launch WhisperID</span>
              <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <>
            {/* Mode Switcher Tabs */}
            <div className="flex rounded-xl bg-zinc-900 p-1 border border-white/5">
              <button
                type="button"
                onClick={() => { setTab('create'); setErrorMsg(''); }}
                className={`flex-1 py-2 text-xs font-mono font-semibold rounded-lg transition-all ${
                  tab === 'create'
                    ? 'bg-neon-green text-black shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Create New WhisperID
              </button>
              <button
                type="button"
                onClick={() => { setTab('restore'); setErrorMsg(''); }}
                className={`flex-1 py-2 text-xs font-mono font-semibold rounded-lg transition-all ${
                  tab === 'restore'
                    ? 'bg-neon-green text-black shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Restore from Phrase
              </button>
            </div>

            {errorMsg && (
              <p className="text-xs text-red-400 font-mono p-2.5 rounded-xl bg-red-950/40 border border-red-900/40">
                {errorMsg}
              </p>
            )}

            {tab === 'create' ? (
              /* Create Identity Form */
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                    Human-Readable Username Alias
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-sm">@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_\-\.]/g, '').slice(0, 16))}
                      placeholder="e.g. bilal"
                      className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl pl-8 pr-4 py-3 text-sm font-mono text-white placeholder:text-zinc-600 outline-none focus:border-neon-green"
                      required
                    />
                  </div>
                  <p className="text-[11px] font-mono text-zinc-500 mt-1">
                    Your username is an alias. Your real identity is a cryptographic public key generated locally.
                  </p>
                </div>

                {/* Optional PIN Protection */}
                <div className="p-3.5 rounded-2xl bg-zinc-900/50 border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-mono text-zinc-300">
                      <input
                        type="checkbox"
                        checked={usePin}
                        onChange={e => setUsePin(e.target.checked)}
                        className="w-4 h-4 rounded text-neon-green focus:ring-neon-green/40 border-zinc-700 bg-zinc-800"
                      />
                      <span>Protect with Local Security PIN</span>
                    </label>
                    <span className="text-[10px] font-mono text-zinc-500">Optional</span>
                  </div>

                  {usePin && (
                    <div className="grid grid-cols-2 gap-2 pt-1 animate-in fade-in">
                      <div>
                        <label className="block text-[10px] font-mono text-zinc-400 mb-1">Create PIN (4-6 digits)</label>
                        <input
                          type="password"
                          inputMode="numeric"
                          maxLength={6}
                          value={pin}
                          onChange={e => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder="••••"
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm font-mono text-white text-center tracking-widest outline-none focus:border-neon-green"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-zinc-400 mb-1">Confirm PIN</label>
                        <input
                          type="password"
                          inputMode="numeric"
                          maxLength={6}
                          value={confirmPin}
                          onChange={e => setConfirmPin(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder="••••"
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm font-mono text-white text-center tracking-widest outline-none focus:border-neon-green"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !username.trim()}
                  className="w-full py-3.5 rounded-xl bg-neon-green hover:bg-green-400 disabled:opacity-40 text-black font-bold text-sm font-mono transition-all flex items-center justify-center gap-2 shadow-lg shadow-neon-green/10"
                >
                  {isLoading ? (
                    <span>Generating Cryptographic Identity...</span>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Create WhisperID</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* Restore Identity Form */
              <form onSubmit={handleRestore} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                    12-Word Recovery Phrase
                  </label>
                  <textarea
                    value={restorePhrase}
                    onChange={e => setRestorePhrase(e.target.value)}
                    placeholder="e.g. alpha meteor harbor horizon cipher glacier river shadow titan voyage whisper zenith"
                    rows={3}
                    className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl p-3 text-xs font-mono text-white placeholder:text-zinc-600 outline-none focus:border-neon-green resize-none leading-relaxed"
                    required
                  />
                  <p className="text-[11px] font-mono text-zinc-500 mt-1">
                    Enter the words separated by spaces in their exact sequence.
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                    Desired Username (Optional)
                  </label>
                  <input
                    type="text"
                    value={restoreUsername}
                    onChange={e => setRestoreUsername(e.target.value.replace(/[^a-zA-Z0-9_\-\.]/g, '').slice(0, 16))}
                    placeholder="Leave blank to keep default"
                    className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-4 py-2.5 text-xs font-mono text-white outline-none focus:border-neon-green"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                    New Security PIN (Optional)
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={restorePin}
                    onChange={e => setRestorePin(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="4-6 digits (optional)"
                    className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-4 py-2.5 text-xs font-mono text-white outline-none focus:border-neon-green"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !restorePhrase.trim()}
                  className="w-full py-3.5 rounded-xl bg-neon-green hover:bg-green-400 disabled:opacity-40 text-black font-bold text-sm font-mono transition-all flex items-center justify-center gap-2 shadow-lg shadow-neon-green/10"
                >
                  {isLoading ? (
                    <span>Restoring Cryptographic Keys...</span>
                  ) : (
                    <>
                      <RefreshCw size={16} />
                      <span>Restore Identity</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};
