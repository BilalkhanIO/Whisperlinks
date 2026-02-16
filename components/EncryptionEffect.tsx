import React, { useState, useEffect, useRef } from 'react';

interface EncryptionEffectProps {
  text: string;
  duration?: number;
  reveal?: boolean;
}

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&";

export const EncryptionEffect: React.FC<EncryptionEffectProps> = React.memo(({ text, duration = 800, reveal = true }) => {
  const [displayText, setDisplayText] = useState('');
  const frameRef = useRef<number>(0);

  useEffect(() => {
    let startTime: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;

      if (progress >= duration) {
        setDisplayText(text);
        return;
      }

      const ratio = progress / duration;
      const revealIdx = Math.floor(ratio * text.length);

      // Build string more efficiently
      const chars: string[] = new Array(text.length);
      for (let i = 0; i < text.length; i++) {
        if (i < revealIdx && reveal) {
          chars[i] = text[i];
        } else if (text[i] === ' ') {
          chars[i] = ' ';
        } else {
          chars[i] = CHARS[(Math.random() * CHARS.length) | 0];
        }
      }

      setDisplayText(chars.join(''));
      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [text, duration, reveal]);

  return <span>{displayText}</span>;
});

EncryptionEffect.displayName = 'EncryptionEffect';