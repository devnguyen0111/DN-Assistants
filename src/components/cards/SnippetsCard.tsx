import { useEffect, useMemo, useState } from "react";
import {
  Code2,
  Copy,
  FileCode2,
  MoreVertical,
  Pin,
  Plus,
  Search,
  Sparkles,
  Trash2,
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
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import {
  createSnippet,
  deleteSnippet,
  expandPlaceholders,
  listSnippets,
  updateSnippet,
  type Snippet,
  type SnippetLanguage,
} from "@/lib/snippets";
import { cn } from "@/lib/utils";

const LANGUAGES: SnippetLanguage[] = [
  "text",
  "javascript",
  "typescript",
  "python",
  "rust",
  "sql",
  "html",
  "css",
  "markdown",
  "shell",
  "json",
];

const PLACEHOLDERS = [
  { key: "{{date}}", desc: "YYYY-MM-DD" },
  { key: "{{time}}", desc: "HH:mm:ss" },
  { key: "{{datetime}}", desc: "Date & Time" },
  { key: "{{year}}", desc: "Current Year" },
  { key: "{{uuid}}", desc: "Unique UUID v4" },
  { key: "{{clipboard}}", desc: "Current Clipboard Text" },
];

export function SnippetsCard() {
  const { t } = useI18n();
  const [items, setItems] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedLang, setSelectedLang] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [language, setLanguage] = useState<SnippetLanguage>("text");
  const [tags, setTags] = useState("");

  const loadData = async () => {
    try {
      const data = await listSnippets();
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
    window.addEventListener("dn-snippets-changed", handler);
    return () => window.removeEventListener("dn-snippets-changed", handler);
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setTitle("");
    setContent("");
    setCategory("general");
    setLanguage("text");
    setTags("");
    setDialogOpen(true);
  };

  const openEdit = (snippet: Snippet) => {
    setEditingId(snippet.id);
    setTitle(snippet.title);
    setContent(snippet.content);
    setCategory(snippet.category);
    setLanguage(snippet.language);
    setTags(snippet.tags);
    setDialogOpen(true);
  };

  const saveSnippet = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error(t.snippetTitle);
      return;
    }
    if (!content) {
      toast.error(t.snippetContent);
      return;
    }

    try {
      if (editingId) {
        await updateSnippet(editingId, {
          title: trimmedTitle,
          content,
          category,
          language,
          tags,
        });
        toast.success(t.saved);
      } else {
        await createSnippet({
          title: trimmedTitle,
          content,
          category,
          language,
          tags,
        });
        toast.success(t.saved);
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const onCopy = async (snippet: Snippet) => {
    try {
      const expanded = await expandPlaceholders(snippet.content);
      await navigator.clipboard.writeText(expanded);
      toast.success(t.copiedWithPlaceholders);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const onTogglePin = async (snippet: Snippet) => {
    try {
      await updateSnippet(snippet.id, { pinned: !snippet.pinned });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const onDelete = async (id: string) => {
    try {
      await deleteSnippet(id);
      toast.success(t.deleted);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchQuery =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q) ||
        item.tags.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);

      const matchLang = selectedLang === "all" || item.language === selectedLang;
      return matchQuery && matchLang;
    });
  }, [items, query, selectedLang]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <FileCode2 className="size-5 text-primary" />
              {t.snippetsTitle}
            </CardTitle>
            <Badge variant="secondary" className="font-mono text-xs">
              {items.length}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-48 sm:w-60">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search snippets..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>

            <Select value={selectedLang} onValueChange={setSelectedLang}>
              <SelectTrigger className="h-8 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All languages</SelectItem>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button size="sm" onClick={openCreate} className="h-8 gap-1.5">
              <Plus className="size-3.5" />
              <span>{t.addSnippet}</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t.loading}</p>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Code2 className="size-10 text-muted-foreground/40" />
              <p className="mt-2 text-sm font-medium">{t.noSnippetsFound}</p>
              <Button size="sm" variant="secondary" onClick={openCreate} className="mt-4">
                <Plus className="size-3.5" />
                {t.addSnippet}
              </Button>
            </div>
          ) : (
            filteredItems.map((item) => {
              const hasPlaceholders = /\{\{[^}]+\}\}/.test(item.content);

              return (
                <div
                  key={item.id}
                  className="rounded-xl border bg-card/40 p-3.5 transition-colors hover:bg-card/70"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold tracking-tight text-foreground">
                          {item.title}
                        </span>
                        <Badge variant="outline" className="font-mono text-[10px] uppercase">
                          {item.language}
                        </Badge>
                        {item.category && item.category !== "general" && (
                          <Badge variant="secondary" className="text-[10px]">
                            {item.category}
                          </Badge>
                        )}
                        {hasPlaceholders && (
                          <Badge
                            variant="secondary"
                            className="gap-1 border-primary/20 bg-primary/10 text-primary text-[10px]"
                          >
                            <Sparkles className="size-2.5" />
                            Dynamic
                          </Badge>
                        )}
                      </div>

                      {item.tags && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {item.tags.split(",").map((t) => `#${t.trim()}`).join(" ")}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onCopy(item)}
                        className="h-8 gap-1.5"
                      >
                        <Copy className="size-3.5" />
                        <span>{t.copied.replace("Đã sao chép", "Sao chép").replace("Copied", "Copy")}</span>
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onTogglePin(item)}
                        className={cn("size-8", item.pinned && "text-primary")}
                        title={item.pinned ? "Unpin" : "Pin to top"}
                      >
                        <Pin className={cn("size-3.5", item.pinned && "fill-current")} />
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="size-8">
                            <MoreVertical className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(item)}>
                            {t.editSnippet}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => onDelete(item.id)}
                          >
                            <Trash2 className="size-3.5 mr-2" />
                            {t.delete}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Snippet Code block */}
                  <div className="mt-2 max-h-36 overflow-auto rounded-lg border bg-muted/40 p-2.5 font-mono text-xs leading-relaxed">
                    <pre className="whitespace-pre-wrap break-all text-muted-foreground">
                      {item.content}
                    </pre>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Dialog for create/edit snippet */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingId ? t.editSnippet : t.addSnippet}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label>{t.snippetTitle}</Label>
              <Input
                placeholder="e.g. React Component Skeleton, Git Commit Template..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t.snippetLanguage}</Label>
                <Select
                  value={language}
                  onValueChange={(v) => setLanguage(v as SnippetLanguage)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>{t.snippetCategory}</Label>
                <Input
                  placeholder="e.g. dev, email, prompts..."
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t.snippetTags}</Label>
              <Input
                placeholder="react, hooks, ui"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>{t.snippetContent}</Label>
                <span className="text-[11px] text-muted-foreground">
                  Supports dynamic variables
                </span>
              </div>
              <Textarea
                rows={8}
                className="font-mono text-xs"
                placeholder="function example() {\n  return '{{date}}';\n}"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>

            {/* Dynamic variable chips */}
            <div className="rounded-lg border bg-muted/20 p-2.5">
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                Insert variable (click to add):
              </p>
              <div className="flex flex-wrap gap-1.5">
                {PLACEHOLDERS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setContent((prev) => prev + p.key)}
                    className="rounded border bg-background px-2 py-0.5 font-mono text-[11px] transition-colors hover:border-primary hover:text-primary"
                    title={p.desc}
                  >
                    {p.key}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t.cancel}
            </Button>
            <Button onClick={saveSnippet}>{t.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
