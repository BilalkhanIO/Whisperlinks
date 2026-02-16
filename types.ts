export enum SenderType {
  USER = 'USER',
  STRANGER = 'STRANGER', // AI or Peer
  SYSTEM = 'SYSTEM'
}

export interface Message {
  id: string;
  text: string;
  sender: SenderType;
  username?: string; // Added for identity
  timestamp: Date;
  isEncrypted?: boolean; // For visual effect
}

export interface UserInfo {
  peerId: string;
  username: string;
  isHost: boolean;
}

export enum ConnectionStatus {
  IDLE = 'IDLE',
  SEARCHING = 'SEARCHING', // AI Search or P2P Init
  WAITING_FOR_PEER = 'WAITING_FOR_PEER', // P2P Host waiting
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED'
}

export type ChatMood = 'FUNNY' | 'SAD';

export type ChatMode = 'AI' | 'P2P';