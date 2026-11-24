import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type SettingsSectionLink = { id: string; label: string };

function jumpTo(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  // Move focus to the section heading without scrolling again.
  const heading = el.querySelector<HTMLElement>("h2, h3");
  if (heading) {
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }
}

/**
 * In-page navigation for Settings (spec §5): sticky 176px list at wide widths,
 * a sticky section select below that. Scrolling updates the active entry.
 */
export function SettingsNav({ sections }: { sections: SettingsSectionLink[] }) {
  const { t } = useI18n();
  const [active, setActive] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const root = document.getElementById("main-content");
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { root, rootMargin: "0px 0px -70% 0px" },
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [sections]);

  return (
    <>
      <div className="sticky top-0 z-10 -mx-1 bg-background px-1 pb-3 @[1000px]:hidden">
        <Select
          value={active}
          onValueChange={(id) => {
            setActive(id);
            jumpTo(id);
          }}
        >
          <SelectTrigger aria-label={t.settingsSections} className="max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sections.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <nav
        aria-label={t.settingsSections}
        className="sticky top-4 hidden self-start @[1000px]:block"
      >
        <ul className="space-y-0.5">
          {sections.map((s) => {
            const on = s.id === active;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  aria-current={on ? "location" : undefined}
                  onClick={() => {
                    setActive(s.id);
                    jumpTo(s.id);
                  }}
                  className={cn(
                    "relative flex min-h-8 w-full items-center rounded-sm px-3 text-left text-body transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                    on
                      ? "bg-accent font-medium text-accent-foreground before:absolute before:left-0 before:top-1/2 before:h-4 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-primary"
                      : "text-text-2 hover:bg-surface-3 hover:text-text-1",
                  )}
                >
                  {s.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
