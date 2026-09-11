import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Copy, Pin, PinOff, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { localeTag, useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/settings-context";
import {
  clearClipboardHistory,
  deleteItem,
  listClipboardItems,
  pinItem,
  unpinItem,
  upsertClipboardItem,
  type ClipboardItem,
} from "@/lib/clipboard-history";

export function ClipboardCard() {
  const { locale, t } = useI18n();
  const tag = localeTag(locale);
  const { settings } = useSettings();
  const [items, setItems] = useState<ClipboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      setItems(await listClipboardItems());
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    const onChanged = () => void refresh();
    window.addEventListener("dn-clipboard-changed", onChanged);
    return () => window.removeEventListener("dn-clipboard-changed", onChanged);
  }, []);

  // Watch for Tauri clipboard-changed events (emitted by a Rust-side watcher, if enabled).
  useEffect(() => {
    if (!settings.clipboardHistoryEnabled) return;
    let unlisten: (() => void) | undefined;
    void (async () => {
      try {
        const { listen } = await import("@tauri-apps/api/event");
        unlisten = await listen<string>("clipboard-changed", (event) => {
          void upsertClipboardItem(event.payload);
        });
      } catch {
        // Tauri event API unavailable (browser preview)
      }
    })();
    return () => unlisten?.();
  }, [settings.clipboardHistoryEnabled]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.content.toLowerCase().includes(q));
  }, [items, query]);

  const copyItem = async (item: ClipboardItem) => {
    try {
      await navigator.clipboard.writeText(item.content);
      toast.success(t.copied);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const togglePin = async (item: ClipboardItem) => {
    try {
      if (item.pinned) await unpinItem(item.id);
      else await pinItem(item.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteItem(id);
      toast.success(t.deleted);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const clearAll = async () => {
    try {
      await clearClipboardHistory();
      toast.success(t.deleted);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setConfirmClear(false);
    }
  };

  return (
    <>
      <Card className="h-full">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="size-4 text-primary" />
            {t.clipboardTitle}
          </CardTitle>
          <Button size="sm" variant="ghost" onClick={() => setConfirmClear(true)}>
            <Trash2 className="size-4" />
            {t.clipboardClear}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {!settings.clipboardHistoryEnabled && (
            <p className="rounded-lg border border-dashed bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              {t.clipboardEnabledHint}
            </p>
          )}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder={t.clipboardSearch}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <ScrollArea className="h-[440px] pr-2">
            {loading ? (
              <LoadingState />
            ) : filtered.length === 0 ? (
              <EmptyState title={t.clipboardEmpty} />
            ) : (
              <div className="space-y-1.5">
                {filtered.map((item) => (
                  <div
                    key={item.id}
                    className="group flex items-start gap-2 rounded-lg border border-border/60 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-3 whitespace-pre-wrap text-sm">{item.content}</p>
                      <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                        {new Intl.DateTimeFormat(tag, {
                          dateStyle: "short",
                          timeStyle: "short",
                        }).format(new Date(item.created_at))}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        title={item.pinned ? t.clipboardUnpin : t.clipboardPin}
                        onClick={() => void togglePin(item)}
                      >
                        {item.pinned ? (
                          <PinOff className="size-3.5" />
                        ) : (
                          <Pin className="size-3.5" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        title={t.clipboardCopy}
                        onClick={() => void copyItem(item)}
                      >
                        <Copy className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        title={t.delete}
                        onClick={() => void remove(item.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.clipboardClearConfirm}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void clearAll()}>
              {t.clipboardClear}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
