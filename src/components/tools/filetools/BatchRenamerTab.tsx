import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  FileEdit,
  FolderOpen,
  Loader2,
  PencilLine,
  Trash2,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n";
import {
  applyBatchRename,
  DEFAULT_BATCH_RENAME_RULE,
  type BatchRenameRule,
  type CaseTransform,
  type NumberPosition,
} from "@/lib/batch-renamer";

type FileItem = { id: string; name: string; size: number; path: string };
type RenameOp = { from: string; to_name: string };
type RenameResult = { from: string; to: string; ok: boolean; error: string | null };

function baseName(path: string): string {
  return path.slice(Math.max(path.lastIndexOf("\\"), path.lastIndexOf("/")) + 1);
}

async function renameFiles(ops: RenameOp[]): Promise<RenameResult[]> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<RenameResult[]>("rename_files", { ops });
}

/* =========================================================================
   BATCH RENAMER — renames files in place (with undo) via the Rust backend.
   ========================================================================= */
export function BatchRenamerTab() {
  const { t } = useI18n();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [rule, setRule] = useState<BatchRenameRule>(DEFAULT_BATCH_RENAME_RULE);
  const [busy, setBusy] = useState(false);
  const [undoOps, setUndoOps] = useState<RenameOp[]>([]);
  const [dragging, setDragging] = useState(false);

  const addPaths = (paths: string[]) => {
    if (paths.length === 0) return;
    setFiles((prev) => {
      const known = new Set(prev.map((f) => f.path.toLowerCase()));
      const fresh = paths
        .filter((p) => !known.has(p.toLowerCase()))
        .map((path) => ({ id: crypto.randomUUID(), name: baseName(path), size: 0, path }));
      return [...prev, ...fresh];
    });
  };

  const pickFiles = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const picked = await open({ multiple: true, directory: false });
      if (Array.isArray(picked)) addPaths(picked);
      else if (typeof picked === "string") addPaths([picked]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  // Native drag & drop gives real file paths (HTML drop events do not in a webview).
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let disposed = false;
    void import("@tauri-apps/api/webview")
      .then(({ getCurrentWebview }) =>
        getCurrentWebview().onDragDropEvent((e) => {
          if (e.payload.type === "over" || e.payload.type === "enter") setDragging(true);
          else if (e.payload.type === "leave") setDragging(false);
          else if (e.payload.type === "drop") {
            setDragging(false);
            addPaths(e.payload.paths);
          }
        }),
      )
      .then((fn) => {
        if (disposed) fn();
        else unlisten = fn;
      })
      .catch(() => undefined);
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  const clearFiles = () => {
    setFiles([]);
    setUndoOps([]);
  };

  const previewItems = useMemo(() => applyBatchRename(files, rule), [files, rule]);
  const hasCollisions = useMemo(() => previewItems.some((i) => i.hasCollision), [previewItems]);
  const changedCount = useMemo(
    () => previewItems.filter((i) => i.isChanged && !i.hasCollision).length,
    [previewItems],
  );

  /** Run ops, then update the list with the new names. Returns the ops that undo them. */
  const execute = async (ops: RenameOp[]): Promise<RenameOp[]> => {
    const results = await renameFiles(ops);
    const done = results.filter((r) => r.ok);
    const failed = results.filter((r) => !r.ok);
    const byFrom = new Map(done.map((r) => [r.from.toLowerCase(), r.to]));
    setFiles((prev) =>
      prev.map((f) => {
        const to = byFrom.get(f.path.toLowerCase());
        return to ? { ...f, path: to, name: baseName(to) } : f;
      }),
    );
    if (failed.length > 0) {
      const first = failed[0]!;
      toast.error(
        t.renameFailedCount
          .replace("{n}", String(failed.length))
          .replace("{first}", `${baseName(first.from)}: ${first.error ?? ""}`),
      );
    }
    if (done.length > 0) toast.success(t.renameDone.replace("{n}", String(done.length)));
    return done.map((r) => ({ from: r.to, to_name: baseName(r.from) }));
  };

  const runRename = async () => {
    const ops = previewItems
      .filter((i) => i.isChanged && !i.hasCollision && i.originalPath)
      .map((i) => ({ from: i.originalPath!, to_name: i.newName }));
    if (ops.length === 0) return;
    setBusy(true);
    try {
      setUndoOps(await execute(ops));
      // The rules were applied — the next round starts from the new names.
      setRule(DEFAULT_BATCH_RENAME_RULE);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const runUndo = async () => {
    setBusy(true);
    try {
      await execute(undoOps);
      setUndoOps([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{t.batchRenamerDesc}</p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void pickFiles()}>
            <FolderOpen className="size-3.5" />
            {t.addFiles}
          </Button>
          {files.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={clearFiles}
              className="gap-1.5 text-xs text-destructive"
            >
              <Trash2 className="size-3.5" />
              {t.clearFiles} ({files.length})
            </Button>
          )}
        </div>
      </div>

      {files.length === 0 ? (
        <button
          type="button"
          onClick={() => void pickFiles()}
          className={`flex min-h-36 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
            dragging ? "border-primary bg-primary/10" : "bg-muted/20 hover:bg-muted/40"
          }`}
        >
          <div className="space-y-1.5">
            <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileEdit className="size-5" />
            </div>
            <p className="text-sm font-medium">{t.noFilesAdded}</p>
            <p className="text-xs text-muted-foreground">{t.batchRenameHint}</p>
          </div>
        </button>
      ) : (
        <div className="space-y-4">
          {/* Rule Configuration Cards */}
          <div className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2">
            {/* Find & Replace */}
            <div className="space-y-2 rounded-lg border bg-surface-1 p-3">
              <p className="text-xs font-semibold">{t.findAndReplace}</p>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder={t.findPlaceholder}
                  value={rule.find}
                  onChange={(e) => setRule((r) => ({ ...r, find: e.target.value }))}
                  className="font-mono text-xs"
                />
                <Input
                  placeholder={t.replacePlaceholder}
                  value={rule.replace}
                  onChange={(e) => setRule((r) => ({ ...r, replace: e.target.value }))}
                  className="font-mono text-xs"
                />
              </div>
              <div className="flex items-center gap-4 pt-1">
                <div className="flex items-center gap-1.5">
                  <Switch
                    id="matchCase"
                    checked={rule.matchCase}
                    onCheckedChange={(checked) => setRule((r) => ({ ...r, matchCase: checked }))}
                  />
                  <Label htmlFor="matchCase" className="text-[11px] cursor-pointer">
                    {t.matchCase}
                  </Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <Switch
                    id="useRegex"
                    checked={rule.isRegex}
                    onCheckedChange={(checked) => setRule((r) => ({ ...r, isRegex: checked }))}
                  />
                  <Label htmlFor="useRegex" className="text-[11px] cursor-pointer">
                    {t.useRegex}
                  </Label>
                </div>
              </div>
            </div>

            {/* Prefix & Suffix */}
            <div className="space-y-2 rounded-lg border bg-surface-1 p-3">
              <p className="text-xs font-semibold">{t.prefixSuffix}</p>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder={t.prefixPlaceholder}
                  value={rule.prefix}
                  onChange={(e) => setRule((r) => ({ ...r, prefix: e.target.value }))}
                  className="font-mono text-xs"
                />
                <Input
                  placeholder={t.suffixPlaceholder}
                  value={rule.suffix}
                  onChange={(e) => setRule((r) => ({ ...r, suffix: e.target.value }))}
                  className="font-mono text-xs"
                />
              </div>
              <div className="pt-1 flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">{t.caseTransform}:</span>
                <Select
                  value={rule.caseTransform}
                  onValueChange={(v) =>
                    setRule((r) => ({ ...r, caseTransform: v as CaseTransform }))
                  }
                >
                  <SelectTrigger className="h-7 text-xs flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Preserve (Không đổi)</SelectItem>
                    <SelectItem value="lower">lowercase (chữ thường)</SelectItem>
                    <SelectItem value="upper">UPPERCASE (CHỮ HOA)</SelectItem>
                    <SelectItem value="title">Title Case (Chữ Hoa Đầu)</SelectItem>
                    <SelectItem value="camel">camelCase</SelectItem>
                    <SelectItem value="kebab">kebab-case</SelectItem>
                    <SelectItem value="snake">snake_case</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Numbering Sequence */}
            <div className="col-span-full space-y-2 rounded-lg border bg-surface-1 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    id="enableNumbering"
                    checked={rule.enableNumbering}
                    onCheckedChange={(checked) =>
                      setRule((r) => ({ ...r, enableNumbering: checked }))
                    }
                  />
                  <Label htmlFor="enableNumbering" className="text-xs font-semibold cursor-pointer">
                    {t.numbering}
                  </Label>
                </div>
                {rule.enableNumbering && (
                  <span className="text-[11px] text-primary font-mono">
                    Example: {String(rule.startNumber).padStart(rule.digits, "0")}
                  </span>
                )}
              </div>

              {rule.enableNumbering && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 pt-1">
                  <div className="space-y-1">
                    <Label className="text-[10px]">{t.startAt}</Label>
                    <Input
                      type="number"
                      value={rule.startNumber}
                      onChange={(e) =>
                        setRule((r) => ({ ...r, startNumber: Number(e.target.value) || 1 }))
                      }
                      className="h-7 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">{t.step}</Label>
                    <Input
                      type="number"
                      value={rule.step}
                      onChange={(e) =>
                        setRule((r) => ({ ...r, step: Number(e.target.value) || 1 }))
                      }
                      className="h-7 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">{t.padZeros}</Label>
                    <Input
                      type="number"
                      min={1}
                      max={6}
                      value={rule.digits}
                      onChange={(e) =>
                        setRule((r) => ({ ...r, digits: Number(e.target.value) || 2 }))
                      }
                      className="h-7 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">{t.position}</Label>
                    <Select
                      value={rule.numberPosition}
                      onValueChange={(v) =>
                        setRule((r) => ({ ...r, numberPosition: v as NumberPosition }))
                      }
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="prefix">{t.posPrefix}</SelectItem>
                        <SelectItem value="suffix">{t.posSuffix}</SelectItem>
                        <SelectItem value="replace">{t.posReplace}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">{t.separator}</Label>
                    <Input
                      value={rule.numberSeparator}
                      onChange={(e) => setRule((r) => ({ ...r, numberSeparator: e.target.value }))}
                      placeholder="_"
                      className="h-7 font-mono text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Collision Warning */}
          {hasCollisions && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-2.5 text-xs text-destructive">
              <AlertTriangle className="size-4 shrink-0" />
              <span>{t.collisionWarning}</span>
            </div>
          )}

          {/* Live Preview Table */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2 text-xs font-semibold">
              <span>
                {t.batchFilesCount.replace("{n}", String(files.length))} ·{" "}
                <span className="text-primary">
                  {t.batchChangedCount.replace("{n}", String(changedCount))}
                </span>
              </span>
              <div className="flex items-center gap-1.5">
                {undoOps.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void runUndo()}
                    className="h-7 gap-1 text-xs"
                  >
                    <Undo2 className="size-3" />
                    {t.renameUndo.replace("{n}", String(undoOps.length))}
                  </Button>
                )}
                <Button
                  size="sm"
                  disabled={busy || changedCount === 0}
                  onClick={() => void runRename()}
                  className="h-7 gap-1 text-xs"
                >
                  {busy ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <PencilLine className="size-3" />
                  )}
                  {t.renameApply.replace("{n}", String(changedCount))}
                </Button>
              </div>
            </div>

            <ScrollArea className="h-64">
              <div className="divide-y divide-border/60">
                {previewItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2 px-3 py-2 text-xs ${
                      item.hasCollision
                        ? "bg-destructive/10"
                        : item.isChanged
                          ? "bg-primary/5 hover:bg-primary/10"
                          : "hover:bg-muted/30"
                    }`}
                  >
                    <span className="w-6 font-mono text-[10px] text-muted-foreground">
                      {idx + 1}
                    </span>
                    <span
                      className="truncate text-muted-foreground font-mono"
                      title={item.originalPath ?? item.originalName}
                    >
                      {item.originalName}
                    </span>
                    <span className="text-muted-foreground font-mono text-[10px]">→</span>
                    <div className="flex items-center justify-between gap-1 overflow-hidden">
                      <span
                        className={`truncate font-mono font-medium ${
                          item.hasCollision
                            ? "text-destructive font-bold"
                            : item.isChanged
                              ? "text-primary"
                              : "text-foreground"
                        }`}
                        title={item.newName}
                      >
                        {item.newName}
                      </span>
                      {item.hasCollision && (
                        <Badge variant="destructive" className="h-4 px-1 text-[9px] shrink-0">
                          {t.batchDuplicate}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
}
