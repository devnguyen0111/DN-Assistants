import type { Dictionary } from "@/lib/i18n";
import type { AppRoute } from "@/lib/routing";

const PAGE_META: Record<
  AppRoute,
  { title: keyof Dictionary; desc: keyof Dictionary }
> = {
  home: { title: "pageTitleHome", desc: "pageDescHome" },
  clock: { title: "pageTitleClock", desc: "pageDescClock" },
  calendar: { title: "pageTitleCalendar", desc: "pageDescCalendar" },
  calculator: { title: "pageTitleCalculator", desc: "pageDescCalculator" },
  currency: { title: "pageTitleCurrency", desc: "pageDescCurrency" },
  devtools: { title: "pageTitleDevTools", desc: "pageDescDevTools" },
  notes: { title: "pageTitleNotes", desc: "pageDescNotes" },
  todo: { title: "pageTitleTodo", desc: "pageDescTodo" },
  clipboard: { title: "pageTitleClipboard", desc: "pageDescClipboard" },
  passwords: { title: "pageTitlePasswords", desc: "pageDescPasswords" },
  focus: { title: "pageTitleFocus", desc: "pageDescFocus" },
  tiktok: { title: "pageTitleTikTok", desc: "pageDescTikTok" },
  system: { title: "pageTitleSystem", desc: "pageDescSystem" },
  network: { title: "pageTitleNetwork", desc: "pageDescNetwork" },
  weather: { title: "pageTitleWeather", desc: "pageDescWeather" },
  settings: { title: "pageTitleSettings", desc: "pageDescSettings" },
  about: { title: "pageTitleAbout", desc: "pageDescAbout" },
};

export function pageTitle(t: Dictionary, route: AppRoute): string {
  return t[PAGE_META[route].title] as string;
}

export function pageDesc(t: Dictionary, route: AppRoute): string {
  return t[PAGE_META[route].desc] as string;
}

export function navLabel(t: Dictionary, route: AppRoute): string {
  const map: Record<AppRoute, keyof Dictionary> = {
    home: "navHome",
    clock: "navClock",
    calendar: "navCalendar",
    calculator: "navCalculator",
    currency: "navCurrency",
    devtools: "navDevTools",
    notes: "navNotes",
    todo: "navTodo",
    clipboard: "navClipboard",
    passwords: "navPasswords",
    focus: "navFocus",
    tiktok: "navTikTok",
    system: "navSystem",
    network: "navNetwork",
    weather: "navWeather",
    settings: "navSettings",
    about: "navAbout",
  };
  return t[map[route]] as string;
}
