//! Native batch rename for the File Tools page.
//!
//! Renames happen inside each file's own folder (the new value is a file *name*, never a
//! path) and run in two phases — every source is first moved to a unique temporary name,
//! then to its final name — so swaps (a↔b) and case-only renames work on Windows.
//! Existing files that are not part of the batch are never overwritten.

use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Deserialize)]
pub struct RenameOp {
    /// Absolute path of the existing file.
    pub from: String,
    /// New file name (no directory part).
    pub to_name: String,
}

#[derive(Debug, Serialize)]
pub struct RenameResult {
    pub from: String,
    pub to: String,
    pub ok: bool,
    pub error: Option<String>,
}

const RESERVED: [&str; 22] = [
    "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8",
    "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
];

pub fn validate_name(name: &str) -> Result<(), String> {
    if name.is_empty() || name == "." || name == ".." {
        return Err("Empty file name".into());
    }
    if name.len() > 255 {
        return Err("File name is too long".into());
    }
    if name
        .chars()
        .any(|c| matches!(c, '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*') || c < ' ')
    {
        return Err(format!("Invalid character in \"{name}\""));
    }
    if name.ends_with(' ') || name.ends_with('.') {
        return Err(format!("\"{name}\" cannot end with a space or dot"));
    }
    let stem = name.split('.').next().unwrap_or("").to_ascii_uppercase();
    if RESERVED.contains(&stem.as_str()) {
        return Err(format!("\"{name}\" is a reserved Windows name"));
    }
    Ok(())
}

fn key(p: &Path) -> String {
    // Case-insensitive identity, matching Windows/macOS default file systems.
    p.to_string_lossy().to_lowercase()
}

#[tauri::command]
pub async fn rename_files(ops: Vec<RenameOp>) -> Result<Vec<RenameResult>, String> {
    tauri::async_runtime::spawn_blocking(move || rename_blocking(ops))
        .await
        .map_err(|e| e.to_string())
}

pub fn rename_blocking(ops: Vec<RenameOp>) -> Vec<RenameResult> {
    let sources: HashSet<String> = ops.iter().map(|o| key(Path::new(&o.from))).collect();
    let mut seen_targets = HashSet::new();
    let mut results: Vec<RenameResult> = Vec::with_capacity(ops.len());
    // (index into results, source, temp, final)
    let mut staged: Vec<(usize, PathBuf, PathBuf, PathBuf)> = Vec::new();

    for (i, op) in ops.iter().enumerate() {
        let from = PathBuf::from(&op.from);
        let to = from
            .parent()
            .map(|dir| dir.join(&op.to_name))
            .unwrap_or_else(|| PathBuf::from(&op.to_name));
        let mut fail = |msg: String| {
            results.push(RenameResult {
                from: op.from.clone(),
                to: to.to_string_lossy().into_owned(),
                ok: false,
                error: Some(msg),
            });
        };

        if let Err(e) = validate_name(&op.to_name) {
            fail(e);
            continue;
        }
        if !from.is_file() {
            fail("File not found".into());
            continue;
        }
        let to_key = key(&to);
        if !seen_targets.insert(to_key.clone()) {
            fail("Another file in this batch gets the same name".into());
            continue;
        }
        // Occupied by a file outside the batch → never overwrite it.
        if to.exists() && !sources.contains(&to_key) {
            fail("A file with this name already exists".into());
            continue;
        }

        results.push(RenameResult {
            from: op.from.clone(),
            to: to.to_string_lossy().into_owned(),
            ok: false,
            error: None,
        });
        let temp = from.with_file_name(format!(".dn-rename-{}-{i}.tmp", std::process::id()));
        staged.push((results.len() - 1, from, temp, to));
    }

    // Phase 1: move every source out of the way.
    let mut phase2 = Vec::new();
    for (idx, from, temp, to) in staged {
        match fs::rename(&from, &temp) {
            Ok(()) => phase2.push((idx, from, temp, to)),
            Err(e) => results[idx].error = Some(e.to_string()),
        }
    }
    // Phase 2: temp → final; on failure, try to restore the original name.
    for (idx, from, temp, to) in phase2 {
        match fs::rename(&temp, &to) {
            Ok(()) => results[idx].ok = true,
            Err(e) => {
                let _ = fs::rename(&temp, &from);
                results[idx].error = Some(e.to_string());
            }
        }
    }
    results
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tmpdir(tag: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("dn-rename-{tag}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn op(dir: &Path, from: &str, to: &str) -> RenameOp {
        RenameOp {
            from: dir.join(from).to_string_lossy().into_owned(),
            to_name: to.into(),
        }
    }

    #[test]
    fn swaps_names_and_handles_case_only_renames() {
        let dir = tmpdir("swap");
        fs::write(dir.join("a.txt"), "A").unwrap();
        fs::write(dir.join("b.txt"), "B").unwrap();
        fs::write(dir.join("photo.JPG"), "P").unwrap();
        let res = rename_blocking(vec![
            op(&dir, "a.txt", "b.txt"),
            op(&dir, "b.txt", "a.txt"),
            op(&dir, "photo.JPG", "photo.jpg"),
        ]);
        assert!(res.iter().all(|r| r.ok), "{res:?}");
        assert_eq!(fs::read_to_string(dir.join("b.txt")).unwrap(), "A");
        assert_eq!(fs::read_to_string(dir.join("a.txt")).unwrap(), "B");
        let names: Vec<String> = fs::read_dir(&dir)
            .unwrap()
            .flatten()
            .map(|e| e.file_name().to_string_lossy().into_owned())
            .collect();
        assert!(names.contains(&"photo.jpg".to_string()), "{names:?}");
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn never_overwrites_unrelated_files_or_accepts_paths() {
        let dir = tmpdir("guard");
        fs::write(dir.join("a.txt"), "A").unwrap();
        fs::write(dir.join("keep.txt"), "K").unwrap();
        let res = rename_blocking(vec![
            op(&dir, "a.txt", "keep.txt"),
            op(&dir, "a.txt", "..\\evil.txt"),
        ]);
        assert!(res.iter().all(|r| !r.ok));
        assert_eq!(fs::read_to_string(dir.join("keep.txt")).unwrap(), "K");
        assert_eq!(fs::read_to_string(dir.join("a.txt")).unwrap(), "A");
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn validates_windows_names() {
        assert!(validate_name("report 2026.pdf").is_ok());
        assert!(validate_name("con.txt").is_err());
        assert!(validate_name("a:b").is_err());
        assert!(validate_name("trailing.").is_err());
    }
}
