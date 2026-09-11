import { useEffect, useRef } from "react";
import { animate, createScope, stagger } from "animejs";
import { BentoGrid, BentoItem } from "@/components/bento/BentoGrid";
import {
  CpuCard,
  DiskCard,
  GpuCard,
  NetworkCard,
  ProcessesCard,
  RamCard,
} from "@/components/cards/SystemCards";
import { useSystemStats } from "@/hooks/useSystemStats";
import { useI18n } from "@/lib/i18n";

export function SystemPage() {
  const root = useRef<HTMLDivElement>(null);
  const scope = useRef<ReturnType<typeof createScope> | null>(null);
  const { stats, history, error } = useSystemStats(1000);
  const { t } = useI18n();

  useEffect(() => {
    if (!root.current) return;
    scope.current = createScope({ root }).add(() => {
      animate(".bento-item", {
        opacity: [0, 1],
        y: [16, 0],
        delay: stagger(50),
        duration: 420,
        ease: "outCubic",
      });
    });
    return () => scope.current?.revert();
  }, []);

  return (
    <div ref={root} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {t.systemError}: {error}
        </div>
      )}
      <BentoGrid className="xl:grid-cols-2">
        <BentoItem>
          <CpuCard stats={stats} history={history} />
        </BentoItem>
        <BentoItem>
          <RamCard stats={stats} history={history} />
        </BentoItem>
        <BentoItem>
          <GpuCard stats={stats} history={history} />
        </BentoItem>
        <BentoItem>
          <NetworkCard stats={stats} history={history} />
        </BentoItem>
        <BentoItem>
          <DiskCard stats={stats} />
        </BentoItem>
        <BentoItem className="md:col-span-2 xl:col-span-2">
          <ProcessesCard stats={stats} />
        </BentoItem>
      </BentoGrid>
    </div>
  );
}
