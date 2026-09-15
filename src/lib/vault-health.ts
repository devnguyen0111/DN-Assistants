/** Simple password strength for vault health badges. */
export function passwordStrength(pw: string): "weak" | "ok" {
  if (pw.length < 10) return "weak";
  const classes =
    (/[a-z]/.test(pw) ? 1 : 0) +
    (/[A-Z]/.test(pw) ? 1 : 0) +
    (/[0-9]/.test(pw) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(pw) ? 1 : 0);
  if (classes < 3) return "weak";
  return "ok";
}

/** Entry ids that share a non-empty password with at least one other entry. */
export function findReusedPasswords(
  entries: { id: string; password: string }[],
): Set<string> {
  const byPassword = new Map<string, string[]>();
  for (const entry of entries) {
    if (!entry.password) continue;
    const list = byPassword.get(entry.password) ?? [];
    list.push(entry.id);
    byPassword.set(entry.password, list);
  }
  const reused = new Set<string>();
  for (const ids of byPassword.values()) {
    if (ids.length < 2) continue;
    for (const id of ids) reused.add(id);
  }
  return reused;
}

async function sha1Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

/**
 * Have I Been Pwned range API (k-anonymity): only the first 5 SHA-1 hex chars are sent.
 */
export async function checkHibp(password: string): Promise<{ count: number }> {
  if (!password) return { count: 0 };
  const hash = await sha1Hex(password);
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);
  const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    headers: { "Add-Padding": "true" },
  });
  if (!res.ok) {
    throw new Error(`HIBP request failed (${res.status})`);
  }
  const body = await res.text();
  for (const line of body.split("\n")) {
    const [hashSuffix, countStr] = line.trim().split(":");
    if (!hashSuffix || !countStr) continue;
    if (hashSuffix.toUpperCase() === suffix) {
      return { count: Number.parseInt(countStr, 10) || 0 };
    }
  }
  return { count: 0 };
}
