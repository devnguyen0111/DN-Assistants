import { useEffect, useState } from "react";
import { ArrowUpCircle, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/settings-context";
import {
  downloadAndInstallUpdate,
  openGitHubReleasePage,
  subscribeUpdateDialog,
  type UpdateInfo,
  type UpdateProgress,
} from "@/lib/updates";

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

export function UpdateDialog() {
  const { t } = useI18n();
  const { updateSettings } = useSettings();
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState<UpdateProgress>({
    percent: 0,
    downloadedBytes: 0,
    stage: "idle",
  });

  useEffect(() => {
    return subscribeUpdateDialog((newInfo) => {
      setInfo(newInfo);
      setProgress({
        percent: 0,
        downloadedBytes: 0,
        stage: "idle",
      });
      setOpen(true);
    });
  }, []);

  const handleStartUpdate = async () => {
    try {
      await downloadAndInstallUpdate((p) => {
        setProgress(p);
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      toast.error(`${t.updateFailed}: ${errorMsg}`);
    }
  };

  const handleSkipVersion = async () => {
    if (info) {
      await updateSettings({ skippedUpdateVersion: info.version });
    }
    setOpen(false);
  };

  const isWorking = progress.stage === "downloading" || progress.stage === "installing";

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        // Prevent accidental closing while downloading
        if (!nextOpen && isWorking) return;
        setOpen(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ArrowUpCircle className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-left text-lg font-semibold">
                {t.updateDialogTitle}
              </DialogTitle>
              {info && (
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    v{info.currentVersion}
                  </Badge>
                  <span className="text-xs text-muted-foreground">→</span>
                  <Badge variant="default" className="font-mono text-xs">
                    v{info.version}
                  </Badge>
                </div>
              )}
            </div>
          </div>
          <DialogDescription className="text-left pt-2 leading-relaxed">
            {t.updateDialogDesc}
          </DialogDescription>
        </DialogHeader>

        {info?.body && (
          <div className="space-y-1.5 rounded-lg border bg-muted/40 p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {t.updateReleaseNotes}
            </p>
            <ScrollArea className="max-h-44 pr-2">
              <div className="text-xs text-foreground/90 whitespace-pre-wrap font-sans leading-relaxed">
                {info.body}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Progress Display */}
        {isWorking && (
          <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Loader2 className="size-3.5 animate-spin text-primary" />
                {progress.stage === "installing"
                  ? t.updateReadyToInstall
                  : t.updateDownloadProgress}
              </span>
              <span className="font-mono font-semibold text-primary">{progress.percent}%</span>
            </div>
            <Progress value={progress.percent} className="h-2" />
            {progress.totalBytes ? (
              <p className="text-right text-[11px] text-muted-foreground font-mono">
                {formatBytes(progress.downloadedBytes)} / {formatBytes(progress.totalBytes)}
              </p>
            ) : null}
          </div>
        )}

        {/* Error State */}
        {progress.stage === "error" && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2.5">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">{t.updateFailed}</p>
              {progress.errorMessage && (
                <p className="font-mono text-[11px] opacity-90">{progress.errorMessage}</p>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:items-center pt-2">
          <div className="flex items-center gap-2">
            {!isWorking && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkipVersion}
                  className="text-xs text-muted-foreground h-8"
                >
                  {t.updateSkipVersion}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen(false)}
                  className="text-xs h-8"
                >
                  {t.updateRemindLater}
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void openGitHubReleasePage()}
              disabled={isWorking}
              className="gap-1.5 text-xs h-8"
            >
              <ExternalLink className="size-3.5" />
              {t.updateViaBrowser}
            </Button>

            {!isWorking && progress.stage !== "installing" && (
              <Button
                size="sm"
                onClick={() => void handleStartUpdate()}
                className="gap-1.5 text-xs h-8"
              >
                <ArrowUpCircle className="size-3.5" />
                {t.updateNow}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
