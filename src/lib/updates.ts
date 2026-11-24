import type { Update } from "@tauri-apps/plugin-updater";

/**
 * App auto-update state machine (single source of truth for the dialog, the toolbar chip
 * and the Settings › Updates section).
 *
 * idle → checking → (up-to-date | available | error)
 * available → downloading → installing → (Windows: installer closes and relaunches the app;
 *                                         macOS/Linux: relaunch)
 */

export const GITHUB_RELEASES_URL = "https://github.com/devnguyen0111/DN-Assistants/releases/latest";

/** Re-check while the app lives in the tray. */
export const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
/** "Remind me later" hides the prompt (not the toolbar chip) for this long. */
export const UPDATE_SNOOZE_MS = 24 * 60 * 60 * 1000;

export type UpdateInfo = {
  version: string;
  currentVersion: string;
  date?: string;
  body?: string;
};

export type UpdateErrorKind = "network" | "signature" | "no-release" | "unknown";

export type UpdateState =
  | { status: "idle" }
  | { status: "unavailable" }
  | { status: "checking" }
  | { status: "up-to-date"; checkedAt: number }
  | { status: "available"; info: UpdateInfo; checkedAt: number }
  | {
      status: "downloading";
      info: UpdateInfo;
      downloadedBytes: number;
      totalBytes?: number;
      percent: number | null;
    }
  | { status: "installing"; info: UpdateInfo }
  | { status: "error"; kind: UpdateErrorKind; message: string; info?: UpdateInfo };

/** Kept for callers that only care about the check outcome. */
export type UpdateCheckResult =
  | { status: "up-to-date" }
  | { status: "available"; version: string; info: UpdateInfo }
  | { status: "error"; message: string }
  | { status: "unavailable" };

let state: UpdateState = { status: "idle" };
let cachedUpdate: Update | null = null;
let inflight: Promise<UpdateCheckResult> | null = null;
const listeners = new Set<(s: UpdateState) => void>();

function setState(next: UpdateState) {
  state = next;
  listeners.forEach((l) => l(state));
}

export function getUpdateState(): UpdateState {
  return state;
}

export function subscribeUpdateState(listener: (s: UpdateState) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** Map raw plugin errors to something a person can act on; keep the raw text as details. */
export function classifyUpdateError(message: string): UpdateErrorKind {
  const m = message.toLowerCase();
  if (m.includes("signature") || m.includes("minisign") || m.includes("pubkey")) return "signature";
  if (m.includes("404") || m.includes("not found") || m.includes("latest.json"))
    return "no-release";
  if (
    m.includes("network") ||
    m.includes("dns") ||
    m.includes("timed out") ||
    m.includes("timeout") ||
    m.includes("connect") ||
    m.includes("error sending request") ||
    m.includes("offline")
  ) {
    return "network";
  }
  return "unknown";
}

function toInfo(update: Update): UpdateInfo {
  return {
    version: update.version,
    currentVersion: update.currentVersion,
    date: update.date,
    body: update.body,
  };
}

export async function openGitHubReleasePage(): Promise<void> {
  try {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(GITHUB_RELEASES_URL);
  } catch {
    window.open(GITHUB_RELEASES_URL, "_blank", "noopener,noreferrer");
  }
}

/** Check the update endpoint. Concurrent callers share one request. */
export function checkForAppUpdate(): Promise<UpdateCheckResult> {
  if (inflight) return inflight;
  // Never interrupt a download/install with a re-check.
  if (state.status === "downloading" || state.status === "installing") {
    return Promise.resolve({ status: "available", version: state.info.version, info: state.info });
  }
  if (!isTauri()) {
    setState({ status: "unavailable" });
    return Promise.resolve({ status: "unavailable" });
  }

  inflight = (async (): Promise<UpdateCheckResult> => {
    setState({ status: "checking" });
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();
      if (!update) {
        cachedUpdate = null;
        setState({ status: "up-to-date", checkedAt: Date.now() });
        return { status: "up-to-date" };
      }
      cachedUpdate = update;
      const info = toInfo(update);
      setState({ status: "available", info, checkedAt: Date.now() });
      return { status: "available", version: info.version, info };
    } catch (err) {
      cachedUpdate = null;
      const message = err instanceof Error ? err.message : String(err);
      setState({ status: "error", kind: classifyUpdateError(message), message });
      return { status: "error", message };
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/**
 * Download + install. On Windows the updater starts the NSIS installer (passive mode) and
 * exits this process itself; the installer relaunches the app. Calling relaunch() there
 * races the installer's file locks (0xc0000409), so only macOS/Linux relaunch explicitly.
 */
export async function downloadAndInstallUpdate(): Promise<void> {
  let update = cachedUpdate;
  if (!update) {
    const result = await checkForAppUpdate();
    if (result.status !== "available") throw new Error("No update is currently available");
    update = cachedUpdate;
  }
  if (!update) throw new Error("No update is currently available");
  const info = toInfo(update);

  let downloaded = 0;
  let total: number | undefined;
  setState({ status: "downloading", info, downloadedBytes: 0, percent: null });

  try {
    await update.downloadAndInstall((event) => {
      if (event.event === "Started") {
        total = event.data.contentLength ?? undefined;
      } else if (event.event === "Progress") {
        downloaded += event.data.chunkLength;
      } else if (event.event === "Finished") {
        // Persist anything pending before the installer terminates the process.
        void flushBeforeExit();
        setState({ status: "installing", info });
        return;
      }
      setState({
        status: "downloading",
        info,
        downloadedBytes: downloaded,
        totalBytes: total,
        percent: total ? Math.min(100, Math.round((downloaded / total) * 100)) : null,
      });
    });

    let isWindows = true;
    try {
      const os = await import("@tauri-apps/plugin-os");
      isWindows = os.platform() === "windows";
    } catch {
      // assume Windows (primary target) — never relaunch blindly
    }
    if (!isWindows) {
      await flushBeforeExit();
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    }
  } catch (err) {
    // The Update handle may be half-consumed; force a fresh check on retry.
    cachedUpdate = null;
    const message = err instanceof Error ? err.message : String(err);
    setState({ status: "error", kind: classifyUpdateError(message), message, info });
    throw err;
  }
}

async function flushBeforeExit() {
  try {
    const { flushPendingSettings } = await import("@/lib/settings");
    await flushPendingSettings();
  } catch {
    // best effort
  }
}

// ---------- dialog visibility ----------

const UPDATE_DIALOG_EVENT = "dn-show-update-dialog";

export function showUpdateDialog() {
  window.dispatchEvent(new Event(UPDATE_DIALOG_EVENT));
}

export function subscribeUpdateDialog(listener: () => void): () => void {
  window.addEventListener(UPDATE_DIALOG_EVENT, listener);
  return () => window.removeEventListener(UPDATE_DIALOG_EVENT, listener);
}

/** Should an automatic check open the dialog for this version? */
export function shouldPrompt(
  version: string,
  opts: { skippedVersion?: string; snoozedUntil?: number; now?: number },
): boolean {
  if (opts.skippedVersion && opts.skippedVersion === version) return false;
  if (opts.snoozedUntil && (opts.now ?? Date.now()) < opts.snoozedUntil) return false;
  return true;
}

/**
 * Background check: opens the dialog only for a version the user has not skipped or
 * snoozed. Never downloads on its own.
 */
export async function promptUpdateIfAvailable(options?: {
  skippedVersion?: string;
  snoozedUntil?: number;
  forceShow?: boolean;
}): Promise<UpdateCheckResult> {
  const result = await checkForAppUpdate();
  if (
    result.status === "available" &&
    (options?.forceShow ||
      shouldPrompt(result.info.version, {
        skippedVersion: options?.skippedVersion,
        snoozedUntil: options?.snoozedUntil,
      }))
  ) {
    showUpdateDialog();
  }
  return result;
}
