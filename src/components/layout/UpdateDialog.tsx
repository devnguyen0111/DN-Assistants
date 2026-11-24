import { lazy, Suspense, useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, Download, ExternalLink, Loader2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useUpdateState } from "@/hooks/useAutoUpdates";
import { localeTag, useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/settings-context";
import {
  downloadAndInstallUpdate,
  openGitHubReleasePage,
  subscribeUpdateDialog,
  UPDATE_SNOOZE_MS,
  type UpdateErrorKind,
  type UpdateInfo,
} from "@/lib/updates";
import { formatBytes } from "@/lib/utils";

const ReleaseNotes = lazy(() => import("@/components/layout/ReleaseNotes"));

/** Placeholder bodies produced by older release workflows carry no information. */
function hasRealNotes(body?: string): body is string {
  if (!body?.trim()) return false;
  return !/^see the assets below/i.test(body.trim());
}

function VersionChips({ info }: { info: UpdateInfo }) {
  return (
    <div className="flex items-center gap-2 font-mono text-caption">
      <span className="rounded-xs bg-surface-3 px-1.5 py-0.5 text-text-2">
        v{info.currentVersion}
      </span>
      <ArrowRight className="size-3.5 text-text-3" aria-hidden />
      <span className="rounded-xs bg-accent px-1.5 py-0.5 font-semibold text-accent-foreground">
        v{info.version}
      </span>
    </div>
  );
}

/**
 * Update dialog (spec §4 dialog rules): idle → downloading (can be hidden; progress stays in
 * the toolbar chip) → installing. Errors are explained with a retry and a browser fallback.
 */
export function UpdateDialog() {
  const { t, locale } = useI18n();
  const { updateSettings } = useSettings();
  const state = useUpdateState();
  const [open, setOpen] = useState(false);

  useEffect(() => subscribeUpdateDialog(() => setOpen(true)), []);

  const info: UpdateInfo | undefined =
    state.status === "available" || state.status === "downloading" || state.status === "installing"
      ? state.info
      : state.status === "error"
        ? state.info
        : undefined;

  // Nothing to show (e.g. a manual check said "up to date"): close quietly.
  useEffect(() => {
    if (open && !info && state.status !== "error" && state.status !== "checking") setOpen(false);
  }, [open, info, state.status]);

  const errorText: Record<UpdateErrorKind, string> = {
    network: t.updateErrNetwork,
    signature: t.updateErrSignature,
    "no-release": t.updateErrNoRelease,
    unknown: t.updateErrUnknown,
  };

  const start = () => void downloadAndInstallUpdate().catch(() => undefined);
  const later = () => {
    void updateSettings({ updateSnoozedUntil: Date.now() + UPDATE_SNOOZE_MS });
    setOpen(false);
  };
  const skip = () => {
    if (info) void updateSettings({ skippedUpdateVersion: info.version });
    setOpen(false);
  };

  const date =
    info?.date && !Number.isNaN(Date.parse(info.date))
      ? new Intl.DateTimeFormat(localeTag(locale), { dateStyle: "long" }).format(
          new Date(info.date),
        )
      : null;

  return (
    <Dialog
      open={open && (Boolean(info) || state.status === "error")}
      onOpenChange={(next) => {
        // Installing closes the app; don't let the dialog vanish mid-way.
        if (!next && state.status === "installing") return;
        setOpen(next);
      }}
    >
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>
            {state.status === "installing" ? t.updateInstallingTitle : t.updateDialogTitle}
          </DialogTitle>
          {info && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
              <VersionChips info={info} />
              {date && <span className="text-caption text-text-3">{date}</span>}
            </div>
          )}
          {state.status === "available" && (
            <DialogDescription>{t.updateDialogDesc}</DialogDescription>
          )}
        </DialogHeader>

        {/* Release notes */}
        {info && state.status !== "installing" && (
          <section aria-label={t.updateReleaseNotes} className="space-y-2">
            <h3 className="text-caption font-semibold text-text-3">{t.updateReleaseNotes}</h3>
            <div className="max-h-60 overflow-y-auto rounded-md border bg-surface-2 p-3">
              {hasRealNotes(info.body) ? (
                <Suspense fallback={<Skeleton className="h-16 w-full" />}>
                  <ReleaseNotes body={info.body} />
                </Suspense>
              ) : (
                <p className="text-body text-text-3">{t.updateNoNotes}</p>
              )}
            </div>
          </section>
        )}

        {/* Download progress */}
        {state.status === "downloading" && (
          <div className="space-y-2" aria-live="polite">
            <div className="flex items-center justify-between text-body">
              <span className="flex items-center gap-2 text-text-1">
                <Loader2 className="size-4 animate-spin text-accent-foreground motion-reduce:animate-none" />
                {t.updateDownloadProgress}
              </span>
              <span className="font-mono text-caption text-text-2">
                {state.percent != null
                  ? `${state.percent}%`
                  : formatBytes(state.downloadedBytes, locale)}
              </span>
            </div>
            <Progress value={state.percent ?? undefined} className="h-2" />
            <p className="text-caption text-text-3">
              {state.totalBytes
                ? `${formatBytes(state.downloadedBytes, locale)} / ${formatBytes(state.totalBytes, locale)} · `
                : ""}
              {t.updateKeepWorking}
            </p>
          </div>
        )}

        {/* Installing */}
        {state.status === "installing" && (
          <div className="flex items-start gap-3 rounded-md bg-info-soft p-3" role="status">
            <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-info motion-reduce:animate-none" />
            <p className="text-body text-text-1">{t.updateInstallingDesc}</p>
          </div>
        )}

        {/* Error */}
        {state.status === "error" && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-md border border-danger/40 bg-danger-soft p-3"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" />
            <div className="min-w-0 space-y-1">
              <p className="text-label text-text-1">{t.updateFailed}</p>
              <p className="text-body text-text-2">{errorText[state.kind]}</p>
              <details className="text-caption text-text-3">
                <summary className="cursor-pointer select-none">{t.updateErrDetails}</summary>
                <pre className="mt-1 whitespace-pre-wrap break-all font-mono">{state.message}</pre>
              </details>
            </div>
          </div>
        )}

        <DialogFooter className="flex-row flex-wrap items-center justify-between gap-2 sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {state.status === "available" && (
              <Button variant="ghost" onClick={skip}>
                {t.updateSkipVersion}
              </Button>
            )}
            {(state.status === "error" || state.status === "available") && (
              <Button variant="ghost" onClick={() => void openGitHubReleasePage()}>
                <ExternalLink />
                {t.updateViaBrowser}
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {state.status === "available" && (
              <>
                <Button variant="outline" onClick={later}>
                  {t.updateRemindLater}
                </Button>
                <Button onClick={start}>
                  <Download />
                  {t.updateNow}
                </Button>
              </>
            )}
            {state.status === "downloading" && (
              <Button variant="outline" onClick={() => setOpen(false)}>
                {t.updateHide}
              </Button>
            )}
            {state.status === "error" && (
              <>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  {t.close}
                </Button>
                {info && (
                  <Button onClick={start}>
                    <RotateCw />
                    {t.retry}
                  </Button>
                )}
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
