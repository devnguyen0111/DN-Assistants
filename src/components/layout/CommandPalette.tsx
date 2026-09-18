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
  KeyRound,
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
import { Button } from "@/components/ui/button";
import { evaluate, formatResult } from "@/lib/calculator";
import { convertCurrency, formatConverted, parseCurrencyQuery } from "@/lib/currency";
import { listEvents, type CalendarEvent } from "@/lib/events";
import { createNote, searchNotes, type Note } from "@/lib/notes";
import { localeTag, useI18n } from "@/lib/i18n";
import type { AppRoute } from "@/lib/routing";
import { useSettings } from "@/lib/settings-context";
import { getCachedEntries, isVaultUnlocked, searchVaultEntries } from "@/lib/vault";
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
    | "navPasswords"
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
  { route: "passwords", icon: KeyRound, labelKey: "navPasswords" },
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
  const { settings, updateSettings } = useSettings();
  const [query, setQuery] = useState("");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
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
    if (!open) return;
    const q = query.trim();
    if (!q) {
      setNotes([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void searchNotes(q)
        .then((rows) => setNotes(rows.slice(0, 6)))
        .catch(() => setNotes([]));
    }, 150);
    return () => window.clearTimeout(timer);
  }, [query, open]);

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
      .filter((e) => e.title.toLowerCase().includes(q) || (e.note ?? "").toLowerCase().includes(q))
      .slice(0, 8);
  }, [events, query]);

  const vaultUnlocked = isVaultUnlocked();
  const vaultMatches = useMemo(() => {
    if (!open) return [];
    const q = query.trim();
    if (!vaultUnlocked || !q) return [];
    return searchVaultEntries(q, getCachedEntries()).slice(0, 8);
  }, [query, vaultUnlocked, open]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title={t.commandPalette}>
      <CommandInput placeholder={t.commandPlaceholder} value={query} onValueChange={setQuery} />
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

        <CommandGroup heading={t.vaultTitle}>
          {!vaultUnlocked ? (
            <CommandItem
              value={`vault-unlock ${t.vaultUnlock}`}
              onSelect={() => {
                onNavigate("passwords");
                onOpenChange(false);
              }}
            >
              <KeyRound className="size-4" />
              {t.vaultUnlockTitle}
            </CommandItem>
          ) : vaultMatches.length === 0 && query.trim() ? (
            <CommandItem
              value={`vault-empty ${t.vaultEmpty}`}
              onSelect={() => {
                onNavigate("passwords");
                onOpenChange(false);
              }}
            >
              <KeyRound className="size-4" />
              {t.vaultEmpty}
            </CommandItem>
          ) : (
            vaultMatches.map((entry) => (
              <CommandItem
                key={entry.id}
                value={`vault-${entry.id}-${entry.title}-${entry.username}-${entry.url}`}
                onSelect={() => {
                  void navigator.clipboard.writeText(entry.password);
                  toast.success(`${t.copied}: ${t.vaultFieldPassword}`);
                  onOpenChange(false);
                }}
              >
                <KeyRound className="size-4" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{entry.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {entry.username || entry.url}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    void navigator.clipboard.writeText(entry.username);
                    toast.success(`${t.copied}: ${t.vaultFieldUsername}`);
                  }}
                >
                  {t.vaultCopyUsername}
                </Button>
              </CommandItem>
            ))
          )}
        </CommandGroup>

        <CommandGroup heading={t.homeScratchpad}>
          <CommandItem
            value={`scratch-save ${t.commandScratchSave}`}
            onSelect={() => {
              const body = settings.scratchpad.trim();
              if (!body) {
                onOpenChange(false);
                return;
              }
              void createNote({
                title: body.split("\n")[0]?.slice(0, 60) || t.homeScratchpad,
                body,
              })
                .then(() => updateSettings({ scratchpad: "" }))
                .then(() => {
                  toast.success(t.saved);
                  onNavigate("notes");
                  onOpenChange(false);
                })
                .catch((e) => toast.error(String(e)));
            }}
          >
            <NotebookPen className="size-4" />
            {t.commandScratchSave}
          </CommandItem>
          <CommandItem
            value={`scratch-clear ${t.commandScratchClear}`}
            onSelect={() => {
              void updateSettings({ scratchpad: "" }).then(() => {
                toast.success(t.deleted);
                onOpenChange(false);
              });
            }}
          >
            <NotebookPen className="size-4" />
            {t.commandScratchClear}
          </CommandItem>
        </CommandGroup>

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

        {notes.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t.commandNotes}>
              {notes.map((note) => (
                <CommandItem
                  key={note.id}
                  value={`note-${note.id}-${note.title}`}
                  onSelect={() => {
                    onNavigate("notes");
                    onOpenChange(false);
                  }}
                >
                  <NotebookPen className="size-4" />
                  <span className="truncate">{note.title || t.noteTitlePlaceholder}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

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
