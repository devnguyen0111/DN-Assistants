import { loadSettingsSync } from "@/lib/settings";

/**
 * Copy a secret (password, username, TOTP code). On desktop the value is hidden from
 * clipboard history (ours and Windows Win+V) and cleared after the configured timeout.
 */
export async function copySecret(text: string): Promise<void> {
  const clearAfterSecs = loadSettingsSync().vaultClipboardClearSeconds;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("copy_sensitive", { text, clearAfterSecs });
  } catch {
    await navigator.clipboard.writeText(text);
  }
}
