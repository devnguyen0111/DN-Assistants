import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { SystemStats } from "@/lib/system-types";

const HISTORY = 60;

export type SystemHistory = {
  cpu: number[];
  ram: number[];
  rx: number[];
  tx: number[];
  gpu: number[];
};

const emptyHistory = (): SystemHistory => ({
  cpu: [],
  ram: [],
  rx: [],
  tx: [],
  gpu: [],
});

function push(list: number[], value: number) {
  const next = [...list, value];
  if (next.length > HISTORY) next.shift();
  return next;
}

export function useSystemStats(intervalMs = 1000) {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [history, setHistory] = useState<SystemHistory>(emptyHistory);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    let timer: number | undefined;

    const tick = async () => {
      try {
        const next = await invoke<SystemStats>("get_system_stats");
        if (!mounted.current) return;
        setStats(next);
        setError(null);
        setHistory((prev) => ({
          cpu: push(prev.cpu, next.global_cpu_usage),
          ram: push(
            prev.ram,
            next.memory.total > 0 ? (next.memory.used / next.memory.total) * 100 : 0,
          ),
          rx: push(prev.rx, next.network.rx_bytes_per_sec),
          tx: push(prev.tx, next.network.tx_bytes_per_sec),
          gpu: push(prev.gpu, next.gpu.utilization ?? 0),
        }));
      } catch (err) {
        if (!mounted.current) return;
        setError(err instanceof Error ? err.message : String(err));
      }
    };

    void tick();
    timer = window.setInterval(() => void tick(), intervalMs);
    return () => {
      mounted.current = false;
      if (timer) window.clearInterval(timer);
    };
  }, [intervalMs]);

  return { stats, history, error };
}
