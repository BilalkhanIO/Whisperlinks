/**
 * WhisperDB - IndexedDB Storage Layer
 *
 * Implements structured local browser persistence for:
 * - Local Cryptographic Identity (keys, fingerprints, recovery phrase)
 * - Contacts & Address Book (public keys, verification status, trust flag, blocks)
 * - Contact Requests
 *
 * Zero server involvement. Data never leaves client device.
 */

import { EncryptedVault } from './cryptoService';

export interface PrivacySettings {
  invisibleMode: boolean; // Hide from ephemeral presence & discovery
  whoCanFindMe: 'anyone' | 'contacts_only' | 'nobody';
  allowContactRequests: boolean;
  allowCalls: boolean;
  allowRoomInvites: boolean;
}

export interface StoredWhisperIdentity {
  identityId: string; // unique cryptographic ID (e.g. wid_a7f3d9...)
  username: string; // human-readable alias (e.g. "bilal")
  whisperId: string; // human-readable + short crypto tag (e.g. "bilal#A7F3D9")
  shortTag: string; // "A7F3D9"
  hexFingerprint: string; // "A7F3-91KD-52LM-84BC"
  wordFingerprint: string; // "BLUE WOLF MOON #7291"
  publicKeySpki: string; // Base64
  encryptedVault?: EncryptedVault; // Present if PIN protection is active
  privateKeyPlain?: string; // Stored unencrypted ONLY if user has chosen not to set a PIN
  recoveryPhrase: string; // 12-word recovery mnemonic
  hasPin: boolean;
  pinHash?: string; // fast check salt hash
  createdAt: number;
  updatedAt: number;
  privacy: PrivacySettings;
}

export interface StoredContact {
  identityId: string; // peer's cryptographic ID
  whisperId: string; // e.g. "ahmed#82KD31"
  username: string;
  publicKey: string;
  shortTag: string;
  hexFingerprint?: string;
  wordFingerprint?: string;
  peerId?: string; // ephemeral peerJS ID for direct calling
  nickname?: string;
  verified: boolean;
  isTrusted: boolean;
  blocked: boolean;
  addedAt: number;
  lastSeen?: number;
  note?: string;
}

export interface ContactRequest {
  id: string;
  senderIdentityId: string;
  senderWhisperId: string;
  senderUsername: string;
  senderPublicKey: string;
  senderPeerId: string;
  timestamp: number;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  message?: string;
}

const DB_NAME = 'WhisperDB_v1';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains('identity')) {
        db.createObjectStore('identity', { keyPath: 'identityId' });
      }
      if (!db.objectStoreNames.contains('contacts')) {
        const contactStore = db.createObjectStore('contacts', { keyPath: 'identityId' });
        contactStore.createIndex('by_whisperId', 'whisperId', { unique: false });
        contactStore.createIndex('by_username', 'username', { unique: false });
      }
      if (!db.objectStoreNames.contains('contactRequests')) {
        db.createObjectStore('contactRequests', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

/**
 * Save Whisper Identity into IndexedDB (and sync backup to localStorage)
 */
export async function dbSaveIdentity(identity: StoredWhisperIdentity): Promise<void> {
  try {
    const db = await getDb();
    const tx = db.transaction('identity', 'readwrite');
    tx.objectStore('identity').put(identity);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('IndexedDB identity write fallback:', e);
  }

  // Backup sync to localStorage for rapid sync
  try {
    localStorage.setItem('whisperlink_whisper_id_backup', JSON.stringify(identity));
  } catch {}
}

/**
 * Load Whisper Identity from IndexedDB (with fallback)
 */
export async function dbLoadIdentity(): Promise<StoredWhisperIdentity | null> {
  try {
    const db = await getDb();
    const tx = db.transaction('identity', 'readonly');
    const store = tx.objectStore('identity');
    const req = store.getAll();

    const records = await new Promise<StoredWhisperIdentity[]>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    if (records.length > 0) {
      return records[0];
    }
  } catch (e) {
    console.warn('IndexedDB identity read fallback:', e);
  }

  try {
    const raw = localStorage.getItem('whisperlink_whisper_id_backup');
    if (raw) return JSON.parse(raw);
  } catch {}

  return null;
}

/**
 * Contacts CRUD
 */
export async function dbGetAllContacts(): Promise<StoredContact[]> {
  try {
    const db = await getDb();
    const tx = db.transaction('contacts', 'readonly');
    const req = tx.objectStore('contacts').getAll();

    return await new Promise<StoredContact[]>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function dbSaveContact(contact: StoredContact): Promise<void> {
  try {
    const db = await getDb();
    const tx = db.transaction('contacts', 'readwrite');
    tx.objectStore('contacts').put(contact);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error('dbSaveContact failed:', e);
  }
}

export async function dbDeleteContact(identityId: string): Promise<void> {
  try {
    const db = await getDb();
    const tx = db.transaction('contacts', 'readwrite');
    tx.objectStore('contacts').delete(identityId);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error('dbDeleteContact failed:', e);
  }
}

/**
 * Contact Requests CRUD
 */
export async function dbGetContactRequests(): Promise<ContactRequest[]> {
  try {
    const db = await getDb();
    const tx = db.transaction('contactRequests', 'readonly');
    const req = tx.objectStore('contactRequests').getAll();

    return await new Promise<ContactRequest[]>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function dbSaveContactRequest(request: ContactRequest): Promise<void> {
  try {
    const db = await getDb();
    const tx = db.transaction('contactRequests', 'readwrite');
    tx.objectStore('contactRequests').put(request);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error('dbSaveContactRequest error:', e);
  }
}
