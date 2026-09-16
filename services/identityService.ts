/**
 * WhisperID Identity Service
 *
 * Core architectural principle:
 * Local identity + public cryptographic identifier + temporary discovery + P2P communication.
 *
 * The browser generates & stores:
 * - Username (human-readable alias)
 * - Whisper ID (e.g. bilal#A7F3D9)
 * - Public Key (ECDSA P-256)
 * - Cryptographic Fingerprint (Hex & Human Mnemonic)
 * - Encrypted Private Key (protected by PBKDF2-derived PIN)
 * - 12-word Recovery Phrase
 * - Local Address Book (Contacts, Verification state, Trust state)
 *
 * The server never stores private keys, PINs, or user databases.
 */

import {
  generateIdentityKeyPair,
  restoreKeyPairFromRecoveryPhrase,
  generateRecoveryPhrase,
  computeFingerprints,
  encryptPrivateKeyWithPin,
  decryptPrivateKeyWithPin,
  signChallenge,
  verifyChallenge,
  EncryptedVault,
} from './cryptoService';
import {
  dbSaveIdentity,
  dbLoadIdentity,
  dbGetAllContacts,
  dbSaveContact,
  dbDeleteContact,
  StoredWhisperIdentity,
  StoredContact,
  PrivacySettings,
} from './whisperDb';

export interface UserIdentity {
  identityId: string;
  username: string;
  whisperId: string;
  shortTag: string;
  hexFingerprint: string;
  wordFingerprint: string;
  publicKeySpki: string;
  hasPin: boolean;
  recoveryPhrase: string;
  privacy: PrivacySettings;
  savedContacts: StoredContact[];
}

const SESSION_LOCK_KEY = 'whisperlink_session_locked';
const UNENCRYPTED_KEY_MEM = 'whisperlink_active_privkey';

// Default privacy configuration
export const DEFAULT_PRIVACY: PrivacySettings = {
  invisibleMode: false,
  whoCanFindMe: 'anyone',
  allowContactRequests: true,
  allowCalls: true,
  allowRoomInvites: true,
};

/**
 * Sanitize username for display & URL/PeerJS compatibility
 */
export function sanitizeUsername(raw: string): string {
  return raw
    .trim()
    .replace(/^@/, '')
    .replace(/[^a-zA-Z0-9_\-\.]/g, '')
    .slice(0, 16) || 'Ghost';
}

/**
 * Deterministic WebRTC PeerJS ID derived from WhisperID public tag
 * Format: `wl-wid-[shortTag]-[safeUsername]`
 */
export function getPeerIdFromWhisperId(whisperId: string): string {
  const parts = whisperId.trim().replace(/^@/, '').split('#');
  const safeName = sanitizeUsername(parts[0]).toLowerCase();
  const safeTag = (parts[1] || '000000').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6);
  return `wl-wid-${safeTag}-${safeName}`;
}

/**
 * Parse human inputs: "@bilal#A7F3D9", "bilal#A7F3D9", or plain "bilal"
 */
export function parseWhisperId(input: string): {
  username: string;
  tag?: string;
  whisperId: string;
  peerId: string;
} {
  const cleaned = input.trim().replace(/^@/, '');
  const parts = cleaned.split('#');
  const username = sanitizeUsername(parts[0]);
  const tag = parts[1] ? parts[1].trim().toUpperCase().slice(0, 6) : undefined;
  const whisperId = tag ? `${username}#${tag}` : username;
  const peerId = tag ? getPeerIdFromWhisperId(`${username}#${tag}`) : `wl-wid-find-${username.toLowerCase()}`;

  return { username, tag, whisperId, peerId };
}

// Client-side SHA-256 for fast PIN verification
async function hashPinLocal(pin: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`whisper-pin-salt-${salt}:${pin}`);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Create a new WhisperID cryptographic identity
 */
export async function createWhisperIdentity(
  rawUsername: string,
  pin?: string
): Promise<UserIdentity> {
  const username = sanitizeUsername(rawUsername);
  const { exported } = await generateIdentityKeyPair();
  const recoveryPhrase = generateRecoveryPhrase();

  const { identityId, shortTag, hexFingerprint, wordFingerprint } =
    await computeFingerprints(exported.publicKeySpki);

  const whisperId = `${username}#${shortTag}`;

  let encryptedVault: EncryptedVault | undefined;
  let pinHash: string | undefined;
  let privateKeyPlain: string | undefined;

  if (pin && pin.trim().length >= 4) {
    encryptedVault = await encryptPrivateKeyWithPin(exported.privateKeyPkcs8, pin.trim());
    pinHash = await hashPinLocal(pin.trim(), shortTag);
  } else {
    privateKeyPlain = exported.privateKeyPkcs8;
  }

  // Keep in session memory for active usage
  sessionStorage.setItem(UNENCRYPTED_KEY_MEM, exported.privateKeyPkcs8);
  unlockAppSession();

  const stored: StoredWhisperIdentity = {
    identityId,
    username,
    whisperId,
    shortTag,
    hexFingerprint,
    wordFingerprint,
    publicKeySpki: exported.publicKeySpki,
    encryptedVault,
    privateKeyPlain,
    recoveryPhrase,
    hasPin: !!encryptedVault,
    pinHash,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    privacy: { ...DEFAULT_PRIVACY },
  };

  await dbSaveIdentity(stored);

  return {
    identityId,
    username,
    whisperId,
    shortTag,
    hexFingerprint,
    wordFingerprint,
    publicKeySpki: exported.publicKeySpki,
    hasPin: stored.hasPin,
    recoveryPhrase,
    privacy: stored.privacy,
    savedContacts: [],
  };
}

/**
 * Restore WhisperID identity from 12-word recovery phrase
 */
export async function restoreWhisperIdentityFromPhrase(
  phrase: string,
  rawUsername?: string,
  pin?: string
): Promise<UserIdentity> {
  const { exported } = await restoreKeyPairFromRecoveryPhrase(phrase);
  const { identityId, shortTag, hexFingerprint, wordFingerprint } =
    await computeFingerprints(exported.publicKeySpki);

  const username = sanitizeUsername(rawUsername || 'WhisperUser');
  const whisperId = `${username}#${shortTag}`;

  let encryptedVault: EncryptedVault | undefined;
  let pinHash: string | undefined;
  let privateKeyPlain: string | undefined;

  if (pin && pin.trim().length >= 4) {
    encryptedVault = await encryptPrivateKeyWithPin(exported.privateKeyPkcs8, pin.trim());
    pinHash = await hashPinLocal(pin.trim(), shortTag);
  } else {
    privateKeyPlain = exported.privateKeyPkcs8;
  }

  sessionStorage.setItem(UNENCRYPTED_KEY_MEM, exported.privateKeyPkcs8);
  unlockAppSession();

  const stored: StoredWhisperIdentity = {
    identityId,
    username,
    whisperId,
    shortTag,
    hexFingerprint,
    wordFingerprint,
    publicKeySpki: exported.publicKeySpki,
    encryptedVault,
    privateKeyPlain,
    recoveryPhrase: phrase.trim().toLowerCase(),
    hasPin: !!encryptedVault,
    pinHash,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    privacy: { ...DEFAULT_PRIVACY },
  };

  await dbSaveIdentity(stored);
  const contacts = await dbGetAllContacts();

  return {
    identityId,
    username,
    whisperId,
    shortTag,
    hexFingerprint,
    wordFingerprint,
    publicKeySpki: exported.publicKeySpki,
    hasPin: stored.hasPin,
    recoveryPhrase: phrase,
    privacy: stored.privacy,
    savedContacts: contacts,
  };
}

/**
 * Load Active WhisperID from local IndexedDB
 */
export async function loadActiveWhisperIdentity(): Promise<UserIdentity> {
  let stored = await dbLoadIdentity();

  if (!stored) {
    // Generate fresh initial identity
    return await createWhisperIdentity('CipherGhost');
  }

  const contacts = await dbGetAllContacts();

  // If private key is stored plain (no PIN), load into memory
  if (stored.privateKeyPlain && !stored.hasPin) {
    sessionStorage.setItem(UNENCRYPTED_KEY_MEM, stored.privateKeyPlain);
  }

  return {
    identityId: stored.identityId,
    username: stored.username,
    whisperId: stored.whisperId || `${stored.username}#${stored.shortTag}`,
    shortTag: stored.shortTag,
    hexFingerprint: stored.hexFingerprint,
    wordFingerprint: stored.wordFingerprint,
    publicKeySpki: stored.publicKeySpki,
    hasPin: stored.hasPin,
    recoveryPhrase: stored.recoveryPhrase,
    privacy: stored.privacy || { ...DEFAULT_PRIVACY },
    savedContacts: contacts,
  };
}

/**
 * Change username alias without changing cryptographic identity
 */
export async function changeUsername(newUsername: string): Promise<UserIdentity> {
  const stored = await dbLoadIdentity();
  if (!stored) throw new Error('No identity found');

  const clean = sanitizeUsername(newUsername);
  stored.username = clean;
  stored.whisperId = `${clean}#${stored.shortTag}`;
  stored.updatedAt = Date.now();

  await dbSaveIdentity(stored);
  const contacts = await dbGetAllContacts();

  return {
    identityId: stored.identityId,
    username: stored.username,
    whisperId: stored.whisperId,
    shortTag: stored.shortTag,
    hexFingerprint: stored.hexFingerprint,
    wordFingerprint: stored.wordFingerprint,
    publicKeySpki: stored.publicKeySpki,
    hasPin: stored.hasPin,
    recoveryPhrase: stored.recoveryPhrase,
    privacy: stored.privacy,
    savedContacts: contacts,
  };
}

/**
 * Update privacy preferences
 */
export async function updatePrivacySettings(
  privacyUpdate: Partial<PrivacySettings>
): Promise<UserIdentity> {
  const stored = await dbLoadIdentity();
  if (!stored) throw new Error('No identity found');

  stored.privacy = { ...stored.privacy, ...privacyUpdate };
  stored.updatedAt = Date.now();
  await dbSaveIdentity(stored);
  const contacts = await dbGetAllContacts();

  return {
    identityId: stored.identityId,
    username: stored.username,
    whisperId: stored.whisperId,
    shortTag: stored.shortTag,
    hexFingerprint: stored.hexFingerprint,
    wordFingerprint: stored.wordFingerprint,
    publicKeySpki: stored.publicKeySpki,
    hasPin: stored.hasPin,
    recoveryPhrase: stored.recoveryPhrase,
    privacy: stored.privacy,
    savedContacts: contacts,
  };
}

/**
 * Local PIN Management (PBKDF2 / AES-GCM)
 */
export function isAppSessionLocked(): boolean {
  try {
    const raw = localStorage.getItem('whisperlink_whisper_id_backup');
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!parsed.hasPin) return false;
    return sessionStorage.getItem(SESSION_LOCK_KEY) !== 'unlocked';
  } catch {
    return false;
  }
}

export function unlockAppSession(): void {
  sessionStorage.setItem(SESSION_LOCK_KEY, 'unlocked');
}

export function lockAppSession(): void {
  sessionStorage.removeItem(SESSION_LOCK_KEY);
  sessionStorage.removeItem(UNENCRYPTED_KEY_MEM);
}

export async function verifyUserPin(pin: string): Promise<boolean> {
  const stored = await dbLoadIdentity();
  if (!stored || !stored.hasPin) return true;

  if (stored.encryptedVault) {
    try {
      const decryptedKey = await decryptPrivateKeyWithPin(stored.encryptedVault, pin);
      sessionStorage.setItem(UNENCRYPTED_KEY_MEM, decryptedKey);
      unlockAppSession();
      return true;
    } catch {
      return false;
    }
  }

  // Fallback hash check
  const hash = await hashPinLocal(pin, stored.shortTag);
  const valid = hash === stored.pinHash;
  if (valid) unlockAppSession();
  return valid;
}

export async function setUserPin(newPin: string): Promise<UserIdentity> {
  const stored = await dbLoadIdentity();
  if (!stored) throw new Error('No identity found');

  let privateKey = sessionStorage.getItem(UNENCRYPTED_KEY_MEM) || stored.privateKeyPlain;
  if (!privateKey) {
    // Attempt to restore using recovery phrase if key in memory was lost
    const restored = await restoreKeyPairFromRecoveryPhrase(stored.recoveryPhrase);
    privateKey = restored.exported.privateKeyPkcs8;
  }

  const vault = await encryptPrivateKeyWithPin(privateKey, newPin.trim());
  const pinHash = await hashPinLocal(newPin.trim(), stored.shortTag);

  stored.encryptedVault = vault;
  stored.pinHash = pinHash;
  stored.hasPin = true;
  stored.privateKeyPlain = undefined; // Wipe plaintext private key
  stored.updatedAt = Date.now();

  sessionStorage.setItem(UNENCRYPTED_KEY_MEM, privateKey);
  unlockAppSession();

  await dbSaveIdentity(stored);
  const contacts = await dbGetAllContacts();

  return {
    identityId: stored.identityId,
    username: stored.username,
    whisperId: stored.whisperId,
    shortTag: stored.shortTag,
    hexFingerprint: stored.hexFingerprint,
    wordFingerprint: stored.wordFingerprint,
    publicKeySpki: stored.publicKeySpki,
    hasPin: true,
    recoveryPhrase: stored.recoveryPhrase,
    privacy: stored.privacy,
    savedContacts: contacts,
  };
}

export async function removeUserPin(currentPin: string): Promise<UserIdentity> {
  const stored = await dbLoadIdentity();
  if (!stored) throw new Error('No identity found');

  let privateKey: string;
  if (stored.encryptedVault) {
    privateKey = await decryptPrivateKeyWithPin(stored.encryptedVault, currentPin);
  } else {
    privateKey = sessionStorage.getItem(UNENCRYPTED_KEY_MEM) || '';
  }

  stored.hasPin = false;
  stored.encryptedVault = undefined;
  stored.pinHash = undefined;
  stored.privateKeyPlain = privateKey;
  stored.updatedAt = Date.now();

  sessionStorage.setItem(UNENCRYPTED_KEY_MEM, privateKey);
  unlockAppSession();

  await dbSaveIdentity(stored);
  const contacts = await dbGetAllContacts();

  return {
    identityId: stored.identityId,
    username: stored.username,
    whisperId: stored.whisperId,
    shortTag: stored.shortTag,
    hexFingerprint: stored.hexFingerprint,
    wordFingerprint: stored.wordFingerprint,
    publicKeySpki: stored.publicKeySpki,
    hasPin: false,
    recoveryPhrase: stored.recoveryPhrase,
    privacy: stored.privacy,
    savedContacts: contacts,
  };
}

/**
 * Sign handshake challenge with active private key
 */
export async function signIdentityChallenge(challenge: string): Promise<string> {
  const key = sessionStorage.getItem(UNENCRYPTED_KEY_MEM);
  if (!key) throw new Error('Identity locked. PIN required.');
  return await signChallenge(key, challenge);
}

/**
 * Verify peer handshake signature
 */
export async function verifyPeerSignature(
  publicKeySpki: string,
  challenge: string,
  signatureBase64: string
): Promise<boolean> {
  return await verifyChallenge(publicKeySpki, challenge, signatureBase64);
}

/**
 * Local Address Book & Contacts API
 */
export async function saveContactToBook(
  contactData: Omit<StoredContact, 'addedAt'>
): Promise<StoredContact[]> {
  const contact: StoredContact = {
    ...contactData,
    addedAt: Date.now(),
  };
  await dbSaveContact(contact);
  return await dbGetAllContacts();
}

export async function removeContactFromBook(identityId: string): Promise<StoredContact[]> {
  await dbDeleteContact(identityId);
  return await dbGetAllContacts();
}

export async function toggleTrustContact(
  identityId: string,
  isTrusted: boolean
): Promise<StoredContact[]> {
  const contacts = await dbGetAllContacts();
  const c = contacts.find(x => x.identityId === identityId);
  if (c) {
    c.isTrusted = isTrusted;
    await dbSaveContact(c);
  }
  return await dbGetAllContacts();
}

export async function toggleBlockContact(
  identityId: string,
  blocked: boolean
): Promise<StoredContact[]> {
  const contacts = await dbGetAllContacts();
  const c = contacts.find(x => x.identityId === identityId);
  if (c) {
    c.blocked = blocked;
    await dbSaveContact(c);
  }
  return await dbGetAllContacts();
}

export async function verifyContactIdentity(identityId: string): Promise<StoredContact[]> {
  const contacts = await dbGetAllContacts();
  const c = contacts.find(x => x.identityId === identityId);
  if (c) {
    c.verified = true;
    await dbSaveContact(c);
  }
  return await dbGetAllContacts();
}

/**
 * Ephemeral Discovery & Presence Client
 */
export async function registerEphemeralPresence(
  identity: UserIdentity,
  peerId: string
): Promise<void> {
  if (identity.privacy.invisibleMode) {
    try {
      await fetch('/api/presence/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whisperId: identity.whisperId }),
      });
    } catch {}
    return;
  }

  try {
    await fetch('/api/presence/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: identity.username,
        whisperId: identity.whisperId,
        identityId: identity.identityId,
        peerId,
        isInvisible: identity.privacy.invisibleMode,
      }),
    });
  } catch (e) {
    console.warn('Presence registration notice:', e);
  }
}

export async function heartbeatEphemeralPresence(
  whisperId: string,
  peerId: string
): Promise<void> {
  try {
    await fetch('/api/presence/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ whisperId, peerId }),
    });
  } catch {}
}

export async function leaveEphemeralPresence(whisperId: string): Promise<void> {
  try {
    await fetch('/api/presence/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ whisperId }),
    });
  } catch {}
}

export async function lookupEphemeralPeers(query: string): Promise<Array<{
  whisperId: string;
  username: string;
  identityId: string;
  peerId: string;
  isExactMatch: boolean;
}>> {
  try {
    const res = await fetch(`/api/presence/lookup?query=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch {
    return [];
  }
}
