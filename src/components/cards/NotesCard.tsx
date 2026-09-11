import { useEffect, useMemo, useState } from "react";
import { NotebookPen, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  createNote,
  deleteNote,
  searchNotes,
  updateNote,
  type Note,
} from "@/lib/notes";

export function NotesCard() {
  const { locale, t } = useI18n();
  const tag = localeTag(locale);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const refresh = async (q = query) => {
    setLoading(true);
    try {
      setNotes(await searchNotes(q));
    } catch {
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    const onChanged = () => void refresh();
    window.addEventListener("dn-notes-changed", onChanged);
    return () => window.removeEventListener("dn-notes-changed", onChanged);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(query), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const selected = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId],
  );

  const selectNote = (note: Note) => {
    setSelectedId(note.id);
    setTitle(note.title);
    setBody(note.body);
  };

  const startNew = () => {
    setSelectedId(null);
    setTitle("");
    setBody("");
  };

  const save = async () => {
    if (!title.trim() && !body.trim()) return;
    try {
      if (selectedId) {
        await updateNote(selectedId, { title: title.trim() || t.noteTitlePlaceholder, body });
      } else {
        const created = await createNote({ title: title.trim() || t.noteTitlePlaceholder, body });
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

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
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
                      className={`block w-full rounded-lg border px-3 py-2 text-left transition-colors hover:bg-accent ${
                        note.id === selectedId ? "border-primary bg-accent" : "border-border/60"
                      }`}
                      onClick={() => selectNote(note)}
                    >
                      <p className="truncate text-sm font-medium">
                        {note.title || t.noteTitlePlaceholder}
                      </p>
                      <p className="line-clamp-1 text-xs text-muted-foreground">
                        {note.body || "—"}
                      </p>
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

        <Card className="h-full">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>{selected ? t.notesTitle : t.newNote}</CardTitle>
            <div className="flex items-center gap-2">
              {selectedId && (
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="size-4" />
                  {t.delete}
                </Button>
              )}
              <Button size="sm" onClick={() => void save()}>
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
            <Textarea
              placeholder={t.noteBodyPlaceholder}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={16}
              className="resize-none"
            />
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
