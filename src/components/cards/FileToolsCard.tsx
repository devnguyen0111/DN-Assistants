import { lazy, Suspense } from "react";
import { FileEdit, ImageIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n";

const BatchRenamerTab = lazy(() =>
  import("@/components/tools/filetools/BatchRenamerTab").then((m) => ({
    default: m.BatchRenamerTab,
  })),
);
const ImageConverterTab = lazy(() =>
  import("@/components/tools/filetools/ImageConverterTab").then((m) => ({
    default: m.ImageConverterTab,
  })),
);

/**
 * File tools: batch rename and image conversion. Checksums, QR scanning and text stats
 * moved into Developer Tools (Hash / QR / Text tabs) next to their text-based siblings.
 */
export function FileToolsCard() {
  const { t } = useI18n();

  return (
    <div>
      <Tabs defaultValue="batch" className="w-full">
        <TabsList>
          <TabsTrigger value="batch" className="gap-1.5">
            <FileEdit className="size-3.5" />
            {t.batchRenamerTab}
          </TabsTrigger>
          <TabsTrigger value="image" className="gap-1.5">
            <ImageIcon className="size-3.5" />
            {t.imageConverterTab}
          </TabsTrigger>
        </TabsList>

        <Suspense fallback={<Skeleton className="mt-4 h-64 w-full" />}>
          <TabsContent value="batch" className="mt-4">
            <BatchRenamerTab />
          </TabsContent>
          <TabsContent value="image" className="mt-4">
            <ImageConverterTab />
          </TabsContent>
        </Suspense>
      </Tabs>
    </div>
  );
}
