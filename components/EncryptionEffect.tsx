import React, { useState, useEffect } from 'react';

interface EncryptionEffectProps {
  text: string;
  duration?: number; // ms
  reveal?: boolean;
}

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&";

export const EncryptionEffect: React.FC<EncryptionEffectProps> = ({ text, duration = 1000, reveal = true }) => {
  const [displayText, setDisplayText] = useState('');
  
  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      
      if (progress >= duration) {
        setDisplayText(text);
        return;
      }

      const revealIdx = Math.floor((progress / duration) * text.length);
      
      let scrambled = '';
      for (let i = 0; i < text.length; i++) {
        if (i < revealIdx && reveal) {
          scrambled += text[i];
        } else if (text[i] === ' ') {
          scrambled += ' ';
        } else {
          scrambled += CHARS[Math.floor(Math.random() * CHARS.length)];
        }
      }
      
      setDisplayText(scrambled);
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [text, duration, reveal]);

  return <span>{displayText}</span>;
};