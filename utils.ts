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
