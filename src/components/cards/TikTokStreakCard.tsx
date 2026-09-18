import { useEffect, useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Flame, Plus, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { EmptyState, LoadingState } from "@/components/ui/state-block";
import { useI18n } from "@/lib/i18n";
import {
  createTikTokStreak,
  deleteTikTokStreak,
  isDoneToday,
  listTikTokStreaks,
  markTikTokStreakDone,
  openTikTok,
  subscribeTikTokStreaks,
  updateTikTokStreak,
  type TikTokStreak,
} from "@/lib/tiktok-streaks";
import { cn } from "@/lib/utils";

export function TikTokStreakCard() {
  const { t } = useI18n();
  const [items, setItems] = useState<TikTokStreak[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [remindAt, setRemindAt] = useState("20:00");
  const [nudgeAt, setNudgeAt] = useState("22:30");
  const [hint, setHint] = useState("");

  const refresh = async () => {
    try {
      setItems(await listTikTokStreaks());
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    return subscribeTikTokStreaks(() => void refresh());
  }, []);

  const pending = useMemo(
    () => items.filter((item) => item.enabled && !isDoneToday(item)).length,
    [items],
  );

  const add = async () => {
    if (!name.trim()) return;
    try {
      await createTikTokStreak({
        name: name.trim(),
        username,
        remindAt,
        nudgeAt,
        hint,
      });
      setName("");
      setUsername("");
      setHint("");
      toast.success(t.saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const mark = async (item: TikTokStreak, done: boolean) => {
    try {
      await markTikTokStreakDone(item.id, done);
      toast.success(done ? t.tiktokDoneToday : t.saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const copyHint = async (item: TikTokStreak) => {
    const text = item.hint.trim();
    if (!text) return;
    await navigator.clipboard.writeText(text);
    toast.success(t.copied);
  };

  return (
    <Card className="h-full">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Flame className="size-4 text-primary" />
            {t.tiktokTitle}
          </CardTitle>
          {pending > 0 && (
            <Badge variant="secondary">
              {pending} {t.tiktokPending}
            </Badge>
          )}
        </div>
        <Alert>
          <AlertDescription>{t.tiktokDisclaimer}</AlertDescription>
        </Alert>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{t.tiktokDesc}</p>

        <div className="grid gap-2 rounded-lg border bg-muted/20 p-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-1">
            <Label htmlFor="tiktok-name">{t.tiktokName}</Label>
            <Input
              id="tiktok-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.tiktokNamePlaceholder}
              onKeyDown={(e) => {
                if (e.key === "Enter") void add();
              }}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tiktok-user">{t.tiktokUsername}</Label>
            <Input
              id="tiktok-user"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t.tiktokUsernamePlaceholder}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tiktok-remind">{t.tiktokRemindAt}</Label>
            <Input
              id="tiktok-remind"
              type="time"
              value={remindAt}
              onChange={(e) => setRemindAt(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tiktok-nudge">{t.tiktokNudgeAt}</Label>
            <Input
              id="tiktok-nudge"
              type="time"
              value={nudgeAt}
              onChange={(e) => setNudgeAt(e.target.value)}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="tiktok-hint">{t.tiktokHint}</Label>
            <Input
              id="tiktok-hint"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder={t.tiktokHintPlaceholder}
            />
          </div>
          <div className="sm:col-span-2">
            <Button onClick={() => void add()} disabled={!name.trim()}>
              <Plus className="size-4" />
              {t.tiktokAdd}
            </Button>
          </div>
        </div>

        {loading ? (
          <LoadingState />
        ) : items.length === 0 ? (
          <EmptyState title={t.tiktokEmpty} />
        ) : (
          <ScrollArea className="h-[420px] pr-2">
            <div className="space-y-2">
              {items.map((item) => {
                const done = isDoneToday(item);
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "rounded-lg border bg-muted/20 p-3",
                      !item.enabled && "opacity-70",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{item.name}</p>
                        {item.username && (
                          <p className="truncate font-mono text-xs text-muted-foreground">
                            @{item.username}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={item.enabled}
                          onCheckedChange={(checked) =>
                            void updateTikTokStreak(item.id, { enabled: checked })
                          }
                          aria-label={t.tiktokEnabled}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            void deleteTikTokStreak(item.id).then(() => toast.success(t.deleted))
                          }
                          title={t.delete}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <Badge variant={done ? "secondary" : "outline"}>
                        <Flame className="size-3" />
                        {t.tiktokStreakDays.replace("{n}", String(item.streakCount))}
                      </Badge>
                      <span className="text-muted-foreground">
                        {t.tiktokBest.replace("{n}", String(item.longestStreak))}
                      </span>
                      <span
                        className={
                          done
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-amber-600 dark:text-amber-400"
                        }
                      >
                        {done ? t.tiktokDoneToday : t.tiktokPending}
                      </span>
                    </div>

                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {t.tiktokRemindAt} {item.remindAt} · {t.tiktokNudgeAt} {item.nudgeAt}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={done ? "outline" : "default"}
                        onClick={() => void mark(item, !done)}
                      >
                        {done ? <Undo2 className="size-3.5" /> : <Check className="size-3.5" />}
                        {done ? t.tiktokUndoDone : t.tiktokMarkDone}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => void openTikTok(item.username)}
                      >
                        <ExternalLink className="size-3.5" />
                        {t.tiktokOpen}
                      </Button>
                      {item.hint && (
                        <Button size="sm" variant="ghost" onClick={() => void copyHint(item)}>
                          <Copy className="size-3.5" />
                          {t.tiktokCopyHint}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
