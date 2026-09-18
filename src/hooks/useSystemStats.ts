import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
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

function applyStats(
  next: SystemStats,
  setStats: (s: SystemStats) => void,
  setHistory: Dispatch<SetStateAction<SystemHistory>>,
  setError: (e: string | null) => void,
) {
  setStats(next);
  setError(null);
  setHistory((prev) => ({
    cpu: push(prev.cpu, next.global_cpu_usage),
    ram: push(prev.ram, next.memory.total > 0 ? (next.memory.used / next.memory.total) * 100 : 0),
    rx: push(prev.rx, next.network.rx_bytes_per_sec),
    tx: push(prev.tx, next.network.tx_bytes_per_sec),
    gpu: push(prev.gpu, next.gpu.utilization ?? 0),
  }));
}

export function useSystemStats(_intervalMs = 1000) {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [history, setHistory] = useState<SystemHistory>(emptyHistory);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    let unlisten: (() => void) | undefined;
    let pollTimer: number | undefined;

    void (async () => {
      try {
        const next = await invoke<SystemStats>("get_system_stats");
        if (mounted.current) applyStats(next, setStats, setHistory, setError);
      } catch (err) {
        if (mounted.current) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }

      try {
        await invoke("set_metrics_paused", { paused: false });
      } catch {
        // older builds / browser
      }

      try {
        unlisten = await listen<SystemStats>("system-stats", (event) => {
          if (!mounted.current) return;
          applyStats(event.payload, setStats, setHistory, setError);
        });
      } catch {
        pollTimer = window.setInterval(() => {
          void invoke<SystemStats>("get_system_stats")
            .then((next) => {
              if (mounted.current) applyStats(next, setStats, setHistory, setError);
            })
            .catch((err) => {
              if (mounted.current) {
                setError(err instanceof Error ? err.message : String(err));
              }
            });
        }, _intervalMs);
      }
    })();

    const onVis = () => {
      void invoke("set_metrics_paused", { paused: document.hidden }).catch(() => undefined);
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      mounted.current = false;
      document.removeEventListener("visibilitychange", onVis);
      unlisten?.();
      if (pollTimer) window.clearInterval(pollTimer);
      void invoke("set_metrics_paused", { paused: true }).catch(() => undefined);
    };
  }, [_intervalMs]);

  return { stats, history, error };
}
