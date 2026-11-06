use image::ImageReader;
use std::{
    collections::hash_map::DefaultHasher,
    hash::{Hash, Hasher},
    path::{Path, PathBuf},
    sync::{Mutex, OnceLock},
};

pub fn thumbnail(source: &Path) -> Result<PathBuf, String> {
    static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
    let _guard = LOCK
        .get_or_init(|| Mutex::new(()))
        .lock()
        .map_err(|e| e.to_string())?;
    thumbnail_in(source, &crate::storage::cache_dir().join("thumbnails"))
}

fn thumbnail_in(source: &Path, cache: &Path) -> Result<PathBuf, String> {
    let source = source.canonicalize().map_err(|e| e.to_string())?;
    let metadata = source.metadata().map_err(|e| e.to_string())?;
    let mut hash = DefaultHasher::new();
    source.hash(&mut hash);
    metadata.len().hash(&mut hash);
    metadata
        .modified()
        .map_err(|e| e.to_string())?
        .hash(&mut hash);
    480u32.hash(&mut hash);
    let target = cache.join(format!("{:016x}.jpg", hash.finish()));
    if target.metadata().is_ok_and(|m| m.len() > 0) && crate::network::validate_image(&target).is_ok() {
        return Ok(crate::gallery::clean_windows_path(target));
    }
    let mut reader = ImageReader::open(&source)
        .map_err(|e| e.to_string())?
        .with_guessed_format()
        .map_err(|e| e.to_string())?;
    let mut limits = image::Limits::default();
    limits.max_alloc = Some(256 * 1024 * 1024);
    limits.max_image_width = Some(16384);
    limits.max_image_height = Some(16384);
    reader.limits(limits);
    let image = reader
        .decode()
        .map_err(|e| e.to_string())?
        .thumbnail(480, 480)
        .to_rgb8();
    let mut bytes = Vec::new();
    image::codecs::jpeg::JpegEncoder::new_with_quality(&mut bytes, 80)
        .encode_image(&image)
        .map_err(|e| e.to_string())?;
    crate::storage::atomic_write(&target, &bytes)?;
    let mut entries: Vec<_> = std::fs::read_dir(cache)
        .map_err(|e| e.to_string())?
        .flatten()
        .filter(|e| e.path().extension().is_some_and(|ext| ext == "jpg"))
        .collect();
    if entries.len() > 1200 {
        entries.sort_by_key(|e| e.metadata().and_then(|m| m.modified()).ok());
        let remove = entries.len() - 1000;
        for entry in entries.into_iter().take(remove) {
            let _ = std::fs::remove_file(entry.path());
        }
    }
    Ok(crate::gallery::clean_windows_path(target))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn small_thumbnail_is_cached_and_changes_with_source() {
        let dir = tempfile::tempdir().unwrap();
        let source = dir.path().join("source.png");
        let cache = dir.path().join("thumbs");
        image::RgbImage::new(1920, 1080).save(&source).unwrap();
        let first = thumbnail_in(&source, &cache).unwrap();
        let decoded = image::open(&first).unwrap();
        assert_eq!(decoded.width(), 480);
        assert!(decoded.height() <= 480);
        assert_eq!(thumbnail_in(&source, &cache).unwrap(), first);
        std::fs::write(&first, b"").unwrap();
        let regenerated = thumbnail_in(&source, &cache).unwrap();
        assert_eq!(regenerated, first);
        assert!(image::open(&regenerated).is_ok());
        image::RgbImage::new(100, 100).save(&source).unwrap();
        assert_ne!(thumbnail_in(&source, &cache).unwrap(), first);
    }
}
