import type { Update } from "@tauri-apps/plugin-updater";

export const GITHUB_RELEASES_URL = "https://github.com/devnguyen0111/DN-Assistants/releases/latest";

export type UpdateInfo = {
  version: string;
  currentVersion: string;
  date?: string;
  body?: string;
};

export type UpdateCheckResult =
  | { status: "up-to-date" }
  | { status: "available"; version: string; info: UpdateInfo }
  | { status: "error"; message: string }
  | { status: "unavailable" };

export type UpdateProgress = {
  percent: number;
  downloadedBytes: number;
  totalBytes?: number;
  stage: "idle" | "downloading" | "installing" | "done" | "error";
  errorMessage?: string;
};

let cachedUpdate: Update | null = null;
let lastCheckResult: UpdateCheckResult | null = null;

async function getUpdater() {
  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    return check;
  } catch {
    return null;
  }
}

export async function openGitHubReleasePage(): Promise<void> {
  try {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(GITHUB_RELEASES_URL);
  } catch {
    window.open(GITHUB_RELEASES_URL, "_blank", "noopener,noreferrer");
  }
}

export async function checkForAppUpdate(): Promise<UpdateCheckResult> {
  const check = await getUpdater();
  if (!check) {
    lastCheckResult = { status: "unavailable" };
    return lastCheckResult;
  }

  try {
    const update = await check();
    if (!update) {
      cachedUpdate = null;
      lastCheckResult = { status: "up-to-date" };
      return lastCheckResult;
    }

    cachedUpdate = update;
    const info: UpdateInfo = {
      version: update.version,
      currentVersion: update.currentVersion,
      date: update.date,
      body: update.body,
    };

    lastCheckResult = {
      status: "available",
      version: update.version,
      info,
    };
    return lastCheckResult;
  } catch (err) {
    cachedUpdate = null;
    const result: UpdateCheckResult = {
      status: "error",
      message: err instanceof Error ? err.message : String(err),
    };
    lastCheckResult = result;
    return result;
  }
}

export function getLastCheckResult(): UpdateCheckResult | null {
  return lastCheckResult;
}

/**
 * Downloads and installs the update safely.
 * On Windows, Tauri's updater launches the NSIS installer and closes the app.
 * Calling relaunch() on Windows leads to file locks / application crashes (0xc0000409).
 * Only relaunch on macOS/Linux.
 */
export async function downloadAndInstallUpdate(
  onProgress?: (progress: UpdateProgress) => void,
): Promise<void> {
  let update = cachedUpdate;
  if (!update) {
    const check = await getUpdater();
    if (!check) throw new Error("Updater plugin is unavailable");
    update = await check();
  }
  if (!update) throw new Error("No update is currently available");

  let downloaded = 0;
  let total: number | undefined = undefined;

  onProgress?.({
    percent: 0,
    downloadedBytes: 0,
    stage: "downloading",
  });

  try {
    await update.downloadAndInstall((event) => {
      if (event.event === "Started") {
        total = event.data.contentLength;
        onProgress?.({
          percent: 0,
          downloadedBytes: 0,
          totalBytes: total,
          stage: "downloading",
        });
      } else if (event.event === "Progress") {
        downloaded += event.data.chunkLength;
        const percent =
          total && total > 0 ? Math.min(100, Math.round((downloaded / total) * 100)) : 0;
        onProgress?.({
          percent,
          downloadedBytes: downloaded,
          totalBytes: total,
          stage: "downloading",
        });
      } else if (event.event === "Finished") {
        onProgress?.({
          percent: 100,
          downloadedBytes: downloaded,
          totalBytes: total,
          stage: "installing",
        });
      }
    });

    let isWindows = true;
    try {
      const pluginOs = await import("@tauri-apps/plugin-os");
      isWindows = pluginOs.platform() === "windows";
    } catch {
      // default to true
    }

    if (!isWindows) {
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    onProgress?.({
      percent: 0,
      downloadedBytes: downloaded,
      totalBytes: total,
      stage: "error",
      errorMessage: message,
    });
    throw err;
  }
}

const UPDATE_DIALOG_EVENT = "dn-show-update-dialog";

export function showUpdateDialog(info: UpdateInfo) {
  window.dispatchEvent(new CustomEvent<UpdateInfo>(UPDATE_DIALOG_EVENT, { detail: info }));
}

export function subscribeUpdateDialog(listener: (info: UpdateInfo) => void): () => void {
  const handler = (e: Event) => {
    const custom = e as CustomEvent<UpdateInfo>;
    if (custom.detail) {
      listener(custom.detail);
    }
  };
  window.addEventListener(UPDATE_DIALOG_EVENT, handler);
  return () => window.removeEventListener(UPDATE_DIALOG_EVENT, handler);
}

/**
 * Checks for update silently. If an update is available, prompts the user via UpdateDialog.
 * Does NOT auto-download or auto-install, preserving application stability.
 */
export async function promptUpdateIfAvailable(options?: {
  skippedVersion?: string;
  forceShow?: boolean;
}): Promise<UpdateCheckResult> {
  const result = await checkForAppUpdate();
  if (result.status === "available") {
    if (
      !options?.forceShow &&
      options?.skippedVersion &&
      options.skippedVersion === result.info.version
    ) {
      return result;
    }
    showUpdateDialog(result.info);
  }
  return result;
}
