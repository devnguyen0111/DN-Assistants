import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type Locale = "vi" | "en";

import { en, type Dictionary, type TranslationKey } from "@/locales/en";
import { vi } from "@/locales/vi";

export type { Dictionary, TranslationKey };

const dictionaries: Record<Locale, Dictionary> = { en, vi };

type I18nContextValue = {
  locale: Locale;
  t: Dictionary;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);
const STORAGE_KEY = "dn-assistant-locale";

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "vi";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "vi" || stored === "en") return stored;
  return "vi";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const toggleLocale = useCallback(() => {
    setLocaleState((prev) => {
      const next = prev === "vi" ? "en" : "vi";
      window.localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      locale,
      t: dictionaries[locale],
      setLocale,
      toggleLocale,
    }),
    [locale, setLocale, toggleLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export function localeTag(locale: Locale): string {
  return locale === "vi" ? "vi-VN" : "en-US";
}
