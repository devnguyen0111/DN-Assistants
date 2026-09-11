export type SystemStats = {
  cpu_name: string;
  global_cpu_usage: number;
  per_core: number[];
  memory: {
    used: number;
    total: number;
    swap_used: number;
    swap_total: number;
  };
  network: {
    rx_bytes_per_sec: number;
    tx_bytes_per_sec: number;
  };
  interfaces: Array<{
    name: string;
    rx_bytes_per_sec: number;
    tx_bytes_per_sec: number;
  }>;
  gpu: {
    available: boolean;
    name: string | null;
    utilization: number | null;
    memory_used: number | null;
    memory_total: number | null;
    temperature: number | null;
    power_watts: number | null;
  };
  disks: Array<{
    name: string;
    mount_point: string;
    total: number;
    available: number;
    used: number;
  }>;
  processes: Array<{
    pid: number;
    name: string;
    cpu_usage: number;
    memory: number;
  }>;
};
