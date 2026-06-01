
const audioCtx = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

export const playSound = (type: 'message' | 'send' | 'connect' | 'error') => {
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  const now = audioCtx.currentTime;

  switch (type) {
    case 'message':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now); osc.stop(now + 0.1);
      break;
    case 'send':
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now); osc.stop(now + 0.05);
      break;
    case 'connect':
      osc.type = 'square';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.linearRampToValueAtTime(600, now + 0.3);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.start(now); osc.stop(now + 0.3);
      break;
    case 'error':
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(100, now + 0.2);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.2);
      osc.start(now); osc.stop(now + 0.2);
      break;
  }
};

export const decodeAndPlayAudio = async (base64Data: string) => {
  if (!base64Data) return;
  try {
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    const bytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    const buffer = await audioCtx.decodeAudioData(bytes.buffer);
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start(0);
  } catch (e) {
    console.error("Audio playback failed", e);
  }
};

export const speakWithBrowser = (text: string, mood: string): void => {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text.replace(/[^\w\s,.!?]/g, '').slice(0, 250));
  switch (mood) {
    case 'SAD':        utterance.rate = 0.82; utterance.pitch = 0.7;  break;
    case 'ANGRY':      utterance.rate = 1.35; utterance.pitch = 1.25; break;
    case 'FLIRTY':     utterance.rate = 0.92; utterance.pitch = 1.15; break;
    case 'FACT_CHECK': utterance.rate = 1.1;  utterance.pitch = 0.85; break;
    default:           utterance.rate = 1.1;  utterance.pitch = 1.1;
  }
  window.speechSynthesis.speak(utterance);
};
