use serde::{Deserialize, Serialize};
use std::net::{TcpStream, ToSocketAddrs};
use std::time::Duration;

const HTTP_TIMEOUT: Duration = Duration::from_secs(6);

#[derive(Debug, Clone, Serialize)]
pub struct PingResult {
    pub ok: bool,
    pub latency_ms: Option<f64>,
    pub output: String,
}

#[derive(Debug, Deserialize)]
struct IpifyResponse {
    ip: String,
}

#[derive(Debug, Deserialize)]
struct IpApiResponse {
    ip: String,
}

/// Fetches the machine's public IP address, trying ipify first and falling
/// back to ipapi.co if that fails.
#[tauri::command]
pub fn get_public_ip() -> Result<String, String> {
    let client = reqwest::blocking::Client::builder()
        .timeout(HTTP_TIMEOUT)
        .build()
        .map_err(|e| e.to_string())?;

    if let Ok(resp) = client
        .get("https://api.ipify.org?format=json")
        .send()
        .and_then(|r| r.error_for_status())
    {
        if let Ok(data) = resp.json::<IpifyResponse>() {
            return Ok(data.ip);
        }
    }

    let resp = client
        .get("https://ipapi.co/json/")
        .send()
        .and_then(|r| r.error_for_status())
        .map_err(|e| e.to_string())?;
    let data: IpApiResponse = resp.json().map_err(|e| e.to_string())?;
    Ok(data.ip)
}

/// Sends a single ping to `host` using the platform's `ping` binary and
/// parses the round-trip latency out of its output.
#[tauri::command]
pub fn ping_host(host: String) -> Result<PingResult, String> {
    let output = if cfg!(target_os = "windows") {
        std::process::Command::new("ping")
            .args(["-n", "1", "-w", "2000", &host])
            .output()
    } else {
        std::process::Command::new("ping")
            .args(["-c", "1", "-W", "2", &host])
            .output()
    };

    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout).to_string();
            let stderr = String::from_utf8_lossy(&out.stderr).to_string();
            let combined = if stdout.trim().is_empty() {
                stderr
            } else {
                stdout
            };
            let latency_ms = parse_latency_ms(&combined);
            Ok(PingResult {
                ok: out.status.success() && latency_ms.is_some(),
                latency_ms,
                output: combined,
            })
        }
        Err(e) => Ok(PingResult {
            ok: false,
            latency_ms: None,
            output: e.to_string(),
        }),
    }
}

/// Extracts the first `time=`/`time<` value (in ms) from `ping` output.
fn parse_latency_ms(text: &str) -> Option<f64> {
    let lower = text.to_lowercase();
    let idx = lower.find("time")?;
    let rest = lower[idx + "time".len()..].trim_start_matches(['=', '<', ' ']);
    let end = rest.find(|c: char| !c.is_ascii_digit() && c != '.')?;
    if end == 0 {
        return None;
    }
    rest[..end].parse::<f64>().ok()
}

/// Attempts a TCP connection to `host:port` with a 2s timeout.
#[tauri::command]
pub fn check_port(host: String, port: u16) -> bool {
    let addr = format!("{host}:{port}");
    match addr.to_socket_addrs() {
        Ok(mut addrs) => match addrs.next() {
            Some(socket_addr) => {
                TcpStream::connect_timeout(&socket_addr, Duration::from_secs(2)).is_ok()
            }
            None => false,
        },
        Err(_) => false,
    }
}
