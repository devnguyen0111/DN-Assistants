import { useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  datePattern,
  formatDateNumeric,
  formatTime24,
  monthGrid,
  parseDateNumeric,
  parseTime24,
  sameDay,
  withTime,
} from "@/lib/datetime";
import { localeTag, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Props = {
  value: Date | null;
  onChange: (value: Date | null) => void;
  /** Include hour/minute fields (default true). */
  withTimeField?: boolean;
  required?: boolean;
  id?: string;
  className?: string;
  "aria-label"?: string;
};

/**
 * Localized date (+ optional 24h time) picker built from Popover/Input (spec §4):
 * vi shows dd/mm/yyyy and starts weeks on Monday; never the browser's US native format.
 * Edits are a draft until Apply; Cancel/Escape restores the previous value.
 */
export function DateTimePicker({
  value,
  onChange,
  withTimeField = true,
  required,
  id,
  className,
  "aria-label": ariaLabel,
}: Props) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState<Date | null>(value);
  const [dateText, setDateText] = useState("");
  const [timeText, setTimeText] = useState("");
  const [month, setMonth] = useState(() => value ?? new Date());
  const [error, setError] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const reset = (v: Date | null) => {
    const base = v ?? new Date();
    setDraftDate(v);
    setDateText(v ? formatDateNumeric(v, locale) : "");
    setTimeText(v && withTimeField ? formatTime24(v) : withTimeField ? "09:00" : "");
    setMonth(base);
    setError(null);
  };

  const days = useMemo(() => monthGrid(month, locale), [month, locale]);
  const weekdayNames = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(localeTag(locale), { weekday: "short" });
    return days.slice(0, 7).map((d) => fmt.format(d));
  }, [days, locale]);
  const monthLabel = new Intl.DateTimeFormat(localeTag(locale), {
    month: "long",
    year: "numeric",
  }).format(month);
  const fullDate = new Intl.DateTimeFormat(localeTag(locale), { dateStyle: "full" });
  const today = new Date();

  const pickDay = (d: Date) => {
    setDraftDate(d);
    setDateText(formatDateNumeric(d, locale));
    setError(null);
  };

  const apply = () => {
    const parsed = dateText.trim() ? parseDateNumeric(dateText, locale) : null;
    if (dateText.trim() && !parsed) {
      setError(t.dateInvalid.replace("{pattern}", datePattern(locale)));
      return;
    }
    if (!parsed) {
      if (required) {
        setError(t.dateRequired);
        return;
      }
      onChange(null);
      setOpen(false);
      return;
    }
    if (withTimeField) {
      const tm = parseTime24(timeText);
      if (!tm) {
        setError(t.timeInvalid);
        return;
      }
      onChange(withTime(parsed, tm.hours, tm.minutes));
    } else {
      onChange(parsed);
    }
    setOpen(false);
  };

  const onGridKey = (e: React.KeyboardEvent) => {
    const base = draftDate ?? today;
    const step: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    let next: Date | null = null;
    if (e.key in step) {
      next = new Date(base);
      next.setDate(base.getDate() + step[e.key]!);
    } else if (e.key === "PageUp" || e.key === "PageDown") {
      next = new Date(base);
      next.setMonth(base.getMonth() + (e.key === "PageUp" ? -1 : 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      apply();
      return;
    }
    if (next) {
      e.preventDefault();
      pickDay(next);
      setMonth(next);
    }
  };

  const display = value
    ? withTimeField
      ? `${formatDateNumeric(value, locale)} ${formatTime24(value)}`
      : formatDateNumeric(value, locale)
    : "";

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        if (o) reset(value);
        setOpen(o);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          aria-label={ariaLabel}
          className={cn("w-full justify-start font-normal", !value && "text-text-3", className)}
        >
          <CalendarDays className="text-text-3" />
          <span className="truncate tabular">
            {display || (withTimeField ? `${datePattern(locale)} --:--` : datePattern(locale))}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-3">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div className="space-y-1">
            <label className="text-caption text-text-3" htmlFor={`${id ?? "dtp"}-date`}>
              {t.dateLabel} ({datePattern(locale)})
            </label>
            <Input
              id={`${id ?? "dtp"}-date`}
              value={dateText}
              placeholder={datePattern(locale)}
              inputMode="numeric"
              aria-invalid={Boolean(error) || undefined}
              onChange={(e) => {
                setDateText(e.target.value);
                const p = parseDateNumeric(e.target.value, locale);
                if (p) {
                  setDraftDate(p);
                  setMonth(p);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  apply();
                }
              }}
            />
          </div>
          {withTimeField && (
            <div className="w-20 space-y-1">
              <label className="text-caption text-text-3" htmlFor={`${id ?? "dtp"}-time`}>
                {t.timeLabel}
              </label>
              <Input
                id={`${id ?? "dtp"}-time`}
                value={timeText}
                placeholder="HH:mm"
                inputMode="numeric"
                className="tabular"
                onChange={(e) => setTimeText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    apply();
                  }
                }}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <Button
            size="icon"
            variant="ghost"
            aria-label={t.prevMonth}
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          >
            <ChevronLeft />
          </Button>
          <span className="text-label capitalize">{monthLabel}</span>
          <Button
            size="icon"
            variant="ghost"
            aria-label={t.nextMonth}
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          >
            <ChevronRight />
          </Button>
        </div>

        <div
          ref={gridRef}
          role="grid"
          tabIndex={0}
          aria-label={monthLabel}
          onKeyDown={onGridKey}
          className="grid grid-cols-7 gap-0.5 rounded-sm focus-visible:outline-2 focus-visible:outline-ring"
        >
          {weekdayNames.map((w) => (
            <span key={w} role="columnheader" className="py-1 text-center text-caption text-text-3">
              {w}
            </span>
          ))}
          {days.map((d) => {
            const selected = draftDate != null && sameDay(d, draftDate);
            const isToday = sameDay(d, today);
            const outside = d.getMonth() !== month.getMonth();
            return (
              <button
                key={d.toISOString()}
                type="button"
                role="gridcell"
                tabIndex={-1}
                aria-selected={selected}
                aria-label={`${fullDate.format(d)}${isToday ? ` (${t.today})` : ""}`}
                onClick={() => pickDay(d)}
                className={cn(
                  "relative h-8 rounded-sm text-body tabular hover:bg-surface-3",
                  outside ? "text-text-3" : "text-text-1",
                  selected && "border border-primary bg-accent text-accent-foreground",
                )}
              >
                {d.getDate()}
                {isToday && (
                  <span className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>

        {error && (
          <p role="alert" className="text-caption text-danger">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <Button size="sm" variant="ghost" onClick={() => pickDay(new Date())}>
            {t.today}
          </Button>
          {!required && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setDraftDate(null);
                setDateText("");
                setError(null);
              }}
            >
              {t.clear}
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
              {t.cancel}
            </Button>
            <Button size="sm" onClick={apply}>
              {t.apply}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
