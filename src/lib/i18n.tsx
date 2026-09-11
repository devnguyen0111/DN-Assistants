import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Locale = "vi" | "en";

const dictionaries = {
  en: {
    appName: "DN Assistant",
    appTagline: "Desktop utilities in one place",
    theme: "Theme",
    language: "Language",
    clock: "Clock",
    calendar: "Calendar",
    calculator: "Calculator",
    agenda: "Upcoming",
    cpu: "CPU",
    ram: "Memory",
    network: "Network",
    gpu: "GPU",
    cores: "Cores",
    used: "Used",
    total: "Total",
    swap: "Swap",
    download: "Down",
    upload: "Up",
    temperature: "Temp",
    power: "Power",
    vram: "VRAM",
    utilization: "Utilization",
    unavailable: "Unavailable",
    today: "Today",
    addEvent: "Add event",
    editEvent: "Edit event",
    title: "Title",
    note: "Note",
    allDay: "All day",
    start: "Start",
    end: "End",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    noEvents: "No upcoming events",
    clear: "Clear",
    history: "History",
    timezone: "Timezone",
    loading: "Loading…",
  },
  vi: {
    appName: "DN Assistant",
    appTagline: "Tiện ích máy tính trong một nơi",
    theme: "Giao diện",
    language: "Ngôn ngữ",
    clock: "Đồng hồ",
    calendar: "Lịch",
    calculator: "Máy tính",
    agenda: "Sắp tới",
    cpu: "CPU",
    ram: "Bộ nhớ",
    network: "Mạng",
    gpu: "GPU",
    cores: "Nhân",
    used: "Đã dùng",
    total: "Tổng",
    swap: "Swap",
    download: "Tải xuống",
    upload: "Tải lên",
    temperature: "Nhiệt độ",
    power: "Công suất",
    vram: "VRAM",
    utilization: "Sử dụng",
    unavailable: "Không khả dụng",
    today: "Hôm nay",
    addEvent: "Thêm sự kiện",
    editEvent: "Sửa sự kiện",
    title: "Tiêu đề",
    note: "Ghi chú",
    allDay: "Cả ngày",
    start: "Bắt đầu",
    end: "Kết thúc",
    save: "Lưu",
    cancel: "Hủy",
    delete: "Xóa",
    noEvents: "Không có sự kiện sắp tới",
    clear: "Xóa",
    history: "Lịch sử",
    timezone: "Múi giờ",
    loading: "Đang tải…",
  },
} as const;

export type Dictionary = (typeof dictionaries)[Locale];
export type TranslationKey = keyof Dictionary;

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
