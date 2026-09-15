import { useState } from "react";
import { ClipboardList, Keyboard, Sparkles } from "lucide-react";
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
import { useSettings } from "@/lib/settings-context";
import type { AppRoute } from "@/lib/routing";

type Props = {
  onNavigate: (route: AppRoute) => void;
};

const STEPS = ["welcome", "hotkeys", "clipboard"] as const;

export function OnboardingDialog({ onNavigate }: Props) {
  const { t } = useI18n();
  const { settings, updateSettings, ready } = useSettings();
  const [step, setStep] = useState(0);
  const open = ready && !settings.onboardingDone;

  const finish = () => {
    void updateSettings({ onboardingDone: true });
  };

  const content = [
    {
      icon: Sparkles,
      title: t.onboardingWelcomeTitle,
      body: t.onboardingWelcomeBody,
    },
    {
      icon: Keyboard,
      title: t.onboardingHotkeysTitle,
      body: t.onboardingHotkeysBody,
    },
    {
      icon: ClipboardList,
      title: t.onboardingClipboardTitle,
      body: t.onboardingClipboardBody,
    },
  ][step]!;

  const Icon = content.icon;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && finish()}>
      <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="size-5 text-primary" />
            {content.title}
          </DialogTitle>
          <DialogDescription className="text-left leading-relaxed">
            {content.body}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center gap-1.5 py-2">
          {STEPS.map((_, i) => (
            <span
              key={STEPS[i]}
              className={
                i === step
                  ? "size-2 rounded-full bg-primary"
                  : "size-2 rounded-full bg-muted-foreground/30"
              }
            />
          ))}
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              finish();
              onNavigate("about");
            }}
          >
            {t.onboardingOpenAbout}
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
                {t.onboardingBack}
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)}>{t.onboardingNext}</Button>
            ) : (
              <Button onClick={finish}>{t.onboardingFinish}</Button>
            )}
            <Button variant="ghost" onClick={finish}>
              {t.onboardingSkip}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
