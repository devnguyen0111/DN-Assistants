import { emitChange, getDb, type DataTopic } from "@/lib/db";
import { deriveVaultKey, encryptString, decryptString, randomBytes } from "@/lib/vault-crypto";
import {
  DEVICE_SETTINGS,
  exportableSettings,
  loadSettings,
  saveSettings,
  type AppSettings,
} from "@/lib/settings";
import { listEvents, upsertEventFromImport, type CalendarEvent } from "@/lib/events";
import { listNotes, upsertNote, type Note } from "@/lib/notes";
import { listTodos, upsertTodo, type Todo } from "@/lib/todos";
import {
  listHabits,
  getHabitLogs,
  upsertHabit,
  upsertHabitLog,
  type Habit,
  type HabitLog,
} from "@/lib/habits";
import { listSnippets, upsertSnippet, type Snippet } from "@/lib/snippets";
import { listAllSessions, upsertFocusSession, type FocusSession } from "@/lib/focus";
import {
  listPinnedTextItems,
  upsertPinnedTextItem,
  type ClipboardItem,
} from "@/lib/clipboard-history";
import { loadVaultMeta, lockVault, type VaultMeta } from "@/lib/vault";

/**
 * v1: settings/events/notes/todos/vault · v2: + habits, snippets
 * v3: + focus sessions, pinned clipboard text; device-only settings are no longer exported.
 */
const BACKUP_VERSION = 3;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

type VaultEntryRow = {
  id: string;
  nonce: string;
  ciphertext: string;
  created_at: string;
  updated_at: string;
};

export type BackupPayload = {
  version: number;
  exportedAt: string;
  settings: Partial<AppSettings>;
  events: CalendarEvent[];
  notes: Note[];
  todos: Todo[];
  habits?: Habit[];
  habit_logs?: HabitLog[];
  snippets?: Snippet[];
  focus_sessions?: FocusSession[];
  clipboard_pinned?: ClipboardItem[];
  vault_entries: VaultEntryRow[];
  vaultMeta: VaultMeta | null;
};

export type BackupSummary = {
  version: number;
  exportedAt: string;
  events: number;
  notes: number;
  todos: number;
  habits: number;
  snippets: number;
  focusSessions: number;
  clipboardPinned: number;
  vaultEntries: number;
  hasVault: boolean;
};

type EncryptedBackupFile = {
  version: number;
  salt: string;
  nonce: string;
  ciphertext: string;
};

async function listVaultEntryRows(): Promise<VaultEntryRow[]> {
  const db = await getDb();
  return db.select<VaultEntryRow[]>("SELECT * FROM vault_entries ORDER BY updated_at DESC");
}

async function replaceVaultEntries(rows: VaultEntryRow[]): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM vault_entries");
  for (const row of rows) {
    await db.execute(
      `INSERT INTO vault_entries (id, nonce, ciphertext, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [row.id, row.nonce, row.ciphertext, row.created_at, row.updated_at],
    );
  }
}

async function saveVaultMeta(meta: VaultMeta): Promise<void> {
  try {
    const { Store } = await import("@tauri-apps/plugin-store");
    const store = await Store.load("vault-meta.json");
    await store.set("meta", meta);
    await store.save();
  } catch {
    localStorage.setItem("dn-vault-meta", JSON.stringify(meta));
  }
}

/** Snapshot of everything a backup carries. */
export async function collectBackupPayload(): Promise<BackupPayload> {
  const [settings, events, notes, todos, habits, habitLogs, snippets, focus, pinned, vault, meta] =
    await Promise.all([
      loadSettings(),
      listEvents(),
      listNotes(),
      listTodos(),
      listHabits(),
      getHabitLogs(),
      listSnippets(),
      listAllSessions(),
      listPinnedTextItems(),
      listVaultEntryRows(),
      loadVaultMeta(),
    ]);
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    settings: exportableSettings(settings),
    events,
    notes,
    todos,
    habits,
    habit_logs: habitLogs,
    snippets,
    focus_sessions: focus,
    clipboard_pinned: pinned,
    vault_entries: vault,
    vaultMeta: meta,
  };
}

/** Serialize + encrypt a payload into the `.dnbackup` file text. */
export async function encryptBackup(payload: BackupPayload, password: string): Promise<string> {
  if (!password.trim()) throw new Error("Backup password required");
  const salt = bytesToBase64(randomBytes(16));
  const key = await deriveVaultKey(password, salt);
  const { nonce, ciphertext } = await encryptString(key, JSON.stringify(payload));
  const file: EncryptedBackupFile = { version: BACKUP_VERSION, salt, nonce, ciphertext };
  return JSON.stringify(file, null, 2);
}

/** Ask for a destination and write an encrypted backup. Returns false if cancelled. */
export async function exportEncryptedBackup(password: string): Promise<boolean> {
  const text = await encryptBackup(await collectBackupPayload(), password);
  const { save } = await import("@tauri-apps/plugin-dialog");
  const { writeTextFile } = await import("@tauri-apps/plugin-fs");
  const stamp = new Date().toISOString().slice(0, 10);
  const path = await save({
    defaultPath: `dn-assistant-backup-${stamp}.dnbackup`,
    filters: [{ name: "DN Backup", extensions: ["dnbackup"] }],
  });
  if (!path) return false;
  await writeTextFile(path, text);
  return true;
}

function isArray(v: unknown): v is unknown[] {
  return Array.isArray(v);
}

/** Decrypt and validate a backup without touching any data. */
export async function decryptBackup(raw: string, password: string): Promise<BackupPayload> {
  let file: EncryptedBackupFile;
  try {
    file = JSON.parse(raw) as EncryptedBackupFile;
  } catch {
    throw new Error("Invalid backup file");
  }
  if (!file.salt || !file.nonce || !file.ciphertext) throw new Error("Invalid backup file");
  const key = await deriveVaultKey(password, file.salt);
  let plain: string;
  try {
    plain = await decryptString(key, file.nonce, file.ciphertext);
  } catch {
    throw new Error("Wrong password or corrupted backup");
  }
  const data = JSON.parse(plain) as BackupPayload;
  if (!isArray(data.events) || !isArray(data.notes) || !isArray(data.todos)) {
    throw new Error("Backup is missing required sections");
  }
  if (data.version > BACKUP_VERSION) {
    throw new Error(`Backup v${data.version} was made by a newer app version — update first`);
  }
  return data;
}

export function summarizeBackup(data: BackupPayload): BackupSummary {
  return {
    version: data.version,
    exportedAt: data.exportedAt,
    events: data.events.length,
    notes: data.notes.length,
    todos: data.todos.length,
    habits: data.habits?.length ?? 0,
    snippets: data.snippets?.length ?? 0,
    focusSessions: data.focus_sessions?.length ?? 0,
    clipboardPinned: data.clipboard_pinned?.length ?? 0,
    vaultEntries: data.vaultMeta ? (data.vault_entries?.length ?? 0) : 0,
    hasVault: Boolean(data.vaultMeta),
  };
}

/** Ask for a `.dnbackup` file and decrypt it. Returns null if the user cancelled. */
export async function pickAndDecryptBackup(
  password: string,
): Promise<{ payload: BackupPayload; summary: BackupSummary } | null> {
  if (!password.trim()) throw new Error("Backup password required");
  const { open } = await import("@tauri-apps/plugin-dialog");
  const { readTextFile } = await import("@tauri-apps/plugin-fs");
  const path = await open({
    multiple: false,
    filters: [{ name: "DN Backup", extensions: ["dnbackup"] }],
  });
  if (!path || typeof path !== "string") return null;
  const payload = await decryptBackup(await readTextFile(path), password);
  return { payload, summary: summarizeBackup(payload) };
}

async function writeRows(data: BackupPayload): Promise<void> {
  for (const event of data.events) await upsertEventFromImport(event);
  for (const note of data.notes) await upsertNote(note);
  for (const todo of data.todos) await upsertTodo(todo);
  for (const habit of data.habits ?? []) await upsertHabit(habit);
  for (const log of data.habit_logs ?? []) await upsertHabitLog(log);
  for (const snippet of data.snippets ?? []) await upsertSnippet(snippet);
  for (const session of data.focus_sessions ?? []) await upsertFocusSession(session);
  for (const item of data.clipboard_pinned ?? []) await upsertPinnedTextItem(item);

  // Entries are encrypted with the backup's master key, so entries and meta must be restored
  // together — and only when the backup has a vault (otherwise we'd wipe the current one).
  if (data.vaultMeta && isArray(data.vault_entries)) {
    lockVault();
    await replaceVaultEntries(data.vault_entries);
    await saveVaultMeta(data.vaultMeta);
  }
}

async function saveSafetySnapshot(snapshot: BackupPayload): Promise<void> {
  try {
    const { writeTextFile, mkdir, BaseDirectory } = await import("@tauri-apps/plugin-fs");
    await mkdir("restore-snapshots", { baseDir: BaseDirectory.AppData, recursive: true });
    const name = `restore-snapshots/before-restore-${Date.now()}.json`;
    await writeTextFile(name, JSON.stringify(snapshot), { baseDir: BaseDirectory.AppData });
  } catch {
    // best effort — the in-memory snapshot is still used for rollback
  }
}

/**
 * Merge a decrypted backup into local data. A snapshot of the current data is taken first
 * (kept in AppData/restore-snapshots); if any write fails, the snapshot is re-applied.
 */
export async function applyBackup(data: BackupPayload): Promise<BackupSummary> {
  const snapshot = await collectBackupPayload();
  await saveSafetySnapshot(snapshot);

  try {
    await writeRows(data);
    if (data.settings) {
      const current = await loadSettings();
      const keep: Partial<AppSettings> = {};
      for (const key of DEVICE_SETTINGS) (keep as Record<string, unknown>)[key] = current[key];
      await saveSettings({ ...data.settings, ...keep });
    }
  } catch (err) {
    try {
      await writeRows(snapshot);
    } catch {
      // keep the original error; the on-disk snapshot remains for manual recovery
    }
    throw err;
  } finally {
    const topics: DataTopic[] = [
      "events",
      "notes",
      "todos",
      "habits",
      "snippets",
      "focus",
      "clipboard",
      "vault",
    ];
    topics.forEach(emitChange);
  }
  return summarizeBackup(data);
}

/** Write an encrypted backup into `dir` (Rust side handles path + pruning old auto backups). */
export async function runAutoBackup(dir: string, password: string, keep: number): Promise<string> {
  const text = await encryptBackup(await collectBackupPayload(), password);
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<string>("write_auto_backup", { dir, contents: text, keep });
}
