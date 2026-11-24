import { lazy, Suspense, useState, type ComponentType, type LazyExoticComponent } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n";

/** Load one named export lazily so each tool tab is its own chunk. */
function lazyTab<M>(load: () => Promise<M>, name: keyof M): LazyExoticComponent<ComponentType> {
  return lazy(() => load().then((m) => ({ default: m[name] as ComponentType })));
}

const JsonTab = lazyTab(() => import("@/components/tools/devtools/JsonTab"), "JsonTab");
const Base64Tab = lazyTab(() => import("@/components/tools/devtools/Base64Tab"), "Base64Tab");
const UrlTab = lazyTab(() => import("@/components/tools/devtools/UrlTab"), "UrlTab");
const JwtTab = lazyTab(() => import("@/components/tools/devtools/JwtTab"), "JwtTab");
const HashTab = lazyTab(() => import("@/components/tools/devtools/HashTab"), "HashTab");
const FileHashTab = lazyTab(() => import("@/components/tools/filetools/HasherTab"), "HasherTab");
const UuidTab = lazyTab(() => import("@/components/tools/devtools/UuidTab"), "UuidTab");
const QrTab = lazyTab(() => import("@/components/tools/devtools/QrTab"), "QrTab");
const QrScanTab = lazyTab(
  () => import("@/components/tools/filetools/QrScannerTab"),
  "QrScannerTab",
);
const RegexTab = lazyTab(() => import("@/components/tools/devtools/RegexTab"), "RegexTab");
const TimeTab = lazyTab(() => import("@/components/tools/devtools/TimeTab"), "TimeTab");
const DiffTab = lazyTab(() => import("@/components/tools/devtools/DiffTab"), "DiffTab");
const TextStatsTab = lazyTab(
  () => import("@/components/tools/filetools/TextInspectorTab"),
  "TextInspectorTab",
);
const UtilsTab = lazyTab(() => import("@/components/tools/devtools/UtilsTab"), "UtilsTab");

type ToolTab = {
  value: string;
  label: TranslationKey | string;
  /** One or more sections; several sections are stacked with a separator. */
  sections: { title?: TranslationKey; Component: ComponentType }[];
};

const TABS: ToolTab[] = [
  { value: "json", label: "JSON", sections: [{ Component: JsonTab }] },
  { value: "base64", label: "Base64", sections: [{ Component: Base64Tab }] },
  { value: "url", label: "URL", sections: [{ Component: UrlTab }] },
  { value: "jwt", label: "JWT", sections: [{ Component: JwtTab }] },
  {
    value: "hash",
    label: "hash",
    sections: [
      { title: "toolsHashText", Component: HashTab },
      { title: "fileHasherTab", Component: FileHashTab },
    ],
  },
  { value: "uuid", label: "uuid", sections: [{ Component: UuidTab }] },
  {
    value: "qr",
    label: "qrCode",
    sections: [
      { title: "toolsQrGenerate", Component: QrTab },
      { title: "qrScannerTab", Component: QrScanTab },
    ],
  },
  { value: "regex", label: "regexTester", sections: [{ Component: RegexTab }] },
  { value: "time", label: "toolsTime", sections: [{ Component: TimeTab }] },
  { value: "diff", label: "Diff", sections: [{ Component: DiffTab }] },
  {
    value: "text",
    label: "toolsText",
    sections: [
      { title: "toolsTextStats", Component: TextStatsTab },
      { title: "codeUtils", Component: UtilsTab },
    ],
  },
];

function TabFallback() {
  return <Skeleton className="h-64 w-full" />;
}

/**
 * Developer tools workspace (spec §5): vertical tool list with a filter at ≥960px content
 * width, a labeled "Tool" select below that. No outer card or repeated page title.
 */
export function DevToolsCard() {
  const { t } = useI18n();
  const label = (key: string) => (key in t ? t[key as TranslationKey] : key);
  const [active, setActive] = useState("json");
  const [query, setQuery] = useState("");
  const visible = TABS.filter((tab) =>
    label(tab.label).toLowerCase().includes(query.trim().toLowerCase()),
  );
  const current = TABS.find((tab) => tab.value === active) ?? TABS[0]!;

  return (
    <div className="@container">
      <div className="mb-4 max-w-xs @[960px]:hidden">
        <Label htmlFor="devtools-tool" className="text-caption text-text-3">
          {t.toolsPick}
        </Label>
        <Select value={active} onValueChange={setActive}>
          <SelectTrigger id="devtools-tool">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TABS.map((tab) => (
              <SelectItem key={tab.value} value={tab.value}>
                {label(tab.label)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs
        value={active}
        onValueChange={setActive}
        orientation="vertical"
        className="grid gap-5 @[960px]:grid-cols-[176px_minmax(0,1fr)]"
      >
        <div className="hidden space-y-2 @[960px]:block">
          <Input
            aria-label={t.toolsFilter}
            placeholder={t.toolsFilter}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <TabsList className="w-full">
            {visible.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="w-full">
                {label(tab.label)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value={current.value} forceMount className="mt-0 min-w-0 space-y-6">
          <Suspense fallback={<TabFallback />}>
            {current.sections.map(({ title, Component }, i) => (
              <section key={`${current.value}-${i}`} className="space-y-3">
                {title && <h2 className="text-section text-text-1">{t[title]}</h2>}
                <Component />
              </section>
            ))}
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
