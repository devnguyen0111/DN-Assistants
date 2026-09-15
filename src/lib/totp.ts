const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const PERIOD_SEC = 30;
const DIGITS = 6;

function decodeBase32(secret: string): Uint8Array {
  const cleaned = secret.replace(/[\s=-]/g, "").toUpperCase();
  if (!cleaned) throw new Error("Empty TOTP secret");

  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const ch of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx < 0) throw new Error("Invalid base32 TOTP secret");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return new Uint8Array(bytes);
}

function counterToBytes(counter: number): Uint8Array {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  const high = Math.floor(counter / 0x100000000);
  const low = counter >>> 0;
  view.setUint32(0, high);
  view.setUint32(4, low);
  return new Uint8Array(buf);
}

/**
 * Sync SHA-1 — SubtleCrypto HMAC is async-only; algorithm matches Web Crypto SHA-1.
 */
function sha1(message: Uint8Array): Uint8Array {
  const ml = message.length;
  const bitLen = ml * 8;
  const totalLen = ((ml + 1 + 8 + 63) & ~63);
  const bytes = new Uint8Array(totalLen);
  bytes.set(message);
  bytes[ml] = 0x80;
  const view = new DataView(bytes.buffer);
  view.setUint32(totalLen - 8, Math.floor(bitLen / 0x100000000));
  view.setUint32(totalLen - 4, bitLen >>> 0);

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  const w = new Int32Array(80);
  for (let i = 0; i < totalLen; i += 64) {
    for (let j = 0; j < 16; j++) w[j] = view.getInt32(i + j * 4);
    for (let j = 16; j < 80; j++) {
      const x = w[j - 3]! ^ w[j - 8]! ^ w[j - 14]! ^ w[j - 16]!;
      w[j] = (x << 1) | (x >>> 31);
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let j = 0; j < 80; j++) {
      let f: number;
      let k: number;
      if (j < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (j < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (j < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }
      const temp = (((a << 5) | (a >>> 27)) + f + e + k + w[j]!) | 0;
      e = d;
      d = c;
      c = ((b << 30) | (b >>> 2)) | 0;
      b = a;
      a = temp;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
  }

  const out = new Uint8Array(20);
  const outView = new DataView(out.buffer);
  outView.setInt32(0, h0);
  outView.setInt32(4, h1);
  outView.setInt32(8, h2);
  outView.setInt32(12, h3);
  outView.setInt32(16, h4);
  return out;
}

/** HMAC-SHA1 matching Web Crypto `{ name: "HMAC", hash: "SHA-1" }`. */
function hmacSha1(keyBytes: Uint8Array, data: Uint8Array): Uint8Array {
  let key = keyBytes;
  if (key.length > 64) key = sha1(key);
  const block = new Uint8Array(64);
  block.set(key);

  const oPad = new Uint8Array(64);
  const iPad = new Uint8Array(64);
  for (let i = 0; i < 64; i++) {
    oPad[i] = block[i]! ^ 0x5c;
    iPad[i] = block[i]! ^ 0x36;
  }

  const inner = new Uint8Array(64 + data.length);
  inner.set(iPad);
  inner.set(data, 64);

  const outer = new Uint8Array(84);
  outer.set(oPad);
  outer.set(sha1(inner), 64);
  return sha1(outer);
}

function truncateHotp(hmac: Uint8Array): number {
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const bin =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  return bin % 10 ** DIGITS;
}

/**
 * RFC 6238 TOTP — HMAC-SHA1, 30s period, 6 digits.
 * Uses sync HMAC-SHA1 equivalent to Web Crypto (SubtleCrypto is async-only).
 */
export function generateTotp(
  secretBase32: string,
  nowMs: number = Date.now(),
): { code: string; remaining: number } {
  const keyBytes = decodeBase32(secretBase32);
  const epoch = Math.floor(nowMs / 1000);
  const counter = Math.floor(epoch / PERIOD_SEC);
  const remaining = PERIOD_SEC - (epoch % PERIOD_SEC);
  const hmac = hmacSha1(keyBytes, counterToBytes(counter));
  const code = String(truncateHotp(hmac)).padStart(DIGITS, "0");
  return { code, remaining };
}
