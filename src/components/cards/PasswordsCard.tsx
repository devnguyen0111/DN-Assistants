import { useEffect, useMemo, useState } from "react";
import {
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { EmptyState, LoadingState } from "@/components/ui/state-block";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/settings-context";
import { generateTotp } from "@/lib/totp";
import { checkHibp, findReusedPasswords, passwordStrength } from "@/lib/vault-health";
import { parseGooglePasswordCsv } from "@/lib/vault-csv";
import {
  createVaultEntry,
  deleteVaultEntry,
  entryDedupKey,
  entryHost,
  hasVault,
  isVaultUnlocked,
  listVaultEntries,
  lockVault,
  makePassword,
  searchVaultEntries,
  setupVault,
  unlockVault,
  updateVaultEntry,
  type VaultEntry,
} from "@/lib/vault";

type FormState = {
  title: string;
  url: string;
  username: string;
  password: string;
  note: string;
  totpSecret: string;
};

const emptyForm = (): FormState => ({
  title: "",
  url: "",
  username: "",
  password: "",
  note: "",
  totpSecret: "",
});

export function PasswordsCard() {
  const { t } = useI18n();
  const { settings } = useSettings();
  const [ready, setReady] = useState(false);
  const [vaultExists, setVaultExists] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [masterPassword, setMasterPassword] = useState("");
  const [masterConfirm, setMasterConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [genLength, setGenLength] = useState(20);
  const [genLower, setGenLower] = useState(true);
  const [genUpper, setGenUpper] = useState(true);
  const [genDigits, setGenDigits] = useState(true);
  const [genSymbols, setGenSymbols] = useState(true);
  const [totpLive, setTotpLive] = useState<{ code: string; remaining: number } | null>(null);
  const [hibpBusy, setHibpBusy] = useState(false);
  const [hibpResult, setHibpResult] = useState<number | null>(null);

  const refreshMeta = async () => {
    setLoading(true);
    try {
      const exists = await hasVault();
      setVaultExists(exists);
      const open = isVaultUnlocked();
      setUnlocked(open);
      if (open) {
        setEntries(await listVaultEntries());
      } else {
        setEntries([]);
      }
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
      setReady(true);
    }
  };

  useEffect(() => {
    void refreshMeta();
    const onChanged = () => void refreshMeta();
    window.addEventListener("dn-vault-changed", onChanged);
    return () => window.removeEventListener("dn-vault-changed", onChanged);
  }, []);

  const filtered = useMemo(() => searchVaultEntries(query, entries), [entries, query]);

  const selected = useMemo(
    () => entries.find((e) => e.id === selectedId) ?? null,
    [entries, selectedId],
  );

  const reusedIds = useMemo(
    () => findReusedPasswords(entries.map((e) => ({ id: e.id, password: e.password }))),
    [entries],
  );

  const activeTotpSecret = (selected?.totpSecret || form.totpSecret || "").trim() || "";

  useEffect(() => {
    if (!unlocked || !activeTotpSecret) {
      setTotpLive(null);
      return;
    }
    const tick = () => {
      try {
        setTotpLive(generateTotp(activeTotpSecret));
      } catch {
        setTotpLive(null);
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [unlocked, activeTotpSecret, selectedId]);

  useEffect(() => {
    setHibpResult(null);
  }, [form.password, selectedId]);

  const selectEntry = (entry: VaultEntry) => {
    setSelectedId(entry.id);
    setForm({
      title: entry.title,
      url: entry.url,
      username: entry.username,
      password: entry.password,
      note: entry.note,
      totpSecret: entry.totpSecret ?? "",
    });
    setShowPassword(false);
  };

  const startNew = () => {
    setSelectedId(null);
    setForm(emptyForm());
    setShowPassword(true);
  };

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${t.copied}: ${label}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const save = async () => {
    if (!form.title.trim() && !form.url.trim() && !form.username.trim()) {
      toast.error(t.vaultNeedFields);
      return;
    }
    try {
      setBusy(true);
      const payload = {
        title: form.title.trim() || entryHost(form.url) || form.username || "Untitled",
        url: form.url,
        username: form.username,
        password: form.password,
        note: form.note,
        totpSecret: form.totpSecret,
      };
      if (selectedId) {
        await updateVaultEntry(selectedId, payload);
      } else {
        const created = await createVaultEntry(payload);
        setSelectedId(created.id);
      }
      toast.success(t.saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!selectedId) return;
    try {
      await deleteVaultEntry(selectedId);
      toast.success(t.deleted);
      startNew();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setConfirmDelete(false);
    }
  };

  const onSetup = async () => {
    if (masterPassword.length < 8) {
      toast.error(t.vaultPasswordTooShort);
      return;
    }
    if (masterPassword !== masterConfirm) {
      toast.error(t.vaultPasswordMismatch);
      return;
    }
    try {
      setBusy(true);
      await setupVault(masterPassword);
      setMasterPassword("");
      setMasterConfirm("");
      toast.success(t.vaultCreated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const onUnlock = async () => {
    try {
      setBusy(true);
      const ok = await unlockVault(masterPassword);
      if (!ok) {
        toast.error(t.vaultWrongPassword);
        return;
      }
      setMasterPassword("");
      toast.success(t.vaultUnlocked);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const onLock = () => {
    lockVault();
    setSelectedId(null);
    setForm(emptyForm());
    toast.success(t.vaultLocked);
  };

  const onGenerate = () => {
    const password = makePassword({
      length: genLength,
      lowercase: genLower,
      uppercase: genUpper,
      digits: genDigits,
      symbols: genSymbols,
    });
    setForm((f) => ({ ...f, password }));
    setShowPassword(true);
  };

  const onHibpCheck = async () => {
    if (!form.password) return;
    try {
      setHibpBusy(true);
      const { count } = await checkHibp(form.password);
      setHibpResult(count);
      if (count > 0) {
        toast.warning(t.vaultHibpFound.replace("{n}", String(count)));
      } else {
        toast.success(t.vaultHibpClean);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setHibpBusy(false);
    }
  };

  const onImportCsv = async () => {
    try {
      setBusy(true);
      const { open } = await import("@tauri-apps/plugin-dialog");
      const { readTextFile } = await import("@tauri-apps/plugin-fs");
      const path = await open({
        multiple: false,
        filters: [{ name: "CSV", extensions: ["csv"] }],
      });
      if (!path || typeof path !== "string") return;
      const raw = await readTextFile(path);
      const rows = parseGooglePasswordCsv(raw);
      const existing = new Set(entries.map((e) => entryDedupKey(e.url, e.username)));
      let imported = 0;
      let skipped = 0;
      for (const row of rows) {
        const key = entryDedupKey(row.url, row.username);
        if (existing.has(key)) {
          skipped += 1;
          continue;
        }
        await createVaultEntry({ ...row, totpSecret: "" });
        existing.add(key);
        imported += 1;
      }
      toast.success(
        t.vaultImportResult
          .replace("{imported}", String(imported))
          .replace("{skipped}", String(skipped)),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  if (!ready || loading) {
    return (
      <Card>
        <CardContent className="py-10">
          <LoadingState />
        </CardContent>
      </Card>
    );
  }

  if (!vaultExists) {
    return (
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-4 text-primary" />
            {t.vaultSetupTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{t.vaultSetupHint}</p>
          <div className="space-y-1.5">
            <Label htmlFor="vault-master">{t.vaultMasterPassword}</Label>
            <Input
              id="vault-master"
              type="password"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vault-master2">{t.vaultConfirmPassword}</Label>
            <Input
              id="vault-master2"
              type="password"
              value={masterConfirm}
              onChange={(e) => setMasterConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <Button className="w-full" disabled={busy} onClick={() => void onSetup()}>
            {t.vaultCreate}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!unlocked) {
    return (
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="size-4 text-primary" />
            {t.vaultUnlockTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{t.vaultUnlockHint}</p>
          <div className="space-y-1.5">
            <Label htmlFor="vault-unlock">{t.vaultMasterPassword}</Label>
            <Input
              id="vault-unlock"
              type="password"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void onUnlock();
              }}
              autoComplete="current-password"
            />
          </div>
          <Button className="w-full" disabled={busy} onClick={() => void onUnlock()}>
            {t.vaultUnlock}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="size-4 text-primary" />
              {t.vaultTitle}
            </CardTitle>
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                title={t.vaultImport}
                onClick={() => void onImportCsv()}
              >
                <Upload className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                title={t.vaultAdd}
                onClick={startNew}
              >
                <Plus className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                title={t.vaultLock}
                onClick={onLock}
              >
                <Lock className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder={t.vaultSearch}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <ScrollArea className="h-[480px] pr-2">
              {filtered.length === 0 ? (
                <EmptyState title={t.vaultEmpty} />
              ) : (
                <div className="space-y-1">
                  {filtered.map((entry) => {
                    const weak = passwordStrength(entry.password) === "weak";
                    const reused = reusedIds.has(entry.id);
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                          selectedId === entry.id
                            ? "border-primary/40 bg-primary/5"
                            : "border-transparent hover:bg-muted/50"
                        }`}
                        onClick={() => selectEntry(entry)}
                      >
                        <p className="truncate text-sm font-medium">{entry.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {entry.username || entryHost(entry.url) || "—"}
                        </p>
                        {(weak || reused) && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {weak && (
                              <Badge variant="destructive" className="text-[10px] font-normal">
                                {t.vaultHealthWeak}
                              </Badge>
                            )}
                            {reused && (
                              <Badge variant="secondary" className="text-[10px] font-normal">
                                {t.vaultHealthReused}
                              </Badge>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{selectedId ? t.vaultEdit : t.vaultAdd}</CardTitle>
            {selectedId && (
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="size-4" />
                {t.delete}
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t.vaultFieldTitle}</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t.vaultFieldUrl}</Label>
                <Input
                  value={form.url}
                  onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t.vaultFieldUsername}</Label>
                <div className="flex gap-1">
                  <Input
                    value={form.username}
                    onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    title={t.vaultCopyUsername}
                    onClick={() => void copyText(form.username, t.vaultFieldUsername)}
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t.vaultFieldPassword}</Label>
                <div className="flex gap-1">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    title={showPassword ? t.vaultHidePassword : t.vaultShowPassword}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    title={t.vaultCopyPassword}
                    onClick={() => void copyText(form.password, t.vaultFieldPassword)}
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t.vaultTotpSecret}</Label>
                <Input
                  value={form.totpSecret}
                  onChange={(e) => setForm((f) => ({ ...f, totpSecret: e.target.value }))}
                  placeholder={t.vaultTotpHint}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              {totpLive && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>{t.vaultTotp}</Label>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-2xl tracking-[0.2em] tabular-nums">
                      {totpLive.code}
                    </p>
                    <Badge variant="secondary" className="font-mono tabular-nums">
                      {totpLive.remaining}s
                    </Badge>
                    <Button
                      size="icon"
                      variant="outline"
                      title={t.vaultCopyTotp}
                      onClick={() => void copyText(totpLive.code, t.vaultTotp)}
                    >
                      <Copy className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t.vaultFieldNote}</Label>
                <Textarea
                  rows={3}
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                />
              </div>
            </div>

            {form.password && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted-foreground">{t.vaultHealthTitle}:</span>
                {passwordStrength(form.password) === "weak" ? (
                  <Badge variant="destructive" className="font-normal">
                    {t.vaultHealthWeak}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="font-normal">
                    {t.vaultHealthOk}
                  </Badge>
                )}
                {selectedId && reusedIds.has(selectedId) && (
                  <Badge variant="secondary" className="font-normal">
                    {t.vaultHealthReused}
                  </Badge>
                )}
              </div>
            )}

            {settings.hibpCheckEnabled && (
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      <ShieldAlert className="size-3.5" />
                      {t.vaultHibpCheck}
                    </p>
                    <p className="text-xs text-muted-foreground">{t.vaultHibpHint}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={hibpBusy || !form.password}
                    onClick={() => void onHibpCheck()}
                  >
                    {t.vaultHibpCheck}
                  </Button>
                </div>
                {hibpResult != null && (
                  <p className="text-xs">
                    {hibpResult > 0
                      ? t.vaultHibpFound.replace("{n}", String(hibpResult))
                      : t.vaultHibpClean}
                  </p>
                )}
              </div>
            )}

            <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{t.vaultGenerator}</p>
                <Button size="sm" variant="secondary" onClick={onGenerate}>
                  <RefreshCw className="size-3.5" />
                  {t.vaultGenerate}
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <label className="flex items-center gap-1.5">
                  <span>{t.vaultGenLength}</span>
                  <Input
                    type="number"
                    className="h-7 w-16"
                    min={8}
                    max={128}
                    value={genLength}
                    onChange={(e) => setGenLength(Number(e.target.value) || 20)}
                  />
                </label>
                <label className="flex items-center gap-1.5">
                  <Checkbox checked={genLower} onCheckedChange={(v) => setGenLower(v === true)} />
                  a-z
                </label>
                <label className="flex items-center gap-1.5">
                  <Checkbox checked={genUpper} onCheckedChange={(v) => setGenUpper(v === true)} />
                  A-Z
                </label>
                <label className="flex items-center gap-1.5">
                  <Checkbox checked={genDigits} onCheckedChange={(v) => setGenDigits(v === true)} />
                  0-9
                </label>
                <label className="flex items-center gap-1.5">
                  <Checkbox
                    checked={genSymbols}
                    onCheckedChange={(v) => setGenSymbols(v === true)}
                  />
                  !@#
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              {!selectedId && (
                <Button variant="outline" onClick={startNew}>
                  {t.cancel}
                </Button>
              )}
              <Button disabled={busy} onClick={() => void save()}>
                {t.save}
              </Button>
            </div>

            {selected && (
              <p className="text-[10px] text-muted-foreground font-mono">
                {entryHost(selected.url) || selected.url || "—"} · {selected.updated_at}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.vaultDeleteConfirm}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void remove()}>{t.delete}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
