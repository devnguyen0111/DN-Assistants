import { Languages, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

export function AppHeader() {
  const { t, locale, toggleLocale } = useI18n();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{t.appName}</h1>
        <p className="text-sm text-muted-foreground">{t.appTagline}</p>
      </div>
      <div className="flex items-center gap-2 rounded-xl border bg-card/70 p-1.5 backdrop-blur">
        <Button variant="ghost" size="sm" onClick={toggleLocale} title={t.language}>
          <Languages className="size-4" />
          {locale.toUpperCase()}
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <Button variant="ghost" size="sm" onClick={toggleTheme} title={t.theme}>
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          {theme === "dark" ? "Light" : "Dark"}
        </Button>
      </div>
    </header>
  );
}
