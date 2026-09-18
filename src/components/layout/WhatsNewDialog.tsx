import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { APP_VERSION } from "@/lib/settings";
import { useSettings } from "@/lib/settings-context";

export function WhatsNewDialog() {
  const { t } = useI18n();
  const { settings, updateSettings, ready } = useSettings();
  const open = ready && settings.onboardingDone && settings.whatsNewSeenVersion !== APP_VERSION;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) void updateSettings({ whatsNewSeenVersion: APP_VERSION });
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            {t.whatsNewTitle}
          </DialogTitle>
          <DialogDescription className="text-left leading-relaxed">
            {t.aboutChangelogBody}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => void updateSettings({ whatsNewSeenVersion: APP_VERSION })}>
            {t.whatsNewDismiss}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
