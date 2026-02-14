export enum SenderType {
  USER = 'USER',
  STRANGER = 'STRANGER',
  SYSTEM = 'SYSTEM'
}

export interface Message {
  id: string;
  text: string;
  sender: SenderType;
  timestamp: Date;
  isEncrypted?: boolean; // For visual effect
}

export interface ChatState {
  isConnected: boolean;
  isConnecting: boolean;
  nickname: string;
}

export enum ConnectionStatus {
  IDLE = 'IDLE',
  SEARCHING = 'SEARCHING',
  ENCRYPTING = 'ENCRYPTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED'
}

export type ChatMood = 'FUNNY' | 'SAD';