import { useEffect, useMemo, useState } from "react";
import {
  Calculator,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  Clock3,
  CloudSun,
  Code2,
  Coins,
  Copy,
  Home,
  Info,
  Monitor,
  Network,
  NotebookPen,
  Settings,
  Timer,
  Flame,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { evaluate, formatResult } from "@/lib/calculator";
import { convertCurrency, formatConverted, parseCurrencyQuery } from "@/lib/currency";
import { listEvents, type CalendarEvent } from "@/lib/events";
import { localeTag, useI18n } from "@/lib/i18n";
import type { AppRoute } from "@/lib/routing";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (route: AppRoute) => void;
};

const NAV_ITEMS: Array<{
  route: AppRoute;
  icon: typeof Home;
  labelKey:
    | "navHome"
    | "navClock"
    | "navCalendar"
    | "navCalculator"
    | "navCurrency"
    | "navDevTools"
    | "navNotes"
    | "navTodo"
    | "navClipboard"
    | "navFocus"
    | "navTikTok"
    | "navSystem"
    | "navNetwork"
    | "navWeather"
    | "navSettings"
    | "navAbout";
}> = [
  { route: "home", icon: Home, labelKey: "navHome" },
  { route: "clock", icon: Clock3, labelKey: "navClock" },
  { route: "calendar", icon: CalendarDays, labelKey: "navCalendar" },
  { route: "calculator", icon: Calculator, labelKey: "navCalculator" },
  { route: "currency", icon: Coins, labelKey: "navCurrency" },
  { route: "devtools", icon: Code2, labelKey: "navDevTools" },
  { route: "notes", icon: NotebookPen, labelKey: "navNotes" },
  { route: "todo", icon: CheckSquare, labelKey: "navTodo" },
  { route: "clipboard", icon: ClipboardList, labelKey: "navClipboard" },
  { route: "focus", icon: Timer, labelKey: "navFocus" },
  { route: "tiktok", icon: Flame, labelKey: "navTikTok" },
  { route: "system", icon: Monitor, labelKey: "navSystem" },
  { route: "network", icon: Network, labelKey: "navNetwork" },
  { route: "weather", icon: CloudSun, labelKey: "navWeather" },
  { route: "settings", icon: Settings, labelKey: "navSettings" },
  { route: "about", icon: Info, labelKey: "navAbout" },
];

function looksLikeMath(query: string): boolean {
  const q = query.trim();
  if (!q) return false;
  if (/\b(to|sang)\b/i.test(q)) return false;
  return /[\d+\-*/%().]/.test(q) && /\d/.test(q);
}

export function CommandPalette({ open, onOpenChange, onNavigate }: Props) {
  const { locale, t } = useI18n();
  const tag = localeTag(locale);
  const [query, setQuery] = useState("");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [fxResult, setFxResult] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setFxResult(null);
      return;
    }
    void listEvents()
      .then(setEvents)
      .catch(() => setEvents([]));
  }, [open]);

  useEffect(() => {
    const parsed = parseCurrencyQuery?.(query);
    if (!parsed) {
      setFxResult(null);
      return;
    }
    let cancelled = false;
    void convertCurrency(parsed.amount, parsed.from, parsed.to)
      .then((r) => {
        if (!cancelled) {
          setFxResult(
            `${formatConverted(parsed.amount, parsed.from, tag)} ${parsed.from} = ${formatConverted(r, parsed.to, tag)} ${parsed.to}`,
          );
        }
      })
      .catch(() => {
        if (!cancelled) setFxResult(null);
      });
    return () => {
      cancelled = true;
    };
  }, [query, tag]);

  const calcResult = useMemo(() => {
    if (!looksLikeMath(query)) return null;
    try {
      return formatResult(evaluate(query));
    } catch {
      return null;
    }
  }, [query]);

  const filteredEvents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || looksLikeMath(q)) return events.slice(0, 6);
    return events
      .filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.note ?? "").toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [events, query]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title={t.commandPalette}>
      <CommandInput
        placeholder={t.commandPlaceholder}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>{t.noCommandResults}</CommandEmpty>

        {calcResult != null && (
          <CommandGroup heading={t.commandCalc}>
            <CommandItem
              value={`calc-${query}-${calcResult}`}
              onSelect={() => {
                void navigator.clipboard.writeText(calcResult);
                toast.success(`${t.copyResult}: ${calcResult}`);
                onOpenChange(false);
              }}
            >
              <Copy className="size-4" />
              <span className="font-mono tabular-nums">
                {query.trim()} = {calcResult}
              </span>
            </CommandItem>
          </CommandGroup>
        )}

        {fxResult && (
          <CommandGroup heading={t.currencyTitle}>
            <CommandItem
              value={`fx-${fxResult}`}
              onSelect={() => {
                void navigator.clipboard.writeText(fxResult);
                toast.success(t.copied);
                onOpenChange(false);
              }}
            >
              <Coins className="size-4" />
              <span className="font-mono tabular-nums">{fxResult}</span>
            </CommandItem>
          </CommandGroup>
        )}

        <CommandGroup heading={t.commandNavigate}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.route}
                value={`${t[item.labelKey]} ${item.route}`}
                onSelect={() => {
                  onNavigate(item.route);
                  onOpenChange(false);
                }}
              >
                <Icon className="size-4" />
                {t[item.labelKey]}
              </CommandItem>
            );
          })}
        </CommandGroup>

        {filteredEvents.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t.commandEvents}>
              {filteredEvents.map((event) => (
                <CommandItem
                  key={event.id}
                  value={`event-${event.id}-${event.title}`}
                  onSelect={() => {
                    onNavigate("calendar");
                    onOpenChange(false);
                  }}
                >
                  <CalendarDays className="size-4" />
                  <span className="truncate">{event.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
