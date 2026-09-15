import { useState } from "react";
import { Cpu, Gauge, HardDrive, MemoryStick, Network, Thermometer, X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sparkline } from "@/components/charts/Sparkline";
import { useI18n, localeTag } from "@/lib/i18n";
import { formatBytes, formatPercent, formatRate } from "@/lib/utils";
import type { SystemHistory } from "@/hooks/useSystemStats";
import type { SystemStats } from "@/lib/system-types";

type Props = {
  stats: SystemStats | null;
  history: SystemHistory;
};

const CORE_SLOTS = 8;

function StatSkeleton() {
  return <Skeleton className="h-4 w-20" />;
}

export function CpuCard({ stats, history }: Props) {
  const { locale, t } = useI18n();
  const tag = localeTag(locale);
  const usage = stats?.global_cpu_usage ?? 0;
  const cores = stats?.per_core ?? [];

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Cpu className="size-4 text-primary" />
          {t.cpu}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7"
            onClick={() => void import("@/lib/routing").then((m) => m.openWidgetWindow("cpu"))}
          >
            {t.openWidget}
          </Button>
          <Badge variant="secondary" className="min-w-[4.5ch] justify-center font-mono tabular-nums">
            {stats ? formatPercent(usage, tag) : <StatSkeleton />}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="line-clamp-2 min-h-8 text-xs text-muted-foreground">
          {stats?.cpu_name ?? t.loading}
        </p>
        <Sparkline values={history.cpu} />
        <div className="flex flex-wrap gap-1">
          {(cores.length > 0 ? cores : Array.from({ length: CORE_SLOTS }, () => null)).map(
            (core, index) => (
              <span
                key={index}
                className="inline-flex min-w-[3.25ch] justify-center rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] tabular-nums"
              >
                {core != null ? `${Math.round(core)}%` : "—"}
              </span>
            ),
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function RamCard({ stats, history }: Props) {
  const { locale, t } = useI18n();
  const tag = localeTag(locale);
  const used = stats?.memory.used ?? 0;
  const total = stats?.memory.total ?? 0;
  const pct = total > 0 ? (used / total) * 100 : 0;

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <MemoryStick className="size-4 text-primary" />
          {t.ram}
        </CardTitle>
        <Badge variant="secondary" className="min-w-[4.5ch] justify-center font-mono tabular-nums">
          {formatPercent(pct, tag)}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="min-w-[14ch] font-mono text-sm font-medium tabular-nums">
          {formatBytes(used, tag)} / {formatBytes(total, tag)}
        </p>
        <Sparkline values={history.ram} />
        <p className="font-mono text-xs text-muted-foreground tabular-nums">
          {t.swap}: {formatBytes(stats?.memory.swap_used ?? 0, tag)} /{" "}
          {formatBytes(stats?.memory.swap_total ?? 0, tag)}
        </p>
      </CardContent>
    </Card>
  );
}

export function NetworkCard({ stats, history }: Props) {
  const { locale, t } = useI18n();
  const tag = localeTag(locale);
  const maxRate = Math.max(1, ...history.rx, ...history.tx);

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Network className="size-4 text-primary" />
          {t.network}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">{t.download}</p>
            <p className="min-w-[10ch] font-mono font-medium tabular-nums">
              {formatRate(stats?.network.rx_bytes_per_sec ?? 0, tag)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t.upload}</p>
            <p className="min-w-[10ch] font-mono font-medium tabular-nums">
              {formatRate(stats?.network.tx_bytes_per_sec ?? 0, tag)}
            </p>
          </div>
        </div>
        <Sparkline values={history.rx} max={maxRate} className="text-chart-2" />
        <Sparkline values={history.tx} max={maxRate} className="text-chart-5" />
      </CardContent>
    </Card>
  );
}

export function GpuCard({ stats, history }: Props) {
  const { locale, t } = useI18n();
  const tag = localeTag(locale);
  const gpu = stats?.gpu;

  if (!gpu?.available) {
    return (
      <Card className="h-full">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="size-4 text-primary" />
            {t.gpu}
          </CardTitle>
          <Badge variant="secondary" className="min-w-[4.5ch] justify-center font-mono tabular-nums">
            {formatPercent(0, tag)}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="line-clamp-2 min-h-8 text-xs text-muted-foreground">{t.unavailable}</p>
          <Sparkline values={history.gpu} />
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Gauge className="size-3.5" />
              <span>
                {t.vram}: {formatBytes(0, tag)} / {formatBytes(0, tag)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Thermometer className="size-3.5" />
              <span>
                {t.temperature}: —°C
              </span>
            </div>
            <div className="col-span-2">
              {t.power}: —
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="size-4 text-primary" />
          {t.gpu}
        </CardTitle>
        <Badge variant="secondary" className="min-w-[4.5ch] justify-center font-mono tabular-nums">
          {formatPercent(gpu.utilization ?? 0, tag)}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="line-clamp-2 min-h-8 text-xs text-muted-foreground">{gpu.name}</p>
        <Sparkline values={history.gpu} />
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <Gauge className="size-3.5 text-muted-foreground" />
            <span className="font-mono tabular-nums">
              {t.vram}: {formatBytes(gpu.memory_used ?? 0, tag)} /{" "}
              {formatBytes(gpu.memory_total ?? 0, tag)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Thermometer className="size-3.5 text-muted-foreground" />
            <span className="font-mono tabular-nums">
              {t.temperature}: {gpu.temperature ?? "—"}°C
            </span>
          </div>
          <div className="col-span-2 text-muted-foreground font-mono tabular-nums">
            {t.power}: {gpu.power_watts != null ? `${gpu.power_watts.toFixed(0)} W` : "—"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DiskCard({ stats }: { stats: SystemStats | null }) {
  const { locale, t } = useI18n();
  const tag = localeTag(locale);
  const disks = stats?.disks ?? [];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="size-4 text-primary" />
          {t.disk}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {disks.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.loading}</p>
        ) : (
          disks.slice(0, 6).map((disk) => {
            const pct = disk.total > 0 ? (disk.used / disk.total) * 100 : 0;
            return (
              <div key={`${disk.mount_point}-${disk.name}`} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate font-medium">
                    {disk.mount_point || disk.name}
                  </span>
                  <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
                    {formatPercent(pct, tag)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                  />
                </div>
                <p className="font-mono text-[10px] text-muted-foreground tabular-nums">
                  {formatBytes(disk.used, tag)} / {formatBytes(disk.total, tag)} · {t.free}{" "}
                  {formatBytes(disk.available, tag)}
                </p>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

export function ProcessesCard({ stats }: { stats: SystemStats | null }) {
  const { locale, t } = useI18n();
  const tag = localeTag(locale);
  const processes = stats?.processes ?? [];
  const [pendingKill, setPendingKill] = useState<{ pid: number; name: string } | null>(null);
  const [killing, setKilling] = useState(false);

  const confirmKill = async () => {
    if (!pendingKill) return;
    setKilling(true);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("kill_process", { pid: pendingKill.pid });
      toast.success(t.killProcessSuccess);
      setPendingKill(null);
    } catch {
      toast.error(t.killProcessFailed);
    } finally {
      setKilling(false);
    }
  };

  return (
    <>
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="size-4 text-primary" />
            {t.processes}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-2 grid grid-cols-[minmax(0,1fr)_4.5rem_5.5rem_2rem] gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
            <span>{t.processName}</span>
            <span className="text-right">{t.cpu}</span>
            <span className="text-right">{t.ram}</span>
            <span />
          </div>
          <div className="space-y-1.5">
            {processes.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.loading}</p>
            ) : (
              processes.map((proc) => (
                <div
                  key={proc.pid}
                  className="grid grid-cols-[minmax(0,1fr)_4.5rem_5.5rem_2rem] items-center gap-2 rounded-md px-1 py-1 text-xs hover:bg-muted/40"
                >
                  <span className="truncate" title={`${proc.name} (#${proc.pid})`}>
                    {proc.name || `PID ${proc.pid}`}
                  </span>
                  <span className="text-right font-mono tabular-nums">
                    {formatPercent(proc.cpu_usage, tag)}
                  </span>
                  <span className="text-right font-mono tabular-nums">
                    {formatBytes(proc.memory, tag)}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 text-destructive hover:text-destructive"
                    title={t.killProcess}
                    onClick={() =>
                      setPendingKill({
                        pid: proc.pid,
                        name: proc.name || `PID ${proc.pid}`,
                      })
                    }
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={pendingKill != null}
        onOpenChange={(open) => {
          if (!open && !killing) setPendingKill(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t.killProcessConfirm
                .replace("{name}", pendingKill?.name ?? "")
                .replace("{pid}", String(pendingKill?.pid ?? ""))}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={killing}>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction disabled={killing} onClick={() => void confirmKill()}>
              {t.killProcess}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
