export type JsonFormatResult = { ok: true; formatted: string } | { ok: false; error: string };

export function formatJson(input: string, indent = 2): JsonFormatResult {
  try {
    const parsed = JSON.parse(input);
    return { ok: true, formatted: JSON.stringify(parsed, null, indent) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function validateJson(input: string): { valid: boolean; error?: string } {
  try {
    JSON.parse(input);
    return { valid: true };
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function base64Encode(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

export function base64Decode(input: string): string {
  const binary = atob(input);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export function urlEncode(input: string): string {
  return encodeURIComponent(input);
}

export function urlDecode(input: string): string {
  return decodeURIComponent(input);
}

export type JwtDecoded = {
  header: unknown;
  payload: unknown;
};

/** Decodes a JWT's header + payload without verifying the signature. */
export function decodeJwt(token: string): JwtDecoded {
  const parts = token.trim().split(".");
  if (parts.length < 2) throw new Error("Not a valid JWT");
  const decodePart = (part: string) => {
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    return JSON.parse(base64Decode(padded));
  };
  return {
    header: decodePart(parts[0]),
    payload: decodePart(parts[1]),
  };
}

export type HashAlgo = "SHA-1" | "SHA-256" | "SHA-512";

export async function hashText(input: string, algo: HashAlgo): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest(algo, data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function generateUuidV4(): string {
  return crypto.randomUUID();
}

/** Simple timestamp-based UUID v7 (not a full spec implementation, but timestamp-sortable). */
export function generateUuidV7(): string {
  const timestamp = BigInt(Date.now());
  const timeHex = timestamp.toString(16).padStart(12, "0");
  const randomBytes = crypto.getRandomValues(new Uint8Array(10));
  const randomHex = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const part1 = timeHex.slice(0, 8);
  const part2 = timeHex.slice(8, 12);
  const part3 = `7${randomHex.slice(0, 3)}`;
  const variantNibble = ((parseInt(randomHex.slice(3, 4), 16) & 0x3) | 0x8).toString(16);
  const part4 = `${variantNibble}${randomHex.slice(4, 7)}`;
  const part5 = randomHex.slice(7, 17).padEnd(12, "0");

  return `${part1}-${part2}-${part3}-${part4}-${part5}`;
}

export type RegexMatch = {
  match: string;
  index: number;
  groups: string[];
};

export function testRegex(pattern: string, flags: string, text: string): RegexMatch[] {
  const re = new RegExp(pattern, flags.includes("g") ? flags : `${flags}g`);
  const matches: RegexMatch[] = [];
  let m: RegExpExecArray | null;
  let guard = 0;
  while ((m = re.exec(text)) !== null && guard < 10000) {
    matches.push({
      match: m[0],
      index: m.index,
      groups: m.slice(1).map((g) => g ?? ""),
    });
    if (m[0] === "") re.lastIndex += 1;
    guard += 1;
  }
  return matches;
}
