const PBKDF2_ITERATIONS = 210_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const KEY_BITS = 256;
export const VAULT_VERIFIER_PLAINTEXT = "dn-assistant-vault-v1";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/** Ensure a Uint8Array backed by ArrayBuffer for Web Crypto BufferSource typing. */
function asBufferSource(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
}

export function randomBytes(length: number): Uint8Array {
  const buf = new Uint8Array(length);
  crypto.getRandomValues(buf);
  return buf;
}

async function importPasswordKey(password: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveKey",
  ]);
}

export async function deriveVaultKey(password: string, saltB64: string): Promise<CryptoKey> {
  const baseKey = await importPasswordKey(password);
  const salt = asBufferSource(base64ToBytes(saltB64));
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: KEY_BITS },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function createVaultMeta(password: string): Promise<{
  salt: string;
  verifierNonce: string;
  verifierCiphertext: string;
  iterations: number;
}> {
  const salt = bytesToBase64(randomBytes(SALT_BYTES));
  const key = await deriveVaultKey(password, salt);
  const { nonce, ciphertext } = await encryptString(key, VAULT_VERIFIER_PLAINTEXT);
  return {
    salt,
    verifierNonce: nonce,
    verifierCiphertext: ciphertext,
    iterations: PBKDF2_ITERATIONS,
  };
}

export async function verifyMasterPassword(
  password: string,
  meta: { salt: string; verifierNonce: string; verifierCiphertext: string },
): Promise<CryptoKey | null> {
  try {
    const key = await deriveVaultKey(password, meta.salt);
    const plain = await decryptString(key, meta.verifierNonce, meta.verifierCiphertext);
    if (plain !== VAULT_VERIFIER_PLAINTEXT) return null;
    return key;
  } catch {
    return null;
  }
}

export async function encryptString(
  key: CryptoKey,
  plaintext: string,
): Promise<{ nonce: string; ciphertext: string }> {
  const iv = asBufferSource(randomBytes(IV_BYTES));
  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return {
    nonce: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(cipherBuf)),
  };
}

export async function decryptString(
  key: CryptoKey,
  nonceB64: string,
  ciphertextB64: string,
): Promise<string> {
  const iv = asBufferSource(base64ToBytes(nonceB64));
  const data = asBufferSource(base64ToBytes(ciphertextB64));
  const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(plainBuf);
}

export type PasswordGeneratorOptions = {
  length: number;
  lowercase: boolean;
  uppercase: boolean;
  digits: boolean;
  symbols: boolean;
};

const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.?";

export function generatePassword(opts: PasswordGeneratorOptions): string {
  let alphabet = "";
  if (opts.lowercase) alphabet += LOWER;
  if (opts.uppercase) alphabet += UPPER;
  if (opts.digits) alphabet += DIGITS;
  if (opts.symbols) alphabet += SYMBOLS;
  if (!alphabet) alphabet = LOWER + UPPER + DIGITS;

  const length = Math.max(8, Math.min(128, opts.length || 20));
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i]! % alphabet.length]!;
  }
  return out;
}
