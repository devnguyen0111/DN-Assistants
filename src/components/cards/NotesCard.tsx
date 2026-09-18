import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bold,
  CheckSquare,
  Code,
  Copy,
  Download,
  FileText,
  Heading2,
  Italic,
  List,
  Minus,
  NotebookPen,
  Pin,
  Plus,
  Quote,
  Search,
  Table,
  Trash2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
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
import {
  createNote,
  deleteNote,
  listNotes,
  searchNotes,
  updateNote,
  type Note,
} from "@/lib/notes";
import { cn } from "@/lib/utils";

type ViewMode = "edit" | "preview" | "split";

export function NotesCard() {
  const { locale, t } = useI18n();
  const tag = localeTag(locale);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [pinned, setPinned] = useState(false);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const refresh = useCallback(async (q = "") => {
    setLoading(true);
    try {
      const list = q.trim() ? await searchNotes(q.trim()) : await listNotes();
      setNotes(list);
    } catch {
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onChanged = () => void refresh();
    window.addEventListener("dn-notes-changed", onChanged);
    return () => window.removeEventListener("dn-notes-changed", onChanged);
  }, [refresh]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(query), 250);
    return () => window.clearTimeout(timer);
  }, [query, refresh]);

  const selected = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId],
  );

  const selectNote = (note: Note) => {
    setSelectedId(note.id);
    setTitle(note.title);
    setBody(note.body);
    setTags(note.tags ?? "");
    setPinned(note.pinned === 1);
  };

  const startNew = () => {
    setSelectedId(null);
    setTitle("");
    setBody("");
    setTags("");
    setPinned(false);
  };

  const isDirty = useMemo(() => {
    if (!selected) {
      return Boolean(title.trim() || body.trim() || tags.trim());
    }
    return (
      title !== selected.title ||
      body !== selected.body ||
      tags !== (selected.tags ?? "") ||
      pinned !== (selected.pinned === 1)
    );
  }, [selected, title, body, tags, pinned]);

  const wordsCount = useMemo(() => {
    const trimmed = body.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [body]);

  const charsCount = body.length;

  const save = async () => {
    if (!title.trim() && !body.trim()) return;
    try {
      const payload = {
        title: title.trim() || t.noteTitlePlaceholder,
        body,
        tags: tags.trim(),
        pinned,
      };
      if (selectedId) {
        await updateNote(selectedId, payload);
      } else {
        const created = await createNote(payload);
        setSelectedId(created.id);
      }
      toast.success(t.saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const remove = async () => {
    if (!selectedId) return;
    try {
      await deleteNote(selectedId);
      toast.success(t.deleted);
      startNew();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setConfirmDelete(false);
    }
  };

  const insertMarkdown = (syntaxBefore: string, syntaxAfter = "") => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setBody((prev) => `${prev}${syntaxBefore}${syntaxAfter}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = body.substring(start, end);
    const replacement = `${syntaxBefore}${selectedText || "text"}${syntaxAfter}`;
    const nextBody = body.substring(0, start) + replacement + body.substring(end);

    setBody(nextBody);
    window.setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + syntaxBefore.length,
        start + syntaxBefore.length + (selectedText.length || 4),
      );
    }, 0);
  };

  const exportMarkdown = () => {
    const blob = new Blob([body], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeTitle = (title.trim() || "note").replace(/[^a-zA-Z0-9_-]/g, "_");
    a.href = url;
    a.download = `${safeTitle}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t.exportMarkdown);
  };

  const copyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(body);
      toast.success(t.copyMarkdown);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const preview = (
    <div className="prose prose-sm dark:prose-invert max-w-none rounded-lg border bg-muted/10 p-3 text-sm [&_pre]:overflow-x-auto [&_code]:rounded [&_code]:bg-muted [&_code]:px-1">
      {body.trim() ? (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
      ) : (
        <p className="text-muted-foreground">{t.noteBodyPlaceholder}</p>
      )}
    </div>
  );

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        {/* Notes list */}
        <Card className="h-full">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <NotebookPen className="size-4 text-primary" />
              {t.notesTitle}
            </CardTitle>
            <Button size="sm" variant="outline" onClick={startNew}>
              <Plus className="size-4" />
              {t.newNote}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder={t.notesSearch}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <ScrollArea className="h-[420px] pr-2">
              {loading ? (
                <LoadingState />
              ) : notes.length === 0 ? (
                <EmptyState title={t.notesEmpty} />
              ) : (
                <div className="space-y-1.5">
                  {notes.map((note) => (
                    <button
                      key={note.id}
                      type="button"
                      className={cn(
                        "block w-full rounded-lg border px-3 py-2 text-left transition-colors hover:bg-accent",
                        note.id === selectedId ? "border-primary bg-accent" : "border-border/60",
                      )}
                      onClick={() => selectNote(note)}
                    >
                      <div className="flex items-center gap-1.5">
                        {note.pinned === 1 && <Pin className="size-3 shrink-0 text-primary" />}
                        <p className="truncate text-sm font-medium">
                          {note.title || t.noteTitlePlaceholder}
                        </p>
                      </div>
                      <p className="line-clamp-1 text-xs text-muted-foreground">
                        {note.body || "—"}
                      </p>
                      {note.tags ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {note.tags
                            .split(",")
                            .map((x) => x.trim())
                            .filter(Boolean)
                            .map((tg) => (
                              <Badge key={tg} variant="secondary" className="text-[10px]">
                                {tg}
                              </Badge>
                            ))}
                        </div>
                      ) : null}
                      <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                        {new Intl.DateTimeFormat(tag, {
                          dateStyle: "short",
                          timeStyle: "short",
                        }).format(new Date(note.updated_at))}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Note editor / preview */}
        <Card className="h-full">
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-3">
            <div className="flex items-center gap-2">
              <CardTitle>{selected ? t.notesTitle : t.newNote}</CardTitle>
              <Badge
                variant={isDirty ? "outline" : "secondary"}
                className={isDirty ? "text-amber-600 border-amber-500/40 text-[10px]" : "text-[10px]"}
              >
                {isDirty ? t.unsavedStatus : t.savedStatus}
              </Badge>
              <span className="font-mono text-[11px] text-muted-foreground">
                {wordsCount} {t.wordsCount} · {charsCount} {t.charsCount}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <div className="flex rounded-lg border p-0.5">
                {(["edit", "preview", "split"] as ViewMode[]).map((m) => (
                  <Button
                    key={m}
                    size="sm"
                    variant={viewMode === m ? "secondary" : "ghost"}
                    className="h-7 px-2 text-xs"
                    onClick={() => setViewMode(m)}
                  >
                    {m === "edit" ? t.notesEdit : m === "preview" ? t.notesPreview : t.notesSplit}
                  </Button>
                ))}
              </div>

              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                onClick={copyMarkdown}
                title={t.copyMarkdown}
              >
                <Copy className="size-3.5" />
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                onClick={exportMarkdown}
                title={t.exportMarkdown}
              >
                <Download className="size-3.5" />
              </Button>

              <Button
                size="sm"
                variant={pinned ? "secondary" : "ghost"}
                className="h-7 px-2"
                onClick={() => setPinned((p) => !p)}
                title={pinned ? t.notesUnpin : t.notesPin}
              >
                <Pin className="size-3.5" />
              </Button>

              {selectedId && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}

              <Button size="sm" className="h-7 px-3 text-xs" onClick={() => void save()}>
                {t.save}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            <Input
              placeholder={t.noteTitlePlaceholder}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-base font-medium"
            />
            <Input
              placeholder={t.notesTagsPlaceholder}
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              aria-label={t.notesTags}
              className="h-8 text-xs"
            />

            {/* Pro Markdown Formatting Toolbar */}
            {viewMode !== "preview" && (
              <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-muted/30 p-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => insertMarkdown("**", "**")}
                  title="Bold"
                >
                  <Bold className="size-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => insertMarkdown("*", "*")}
                  title="Italic"
                >
                  <Italic className="size-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => insertMarkdown("### ")}
                  title="Heading 3"
                >
                  <Heading2 className="size-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => insertMarkdown("`", "`")}
                  title="Inline Code"
                >
                  <Code className="size-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => insertMarkdown("```ts\n", "\n```")}
                  title="Code Block"
                >
                  <FileText className="size-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => insertMarkdown("> ")}
                  title="Quote"
                >
                  <Quote className="size-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => insertMarkdown("- ")}
                  title="Bullet List"
                >
                  <List className="size-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => insertMarkdown("- [ ] ")}
                  title="Task Checklist"
                >
                  <CheckSquare className="size-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() =>
                    insertMarkdown("\n| Item | Value |\n|---|---|\n| Sample | 100 |\n")
                  }
                  title="Markdown Table"
                >
                  <Table className="size-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => insertMarkdown("\n---\n")}
                  title="Divider"
                >
                  <Minus className="size-3" />
                </Button>
              </div>
            )}

            {viewMode === "edit" && (
              <Textarea
                ref={textareaRef}
                placeholder={t.noteBodyPlaceholder}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={15}
                className="resize-none font-mono text-sm"
              />
            )}
            {viewMode === "preview" && <ScrollArea className="h-[360px]">{preview}</ScrollArea>}
            {viewMode === "split" && (
              <div className="grid gap-3 md:grid-cols-2">
                <Textarea
                  ref={textareaRef}
                  placeholder={t.noteBodyPlaceholder}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={15}
                  className="resize-none font-mono text-sm"
                />
                <ScrollArea className="h-[360px]">{preview}</ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.delete}?</AlertDialogTitle>
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
