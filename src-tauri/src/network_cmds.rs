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
/// Sync Tauri commands run on the main thread and freeze the UI; run blocking work off it.
async fn run_blocking<T, F>(f: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce() -> Result<T, String> + Send + 'static,
{
    tauri::async_runtime::spawn_blocking(f)
        .await
        .map_err(|e| e.to_string())?
}

/// Rejects hosts that are empty, contain whitespace, or could be parsed as CLI flags.
fn validate_host(host: &str) -> Result<&str, String> {
    let host = host.trim();
    if host.is_empty()
        || host.len() > 253
        || host.starts_with('-')
        || host.contains(char::is_whitespace)
    {
        return Err(format!("Invalid host: {host}"));
    }
    Ok(host)
}

#[tauri::command]
pub async fn get_public_ip() -> Result<String, String> {
    run_blocking(get_public_ip_blocking).await
}

fn get_public_ip_blocking() -> Result<String, String> {
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
pub async fn ping_host(host: String) -> Result<PingResult, String> {
    let host = validate_host(&host)?.to_string();
    run_blocking(move || Ok(ping_host_blocking(&host))).await
}

fn ping_host_blocking(host: &str) -> PingResult {
    let output = if cfg!(target_os = "windows") {
        std::process::Command::new("ping")
            .args(["-n", "1", "-w", "2000", host])
            .output()
    } else {
        std::process::Command::new("ping")
            .args(["-c", "1", "-W", "2", host])
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
            PingResult {
                ok: out.status.success() && latency_ms.is_some(),
                latency_ms,
                output: combined,
            }
        }
        Err(e) => PingResult {
            ok: false,
            latency_ms: None,
            output: e.to_string(),
        },
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
pub async fn check_port(host: String, port: u16) -> bool {
    let Ok(host) = validate_host(&host).map(str::to_string) else {
        return false;
    };
    run_blocking(move || Ok(check_port_blocking(&host, port)))
        .await
        .unwrap_or(false)
}

fn check_port_blocking(host: &str, port: u16) -> bool {
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

/// Resolves `host` to unique IP address strings via DNS (`ToSocketAddrs`).
#[tauri::command]
pub async fn dns_lookup(host: String) -> Result<Vec<String>, String> {
    let host = validate_host(&host)?.to_string();
    run_blocking(move || dns_lookup_blocking(&host)).await
}

fn dns_lookup_blocking(host: &str) -> Result<Vec<String>, String> {
    let addr = format!("{host}:0");
    let addrs = addr
        .to_socket_addrs()
        .map_err(|e| format!("DNS lookup failed for {host}: {e}"))?;

    let mut ips = Vec::new();
    for socket_addr in addrs {
        let ip = socket_addr.ip().to_string();
        if !ips.contains(&ip) {
            ips.push(ip);
        }
    }

    if ips.is_empty() {
        Err(format!("No addresses found for {host}"))
    } else {
        Ok(ips)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_windows_and_unix_ping_latency() {
        assert_eq!(
            parse_latency_ms("Reply from 1.1.1.1: bytes=32 time=12ms TTL=57"),
            Some(12.0)
        );
        assert_eq!(
            parse_latency_ms("Reply from 127.0.0.1: bytes=32 time<1ms TTL=128"),
            Some(1.0)
        );
        assert_eq!(
            parse_latency_ms("64 bytes from 1.1.1.1: icmp_seq=1 ttl=57 time=9.84 ms"),
            Some(9.84)
        );
        assert_eq!(parse_latency_ms("Request timed out."), None);
    }

    #[test]
    fn rejects_flag_like_or_empty_hosts() {
        assert!(validate_host("example.com").is_ok());
        assert!(validate_host("  1.1.1.1 ").is_ok());
        assert!(validate_host("-t").is_err());
        assert!(validate_host("").is_err());
        assert!(validate_host("a b").is_err());
    }
}
