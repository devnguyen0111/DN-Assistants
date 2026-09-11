import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { SHORTCUT_ROUTES } from "@/lib/routing";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function Row({ keys, label }: { keys: string; label: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <kbd className="rounded border bg-muted px-2 py-0.5 font-mono text-xs">{keys}</kbd>
    </div>
  );
}

export function ShortcutsDialog({ open, onOpenChange }: Props) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t.shortcuts}</DialogTitle>
          <DialogDescription>{t.shortcutsHint}</DialogDescription>
        </DialogHeader>
        <div className="divide-y">
          <Row keys="Ctrl+K" label={t.shortcutPalette} />
          <Row keys="Ctrl+," label={t.shortcutSettings} />
          <Row keys="?" label={t.shortcutShortcuts} />
          <Row keys="Ctrl+Shift+Space" label={t.shortcutToggleWindow} />
          <Row keys="Ctrl+Shift+V" label={t.shortcutClipboard} />
          {SHORTCUT_ROUTES.map((route, i) => (
            <Row
              key={route}
              keys={`Alt+${i + 1}`}
              label={`${t.shortcutNavigate}: ${route}`}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
