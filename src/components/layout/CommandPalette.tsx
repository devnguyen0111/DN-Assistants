import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckSquare,
  Coins,
  Copy,
  NotebookPen,
  KeyRound,
  FileCode2,
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
import { Badge } from "@/components/ui/badge";
import { evaluate, formatResult } from "@/lib/calculator";
import { emitChange } from "@/lib/db";
import { Kbd } from "@/components/ui/keyboard-hint";
import { NAV_GROUPS } from "@/lib/nav";
import { navLabel } from "@/lib/page-meta";
import { convertCurrency, formatConverted, parseCurrencyQuery } from "@/lib/currency";
import { listEvents, type CalendarEvent } from "@/lib/events";
import { createNote, searchNotes, type Note } from "@/lib/notes";
import { createTodo, listTodos, toggleTodo, type Todo } from "@/lib/todos";
import { expandPlaceholders, searchSnippets, type Snippet } from "@/lib/snippets";
import { localeTag, useI18n } from "@/lib/i18n";
import type { AppRoute } from "@/lib/routing";
import { useSettings } from "@/lib/settings-context";
import { getCachedEntries, isVaultUnlocked, searchVaultEntries } from "@/lib/vault";
import { toast } from "sonner";
import { copySecret } from "@/lib/secure-clipboard";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (route: AppRoute) => void;
};

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
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [fxResult, setFxResult] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setFxResult(null);
      setSnippets([]);
      setTodos([]);
      return;
    }
    void listEvents()
      .then(setEvents)
      .catch(() => setEvents([]));
    void listTodos()
      .then((items) => setTodos(items.filter((x) => x.done === 0)))
      .catch(() => setTodos([]));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) {
      setNotes([]);
      setSnippets([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void searchNotes(q)
        .then((rows) => setNotes(rows.slice(0, 6)))
        .catch(() => setNotes([]));
      void searchSnippets(q)
        .then((rows) => setSnippets(rows.slice(0, 6)))
        .catch(() => setSnippets([]));
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

  const todoQuery = useMemo(() => {
    const q = query.trim();
    if (/^todo:\s*/i.test(q)) {
      return q.replace(/^todo:\s*/i, "").trim();
    }
    if (/^\+\s+/i.test(q)) {
      return q.replace(/^\+\s+/i, "").trim();
    }
    return null;
  }, [query]);

  const matchingTodos = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || todoQuery) return [];
    return todos.filter((t) => t.title.toLowerCase().includes(q));
  }, [todos, query, todoQuery]);

  const vaultUnlocked = isVaultUnlocked();
  const vaultMatches = useMemo(() => {
    if (!open) return [];
    const q = query.trim();
    if (!vaultUnlocked || !q) return [];
    return searchVaultEntries(q, getCachedEntries()).slice(0, 8);
  }, [query, vaultUnlocked, open]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.commandPalette}
      footer={
        <div className="flex h-8 items-center gap-4 border-t bg-surface-2 px-3 text-caption text-text-3">
          <span className="flex items-center gap-1">
            <Kbd>↑↓</Kbd> {t.paletteHintMove}
          </span>
          <span className="flex items-center gap-1">
            <Kbd>Enter</Kbd> {t.paletteHintRun}
          </span>
          <span className="flex items-center gap-1">
            <Kbd>Esc</Kbd> {t.paletteHintClose}
          </span>
        </div>
      }
    >
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

        {todoQuery && (
          <CommandGroup heading={t.todoTitle}>
            <CommandItem
              value={`create-todo-${todoQuery}`}
              onSelect={async () => {
                try {
                  await createTodo({ title: todoQuery, priority: "medium" });
                  toast.success(`${t.saved}: ${todoQuery}`);
                  emitChange("todos");
                  onOpenChange(false);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : String(err));
                }
              }}
            >
              <CheckSquare className="size-4 text-primary" />
              <span className="font-medium">
                {t.todoAdd}: <span className="text-primary font-semibold">{todoQuery}</span>
              </span>
            </CommandItem>
          </CommandGroup>
        )}

        {matchingTodos.length > 0 && (
          <CommandGroup heading={t.todoTitle}>
            {matchingTodos.map((todo) => (
              <CommandItem
                key={todo.id}
                value={`todo-${todo.id}-${todo.title}`}
                onSelect={async () => {
                  try {
                    await toggleTodo(todo.id, true);
                    toast.success(`${t.todoCompleted}: ${todo.title}`);
                    emitChange("todos");
                    setTodos((prev) => prev.filter((item) => item.id !== todo.id));
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : String(err));
                  }
                }}
              >
                <CheckSquare className="size-4 text-muted-foreground" />
                <span className="flex-1 truncate">{todo.title}</span>
                <Badge variant="outline" className="text-[10px] capitalize">
                  {todo.priority}
                </Badge>
              </CommandItem>
            ))}
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
            vaultMatches.flatMap((entry) => [
              <CommandItem
                key={`${entry.id}-pw`}
                value={`vault-pw-${entry.id}-${entry.title}-${entry.username}-${entry.url}`}
                onSelect={() => {
                  void copySecret(entry.password);
                  toast.success(`${t.copied}: ${t.vaultFieldPassword}`);
                  onOpenChange(false);
                }}
              >
                <KeyRound className="size-4" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body">
                    {t.paletteCopyPassword.replace("{name}", entry.title)}
                  </p>
                  <p className="truncate text-caption text-text-3">{entry.username || entry.url}</p>
                </div>
              </CommandItem>,
              entry.username ? (
                <CommandItem
                  key={`${entry.id}-user`}
                  value={`vault-user-${entry.id}-${entry.title}-${entry.username}`}
                  onSelect={() => {
                    void copySecret(entry.username);
                    toast.success(`${t.copied}: ${t.vaultFieldUsername}`);
                    onOpenChange(false);
                  }}
                >
                  <KeyRound className="size-4 opacity-0" aria-hidden />
                  <p className="truncate text-body">
                    {t.paletteCopyUsername.replace("{name}", entry.title)}
                  </p>
                </CommandItem>
              ) : null,
            ])
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
          {NAV_GROUPS.flatMap((g) => g.items).map((item) => {
            const Icon = item.icon;
            const label = navLabel(t, item.route);
            return (
              <CommandItem
                key={item.route}
                value={`${label} ${item.route}`}
                onSelect={() => {
                  onNavigate(item.route);
                  onOpenChange(false);
                }}
              >
                <Icon className="size-4" />
                {label}
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

        {snippets.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t.commandSnippets}>
              {snippets.map((snip) => (
                <CommandItem
                  key={snip.id}
                  value={`snippet-${snip.id}-${snip.title}-${snip.content}`}
                  onSelect={async () => {
                    const expanded = await expandPlaceholders(snip.content);
                    await navigator.clipboard.writeText(expanded);
                    toast.success(`${t.copiedWithPlaceholders}: ${snip.title}`);
                    onOpenChange(false);
                  }}
                >
                  <FileCode2 className="size-4" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{snip.title}</p>
                    <p className="truncate text-xs text-muted-foreground font-mono">
                      {snip.content.slice(0, 60)}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono uppercase">
                    {snip.language}
                  </Badge>
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
