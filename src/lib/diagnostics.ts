import { APP_VERSION, loadSettingsSync, type AppSettings } from "@/lib/settings";

export async function exportDiagnostics(): Promise<void> {
  const { save } = await import("@tauri-apps/plugin-dialog");
  const { writeTextFile } = await import("@tauri-apps/plugin-fs");
  const settings = loadSettingsSync();
  const safeSettings: Partial<AppSettings> = { ...settings };
  delete (safeSettings as { scratchpad?: string }).scratchpad;
  // never include vault secrets or clipboard content
  let version = APP_VERSION;
  let os: Record<string, string> | null = null;
  try {
    const { getVersion } = await import("@tauri-apps/api/app");
    version = await getVersion();
  } catch {
    // ignore
  }
  try {
    const pluginOs = await import("@tauri-apps/plugin-os");
    os = {
      platform: pluginOs.platform(),
      version: pluginOs.version(),
      arch: pluginOs.arch(),
    };
  } catch {
    os = null;
  }
  const payload = {
    exportedAt: new Date().toISOString(),
    appVersion: version,
    os,
    settings: {
      ...safeSettings,
      clipboardHistoryEnabled: settings.clipboardHistoryEnabled,
      favoriteRoutes: settings.favoriteRoutes,
      // redact scratchpad content length only
      scratchpadLength: settings.scratchpad.length,
    },
  };
  const path = await save({
    defaultPath: "dn-assistant-diagnostics.json",
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  if (!path) return;
  await writeTextFile(path, JSON.stringify(payload, null, 2));
}
