export type JsonFormatResult = { ok: true; formatted: string } | { ok: false; error: string };

export function formatJson(input: string, indent: number | string = 2): JsonFormatResult {
  try {
    const parsed = JSON.parse(input);
    return { ok: true, formatted: JSON.stringify(parsed, null, indent) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function minifyJson(input: string): JsonFormatResult {
  try {
    const parsed = JSON.parse(input);
    return { ok: true, formatted: JSON.stringify(parsed) };
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

export function escapeJsonString(input: string): string {
  return JSON.stringify(input).slice(1, -1);
}

export function unescapeJsonString(input: string): string {
  try {
    return JSON.parse(`"${input.replace(/"/g, '\\"')}"`);
  } catch {
    return input
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\")
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\r/g, "\r");
  }
}

export function jsonToTypeScript(
  input: string,
  rootName = "Root",
): { ok: true; code: string } | { ok: false; error: string } {
  try {
    const data = JSON.parse(input);
    const interfaces: Map<string, string> = new Map();

    function capitalize(s: string): string {
      return s.charAt(0).toUpperCase() + s.slice(1);
    }

    function getType(val: unknown, keyHint: string): string {
      if (val === null) return "null";
      if (val === undefined) return "undefined";
      if (Array.isArray(val)) {
        if (val.length === 0) return "unknown[]";
        const itemType = getType(val[0], `${keyHint}Item`);
        return `${itemType}[]`;
      }
      if (typeof val === "object") {
        const interfaceName = capitalize(keyHint);
        generateInterface(val as Record<string, unknown>, interfaceName);
        return interfaceName;
      }
      return typeof val;
    }

    function generateInterface(obj: Record<string, unknown>, name: string) {
      if (interfaces.has(name)) return;
      const lines: string[] = [];
      lines.push(`export interface ${name} {`);
      for (const [k, v] of Object.entries(obj)) {
        const validIdentifier = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k);
        const propName = validIdentifier ? k : JSON.stringify(k);
        const propType = getType(v, k);
        lines.push(`  ${propName}: ${propType};`);
      }
      lines.push(`}`);
      interfaces.set(name, lines.join("\n"));
    }

    if (Array.isArray(data)) {
      if (data.length === 0) {
        return { ok: true, code: `export type ${rootName} = unknown[];` };
      }
      const itemType = getType(data[0], `${rootName}Item`);
      const body = Array.from(interfaces.values()).reverse().join("\n\n");
      return { ok: true, code: `${body}\n\nexport type ${rootName} = ${itemType}[];`.trim() };
    } else if (typeof data === "object" && data !== null) {
      generateInterface(data as Record<string, unknown>, rootName);
      const body = Array.from(interfaces.values()).reverse().join("\n\n");
      return { ok: true, code: body };
    } else {
      return { ok: true, code: `export type ${rootName} = ${typeof data};` };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function base64Encode(input: string, urlSafe = false): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  const b64 = btoa(binary);
  if (urlSafe) {
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  return b64;
}

export function base64Decode(input: string): string {
  let normalized = input.trim();
  normalized = normalized.replace(/-/g, "+").replace(/_/g, "/");
  while (normalized.length % 4 !== 0) {
    normalized += "=";
  }
  const binary = atob(normalized);
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

export type UrlParam = {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
};

export type UrlDetails = {
  valid: boolean;
  protocol: string;
  hostname: string;
  port: string;
  pathname: string;
  hash: string;
  params: UrlParam[];
  error?: string;
};

export function parseUrlDetails(rawUrl: string): UrlDetails {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return {
      valid: false,
      protocol: "https:",
      hostname: "",
      port: "",
      pathname: "/",
      hash: "",
      params: [],
    };
  }
  try {
    const urlStr = trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;
    const url = new URL(urlStr);
    const params: UrlParam[] = [];
    url.searchParams.forEach((value, key) => {
      params.push({
        id: Math.random().toString(36).slice(2, 9),
        key,
        value,
        enabled: true,
      });
    });
    return {
      valid: true,
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port,
      pathname: url.pathname,
      hash: url.hash,
      params,
    };
  } catch (err) {
    return {
      valid: false,
      protocol: "https:",
      hostname: "",
      port: "",
      pathname: "/",
      hash: "",
      params: [],
      error: err instanceof Error ? err.message : "Invalid URL",
    };
  }
}

export function reconstructUrl(details: {
  protocol: string;
  hostname: string;
  port?: string;
  pathname: string;
  params: UrlParam[];
  hash?: string;
}): string {
  if (!details.hostname) return "";
  try {
    const host = details.port ? `${details.hostname}:${details.port}` : details.hostname;
    const proto = details.protocol.endsWith(":") ? details.protocol : `${details.protocol}:`;
    const path = details.pathname.startsWith("/") ? details.pathname : `/${details.pathname}`;
    const url = new URL(`${proto}//${host}${path}`);
    for (const p of details.params) {
      if (p.enabled && p.key) {
        url.searchParams.append(p.key, p.value);
      }
    }
    if (details.hash) {
      url.hash = details.hash.startsWith("#") ? details.hash : `#${details.hash}`;
    }
    return url.toString();
  } catch {
    return "";
  }
}

export type EnhancedJwtDecoded = {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  isExpired: boolean | null;
  expiresInSeconds: number | null;
  issuedAt: Date | null;
  notBefore: Date | null;
};

/** Decodes a JWT's header + payload with expiry analysis without verifying the signature. */
export function decodeJwt(token: string): EnhancedJwtDecoded {
  const parts = token.trim().split(".");
  if (parts.length < 2) throw new Error("Not a valid JWT (requires header.payload.[signature])");
  const decodePart = (part: string): Record<string, unknown> => {
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    return JSON.parse(base64Decode(padded)) as Record<string, unknown>;
  };

  const header = decodePart(parts[0]);
  const payload = decodePart(parts[1]);
  const signature = parts[2] ?? "";

  let isExpired: boolean | null = null;
  let expiresInSeconds: number | null = null;
  let issuedAt: Date | null = null;
  let notBefore: Date | null = null;

  if (typeof payload === "object" && payload !== null) {
    if (typeof payload.exp === "number") {
      const expMs = payload.exp * (payload.exp < 1e12 ? 1000 : 1);
      const diff = Math.floor((expMs - Date.now()) / 1000);
      expiresInSeconds = diff;
      isExpired = diff <= 0;
    }
    if (typeof payload.iat === "number") {
      issuedAt = new Date(payload.iat * (payload.iat < 1e12 ? 1000 : 1));
    }
    if (typeof payload.nbf === "number") {
      notBefore = new Date(payload.nbf * (payload.nbf < 1e12 ? 1000 : 1));
    }
  }

  return {
    header,
    payload,
    signature,
    isExpired,
    expiresInSeconds,
    issuedAt,
    notBefore,
  };
}

export type HashAlgo = "SHA-1" | "SHA-256" | "SHA-512";

export async function hashText(
  input: string,
  algo: HashAlgo,
  uppercase = false,
): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest(algo, data);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return uppercase ? hex.toUpperCase() : hex.toLowerCase();
}

/** Pure JavaScript standard MD5 (RFC 1321). Zero external dependencies. */
export function md5(input: string, uppercase = false): string {
  function safeAdd(x: number, y: number): number {
    const lsw = (x & 0xffff) + (y & 0xffff);
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xffff);
  }

  function bitRol(num: number, cnt: number): number {
    return (num << cnt) | (num >>> (32 - cnt));
  }

  function md5cmn(q: number, a: number, b: number, x: number, s: number, t: number): number {
    return safeAdd(bitRol(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
  }

  function md5ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return md5cmn((b & c) | (~b & d), a, b, x, s, t);
  }

  function md5gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return md5cmn((b & d) | (c & ~d), a, b, x, s, t);
  }

  function md5hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return md5cmn(b ^ c ^ d, a, b, x, s, t);
  }

  function md5ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return md5cmn(c ^ (b | ~d), a, b, x, s, t);
  }

  function strToWordArray(str: string): number[] {
    const bytes: number[] = [];
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code < 128) {
        bytes.push(code);
      } else if (code < 2048) {
        bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
      } else if (code < 55296 || code >= 57344) {
        bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
      } else {
        i++;
        const code2 = 0x10000 + (((code & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
        bytes.push(
          0xf0 | (code2 >> 18),
          0x80 | ((code2 >> 12) & 0x3f),
          0x80 | ((code2 >> 6) & 0x3f),
          0x80 | (code2 & 0x3f),
        );
      }
    }
    const words: number[] = [];
    for (let i = 0; i < bytes.length * 8; i += 8) {
      words[i >> 5] |= (bytes[i / 8] & 0xff) << (i % 32);
    }
    return words;
  }

  const utf8Len = new TextEncoder().encode(input).length;
  const x = strToWordArray(input);
  const len = utf8Len * 8;

  x[len >> 5] |= 0x80 << (len % 32);
  x[(((len + 64) >>> 9) << 4) + 14] = len;

  let a = 1732584193;
  let b = -271733879;
  let c = -1732584194;
  let d = 271733878;

  for (let i = 0; i < x.length; i += 16) {
    const olda = a;
    const oldb = b;
    const oldc = c;
    const oldd = d;

    a = md5ff(a, b, c, d, x[i + 0] || 0, 7, -680876936);
    d = md5ff(d, a, b, c, x[i + 1] || 0, 12, -389564586);
    c = md5ff(c, d, a, b, x[i + 2] || 0, 17, 606105819);
    b = md5ff(b, c, d, a, x[i + 3] || 0, 22, -1044525330);
    a = md5ff(a, b, c, d, x[i + 4] || 0, 7, -176418897);
    d = md5ff(d, a, b, c, x[i + 5] || 0, 12, 1200080426);
    c = md5ff(c, d, a, b, x[i + 6] || 0, 17, -1473231341);
    b = md5ff(b, c, d, a, x[i + 7] || 0, 22, -45705983);
    a = md5ff(a, b, c, d, x[i + 8] || 0, 7, 1770035416);
    d = md5ff(d, a, b, c, x[i + 9] || 0, 12, -1958414417);
    c = md5ff(c, d, a, b, x[i + 10] || 0, 17, -42063);
    b = md5ff(b, c, d, a, x[i + 11] || 0, 22, -1990404162);
    a = md5ff(a, b, c, d, x[i + 12] || 0, 7, 1804603682);
    d = md5ff(d, a, b, c, x[i + 13] || 0, 12, -40341101);
    c = md5ff(c, d, a, b, x[i + 14] || 0, 17, -1502002290);
    b = md5ff(b, c, d, a, x[i + 15] || 0, 22, 1236535329);

    a = md5gg(a, b, c, d, x[i + 1] || 0, 5, -165796510);
    d = md5gg(d, a, b, c, x[i + 6] || 0, 9, -1069501632);
    c = md5gg(c, d, a, b, x[i + 11] || 0, 14, 643717713);
    b = md5gg(b, c, d, a, x[i + 0] || 0, 20, -373897302);
    a = md5gg(a, b, c, d, x[i + 5] || 0, 5, -701558691);
    d = md5gg(d, a, b, c, x[i + 10] || 0, 9, 38016083);
    c = md5gg(c, d, a, b, x[i + 15] || 0, 14, -660478335);
    b = md5gg(b, c, d, a, x[i + 4] || 0, 20, -405537848);
    a = md5gg(a, b, c, d, x[i + 9] || 0, 5, 568446438);
    d = md5gg(d, a, b, c, x[i + 14] || 0, 9, -1019803690);
    c = md5gg(c, d, a, b, x[i + 3] || 0, 14, -187363961);
    b = md5gg(b, c, d, a, x[i + 8] || 0, 20, 1163531501);
    a = md5gg(a, b, c, d, x[i + 13] || 0, 5, -1444681467);
    d = md5gg(d, a, b, c, x[i + 2] || 0, 9, -51403784);
    c = md5gg(c, d, a, b, x[i + 7] || 0, 14, 1735328473);
    b = md5gg(b, c, d, a, x[i + 12] || 0, 20, -1926607734);

    a = md5hh(a, b, c, d, x[i + 5] || 0, 4, -378558);
    d = md5hh(d, a, b, c, x[i + 8] || 0, 11, -2022574463);
    c = md5hh(c, d, a, b, x[i + 11] || 0, 16, 1839030562);
    b = md5hh(b, c, d, a, x[i + 14] || 0, 23, -35309556);
    a = md5hh(a, b, c, d, x[i + 1] || 0, 4, -1530992060);
    d = md5hh(d, a, b, c, x[i + 4] || 0, 11, 1272893353);
    c = md5hh(c, d, a, b, x[i + 7] || 0, 16, -155497632);
    b = md5hh(b, c, d, a, x[i + 10] || 0, 23, -1094730640);
    a = md5hh(a, b, c, d, x[i + 13] || 0, 4, 681279174);
    d = md5hh(d, a, b, c, x[i + 0] || 0, 11, -358537222);
    c = md5hh(c, d, a, b, x[i + 3] || 0, 16, -722521979);
    b = md5hh(b, c, d, a, x[i + 6] || 0, 23, 76029189);
    a = md5hh(a, b, c, d, x[i + 9] || 0, 4, -640364487);
    d = md5hh(d, a, b, c, x[i + 12] || 0, 11, -421815835);
    c = md5hh(c, d, a, b, x[i + 15] || 0, 16, 530742520);
    b = md5hh(b, c, d, a, x[i + 2] || 0, 23, -995338651);

    a = md5ii(a, b, c, d, x[i + 0] || 0, 6, -198630844);
    d = md5ii(d, a, b, c, x[i + 7] || 0, 10, 1126891415);
    c = md5ii(c, d, a, b, x[i + 14] || 0, 15, -1416354905);
    b = md5ii(b, c, d, a, x[i + 5] || 0, 21, -57434055);
    a = md5ii(a, b, c, d, x[i + 12] || 0, 6, 1700485571);
    d = md5ii(d, a, b, c, x[i + 3] || 0, 10, -1894986606);
    c = md5ii(c, d, a, b, x[i + 10] || 0, 15, -1051523);
    b = md5ii(b, c, d, a, x[i + 1] || 0, 21, -2054922799);
    a = md5ii(a, b, c, d, x[i + 8] || 0, 6, 1873313359);
    d = md5ii(d, a, b, c, x[i + 15] || 0, 10, -30611744);
    c = md5ii(c, d, a, b, x[i + 6] || 0, 15, -1560198380);
    b = md5ii(b, c, d, a, x[i + 13] || 0, 21, 1309151649);
    a = md5ii(a, b, c, d, x[i + 4] || 0, 6, -145523070);
    d = md5ii(d, a, b, c, x[i + 11] || 0, 10, -1120210379);
    c = md5ii(c, d, a, b, x[i + 2] || 0, 15, 718787259);
    b = md5ii(b, c, d, a, x[i + 9] || 0, 21, -343485551);

    a = safeAdd(a, olda);
    b = safeAdd(b, oldb);
    c = safeAdd(c, oldc);
    d = safeAdd(d, oldd);
  }

  const hexChars = "0123456789abcdef";
  let hex = "";
  const words = [a, b, c, d];
  for (let i = 0; i < words.length * 32; i += 8) {
    hex +=
      hexChars.charAt((words[i >> 5] >>> (i % 32 + 4)) & 0x0f) +
      hexChars.charAt((words[i >> 5] >>> (i % 32)) & 0x0f);
  }
  return uppercase ? hex.toUpperCase() : hex.toLowerCase();
}

/** HMAC generator with Web Crypto API */
export async function hmacText(
  input: string,
  secret: string,
  algo: "SHA-256" | "SHA-512" = "SHA-256",
  uppercase = false,
): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: { name: algo } },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(input));
  const hex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return uppercase ? hex.toUpperCase() : hex.toLowerCase();
}

export function generateUuidV4(): string {
  return crypto.randomUUID();
}

/** Timestamp-based UUID v7 */
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

export function generateUuidBatch(
  count: number,
  options: { version?: "v4" | "v7"; uppercase?: boolean; noHyphen?: boolean; braces?: boolean } = {},
): string[] {
  const n = Math.min(Math.max(1, count), 100);
  const list: string[] = [];
  for (let i = 0; i < n; i++) {
    let id = options.version === "v7" ? generateUuidV7() : generateUuidV4();
    if (options.noHyphen) id = id.replace(/-/g, "");
    if (options.uppercase) id = id.toUpperCase();
    if (options.braces) id = `{${id}}`;
    list.push(id);
  }
  return list;
}

export function generateNanoId(
  size = 21,
  alphabet = "useandom-26T1983_40STabckfgijlmopqrvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
): string {
  const len = Math.max(4, Math.min(size, 64));
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let id = "";
  for (let i = 0; i < len; i++) {
    id += alphabet[bytes[i] % alphabet.length];
  }
  return id;
}

export type RegexMatch = {
  match: string;
  index: number;
  groups: string[];
};

export function testRegex(pattern: string, flags: string, text: string): RegexMatch[] {
  const safeFlags = flags.includes("g") ? flags : `${flags}g`;
  const re = new RegExp(pattern, safeFlags);
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

export function replaceRegex(
  pattern: string,
  flags: string,
  text: string,
  replacement: string,
): { ok: true; result: string } | { ok: false; error: string } {
  try {
    const re = new RegExp(pattern, flags);
    return { ok: true, result: text.replace(re, replacement) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export const COMMON_REGEX_PRESETS = [
  { name: "Email", pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", flags: "g" },
  { name: "URL", pattern: "https?:\\/\\/(?:www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b(?:[-a-zA-Z0-9()@:%_\\+.~#?&//=]*)", flags: "g" },
  { name: "IPv4", pattern: "^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$", flags: "g" },
  { name: "Phone (VN)", pattern: "^(?:\\+84|0)(?:3[2-9]|5[689]|7[06-9]|8[1-5]|9[0-9])[0-9]{7}$", flags: "g" },
  { name: "Hex Color", pattern: "^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$", flags: "g" },
  { name: "Date (YYYY-MM-DD)", pattern: "^\\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\d|3[01])$", flags: "g" },
  { name: "Slug", pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$", flags: "g" },
  { name: "Strong Password", pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$", flags: "g" },
];

export function formatTimestampLocal(timestamp: number, isMs = false): string {
  const ms = isMs ? timestamp : timestamp * (Math.abs(timestamp) < 1e12 ? 1000 : 1);
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "Invalid Date";
  return d.toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
}

export function getRelativeTime(timestamp: number, locale: "vi" | "en" = "vi", isMs = false): string {
  const ms = isMs ? timestamp : timestamp * (Math.abs(timestamp) < 1e12 ? 1000 : 1);
  const diffSec = Math.floor((ms - Date.now()) / 1000);
  const absSec = Math.abs(diffSec);

  const rtf = new Intl.RelativeTimeFormat(locale === "vi" ? "vi-VN" : "en-US", { numeric: "auto" });

  if (absSec < 60) return rtf.format(diffSec, "second");
  if (absSec < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (absSec < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (absSec < 2592000) return rtf.format(Math.round(diffSec / 86400), "day");
  if (absSec < 31536000) return rtf.format(Math.round(diffSec / 2592000), "month");
  return rtf.format(Math.round(diffSec / 31536000), "year");
}

export const WORLD_TIMEZONES = [
  { label: "UTC / GMT", zone: "UTC" },
  { label: "Vietnam (ICT, UTC+7)", zone: "Asia/Ho_Chi_Minh" },
  { label: "Tokyo (JST, UTC+9)", zone: "Asia/Tokyo" },
  { label: "London (GMT/BST)", zone: "Europe/London" },
  { label: "New York (EST/EDT)", zone: "America/New_York" },
  { label: "Los Angeles (PST/PDT)", zone: "America/Los_Angeles" },
];

export function encodeHtmlEntities(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
  };
  return text.replace(/&(?:amp|lt|gt|quot|#39|apos|nbsp);/g, (match) => entities[match] || match);
}

export type CaseType =
  | "camel"
  | "pascal"
  | "snake"
  | "kebab"
  | "constant"
  | "title"
  | "upper"
  | "lower";

export function convertCase(text: string, toCase: CaseType): string {
  const words = text
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_\-./\\]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "";

  switch (toCase) {
    case "camel":
      return words
        .map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
        .join("");
    case "pascal":
      return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("");
    case "snake":
      return words.map((w) => w.toLowerCase()).join("_");
    case "kebab":
      return words.map((w) => w.toLowerCase()).join("-");
    case "constant":
      return words.map((w) => w.toUpperCase()).join("_");
    case "title":
      return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    case "upper":
      return text.toUpperCase();
    case "lower":
      return text.toLowerCase();
  }
}

export type CssUnit = "px" | "rem" | "em" | "pt";

export function convertCssUnits(
  value: number,
  from: CssUnit,
  to: CssUnit,
  basePx = 16,
): number {
  if (from === to) return value;
  let px = value;
  if (from === "rem" || from === "em") {
    px = value * basePx;
  } else if (from === "pt") {
    px = value * (4 / 3);
  }

  if (to === "px") return px;
  if (to === "rem" || to === "em") return px / basePx;
  if (to === "pt") return px * (3 / 4);
  return px;
}

const LOREM_WORDS = [
  "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit",
  "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore",
  "magna", "aliqua", "enim", "ad", "minim", "veniam", "quis", "nostrud",
  "exercitation", "ullamco", "laboris", "nisi", "aliquip", "ex", "ea", "commodo",
  "consequat", "duis", "aute", "irure", "in", "reprehenderit", "voluptate", "velit",
  "esse", "cillum", "fugiat", "nulla", "pariatur", "excepteur", "sint", "occaecat",
  "cupidatat", "non", "proident", "sunt", "culpa", "qui", "officia", "deserunt",
  "mollit", "anim", "id", "est", "laborum",
];

export function generateLoremIpsum(
  count: number,
  type: "paragraphs" | "sentences" | "words" = "paragraphs",
): string {
  const safeCount = Math.max(1, Math.min(count, 100));

  function getWord() {
    return LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)];
  }

  function getSentence(len = 8 + Math.floor(Math.random() * 8)) {
    const words = Array.from({ length: len }, getWord);
    words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
    return `${words.join(" ")}.`;
  }

  function getParagraph(sentencesCount = 4 + Math.floor(Math.random() * 3)) {
    return Array.from({ length: sentencesCount }, () => getSentence()).join(" ");
  }

  if (type === "words") {
    return Array.from({ length: safeCount }, getWord).join(" ");
  }
  if (type === "sentences") {
    return Array.from({ length: safeCount }, () => getSentence()).join(" ");
  }
  return Array.from({ length: safeCount }, () => getParagraph()).join("\n\n");
}
