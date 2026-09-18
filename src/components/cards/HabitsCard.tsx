import { useEffect, useState } from "react";
import {
  Check,
  CheckCircle2,
  Flame,
  MoreVertical,
  Plus,
  Star,
  Trash2,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useI18n } from "@/lib/i18n";
import {
  createHabit,
  deleteHabit,
  formatDateKey,
  getAllHabitsWithStats,
  toggleHabitDate,
  updateHabit,
  type HabitCategory,
  type HabitColor,
  type HabitStats,
} from "@/lib/habits";
import { cn } from "@/lib/utils";

const COLOR_MAP: Record<HabitColor, { bg: string; text: string; fill: string; border: string }> = {
  teal: {
    bg: "bg-teal-500/10",
    text: "text-teal-500",
    fill: "bg-teal-500",
    border: "border-teal-500/30",
  },
  blue: {
    bg: "bg-blue-500/10",
    text: "text-blue-500",
    fill: "bg-blue-500",
    border: "border-blue-500/30",
  },
  violet: {
    bg: "bg-violet-500/10",
    text: "text-violet-500",
    fill: "bg-violet-500",
    border: "border-violet-500/30",
  },
  rose: {
    bg: "bg-rose-500/10",
    text: "text-rose-500",
    fill: "bg-rose-500",
    border: "border-rose-500/30",
  },
  amber: {
    bg: "bg-amber-500/10",
    text: "text-amber-500",
    fill: "bg-amber-500",
    border: "border-amber-500/30",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-500",
    fill: "bg-emerald-500",
    border: "border-emerald-500/30",
  },
};

const CATEGORIES: HabitCategory[] = [
  "general",
  "health",
  "productivity",
  "learning",
  "fitness",
  "mindset",
];

const COLORS: HabitColor[] = ["teal", "blue", "violet", "rose", "amber", "emerald"];

export function HabitsCard() {
  const { t } = useI18n();
  const [items, setItems] = useState<HabitStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<HabitCategory>("general");
  const [color, setColor] = useState<HabitColor>("teal");
  const [targetDays, setTargetDays] = useState(7);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const loadData = async () => {
    try {
      const data = await getAllHabitsWithStats();
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    const handler = () => void loadData();
    window.addEventListener("dn-habits-changed", handler);
    return () => window.removeEventListener("dn-habits-changed", handler);
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setTitle("");
    setCategory("general");
    setColor("teal");
    setTargetDays(7);
    setDialogOpen(true);
  };

  const openEdit = (stat: HabitStats) => {
    setEditingId(stat.habit.id);
    setTitle(stat.habit.title);
    setCategory(stat.habit.category);
    setColor(stat.habit.color);
    setTargetDays(stat.habit.target_days_per_week);
    setDialogOpen(true);
  };

  const saveHabit = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error(t.habitTitlePlaceholder);
      return;
    }

    try {
      if (editingId) {
        await updateHabit(editingId, {
          title: trimmed,
          category,
          color,
          target_days_per_week: targetDays,
        });
        toast.success(t.saved);
      } else {
        await createHabit({
          title: trimmed,
          category,
          color,
          target_days_per_week: targetDays,
        });
        toast.success(t.saved);
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const onToggleToday = async (habitId: string) => {
    const today = formatDateKey(new Date());
    try {
      const res = await toggleHabitDate(habitId, today);
      if (res) {
        toast.success(t.completedToday);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const onTogglePast = async (habitId: string, dateStr: string) => {
    try {
      await toggleHabitDate(habitId, dateStr);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const onDelete = async (habitId: string) => {
    try {
      await deleteHabit(habitId);
      toast.success(t.deleted);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const categoryLabel = (cat: HabitCategory) => {
    switch (cat) {
      case "health":
        return t.habitCatHealth;
      case "productivity":
        return t.habitCatProductivity;
      case "learning":
        return t.habitCatLearning;
      case "fitness":
        return t.habitCatFitness;
      case "mindset":
        return t.habitCatMindset;
      default:
        return t.habitCatGeneral;
    }
  };

  const filteredItems =
    filterCategory === "all" ? items : items.filter((x) => x.habit.category === filterCategory);

  const totalDoneToday = items.filter((x) => x.completedToday).length;
  const bestOverallStreak = items.reduce((max, x) => Math.max(max, x.bestStreak), 0);

  return (
    <div className="space-y-4">
      {/* Summary KPI cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="bg-card/60 backdrop-blur">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t.completedToday}</p>
              <p className="text-xl font-semibold tracking-tight">
                {totalDoneToday} / {items.length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <Flame className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t.currentStreak}</p>
              <p className="text-xl font-semibold tracking-tight">
                {items.length > 0
                  ? `${Math.max(...items.map((x) => x.currentStreak), 0)} days`
                  : "0"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
              <Trophy className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t.bestStreak}</p>
              <p className="text-xl font-semibold tracking-tight">{bestOverallStreak} days</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Habit list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-lg font-semibold tracking-tight">
              {t.habitsTitle}
            </CardTitle>
            <Badge variant="secondary" className="font-mono text-xs">
              {items.length}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {categoryLabel(cat)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button size="sm" onClick={openCreate} className="h-8 gap-1.5">
              <Plus className="size-3.5" />
              <span>{t.addHabit}</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t.loading}</p>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CheckCircle2 className="size-10 text-muted-foreground/40" />
              <p className="mt-2 text-sm font-medium">{t.noHabitsYet}</p>
              <p className="text-xs text-muted-foreground">{t.noHabitsDesc}</p>
              <Button size="sm" variant="secondary" onClick={openCreate} className="mt-4">
                <Plus className="size-3.5" />
                {t.addHabit}
              </Button>
            </div>
          ) : (
            filteredItems.map((item) => {
              const theme = COLOR_MAP[item.habit.color] || COLOR_MAP.teal;
              const dateEntries = Object.entries(item.last30Days);

              return (
                <div
                  key={item.habit.id}
                  className="group rounded-xl border bg-card/40 p-3.5 transition-colors hover:bg-card/70"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => onToggleToday(item.habit.id)}
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-xl border transition-all",
                          item.completedToday
                            ? cn(theme.fill, "border-transparent text-white shadow-sm scale-105")
                            : "border-border bg-muted/20 text-muted-foreground hover:border-primary hover:text-primary",
                        )}
                        title={t.checkInToday}
                      >
                        <Check className="size-4 stroke-[2.5]" />
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-semibold tracking-tight text-foreground">
                            {item.habit.title}
                          </p>
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] uppercase font-mono", theme.text, theme.border)}
                          >
                            {categoryLabel(item.habit.category)}
                          </Badge>
                        </div>

                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 font-mono text-amber-500 font-medium">
                            <Flame className="size-3" />
                            {item.currentStreak}
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-1 font-mono">
                            <Star className="size-3 text-muted-foreground" />
                            Best: {item.bestStreak}
                          </span>
                          <span>·</span>
                          <span>
                            Week: {item.completedThisWeek}/{item.habit.target_days_per_week}d
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="size-8">
                            <MoreVertical className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(item)}>
                            {t.editHabit}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => onDelete(item.habit.id)}
                          >
                            <Trash2 className="size-3.5 mr-2" />
                            {t.delete}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* 30-day interactive heatmap */}
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{t.habitHeatmap30Days}</span>
                      <span className="font-mono">
                        {dateEntries.filter(([, v]) => v).length}/30 days
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {dateEntries.map(([dateKey, done]) => (
                        <Tooltip key={dateKey} delayDuration={150}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => onTogglePast(item.habit.id, dateKey)}
                              className={cn(
                                "size-4 rounded-sm transition-all hover:ring-2 hover:ring-primary/40",
                                done ? theme.fill : "bg-muted/40 hover:bg-muted/80",
                              )}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs font-mono">
                            {dateKey}: {done ? "✓ Done" : "○ Not done"}
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Dialog for create / edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? t.editHabit : t.addHabit}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t.title}</Label>
              <Input
                placeholder={t.habitTitlePlaceholder}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t.habitCategory}</Label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as HabitCategory)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {categoryLabel(cat)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>{t.color}</Label>
                <Select value={color} onValueChange={(v) => setColor(v as HabitColor)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLORS.map((c) => (
                      <SelectItem key={c} value={c}>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn("size-2.5 rounded-full", COLOR_MAP[c].fill)}
                          />
                          <span className="capitalize">{c}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>{t.habitTargetDays}</Label>
                <span className="font-mono text-xs text-muted-foreground">
                  {targetDays} / 7
                </span>
              </div>
              <Slider
                value={[targetDays]}
                onValueChange={(v) => setTargetDays(v[0] ?? 7)}
                min={1}
                max={7}
                step={1}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t.cancel}
            </Button>
            <Button onClick={saveHabit}>{t.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
