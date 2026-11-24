use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

const PREFIX: &str = "dn-assistant-auto-";
const EXT: &str = "dnbackup";

/// Writes an (already encrypted) auto backup into `dir` and keeps only the newest `keep`
/// auto-backup files there. Done in Rust because the folder is chosen once and must stay
/// writable across restarts, outside the frontend fs scope.
#[tauri::command]
pub async fn write_auto_backup(dir: String, contents: String, keep: u32) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || write_blocking(Path::new(&dir), &contents, keep))
        .await
        .map_err(|e| e.to_string())?
}

fn write_blocking(dir: &Path, contents: &str, keep: u32) -> Result<String, String> {
    if !dir.is_absolute() {
        return Err("Backup folder must be an absolute path".into());
    }
    fs::create_dir_all(dir).map_err(|e| format!("Cannot create backup folder: {e}"))?;

    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let path = dir.join(format!("{PREFIX}{secs}.{EXT}"));
    let tmp = path.with_extension("tmp");
    fs::write(&tmp, contents).map_err(|e| format!("Cannot write backup: {e}"))?;
    fs::rename(&tmp, &path).map_err(|e| format!("Cannot finalize backup: {e}"))?;

    prune(dir, keep.max(1) as usize);
    Ok(path.to_string_lossy().into_owned())
}

fn prune(dir: &Path, keep: usize) {
    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };
    let mut files: Vec<PathBuf> = entries
        .flatten()
        .map(|e| e.path())
        .filter(|p| {
            p.extension().and_then(|e| e.to_str()) == Some(EXT)
                && p.file_name()
                    .and_then(|n| n.to_str())
                    .is_some_and(|n| n.starts_with(PREFIX))
        })
        .collect();
    // Names embed a unix timestamp of fixed width (10 digits until 2286), so lexical = chronological.
    files.sort();
    let excess = files.len().saturating_sub(keep);
    for old in files.into_iter().take(excess) {
        let _ = fs::remove_file(old);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keeps_only_newest_auto_backups() {
        let dir = std::env::temp_dir().join(format!("dn-backup-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        for ts in ["1700000001", "1700000002", "1700000003"] {
            fs::write(dir.join(format!("{PREFIX}{ts}.{EXT}")), "x").unwrap();
        }
        fs::write(dir.join("manual.dnbackup"), "x").unwrap();
        prune(&dir, 2);
        let mut names: Vec<String> = fs::read_dir(&dir)
            .unwrap()
            .flatten()
            .map(|e| e.file_name().to_string_lossy().into_owned())
            .collect();
        names.sort();
        assert_eq!(
            names,
            vec![
                format!("{PREFIX}1700000002.{EXT}"),
                format!("{PREFIX}1700000003.{EXT}"),
                "manual.dnbackup".to_string()
            ]
        );
        let _ = fs::remove_dir_all(&dir);
    }
}
