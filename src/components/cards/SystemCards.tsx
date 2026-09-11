import { Cpu, Gauge, HardDrive, MemoryStick, Network, Thermometer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkline } from "@/components/charts/Sparkline";
import { useI18n, localeTag } from "@/lib/i18n";
import { formatBytes, formatPercent, formatRate } from "@/lib/utils";
import type { SystemHistory } from "@/hooks/useSystemStats";
import type { SystemStats } from "@/lib/system-types";

type Props = {
  stats: SystemStats | null;
  history: SystemHistory;
};

export function CpuCard({ stats, history }: Props) {
  const { locale, t } = useI18n();
  const tag = localeTag(locale);
  const usage = stats?.global_cpu_usage ?? 0;

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Cpu className="size-4 text-primary" />
          {t.cpu}
        </CardTitle>
        <Badge variant="secondary">{formatPercent(usage, tag)}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="line-clamp-2 text-xs text-muted-foreground">{stats?.cpu_name ?? t.loading}</p>
        <Sparkline values={history.cpu} />
        <div className="flex flex-wrap gap-1">
          {(stats?.per_core ?? []).slice(0, 8).map((core, index) => (
            <span
              key={index}
              className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] tabular-nums"
            >
              {Math.round(core)}%
            </span>
          ))}
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
        <Badge variant="secondary">{formatPercent(pct, tag)}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm font-medium">
          {formatBytes(used, tag)} / {formatBytes(total, tag)}
        </p>
        <Sparkline values={history.ram} />
        <p className="text-xs text-muted-foreground">
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
            <p className="font-medium tabular-nums">
              {formatRate(stats?.network.rx_bytes_per_sec ?? 0, tag)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t.upload}</p>
            <p className="font-medium tabular-nums">
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="size-4 text-primary" />
            {t.gpu}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t.unavailable}</p>
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
        <Badge variant="secondary">
          {formatPercent(gpu.utilization ?? 0, tag)}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="line-clamp-2 text-xs text-muted-foreground">{gpu.name}</p>
        <Sparkline values={history.gpu} />
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <Gauge className="size-3.5 text-muted-foreground" />
            <span>
              {t.vram}: {formatBytes(gpu.memory_used ?? 0, tag)} /{" "}
              {formatBytes(gpu.memory_total ?? 0, tag)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Thermometer className="size-3.5 text-muted-foreground" />
            <span>
              {t.temperature}: {gpu.temperature ?? "—"}°C
            </span>
          </div>
          <div className="col-span-2 text-muted-foreground">
            {t.power}: {gpu.power_watts != null ? `${gpu.power_watts.toFixed(0)} W` : "—"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
