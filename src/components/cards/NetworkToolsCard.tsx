import { useEffect, useState } from "react";
import { Gauge, Globe, Network, Search, Wifi } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { formatRate } from "@/lib/utils";
import type { SystemStats } from "@/lib/system-types";

async function safeInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(cmd, args);
}

type PingResult = {
  ok: boolean;
  latency_ms: number | null;
  output: string;
};

const SPEED_TEST_URL = "https://speed.cloudflare.com/__down?bytes=5000000";

export function NetworkToolsCard() {
  const { t } = useI18n();
  const [publicIp, setPublicIp] = useState<string | null>(null);
  const [ipLoading, setIpLoading] = useState(false);
  const [ipError, setIpError] = useState<string | null>(null);

  const [host, setHost] = useState("1.1.1.1");
  const [pingResult, setPingResult] = useState<string | null>(null);
  const [pinging, setPinging] = useState(false);

  const [port, setPort] = useState("443");
  const [portHost, setPortHost] = useState("1.1.1.1");
  const [portResult, setPortResult] = useState<boolean | null>(null);
  const [checkingPort, setCheckingPort] = useState(false);

  const [dnsHost, setDnsHost] = useState("example.com");
  const [dnsResults, setDnsResults] = useState<string[] | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  const [speedMbps, setSpeedMbps] = useState<number | null>(null);
  const [speedTesting, setSpeedTesting] = useState(false);

  const [stats, setStats] = useState<SystemStats | null>(null);

  const loadIp = async () => {
    setIpLoading(true);
    setIpError(null);
    try {
      const ip = await safeInvoke<string>("get_public_ip");
      setPublicIp(ip);
    } catch (err) {
      setIpError(err instanceof Error ? err.message : String(err));
    } finally {
      setIpLoading(false);
    }
  };

  useEffect(() => {
    void loadIp();
    void safeInvoke<SystemStats>("get_system_stats")
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  const runPing = async () => {
    if (!host.trim()) return;
    setPinging(true);
    setPingResult(null);
    try {
      const result = await safeInvoke<PingResult>("ping_host", { host: host.trim() });
      if (result.ok && result.latency_ms != null) {
        setPingResult(`${result.latency_ms} ms`);
      } else {
        toast.error(result.output || t.pingHost);
      }
    } catch (err) {
      setPingResult(null);
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setPinging(false);
    }
  };

  const runPortCheck = async () => {
    const portNum = Number(port);
    if (!portHost.trim() || !Number.isFinite(portNum)) return;
    setCheckingPort(true);
    setPortResult(null);
    try {
      const open = await safeInvoke<boolean>("check_port", {
        host: portHost.trim(),
        port: portNum,
      });
      setPortResult(open);
    } catch (err) {
      setPortResult(null);
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setCheckingPort(false);
    }
  };

  const runDnsLookup = async () => {
    if (!dnsHost.trim()) return;
    setLookingUp(true);
    setDnsResults(null);
    try {
      const ips = await safeInvoke<string[]>("dns_lookup", { host: dnsHost.trim() });
      setDnsResults(ips);
    } catch (err) {
      setDnsResults(null);
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLookingUp(false);
    }
  };

  const runSpeedTest = async () => {
    setSpeedTesting(true);
    setSpeedMbps(null);
    try {
      const { fetch } = await import("@tauri-apps/plugin-http");
      const start = performance.now();
      const response = await fetch(SPEED_TEST_URL);
      const buffer = await response.arrayBuffer();
      const seconds = (performance.now() - start) / 1000;
      if (seconds <= 0) throw new Error("Speed test timed out");
      const mbps = (buffer.byteLength * 8) / (seconds * 1_000_000);
      setSpeedMbps(mbps);
    } catch (err) {
      setSpeedMbps(null);
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSpeedTesting(false);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="size-4 text-primary" />
            {t.publicIp}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {ipLoading ? (
            <p className="text-sm text-muted-foreground">{t.loading}</p>
          ) : ipError ? (
            <p className="text-sm text-destructive">{ipError}</p>
          ) : (
            <p className="font-mono text-2xl font-semibold tabular-nums">{publicIp ?? "—"}</p>
          )}
          <Button size="sm" variant="outline" onClick={() => void loadIp()}>
            {t.refresh}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="size-4 text-primary" />
            {t.ping}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder={t.pingHost}
              value={host}
              onChange={(e) => setHost(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void runPing()}
            />
            <Button size="sm" onClick={() => void runPing()} disabled={pinging}>
              {t.ping}
            </Button>
          </div>
          {pingResult && (
            <p className="font-mono text-lg font-semibold tabular-nums">
              {t.latency}: {pingResult}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.checkPort}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder={t.pingHost}
              value={portHost}
              onChange={(e) => setPortHost(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder={t.port}
              value={port}
              onChange={(e) => setPort(e.target.value)}
              className="w-20"
              type="number"
            />
            <Button size="sm" onClick={() => void runPortCheck()} disabled={checkingPort}>
              {t.checkPort}
            </Button>
          </div>
          {portResult != null && (
            <Badge variant={portResult ? "default" : "secondary"}>
              {portResult ? t.open : t.closed}
            </Badge>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="size-4 text-primary" />
            {t.network}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">{t.download}</p>
              <p className="font-mono font-medium tabular-nums">
                {formatRate(stats?.network.rx_bytes_per_sec ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t.upload}</p>
              <p className="font-mono font-medium tabular-nums">
                {formatRate(stats?.network.tx_bytes_per_sec ?? 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="size-4 text-primary" />
            {t.dnsLookup}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder={t.dnsHost}
              value={dnsHost}
              onChange={(e) => setDnsHost(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void runDnsLookup()}
            />
            <Button size="sm" onClick={() => void runDnsLookup()} disabled={lookingUp}>
              {t.dnsLookup}
            </Button>
          </div>
          {dnsResults && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t.dnsResult}</p>
              <ul className="space-y-0.5 font-mono text-sm tabular-nums">
                {dnsResults.map((ip) => (
                  <li key={ip}>{ip}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="size-4 text-primary" />
            {t.speedTest}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">{t.speedTestHint}</p>
          <Button size="sm" onClick={() => void runSpeedTest()} disabled={speedTesting}>
            {speedTesting ? t.loading : t.speedTestRun}
          </Button>
          {speedMbps != null && (
            <p className="font-mono text-lg font-semibold tabular-nums">
              {t.speedTestResult.replace("{n}", speedMbps.toFixed(1))}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
