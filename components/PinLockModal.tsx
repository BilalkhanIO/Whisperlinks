import React, { useState, useEffect } from 'react';
import { Lock, Unlock,  ShieldAlert, KeyRound, Check,  Delete } from 'lucide-react';
import { verifyUserPin, setUserPin, removeUserPin, UserIdentity } from '../services/identityService';

interface PinLockModalProps {
  isOpen: boolean;
  mode: 'unlock' | 'setup' | 'disable';
  onSuccess: (identity?: UserIdentity) => void;
  onCancel?: () => void;
  onPanic?: () => void;
}

export const PinLockModal: React.FC<PinLockModalProps> = ({
  isOpen,
  mode,
  onSuccess,
  onCancel,
  onPanic,
}) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setConfirmPin('');
      setIsConfirming(false);
      setErrorMsg('');
    }
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleKeyPress = (num: string) => {
    setErrorMsg('');
    if (mode === 'setup' && isConfirming) {
      if (confirmPin.length < 6) setConfirmPin(prev => prev + num);
    } else {
      if (pin.length < 6) setPin(prev => prev + num);
    }
  };

  const handleDelete = () => {
    setErrorMsg('');
    if (mode === 'setup' && isConfirming) {
      setConfirmPin(prev => prev.slice(0, -1));
    } else {
      setPin(prev => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    setErrorMsg('');
    if (mode === 'setup' && isConfirming) {
      setConfirmPin('');
    } else {
      setPin('');
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (mode === 'unlock' || mode === 'disable') {
      if (pin.length < 4) {
        setErrorMsg('Enter at least 4 digits');
        triggerShake();
        return;
      }
      setIsSubmitting(true);
      const ok = await verifyUserPin(pin);
      setIsSubmitting(false);

      if (ok) {
        if (mode === 'disable') {
          const updated = await removeUserPin(pin);
          onSuccess(updated);
        } else {
          onSuccess();
        }
      } else {
        setErrorMsg('Incorrect PIN. Access Denied.');
        triggerShake();
        setPin('');
      }
      return;
    }

    // Setup mode
    if (mode === 'setup') {
      if (!isConfirming) {
        if (pin.length < 4) {
          setErrorMsg('PIN must be at least 4 digits');
          triggerShake();
          return;
        }
        setIsConfirming(true);
        setErrorMsg('');
      } else {
        if (confirmPin !== pin) {
          setErrorMsg('PINs do not match. Try again.');
          triggerShake();
          setConfirmPin('');
          return;
        }
        setIsSubmitting(true);
        const updated = await setUserPin(pin);
        setIsSubmitting(false);
        onSuccess(updated);
      }
    }
  };

  const currentDisplayPin = mode === 'setup' && isConfirming ? confirmPin : pin;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div
        className={`w-full max-w-xs bg-void-dark border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center select-none ${
          isShaking ? 'animate-shake' : ''
        }`}
      >
        {/* Header Icon */}
        <div className="w-12 h-12 rounded-2xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green mb-4 shadow-lg shadow-neon-green/5">
          {mode === 'unlock' ? (
            <Lock size={22} />
          ) : mode === 'disable' ? (
            <Unlock size={22} className="text-amber-400" />
          ) : (
            <KeyRound size={22} />
          )}
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-white tracking-tight">
          {mode === 'unlock'
            ? 'WhisperLink Vault Locked'
            : mode === 'disable'
            ? 'Disable Security PIN'
            : isConfirming
            ? 'Confirm Security PIN'
            : 'Set Private Security PIN'}
        </h3>
        <p className="text-xs text-zinc-400 mt-1 mb-5">
          {mode === 'unlock'
            ? 'Enter your private PIN stored in local storage'
            : mode === 'disable'
            ? 'Enter current PIN to remove lock protection'
            : isConfirming
            ? 'Re-enter your PIN to verify'
            : '4 to 6 digit client-side access code'}
        </p>

        {/* PIN Indicator Dots */}
        <div className="flex items-center justify-center gap-3 mb-6 h-8">
          {[0, 1, 2, 3, 4, 5].map(idx => {
            const isFilled = idx < currentDisplayPin.length;
            return (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                  isFilled
                    ? 'bg-neon-green scale-110 shadow-sm shadow-neon-green/50'
                    : 'border border-zinc-700 bg-zinc-900/60'
                }`}
              />
            );
          })}
        </div>

        {/* Error Feedback */}
        {errorMsg && (
          <p className="text-xs text-red-400 font-mono mb-4 px-2 py-1 rounded bg-red-950/30 border border-red-900/40">
            {errorMsg}
          </p>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5 w-full mb-5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              className="h-12 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 active:scale-95 text-white font-mono text-lg font-semibold border border-white/5 transition-all shadow-xs"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-12 rounded-2xl bg-zinc-900/40 hover:bg-zinc-800/80 active:scale-95 text-zinc-400 font-mono text-xs border border-white/5 transition-all"
          >
            CLEAR
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-12 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 active:scale-95 text-white font-mono text-lg font-semibold border border-white/5 transition-all shadow-xs"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="h-12 rounded-2xl bg-zinc-900/40 hover:bg-zinc-800/80 active:scale-95 text-zinc-400 flex items-center justify-center border border-white/5 transition-all"
            aria-label="Backspace"
          >
            <Delete size={18} />
          </button>
        </div>

        {/* Primary Action Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={currentDisplayPin.length < 4 || isSubmitting}
          className="w-full py-3.5 rounded-xl bg-neon-green hover:bg-green-400 disabled:opacity-40 text-black font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-neon-green/10"
        >
          {isSubmitting ? (
            <span>Verifying...</span>
          ) : (
            <>
              <Check size={16} />
              <span>
                {mode === 'setup' && !isConfirming
                  ? 'Next: Confirm'
                  : mode === 'disable'
                  ? 'Remove PIN'
                  : 'Unlock Vault'}
              </span>
            </>
          )}
        </button>

        {/* Bottom Escape / Cancel / Panic options */}
        <div className="flex items-center justify-between w-full mt-4 pt-3 border-t border-white/5 text-xs text-zinc-500">
          {onCancel && mode !== 'unlock' ? (
            <button
              type="button"
              onClick={onCancel}
              className="hover:text-zinc-300 transition-colors"
            >
              Cancel
            </button>
          ) : (
            <span className="text-[10px] font-mono text-zinc-600">Zero Server Storage · Local Only</span>
          )}

          {onPanic && (
            <button
              type="button"
              onClick={onPanic}
              className="flex items-center gap-1 text-red-400 hover:text-red-300 text-[11px] font-mono ml-auto"
              title="Instant Disguise"
            >
              <ShieldAlert size={12} />
              <span>Panic Disguise</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
