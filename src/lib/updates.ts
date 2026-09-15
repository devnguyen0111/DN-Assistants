import { toast } from "sonner";

export type UpdateCheckResult =
  | { status: "up-to-date" }
  | { status: "available"; version: string }
  | { status: "error"; message: string }
  | { status: "unavailable" };

type UpdateHandle = {
  version: string;
  downloadAndInstall: () => Promise<void>;
};

async function getUpdater() {
  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    return check;
  } catch {
    return null;
  }
}

export async function checkForAppUpdate(): Promise<UpdateCheckResult> {
  const check = await getUpdater();
  if (!check) return { status: "unavailable" };
  try {
    const update = await check();
    if (!update) return { status: "up-to-date" };
    return { status: "available", version: update.version };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function downloadAndInstallUpdate(): Promise<void> {
  const check = await getUpdater();
  if (!check) throw new Error("Updater unavailable");
  const update = (await check()) as UpdateHandle | null;
  if (!update) throw new Error("No update available");
  await update.downloadAndInstall();
  const { relaunch } = await import("@tauri-apps/plugin-process");
  await relaunch();
}

/** Silent check on launch; prompts via toast when a newer version exists. */
export async function promptUpdateIfAvailable(labels: {
  updateAvailable: string;
  installUpdate: string;
  upToDate?: string;
}): Promise<void> {
  const result = await checkForAppUpdate();
  if (result.status !== "available") return;

  toast(`${labels.updateAvailable}: ${result.version}`, {
    duration: 12_000,
    action: {
      label: labels.installUpdate,
      onClick: () => {
        void downloadAndInstallUpdate().catch((err) => {
          toast.error(err instanceof Error ? err.message : String(err));
        });
      },
    },
  });
}
