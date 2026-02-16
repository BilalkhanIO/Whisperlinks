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
  timestamp: Date;
  isEncrypted?: boolean;
  isFactCheck?: boolean;
  isStreaming?: boolean; // Currently being streamed
}

export interface UserInfo {
  peerId: string;
  username: string;
  isHost: boolean;
}

export enum ConnectionStatus {
  IDLE = 'IDLE',
  SEARCHING = 'SEARCHING',
  WAITING_FOR_PEER = 'WAITING_FOR_PEER',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED'
}

export type ChatMood = 'FUNNY' | 'SAD' | 'SAVAGE' | 'CHILL' | 'FACTCHECK';
export type ChatLanguage = 'EN' | 'UR' | 'PS' | 'AR' | 'HI';
export type ChatMode = 'AI' | 'P2P';

export interface MoodConfig {
  key: ChatMood;
  name: string;
  persona: string;
  icon: string;
  accent: string;
  accentHex: string;
  description: string;
}

export interface LanguageConfig {
  key: ChatLanguage;
  label: string;
  flag: string;
  nativeName: string;
}