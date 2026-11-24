import { useState } from "react";
import { FolderOpen, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { BackupPayload, BackupSummary } from "@/lib/backup";
import { localeTag, useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/settings-context";

type Mode = "export" | "restore";

function errorText(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

/** Encrypted backup export, restore with preview, and scheduled auto backups. */
export function BackupSection() {
  const { t, locale } = useI18n();
  const { settings, updateSettings } = useSettings();
  const [mode, setMode] = useState<Mode | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ payload: BackupPayload; summary: BackupSummary } | null>(
    null,
  );
  const [autoRunning, setAutoRunning] = useState(false);

  const close = () => {
    setMode(null);
    setPassword("");
    setPreview(null);
  };

  const submitPassword = async () => {
    if (!mode || !password.trim()) return;
    setBusy(true);
    try {
      const backup = await import("@/lib/backup");
      if (mode === "export") {
        const saved = await backup.exportEncryptedBackup(password);
        if (saved) toast.success(t.backupSuccess);
        close();
      } else {
        const result = await backup.pickAndDecryptBackup(password);
        if (result) setPreview(result);
      }
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const confirmRestore = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      const { applyBackup } = await import("@/lib/backup");
      await applyBackup(preview.payload);
      toast.success(t.backupRestoreSuccess);
      close();
    } catch (err) {
      toast.error(`${t.backupRestoreFailed}: ${errorText(err)}`);
    } finally {
      setBusy(false);
    }
  };

  const pickFolder = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const dir = await open({ directory: true, multiple: false });
      if (typeof dir === "string") await updateSettings({ autoBackupDir: dir });
    } catch (err) {
      toast.error(errorText(err));
    }
  };

  const runNow = async () => {
    setAutoRunning(true);
    try {
      const { runAutoBackup } = await import("@/lib/backup");
      await runAutoBackup(
        settings.autoBackupDir,
        settings.autoBackupPassword,
        settings.autoBackupKeep,
      );
      await updateSettings({ lastAutoBackupAt: new Date().toISOString() });
      toast.success(t.backupSuccess);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setAutoRunning(false);
    }
  };

  const autoReady = Boolean(settings.autoBackupDir && settings.autoBackupPassword.trim());
  const lastRun = settings.lastAutoBackupAt
    ? new Date(settings.lastAutoBackupAt).toLocaleString(localeTag(locale))
    : t.autoBackupNever;

  const s = preview?.summary;
  const previewRows: [string, number][] = s
    ? [
        [t.navCalendar, s.events],
        [t.navNotes, s.notes],
        [t.navTodo, s.todos],
        [t.navHabits, s.habits],
        [t.navSnippets, s.snippets],
        [t.navFocus, s.focusSessions],
        [t.navClipboard, s.clipboardPinned],
        [t.navPasswords, s.vaultEntries],
      ]
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" />
          {t.backupSectionTitle}
        </CardTitle>
        <CardDescription>{t.backupSectionDesc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setMode("export")}>
            {t.exportEncrypted}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setMode("restore")}>
            {t.importEncrypted}
          </Button>
        </div>

        <div className="space-y-3 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">{t.autoBackup}</Label>
              <p className="text-xs text-muted-foreground">{t.autoBackupHint}</p>
            </div>
            <Switch
              checked={settings.autoBackupEnabled}
              disabled={!autoReady && !settings.autoBackupEnabled}
              onCheckedChange={(v) => void updateSettings({ autoBackupEnabled: v })}
            />
          </div>

          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={settings.autoBackupDir}
              placeholder={t.autoBackupFolder}
              className="flex-1 text-xs"
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => void pickFolder()}
            >
              <FolderOpen className="size-4" />
              {t.autoBackupChoose}
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="auto-backup-pass" className="text-xs">
                {t.backupPassword}
              </Label>
              <Input
                id="auto-backup-pass"
                type="password"
                value={settings.autoBackupPassword}
                onChange={(e) => void updateSettings({ autoBackupPassword: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="auto-backup-interval" className="text-xs">
                {t.autoBackupInterval}
              </Label>
              <Input
                id="auto-backup-interval"
                type="number"
                min={1}
                max={720}
                value={settings.autoBackupIntervalHours}
                onChange={(e) => {
                  const n = Math.floor(Number(e.target.value));
                  if (n >= 1 && n <= 720) void updateSettings({ autoBackupIntervalHours: n });
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="auto-backup-keep" className="text-xs">
                {t.autoBackupKeep}
              </Label>
              <Input
                id="auto-backup-keep"
                type="number"
                min={1}
                max={100}
                value={settings.autoBackupKeep}
                onChange={(e) => {
                  const n = Math.floor(Number(e.target.value));
                  if (n >= 1 && n <= 100) void updateSettings({ autoBackupKeep: n });
                }}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{t.autoBackupPasswordNote}</p>

          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {t.autoBackupLast}: {lastRun}
            </p>
            <Button
              size="sm"
              variant="secondary"
              disabled={!autoReady || autoRunning}
              onClick={() => void runNow()}
              className="gap-1.5"
            >
              {autoRunning && <Loader2 className="size-4 animate-spin" />}
              {t.autoBackupRunNow}
            </Button>
          </div>
        </div>
      </CardContent>

      <Dialog open={mode !== null} onOpenChange={(o) => !o && !busy && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{mode === "restore" ? t.importEncrypted : t.exportEncrypted}</DialogTitle>
            {preview && <DialogDescription>{t.backupPreviewDesc}</DialogDescription>}
          </DialogHeader>

          {preview && s ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {t.backupPreviewCreated}: {new Date(s.exportedAt).toLocaleString(localeTag(locale))}{" "}
                · v{s.version}
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                {previewRows.map(([label, count]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="tabular-nums">{count}</span>
                  </div>
                ))}
              </div>
              {s.hasVault && (
                <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
                  {t.backupPreviewVaultWarning}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="backup-password">{t.backupPassword}</Label>
              <p className="text-xs text-muted-foreground">{t.backupPasswordHint}</p>
              <Input
                id="backup-password"
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void submitPassword();
                }}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={close}>
              {t.cancel}
            </Button>
            {preview ? (
              <Button disabled={busy} onClick={() => void confirmRestore()} className="gap-1.5">
                {busy && <Loader2 className="size-4 animate-spin" />}
                {t.backupPreviewConfirm}
              </Button>
            ) : (
              <Button
                disabled={busy || !password.trim()}
                onClick={() => void submitPassword()}
                className="gap-1.5"
              >
                {busy && <Loader2 className="size-4 animate-spin" />}
                {mode === "restore" ? t.backupChooseFile : t.exportEncrypted}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
