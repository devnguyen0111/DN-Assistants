use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use sysinfo::{Disks, Networks, Pid, ProcessRefreshKind, ProcessesToUpdate, System};
use tauri::{AppHandle, Emitter, Manager};

/// Global switch to pause the background metrics emitter loop (e.g. while
/// the window is hidden) without tearing down the thread.
pub static METRICS_PAUSED: AtomicBool = AtomicBool::new(false);

const PROCESS_REFRESH_INTERVAL: Duration = Duration::from_secs(3);
const DISK_REFRESH_INTERVAL: Duration = Duration::from_secs(10);

#[tauri::command]
pub fn set_metrics_paused(paused: bool) {
    METRICS_PAUSED.store(paused, Ordering::Relaxed);
}

#[derive(Debug, Clone, Serialize)]
pub struct MemoryStats {
    pub used: u64,
    pub total: u64,
    pub swap_used: u64,
    pub swap_total: u64,
}

#[derive(Debug, Clone, Serialize)]
pub struct NetworkStats {
    pub rx_bytes_per_sec: f64,
    pub tx_bytes_per_sec: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct InterfaceStats {
    pub name: String,
    pub rx_bytes_per_sec: f64,
    pub tx_bytes_per_sec: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct GpuStats {
    pub available: bool,
    pub name: Option<String>,
    pub utilization: Option<f32>,
    pub memory_used: Option<u64>,
    pub memory_total: Option<u64>,
    pub temperature: Option<u32>,
    pub power_watts: Option<f32>,
}

#[derive(Debug, Clone, Serialize)]
pub struct DiskStats {
    pub name: String,
    pub mount_point: String,
    pub total: u64,
    pub available: u64,
    pub used: u64,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProcessStats {
    pub pid: u32,
    pub name: String,
    pub cpu_usage: f32,
    pub memory: u64,
}

#[derive(Debug, Clone, Serialize)]
pub struct SystemStats {
    pub cpu_name: String,
    pub global_cpu_usage: f32,
    pub per_core: Vec<f32>,
    pub memory: MemoryStats,
    pub network: NetworkStats,
    pub interfaces: Vec<InterfaceStats>,
    pub gpu: GpuStats,
    pub disks: Vec<DiskStats>,
    pub processes: Vec<ProcessStats>,
}

pub struct Monitor {
    sys: System,
    networks: Networks,
    disks: Disks,
    last_tick: Instant,
    nvml: Option<nvml_wrapper::Nvml>,
    last_process_refresh: Option<Instant>,
    last_disk_refresh: Option<Instant>,
    cached_processes: Vec<ProcessStats>,
    cached_disks: Vec<DiskStats>,
}

impl Monitor {
    pub fn new() -> Self {
        let mut sys = System::new();
        sys.refresh_cpu_all();
        sys.refresh_memory();
        // Defer full process list to first snapshot so the window can open faster.

        let networks = Networks::new_with_refreshed_list();
        let disks = Disks::new_with_refreshed_list();
        let nvml = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            nvml_wrapper::Nvml::init().ok()
        }))
        .ok()
        .flatten();

        sys.refresh_cpu_usage();

        Self {
            sys,
            networks,
            disks,
            last_tick: Instant::now(),
            nvml,
            last_process_refresh: None,
            last_disk_refresh: None,
            cached_processes: Vec::new(),
            cached_disks: Vec::new(),
        }
    }

    pub fn snapshot(&mut self) -> SystemStats {
        // CPU, memory and network are refreshed on every snapshot.
        self.sys.refresh_cpu_usage();
        self.sys.refresh_memory();
        self.networks.refresh(true);

        let elapsed = self.last_tick.elapsed().as_secs_f64().max(0.001);
        self.last_tick = Instant::now();

        let mut rx = 0u64;
        let mut tx = 0u64;
        let mut interfaces = Vec::new();
        for (name, data) in self.networks.iter() {
            rx = rx.saturating_add(data.received());
            tx = tx.saturating_add(data.transmitted());
            interfaces.push(InterfaceStats {
                name: name.clone(),
                rx_bytes_per_sec: data.received() as f64 / elapsed,
                tx_bytes_per_sec: data.transmitted() as f64 / elapsed,
            });
        }

        // Processes are comparatively expensive to enumerate; refresh on a
        // slower cadence and reuse the cached list otherwise.
        let now = Instant::now();
        let should_refresh_processes = match self.last_process_refresh {
            Some(last) => now.duration_since(last) >= PROCESS_REFRESH_INTERVAL,
            None => true,
        };
        if should_refresh_processes {
            self.sys.refresh_processes_specifics(
                ProcessesToUpdate::All,
                true,
                ProcessRefreshKind::nothing().with_cpu().with_memory(),
            );
            let mut processes: Vec<ProcessStats> = self
                .sys
                .processes()
                .iter()
                .map(|(pid, process)| ProcessStats {
                    pid: pid.as_u32(),
                    name: process.name().to_string_lossy().to_string(),
                    cpu_usage: process.cpu_usage(),
                    memory: process.memory(),
                })
                .collect();
            processes.sort_by(|a, b| {
                b.cpu_usage
                    .partial_cmp(&a.cpu_usage)
                    .unwrap_or(std::cmp::Ordering::Equal)
            });
            processes.truncate(12);
            self.cached_processes = processes;
            self.last_process_refresh = Some(now);
        }

        // Disks change rarely; refresh on an even slower cadence.
        let should_refresh_disks = match self.last_disk_refresh {
            Some(last) => now.duration_since(last) >= DISK_REFRESH_INTERVAL,
            None => true,
        };
        if should_refresh_disks {
            self.disks.refresh(true);
            self.cached_disks = self
                .disks
                .iter()
                .map(|disk| {
                    let total = disk.total_space();
                    let available = disk.available_space();
                    let used = total.saturating_sub(available);
                    DiskStats {
                        name: disk.name().to_string_lossy().to_string(),
                        mount_point: disk.mount_point().to_string_lossy().to_string(),
                        total,
                        available,
                        used,
                    }
                })
                .filter(|d| d.total > 0)
                .collect();
            self.last_disk_refresh = Some(now);
        }

        let cpu_name = self
            .sys
            .cpus()
            .first()
            .map(|c| c.brand().to_string())
            .unwrap_or_else(|| "Unknown CPU".to_string());

        SystemStats {
            cpu_name,
            global_cpu_usage: self.sys.global_cpu_usage(),
            per_core: self.sys.cpus().iter().map(|c| c.cpu_usage()).collect(),
            memory: MemoryStats {
                used: self.sys.used_memory(),
                total: self.sys.total_memory(),
                swap_used: self.sys.used_swap(),
                swap_total: self.sys.total_swap(),
            },
            network: NetworkStats {
                rx_bytes_per_sec: rx as f64 / elapsed,
                tx_bytes_per_sec: tx as f64 / elapsed,
            },
            interfaces,
            gpu: self.read_gpu(),
            disks: self.cached_disks.clone(),
            processes: self.cached_processes.clone(),
        }
    }

    fn read_gpu(&self) -> GpuStats {
        let Some(nvml) = &self.nvml else {
            return GpuStats {
                available: false,
                name: None,
                utilization: None,
                memory_used: None,
                memory_total: None,
                temperature: None,
                power_watts: None,
            };
        };

        let Ok(count) = nvml.device_count() else {
            return GpuStats {
                available: false,
                name: None,
                utilization: None,
                memory_used: None,
                memory_total: None,
                temperature: None,
                power_watts: None,
            };
        };

        for index in 0..count {
            let Ok(device) = nvml.device_by_index(index) else {
                continue;
            };
            let Ok(name) = device.name() else {
                continue;
            };
            let lower = name.to_lowercase();
            if lower.contains("parsec") || lower.contains("virtual") {
                continue;
            }

            let utilization = device.utilization_rates().ok().map(|u| u.gpu as f32);
            let memory = device.memory_info().ok();
            let temperature = device
                .temperature(nvml_wrapper::enum_wrappers::device::TemperatureSensor::Gpu)
                .ok();
            let power_watts = device.power_usage().ok().map(|mw| mw as f32 / 1000.0);

            return GpuStats {
                available: true,
                name: Some(name),
                utilization,
                memory_used: memory.as_ref().map(|m| m.used),
                memory_total: memory.as_ref().map(|m| m.total),
                temperature,
                power_watts,
            };
        }

        GpuStats {
            available: false,
            name: None,
            utilization: None,
            memory_used: None,
            memory_total: None,
            temperature: None,
            power_watts: None,
        }
    }
}

#[tauri::command]
pub fn get_system_stats(state: tauri::State<'_, Mutex<Monitor>>) -> Result<SystemStats, String> {
    let mut monitor = state.lock().map_err(|e| e.to_string())?;
    Ok(monitor.snapshot())
}

/// Terminates the process with the given PID via sysinfo.
#[tauri::command]
pub fn kill_process(pid: u32) -> Result<(), String> {
    let mut sys = System::new();
    let target = Pid::from_u32(pid);
    sys.refresh_processes_specifics(
        ProcessesToUpdate::Some(&[target]),
        true,
        ProcessRefreshKind::nothing(),
    );

    match sys.process(target) {
        Some(process) => {
            if process.kill() {
                Ok(())
            } else {
                Err(format!("Failed to kill process {pid}"))
            }
        }
        None => Err(format!("Process {pid} not found")),
    }
}

fn format_tooltip(stats: &SystemStats) -> String {
    let ram_pct = if stats.memory.total > 0 {
        (stats.memory.used as f64 / stats.memory.total as f64) * 100.0
    } else {
        0.0
    };
    format!(
        "DN Assistant\nCPU: {:.0}%  RAM: {:.0}%",
        stats.global_cpu_usage, ram_pct
    )
}

/// Spawns a background thread that periodically emits a `system-stats` event
/// with a fresh `SystemStats` snapshot, unless paused via `METRICS_PAUSED`.
pub fn start_metrics_emitter(app: AppHandle) {
    std::thread::spawn(move || loop {
        std::thread::sleep(Duration::from_secs(1));

        if METRICS_PAUSED.load(Ordering::Relaxed) {
            continue;
        }

        let Some(state) = app.try_state::<Mutex<Monitor>>() else {
            continue;
        };

        let stats = {
            let Ok(mut monitor) = state.lock() else {
                continue;
            };
            monitor.snapshot()
        };

        if let Some(tray) = app.tray_by_id("main-tray") {
            let _ = tray.set_tooltip(Some(format_tooltip(&stats)));
        }

        let _ = app.emit("system-stats", &stats);
    });
}
