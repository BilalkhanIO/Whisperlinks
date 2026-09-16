import { ChatLanguage, ChatMood } from "./types";

const PREF_KEY = 'whisperlink_prefs_v1';

interface UserPrefs {
  username: string;
  mood: ChatMood;
  language: ChatLanguage;
  sfxEnabled: boolean;
  voiceEnabled: boolean;
}

const DEFAULT_PREFS: UserPrefs = {
  username: '',
  mood: 'FUNNY',
  language: 'ENGLISH',
  sfxEnabled: true,
  voiceEnabled: false,
};

export const savePrefs = (prefs: Partial<UserPrefs>) => {
  const current = loadPrefs();
  const updated = { ...current, ...prefs };
  localStorage.setItem(PREF_KEY, JSON.stringify(updated));
};

export const loadPrefs = (): UserPrefs => {
  try {
    const data = localStorage.getItem(PREF_KEY);
    return data ? { ...DEFAULT_PREFS, ...JSON.parse(data) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
};

export const getFlag = (lang: ChatLanguage) => {
  switch (lang) {
    case 'ENGLISH':    return '🇬🇧';
    case 'ROMAN_URDU': return '🇵🇰';
    case 'SPANISH':    return '🇪🇸';
    case 'FRENCH':     return '🇫🇷';
    case 'GERMAN':     return '🇩🇪';
    case 'JAPANESE':   return '🇯🇵';
    case 'ARABIC':     return '🇸🇦';
    case 'HINDI':      return '🇮🇳';
    default:           return '🌐';
  }
};

export const getInitials = (name: string): string => {
  const clean = name.trim();
  if (!clean) return '?';
  return clean.slice(0, 2).toUpperCase();
};

const FINGERPRINT_WORDS = [
  'ALPHA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO', 'FOXTROT', 'GOLF', 'HOTEL',
  'INDIA', 'JULIET', 'KILO', 'LIMA', 'MIKE', 'NOVEMBER', 'OSCAR', 'PAPA',
  'QUEBEC', 'ROMEO', 'SIERRA', 'TANGO', 'UNIFORM', 'VICTOR', 'WHISKEY', 'XRAY',
  'YANKEE', 'ZULU', 'RED', 'BLUE', 'GREEN', 'WOLF', 'BEAR', 'LION', 'LUNA', 'NOVA'
];

export const getRoomFingerprint = (ids: string[]): string => {
  if (ids.length === 0) return 'UNKNOWN';
  // Sort IDs so all peers see the same fingerprint
  const sorted = [...ids].sort();
  const combined = sorted.join(':');
  
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash) + combined.charCodeAt(i);
    hash |= 0;
  }
  
  // Generate 4 words based on hash
  const w1 = FINGERPRINT_WORDS[Math.abs(hash) % FINGERPRINT_WORDS.length];
  const w2 = FINGERPRINT_WORDS[Math.abs(hash >> 8) % FINGERPRINT_WORDS.length];
  const w3 = String(Math.abs(hash % 10000)).padStart(4, '0');
  const w4 = FINGERPRINT_WORDS[Math.abs(hash >> 16) % FINGERPRINT_WORDS.length];
  
  return `${w1} • ${w2} • ${w3} • ${w4}`;
};
