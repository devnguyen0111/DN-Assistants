import Database from "@tauri-apps/plugin-sql";
import { deriveVaultKey, encryptString, decryptString, randomBytes } from "@/lib/vault-crypto";
import { loadSettings, saveSettings, type AppSettings } from "@/lib/settings";
import { listEvents, upsertEventFromImport, type CalendarEvent } from "@/lib/events";
import { listNotes, upsertNote, type Note } from "@/lib/notes";
import { listTodos, upsertTodo, type Todo } from "@/lib/todos";
import { listHabits, getHabitLogs, upsertHabit, upsertHabitLog, type Habit, type HabitLog } from "@/lib/habits";
import { listSnippets, upsertSnippet, type Snippet } from "@/lib/snippets";
import { loadVaultMeta, type VaultMeta } from "@/lib/vault";

const DB_URL = "sqlite:dn-assistant.db";
const BACKUP_VERSION = 2;

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

export type EncryptedBackupPayload = {
  version: number;
  exportedAt: string;
  settings: AppSettings;
  events: CalendarEvent[];
  notes: Note[];
  todos: Todo[];
  habits?: Habit[];
  habit_logs?: HabitLog[];
  snippets?: Snippet[];
  vault_entries: VaultEntryRow[];
  vaultMeta: VaultMeta | null;
};

type EncryptedBackupFile = {
  version: number;
  salt: string;
  nonce: string;
  ciphertext: string;
};

async function getDb() {
  return Database.load(DB_URL);
}

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

async function saveVaultMetaFromBackup(meta: VaultMeta | null): Promise<void> {
  if (!meta) return;
  try {
    const { Store } = await import("@tauri-apps/plugin-store");
    const store = await Store.load("vault-meta.json");
    await store.set("meta", meta);
    await store.save();
  } catch {
    localStorage.setItem("dn-vault-meta", JSON.stringify(meta));
  }
}

export async function exportEncryptedBackup(password: string): Promise<void> {
  if (!password.trim()) throw new Error("Backup password required");

  const { save } = await import("@tauri-apps/plugin-dialog");
  const { writeTextFile } = await import("@tauri-apps/plugin-fs");

  const payload: EncryptedBackupPayload = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    settings: await loadSettings(),
    events: await listEvents(),
    notes: await listNotes(),
    todos: await listTodos(),
    habits: await listHabits(),
    habit_logs: await getHabitLogs(),
    snippets: await listSnippets(),
    vault_entries: await listVaultEntryRows(),
    vaultMeta: await loadVaultMeta(),
  };

  const salt = bytesToBase64(randomBytes(16));
  const key = await deriveVaultKey(password, salt);
  const { nonce, ciphertext } = await encryptString(key, JSON.stringify(payload));

  const file: EncryptedBackupFile = {
    version: BACKUP_VERSION,
    salt,
    nonce,
    ciphertext,
  };

  const path = await save({
    defaultPath: "dn-assistant-backup.dnbackup",
    filters: [{ name: "DN Backup", extensions: ["dnbackup"] }],
  });
  if (!path) return;

  await writeTextFile(path, JSON.stringify(file, null, 2));
}

export async function restoreEncryptedBackup(password: string): Promise<{
  events: number;
  notes: number;
  todos: number;
  habits: number;
  snippets: number;
}> {
  if (!password.trim()) throw new Error("Backup password required");

  const { open } = await import("@tauri-apps/plugin-dialog");
  const { readTextFile } = await import("@tauri-apps/plugin-fs");

  const path = await open({
    multiple: false,
    filters: [{ name: "DN Backup", extensions: ["dnbackup"] }],
  });
  if (!path || typeof path !== "string") {
    return { events: 0, notes: 0, todos: 0, habits: 0, snippets: 0 };
  }

  const raw = await readTextFile(path);
  const file = JSON.parse(raw) as EncryptedBackupFile;
  if (!file.salt || !file.nonce || !file.ciphertext) {
    throw new Error("Invalid backup file");
  }

  const key = await deriveVaultKey(password, file.salt);
  const plain = await decryptString(key, file.nonce, file.ciphertext);
  const data = JSON.parse(plain) as EncryptedBackupPayload;

  if (data.settings) await saveSettings(data.settings);

  let events = 0;
  let notes = 0;
  let todos = 0;
  let habits = 0;
  let snippets = 0;

  for (const event of data.events ?? []) {
    await upsertEventFromImport(event as CalendarEvent);
    events += 1;
  }
  for (const note of data.notes ?? []) {
    await upsertNote(note as Note);
    notes += 1;
  }
  for (const todo of data.todos ?? []) {
    await upsertTodo(todo as Todo);
    todos += 1;
  }
  for (const habit of data.habits ?? []) {
    await upsertHabit(habit as Habit);
    habits += 1;
  }
  for (const log of data.habit_logs ?? []) {
    await upsertHabitLog(log as HabitLog);
  }
  for (const snippet of data.snippets ?? []) {
    await upsertSnippet(snippet as Snippet);
    snippets += 1;
  }

  if (Array.isArray(data.vault_entries)) {
    await replaceVaultEntries(data.vault_entries);
  }
  await saveVaultMetaFromBackup(data.vaultMeta ?? null);

  window.dispatchEvent(new Event("dn-events-changed"));
  window.dispatchEvent(new Event("dn-notes-changed"));
  window.dispatchEvent(new Event("dn-todos-changed"));
  window.dispatchEvent(new Event("dn-habits-changed"));
  window.dispatchEvent(new Event("dn-snippets-changed"));
  window.dispatchEvent(new Event("dn-vault-changed"));

  return { events, notes, todos, habits, snippets };
}
