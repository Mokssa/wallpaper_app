use serde::{de::DeserializeOwned, Serialize};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

pub const APP_ID: &str = "com.wallpaperapp.dev";

pub fn data_dir() -> PathBuf {
    dirs::data_local_dir()
        .unwrap_or_else(std::env::temp_dir)
        .join(APP_ID)
}

pub fn cache_dir() -> PathBuf {
    dirs::cache_dir()
        .unwrap_or_else(std::env::temp_dir)
        .join(APP_ID)
}

pub fn atomic_write(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let parent = path.parent().ok_or("Missing parent directory")?;
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    let mut file = tempfile::NamedTempFile::new_in(parent).map_err(|e| e.to_string())?;
    file.write_all(bytes).map_err(|e| e.to_string())?;
    file.as_file().sync_all().map_err(|e| e.to_string())?;
    file.persist(path).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn write_json<T: Serialize + ?Sized>(path: &Path, value: &T) -> Result<(), String> {
    let bytes = serde_json::to_vec_pretty(value).map_err(|e| e.to_string())?;
    // Keep the last valid version; never replace a backup with malformed JSON.
    if let Ok(previous) = fs::read(path) {
        if serde_json::from_slice::<serde_json::Value>(&previous).is_ok() {
            atomic_write(&path.with_extension("json.bak"), &previous)?;
        }
    }
    atomic_write(path, &bytes)
}

pub fn read_json<T: DeserializeOwned>(path: &Path) -> Result<Option<T>, String> {
    let bytes = match fs::read(path) {
        Ok(bytes) => bytes,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(e) => return Err(e.to_string()),
    };
    match serde_json::from_slice(&bytes) {
        Ok(value) => Ok(Some(value)),
        Err(e) => {
            let backup = path.with_extension("json.bak");
            if let Ok(bytes) = fs::read(&backup) {
                if let Ok(value) = serde_json::from_slice(&bytes) {
                    // Preserve the corrupt file before recovering the previous version.
                    atomic_write(
                        &path.with_extension("json.corrupt"),
                        &fs::read(path).map_err(|e| e.to_string())?,
                    )?;
                    atomic_write(path, &bytes)?;
                    return Ok(Some(value));
                }
            }
            Err(format!("Invalid JSON in {}: {e}", path.display()))
        }
    }
}

pub fn migrate_legacy(target: &Path, filename: &str) -> Result<(), String> {
    if target.exists() {
        return Ok(());
    }
    let mut candidates = Vec::new();
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            candidates.push(parent.join("config").join(filename));
        }
    }
    if let Ok(cwd) = std::env::current_dir() {
        candidates.push(cwd.join("config").join(filename));
    }
    for candidate in candidates {
        if candidate.is_file() {
            let bytes = fs::read(candidate).map_err(|e| e.to_string())?;
            // Migration must not discard an unreadable or corrupt legacy configuration.
            serde_json::from_slice::<serde_json::Value>(&bytes).map_err(|e| e.to_string())?;
            return atomic_write(target, &bytes);
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn atomic_replacement_and_corruption_recovery() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("state.json");
        write_json(&path, &vec![1]).unwrap();
        write_json(&path, &vec![2]).unwrap();
        assert_eq!(read_json::<Vec<u8>>(&path).unwrap(), Some(vec![2]));
        fs::write(&path, b"broken").unwrap();
        assert_eq!(read_json::<Vec<u8>>(&path).unwrap(), Some(vec![1]));
        assert!(path.with_extension("json.corrupt").exists());
    }
}
