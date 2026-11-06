use crate::downloader::WallpaperItem;
use serde::Serialize;
use std::{
    collections::HashSet,
    fs,
    path::{Path, PathBuf},
};

pub fn clean_windows_path(path: PathBuf) -> PathBuf {
    if let Some(s) = path.to_str() {
        if let Some(stripped) = s.strip_prefix(r"\\?\") {
            if !stripped.starts_with(r"UNC\") && stripped.as_bytes().get(1) == Some(&b':') {
                return PathBuf::from(stripped);
            }
        }
    }
    path
}

pub fn image_path(root: &Path, path: &Path) -> Result<PathBuf, String> {
    let root = root.canonicalize().map_err(|e| e.to_string())?;
    let path = path.canonicalize().map_err(|e| e.to_string())?;
    if !path.starts_with(&root) || !path.is_file() || !is_image(&path) {
        return Err("Image is outside the selected wallpaper directory".into());
    }
    Ok(clean_windows_path(path))
}

pub fn is_image(path: &Path) -> bool {
    path.extension()
        .and_then(|s| s.to_str())
        .is_some_and(|ext| {
            ["jpg", "jpeg", "png", "webp", "bmp"].contains(&ext.to_lowercase().as_str())
        })
}

pub fn scan(root: &Path) -> Result<Vec<WallpaperItem>, String> {
    fs::create_dir_all(root).map_err(|e| e.to_string())?;
    let root = root.canonicalize().map_err(|e| e.to_string())?;
    let meta_dir = root.join("metadata");
    fs::create_dir_all(&meta_dir).map_err(|e| e.to_string())?;
    let meta_dir = meta_dir.canonicalize().map_err(|e| e.to_string())?;
    if !meta_dir.starts_with(&root) {
        return Err("Metadata directory escapes wallpaper directory".into());
    }
    // Only migrate recognized wallpaper metadata, never unrelated user JSON files.
    for entry in fs::read_dir(&root).map_err(|e| e.to_string())?.flatten() {
        let path = entry.path();
        if path.extension().is_some_and(|ext| ext == "json") {
            if let Ok(bytes) = fs::read(&path) {
                if serde_json::from_slice::<WallpaperItem>(&bytes).is_ok() {
                    if let Some(name) = path.file_name() {
                        let target = meta_dir.join(name);
                        if !target.exists() {
                            fs::rename(&path, target).map_err(|e| e.to_string())?;
                        }
                    }
                }
            }
        }
    }
    let mut items = Vec::new();
    let mut tracked = HashSet::new();
    for entry in fs::read_dir(&meta_dir)
        .map_err(|e| e.to_string())?
        .flatten()
    {
        if entry.path().extension().is_some_and(|ext| ext == "json") {
            if let Ok(bytes) = fs::read(entry.path()) {
                if let Ok(mut item) = serde_json::from_slice::<WallpaperItem>(&bytes) {
                    if let Ok(path) = image_path(&root, &item.file_path) {
                        item.file_path = path.clone();
                        if tracked.insert(path) {
                            items.push(item);
                        }
                    }
                }
            }
        }
    }
    for entry in fs::read_dir(&root).map_err(|e| e.to_string())?.flatten() {
        if let Ok(path) = image_path(&root, &entry.path()) {
            if tracked.insert(path.clone()) {
                let stem = path
                    .file_stem()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string();
                let date = entry
                    .metadata()
                    .ok()
                    .and_then(|m| m.modified().ok())
                    .map(chrono::DateTime::<chrono::Local>::from)
                    .unwrap_or_else(chrono::Local::now);
                items.push(WallpaperItem {
                    id: stem.clone(),
                    title: stem,
                    author: "本地导入".into(),
                    url: path.to_string_lossy().to_string(),
                    file_path: path,
                    download_date: date.format("%Y-%m-%d %H:%M:%S").to_string(),
                });
            }
        }
    }
    items.sort_by(|a, b| b.download_date.cmp(&a.download_date));
    Ok(items)
}

pub fn delete(root: &Path, path: &Path) -> Result<(), String> {
    let path = image_path(root, path)?;
    fs::remove_file(&path).map_err(|e| e.to_string())?;
    if let (Some(parent), Some(stem)) = (path.parent(), path.file_stem()) {
        let metadata = parent
            .join("metadata")
            .join(format!("{}.json", stem.to_string_lossy()));
        // Image deletion has succeeded; stale metadata is ignored by scan.
        if metadata
            .canonicalize()
            .is_ok_and(|p| p.starts_with(root.canonicalize().unwrap_or_default()))
        {
            if let Err(e) = fs::remove_file(metadata) {
                eprintln!("Metadata cleanup failed: {e}");
            }
        }
    }
    Ok(())
}

#[derive(Debug, Serialize)]
pub struct DeleteFailure {
    pub file_path: String,
    pub error: String,
}
#[derive(Debug, Serialize)]
pub struct BatchDeleteResult {
    pub deleted: Vec<String>,
    pub failed: Vec<DeleteFailure>,
}

pub fn delete_batch(root: &Path, paths: Vec<String>) -> BatchDeleteResult {
    let mut result = BatchDeleteResult {
        deleted: Vec::new(),
        failed: Vec::new(),
    };
    for path in paths.into_iter().collect::<HashSet<_>>() {
        match delete(root, Path::new(&path)) {
            Ok(()) => result.deleted.push(path),
            Err(error) => result.failed.push(DeleteFailure {
                file_path: path,
                error,
            }),
        }
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rejects_outside_paths_and_reports_missing_files() {
        let dir = tempfile::tempdir().unwrap();
        let outside = tempfile::tempdir().unwrap();
        let good = dir.path().join("good.png");
        let bad = outside.path().join("outside.png");
        fs::write(&good, b"image").unwrap();
        fs::write(&bad, b"image").unwrap();
        let result = delete_batch(
            dir.path(),
            vec![
                good.to_string_lossy().into(),
                bad.to_string_lossy().into(),
                dir.path().join("missing.jpg").to_string_lossy().into(),
            ],
        );
        assert_eq!(result.deleted.len(), 1);
        assert_eq!(result.failed.len(), 2);
        assert!(bad.exists());
    }
    #[test]
    fn scan_preserves_unrelated_json() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join("personal.json"), b"{}").unwrap();
        scan(dir.path()).unwrap();
        assert!(dir.path().join("personal.json").exists());
    }
    #[test]
    fn clean_windows_path_strips_verbatim_drive_prefix_only() {
        assert_eq!(
            clean_windows_path(PathBuf::from(r"\\?\C:\Users\cst\wallpaper.jpg")),
            PathBuf::from(r"C:\Users\cst\wallpaper.jpg")
        );
        assert_eq!(
            clean_windows_path(PathBuf::from(r"\\?\UNC\server\share\wallpaper.jpg")),
            PathBuf::from(r"\\?\UNC\server\share\wallpaper.jpg")
        );
    }
}
