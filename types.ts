export enum SenderType {
  USER = 'USER',
  STRANGER = 'STRANGER', // AI or Peer
  SYSTEM = 'SYSTEM'
}

export interface Message {
  id: string;
  text: string;
  sender: SenderType;
  username?: string;
  timestamp: Date;
  isEncrypted?: boolean;
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

export type ChatMood = 'FUNNY' | 'SAD' | 'FACT_CHECK' | 'FLIRTY' | 'ANGRY';

export type ChatLanguage = 'ENGLISH' | 'ROMAN_URDU' | 'SPANISH' | 'FRENCH' | 'GERMAN' | 'JAPANESE' | 'ARABIC' | 'HINDI';

export type ChatMode = 'AI' | 'P2P';