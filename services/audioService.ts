
let audioCtxInstance: AudioContext | null = null;

const getAudioContext = (): AudioContext => {
  if (!audioCtxInstance && typeof window !== 'undefined') {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtxInstance = new AudioContextClass();
    }
  }
  return audioCtxInstance!;
};

export const playSound = (type: 'message' | 'send' | 'connect' | 'error') => {
  const audioCtx = getAudioContext();
  if (!audioCtx) return;
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

/**
 * Converts raw 16-bit linear PCM byte buffer (audio/L16;codec=pcm;rate=24000)
 * to an AudioBuffer that can be played immediately by Web Audio API.
 */
const createAudioBufferFromPcm = (
  ctx: AudioContext,
  bytes: Uint8Array,
  sampleRate = 24000,
  channels = 1
): AudioBuffer => {
  const sampleCount = Math.floor(bytes.byteLength / 2);
  // Ensure word-aligned memory buffer for Int16Array
  const aligned = new ArrayBuffer(sampleCount * 2);
  new Uint8Array(aligned).set(bytes.subarray(0, sampleCount * 2));
  const int16 = new Int16Array(aligned);

  const audioBuffer = ctx.createBuffer(channels, sampleCount, sampleRate);
  const channelData = audioBuffer.getChannelData(0);

  for (let i = 0; i < sampleCount; i++) {
    channelData[i] = int16[i] / 32768.0;
  }
  return audioBuffer;
};

export const decodeAndPlayAudio = async (
  base64Data: string,
  fallbackText?: string,
  fallbackMood?: string
): Promise<boolean> => {
  if (!base64Data) {
    if (fallbackText && fallbackMood) speakWithBrowser(fallbackText, fallbackMood);
    return false;
  }

  try {
    const audioCtx = getAudioContext();
    if (!audioCtx) return false;
    if (audioCtx.state === 'suspended') await audioCtx.resume();

    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    let buffer: AudioBuffer;

    // Check if the payload is a WAV file (starts with ASCII 'RIFF')
    const isWav =
      len >= 4 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46;

    if (isWav) {
      try {
        buffer = await audioCtx.decodeAudioData(bytes.buffer.slice(0));
      } catch {
        buffer = createAudioBufferFromPcm(audioCtx, bytes, 24000, 1);
      }
    } else {
      // Gemini TTS provides raw 24kHz 16-bit mono PCM (audio/L16)
      buffer = createAudioBufferFromPcm(audioCtx, bytes, 24000, 1);
    }

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start(0);
    return true;
  } catch (e) {
    console.warn("Audio buffer playback notice, using browser speech synthesizer:", e);
    if (fallbackText && fallbackMood) {
      speakWithBrowser(fallbackText, fallbackMood);
    }
    return false;
  }
};

export const speakWithBrowser = (text: string, mood: string): void => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
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
