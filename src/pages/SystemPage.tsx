import { PageLayout } from "@/components/layout/PageLayout";
import { ErrorState } from "@/components/ui/state-block";
import {
  CpuCard,
  DiskCard,
  GpuCard,
  NetworkCard,
  ProcessesCard,
  RamCard,
} from "@/components/cards/SystemCards";
import { PowerTimerCard } from "@/components/cards/PowerTimerCard";
import { useSystemStats } from "@/hooks/useSystemStats";
import { useI18n } from "@/lib/i18n";

export function SystemPage() {
  const { stats, history, error } = useSystemStats(2000);
  const { t } = useI18n();

  return (
    <PageLayout route="system">
      {error && <ErrorState title={t.systemError} details={error} />}
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr))]">
        <CpuCard stats={stats} history={history} />
        <RamCard stats={stats} history={history} />
        <GpuCard stats={stats} history={history} />
        <NetworkCard stats={stats} history={history} />
        <DiskCard stats={stats} />
        <PowerTimerCard />
      </div>
      <ProcessesCard stats={stats} />
    </PageLayout>
  );
}
