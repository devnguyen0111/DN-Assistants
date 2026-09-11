use serde::Serialize;
use std::sync::Mutex;
use std::time::Instant;
use sysinfo::{Networks, System};

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
pub struct SystemStats {
    pub cpu_name: String,
    pub global_cpu_usage: f32,
    pub per_core: Vec<f32>,
    pub memory: MemoryStats,
    pub network: NetworkStats,
    pub gpu: GpuStats,
}

pub struct Monitor {
    sys: System,
    networks: Networks,
    last_tick: Instant,
    nvml: Option<nvml_wrapper::Nvml>,
}

impl Monitor {
    pub fn new() -> Self {
        let mut sys = System::new();
        sys.refresh_cpu_all();
        sys.refresh_memory();

        let networks = Networks::new_with_refreshed_list();
        let nvml = nvml_wrapper::Nvml::init().ok();

        // Prime CPU counters so the first real sample is meaningful.
        std::thread::sleep(sysinfo::MINIMUM_CPU_UPDATE_INTERVAL);
        sys.refresh_cpu_usage();

        Self {
            sys,
            networks,
            last_tick: Instant::now(),
            nvml,
        }
    }

    pub fn snapshot(&mut self) -> SystemStats {
        self.sys.refresh_cpu_usage();
        self.sys.refresh_memory();
        self.networks.refresh(true);

        let elapsed = self.last_tick.elapsed().as_secs_f64().max(0.001);
        self.last_tick = Instant::now();

        let mut rx = 0u64;
        let mut tx = 0u64;
        for (_name, data) in self.networks.iter() {
            rx = rx.saturating_add(data.received());
            tx = tx.saturating_add(data.transmitted());
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
            gpu: self.read_gpu(),
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

            let utilization = device
                .utilization_rates()
                .ok()
                .map(|u| u.gpu as f32);
            let memory = device.memory_info().ok();
            let temperature = device
                .temperature(nvml_wrapper::enum_wrappers::device::TemperatureSensor::Gpu)
                .ok();
            let power_watts = device
                .power_usage()
                .ok()
                .map(|mw| mw as f32 / 1000.0);

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
