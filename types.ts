export enum SenderType {
  USER = 'USER',
  STRANGER = 'STRANGER',
  SYSTEM = 'SYSTEM'
}

export interface Message {
  id: string;
  text: string;
  sender: SenderType;
  username?: string;
  timestamp: Date | string | number;
  isEncrypted?: boolean;
  isStreaming?: boolean;
  replyTo?: { id: string; text: string; username?: string };
  reactions?: Record<string, string[]>;
  expiresAt?: number;
  status?: 'sent' | 'delivered';
  type?: 'text' | 'voice' | 'file' | 'image' | 'poll';
  translatedText?: string;
  translatedLang?: string;
  voiceData?: {
    duration: number;
    dataUrl: string;
  };
  fileData?: {
    name: string;
    size: number;
    mimeType: string;
    dataUrl: string;
    sha256?: string;
  };
  pollData?: {
    id: string;
    question: string;
    options: { text: string; votes: string[] }[];
    creator: string;
    totalVotes: number;
  };
}

export interface ModerationSettings {
  allowFileSharing: boolean;
  allowVoice: boolean;
  allowAI: boolean;
  isLocked: boolean;
}

export interface UserInfo {
  peerId: string;
  username: string;
  isHost: boolean;
  whisperId?: string;
  shortTag?: string;
  hexFingerprint?: string;
  verified?: boolean;
  isTrusted?: boolean;
}

export enum ConnectionStatus {
  IDLE = 'IDLE',
  SEARCHING = 'SEARCHING',
  WAITING_FOR_PEER = 'WAITING_FOR_PEER',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED'
}

export type ChatMood = 'FUNNY' | 'SAD' | 'FACT_CHECK' | 'FLIRTY' | 'ANGRY';

export type ChatLanguage = 'ENGLISH' | 'ROMAN_URDU' | 'SPANISH' | 'FRENCH' | 'GERMAN' | 'JAPANESE' | 'ARABIC' | 'HINDI';

export type ChatMode = 'AI' | 'P2P';
