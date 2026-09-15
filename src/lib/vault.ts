import Database from "@tauri-apps/plugin-sql";
import {
  createVaultMeta,
  decryptString,
  encryptString,
  generatePassword,
  verifyMasterPassword,
  type PasswordGeneratorOptions,
} from "@/lib/vault-crypto";

export type VaultEntryPayload = {
  title: string;
  url: string;
  username: string;
  password: string;
  note: string;
  totpSecret?: string;
};

export type VaultEntry = VaultEntryPayload & {
  id: string;
  created_at: string;
  updated_at: string;
};

type VaultRow = {
  id: string;
  nonce: string;
  ciphertext: string;
  created_at: string;
  updated_at: string;
};

export type VaultMeta = {
  salt: string;
  verifierNonce: string;
  verifierCiphertext: string;
  iterations: number;
};

const DB_URL = "sqlite:dn-assistant.db";
const META_STORE = "vault-meta.json";
const META_KEY = "meta";

let dbPromise: Promise<Database> | null = null;
let vaultKey: CryptoKey | null = null;
let cache: VaultEntry[] | null = null;

async function getDb() {
  if (!dbPromise) {
    dbPromise = Database.load(DB_URL);
  }
  return dbPromise;
}

type StoreLike = {
  get: <T>(key: string) => Promise<T | undefined>;
  set: (key: string, value: unknown) => Promise<void>;
  save: () => Promise<void>;
};

async function getMetaStore(): Promise<StoreLike | null> {
  try {
    const { Store } = await import("@tauri-apps/plugin-store");
    return await Store.load(META_STORE);
  } catch {
    return null;
  }
}

function notifyChanged() {
  window.dispatchEvent(new Event("dn-vault-changed"));
}

function newId() {
  return crypto.randomUUID();
}

export function isVaultUnlocked(): boolean {
  return vaultKey !== null;
}

export function getCachedEntries(): VaultEntry[] {
  return cache ? [...cache] : [];
}

export async function loadVaultMeta(): Promise<VaultMeta | null> {
  const store = await getMetaStore();
  if (!store) {
    try {
      const raw = localStorage.getItem("dn-vault-meta");
      return raw ? (JSON.parse(raw) as VaultMeta) : null;
    } catch {
      return null;
    }
  }
  return (await store.get<VaultMeta>(META_KEY)) ?? null;
}

async function saveVaultMeta(meta: VaultMeta): Promise<void> {
  const store = await getMetaStore();
  if (!store) {
    localStorage.setItem("dn-vault-meta", JSON.stringify(meta));
    return;
  }
  await store.set(META_KEY, meta);
  await store.save();
}

export async function hasVault(): Promise<boolean> {
  return (await loadVaultMeta()) != null;
}

export async function setupVault(password: string): Promise<void> {
  if (await hasVault()) {
    throw new Error("Vault already exists");
  }
  if (password.length < 8) {
    throw new Error("Master password must be at least 8 characters");
  }
  const meta = await createVaultMeta(password);
  await saveVaultMeta(meta);
  vaultKey = await verifyMasterPassword(password, meta);
  if (!vaultKey) throw new Error("Failed to initialize vault");
  cache = [];
  notifyChanged();
}

export async function unlockVault(password: string): Promise<boolean> {
  const meta = await loadVaultMeta();
  if (!meta) throw new Error("Vault is not set up");
  const key = await verifyMasterPassword(password, meta);
  if (!key) return false;
  vaultKey = key;
  await reloadCache();
  notifyChanged();
  return true;
}

export function lockVault(): void {
  vaultKey = null;
  cache = null;
  notifyChanged();
}

async function requireKey(): Promise<CryptoKey> {
  if (!vaultKey) throw new Error("Vault is locked");
  return vaultKey;
}

async function decryptRow(key: CryptoKey, row: VaultRow): Promise<VaultEntry> {
  const json = await decryptString(key, row.nonce, row.ciphertext);
  const payload = JSON.parse(json) as VaultEntryPayload;
  return {
    id: row.id,
    title: payload.title ?? "",
    url: payload.url ?? "",
    username: payload.username ?? "",
    password: payload.password ?? "",
    note: payload.note ?? "",
    totpSecret: payload.totpSecret ?? "",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function reloadCache(): Promise<VaultEntry[]> {
  const key = await requireKey();
  const db = await getDb();
  const rows = await db.select<VaultRow[]>(
    "SELECT * FROM vault_entries ORDER BY updated_at DESC",
  );
  const entries: VaultEntry[] = [];
  for (const row of rows) {
    try {
      entries.push(await decryptRow(key, row));
    } catch {
      // skip corrupt rows
    }
  }
  cache = entries;
  return entries;
}

export async function listVaultEntries(): Promise<VaultEntry[]> {
  if (!vaultKey) return [];
  if (cache) return [...cache];
  return reloadCache();
}

export function searchVaultEntries(query: string, entries?: VaultEntry[]): VaultEntry[] {
  const list = entries ?? cache ?? [];
  const q = query.trim().toLowerCase();
  if (!q) return [...list];
  return list.filter(
    (e) =>
      e.title.toLowerCase().includes(q) ||
      e.url.toLowerCase().includes(q) ||
      e.username.toLowerCase().includes(q) ||
      e.note.toLowerCase().includes(q),
  );
}

export async function createVaultEntry(
  input: VaultEntryPayload,
): Promise<VaultEntry> {
  const key = await requireKey();
  const db = await getDb();
  const now = new Date().toISOString();
  const payload: VaultEntryPayload = {
    title: input.title.trim(),
    url: input.url.trim(),
    username: input.username.trim(),
    password: input.password,
    note: input.note.trim(),
    totpSecret: (input.totpSecret ?? "").trim().replace(/\s+/g, ""),
  };
  const { nonce, ciphertext } = await encryptString(key, JSON.stringify(payload));
  const entry: VaultEntry = {
    id: newId(),
    ...payload,
    totpSecret: payload.totpSecret ?? "",
    created_at: now,
    updated_at: now,
  };
  await db.execute(
    `INSERT INTO vault_entries (id, nonce, ciphertext, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [entry.id, nonce, ciphertext, entry.created_at, entry.updated_at],
  );
  cache = [entry, ...(cache ?? [])];
  notifyChanged();
  return entry;
}

export async function updateVaultEntry(
  id: string,
  input: VaultEntryPayload,
): Promise<void> {
  const key = await requireKey();
  const db = await getDb();
  const now = new Date().toISOString();
  const payload: VaultEntryPayload = {
    title: input.title.trim(),
    url: input.url.trim(),
    username: input.username.trim(),
    password: input.password,
    note: input.note.trim(),
    totpSecret: (input.totpSecret ?? "").trim().replace(/\s+/g, ""),
  };
  const { nonce, ciphertext } = await encryptString(key, JSON.stringify(payload));
  await db.execute(
    `UPDATE vault_entries SET nonce = $1, ciphertext = $2, updated_at = $3 WHERE id = $4`,
    [nonce, ciphertext, now, id],
  );
  if (cache) {
    cache = cache.map((e) =>
      e.id === id ? { ...e, ...payload, updated_at: now } : e,
    );
  }
  notifyChanged();
}

export async function deleteVaultEntry(id: string): Promise<void> {
  await requireKey();
  const db = await getDb();
  await db.execute("DELETE FROM vault_entries WHERE id = $1", [id]);
  if (cache) cache = cache.filter((e) => e.id !== id);
  notifyChanged();
}

export function makePassword(opts?: Partial<PasswordGeneratorOptions>): string {
  return generatePassword({
    length: opts?.length ?? 20,
    lowercase: opts?.lowercase ?? true,
    uppercase: opts?.uppercase ?? true,
    digits: opts?.digits ?? true,
    symbols: opts?.symbols ?? true,
  });
}

export function entryHost(url: string): string {
  try {
    if (!url) return "";
    const withProto = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    return new URL(withProto).hostname;
  } catch {
    return url;
  }
}

/** Dedup key used for Google CSV import. */
export function entryDedupKey(url: string, username: string): string {
  return `${url.trim().toLowerCase()}|${username.trim().toLowerCase()}`;
}
