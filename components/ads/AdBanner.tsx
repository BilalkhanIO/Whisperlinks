import React from 'react';

interface AdBannerProps {
  placement: 'content-top' | 'content-bottom' | 'in-article';
}

export const AdBanner: React.FC<AdBannerProps> = ({ placement }) => {
  // In a real AdSense implementation, you would use `<ins className="adsbygoogle" ... />`
  // and push to the ad queue `(window.adsbygoogle = window.adsbygoogle || []).push({});`
  // For now, this serves as a placeholder to reserve space and prevent layout shifts.

  return (
    <div 
      className="w-full bg-zinc-900/40 border border-white/5 rounded-xl flex items-center justify-center p-4 my-6 min-h-[100px]"
      aria-label="Advertisement Placeholder"
    >
      <span className="text-zinc-600 font-mono text-[10px] tracking-widest uppercase">
        Advertisement ({placement})
      </span>
    </div>
  );
};
