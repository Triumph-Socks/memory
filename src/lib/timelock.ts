/**
 * MemoryLane — client-side Time-Lock Engine (demo mirror of the server service).
 *
 * Real cryptography, entirely in the browser:
 *   KDF ......... PBKDF2-SHA256, 150,000 iterations, per-capsule random salt
 *   Cipher ...... AES-256-GCM (authenticated encryption, 96-bit IV)
 *   Fingerprint . SHA-256 over the ciphertext, published for tamper audits
 *
 * The sealed payload is opaque to the platform: without the PIN (or the
 * scheduled key release on the server path) the bytes are noise.
 */

export interface SealedPayload {
  v: 1;
  kdf: "PBKDF2-SHA256";
  iterations: number;
  salt: string; // base64
  iv: string; // base64
  ciphertext: string; // base64
}

export interface SealedCapsuleMeta {
  id: string;
  code: string;
  title: string;
  recipient: string;
  milestone: string;
  unlockAt: number; // epoch ms (T_unlock)
  sealedAt: number;
  payload: SealedPayload;
  fingerprint: string;
  photos: string[];
  demo?: boolean;
  opened?: boolean;
}

export const KDF_ITERATIONS = 150_000;

const te = new TextEncoder();
const td = new TextDecoder();

function toB64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function fromB64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function randomBytes(n: number): Uint8Array {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
}

async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", te.encode(pin), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: KDF_ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Seal plaintext under a PIN. The result can only be opened with the same PIN. */
export async function sealSecret(plaintext: string, pin: string): Promise<SealedPayload> {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await deriveKey(pin, salt);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    te.encode(plaintext),
  );
  return {
    v: 1,
    kdf: "PBKDF2-SHA256",
    iterations: KDF_ITERATIONS,
    salt: toB64(salt),
    iv: toB64(iv),
    ciphertext: toB64(new Uint8Array(ct)),
  };
}

/** Attempt to open a sealed payload. Throws on wrong PIN / tampered bytes. */
export async function openSecret(payload: SealedPayload, pin: string): Promise<string> {
  const key = await deriveKey(pin, fromB64(payload.salt));
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(payload.iv) as BufferSource },
    key,
    fromB64(payload.ciphertext) as BufferSource,
  );
  return td.decode(pt);
}

/** SHA-256 fingerprint of the ciphertext — published so audits can detect tampering. */
export async function fingerprint(payload: SealedPayload): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", fromB64(payload.ciphertext) as BufferSource);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Human-friendly capsule code, e.g. ML-7F3A. */
export function makeCode(): string {
  const hex = Array.from(randomBytes(2))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return `ML-${hex}`;
}
