import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const useInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // Detect if already installed as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS (Safari shows manual install instructions)
    const ua = navigator.userAgent;
    if (/iphone|ipad|ipod/i.test(ua) && !/(chrome|crios|fxios)/i.test(ua)) {
      setIsIos(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const installedHandler = () => setIsInstalled(true);

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const triggerInstall = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setDeferredPrompt(null);
    return outcome === 'accepted';
  };

  const canInstall = !isInstalled && (!!deferredPrompt || isIos);
  return { canInstall, isInstalled, isIos, triggerInstall };
};

interface InstallBannerProps {
  onDismiss: () => void;
}

export const InstallBanner: React.FC<InstallBannerProps> = ({ onDismiss }) => {
  const { canInstall, isIos, triggerInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('pwa-banner-dismissed') === '1'
  );

  if (!canInstall || dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem('pwa-banner-dismissed', '1');
    setDismissed(true);
    onDismiss();
  };

  const handleInstall = async () => {
    if (isIos) return; // iOS: show instructions overlay (handled by parent)
    await triggerInstall();
  };

  return (
    <div className="w-full bg-void-dark border border-neon-green/20 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-lg animate-in slide-in-from-bottom-2 duration-300">
      <div className="w-8 h-8 bg-neon-green/10 rounded-xl flex items-center justify-center shrink-0">
        <Smartphone size={16} className="text-neon-green" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-200 leading-tight">Install WhisperLink</p>
        {isIos ? (
          <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">
            Tap <span className="inline-block px-1 py-0.5 bg-zinc-800 rounded text-[10px]">⎙ Share</span> then <strong>Add to Home Screen</strong>
          </p>
        ) : (
          <p className="text-[11px] text-zinc-500 mt-0.5">Add to home screen for app experience</p>
        )}
      </div>
      {!isIos && (
        <button
          onClick={handleInstall}
          className="shrink-0 flex items-center gap-1.5 bg-neon-green text-black text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-green-400 transition-all"
          aria-label="Install app"
        >
          <Download size={12} />
          Install
        </button>
      )}
      <button
        onClick={handleDismiss}
        className="shrink-0 p-1 rounded-lg text-zinc-600 hover:text-zinc-400 transition-colors"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
};
