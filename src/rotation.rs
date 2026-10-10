use crate::{
    config::AppConfig, downloader::WallpaperDownloader, wallpaper_setter::WallpaperSetter,
};
use rand::seq::SliceRandom;
use std::{future::Future, path::PathBuf, time::Duration};
use tokio::sync::watch;

pub async fn run<F, Fut>(mut config: watch::Receiver<AppConfig>, mut rotate: F)
where
    F: FnMut(AppConfig) -> Fut,
    Fut: Future<Output = ()>,
{
    loop {
        let current = config.borrow_and_update().clone();
        if !current.auto_update_enabled {
            if config.changed().await.is_err() {
                return;
            }
            continue;
        }
        tokio::select! {
            changed = config.changed() => { if changed.is_err() { return; } },
            _ = tokio::time::sleep(Duration::from_secs(current.auto_update_interval_minutes.max(5) * 60)) => {
                // A configuration change also cancels a download in progress.
                tokio::select! {
                    changed = config.changed() => { if changed.is_err() { return; } },
                    _ = rotate(current) => {},
                }
            }
        }
    }
}

pub async fn rotate(config: AppConfig) -> Result<String, String> {
    let root = PathBuf::from(&config.cache_dir);
    let mut sources = if config.random_source == "all" {
        let mut sources = vec!["local", "pexels", "bing", "wallhaven"];
        if !config.unsplash_access_key.trim().is_empty() {
            sources.push("unsplash");
        }
        sources
    } else {
        vec![config.random_source.as_str()]
    };
    sources.shuffle(&mut rand::rng());
    let mut last_error = String::from("No wallpapers available");
    for source in sources {
        if source == "local" {
            let directory = root.clone();
            let mut items = tokio::task::spawn_blocking(move || crate::gallery::scan(&directory))
                .await
                .map_err(|e| e.to_string())??;
            items.shuffle(&mut rand::rng());
            if let Some(item) = items.first() {
                return apply(item.file_path.clone(), config.wallpaper_style.clone()).await;
            }
            continue;
        }
        match WallpaperDownloader::fetch_online_list(
            source,
            &config.query,
            1,
            24,
            &config.unsplash_access_key,
            &config.pexels_api_key,
        )
        .await
        {
            Ok(mut candidates) => {
                candidates.shuffle(&mut rand::rng());
                for item in candidates.into_iter().take(3) {
                    match WallpaperDownloader::download_online_wallpaper(&item, &root).await {
                        Ok(item) => {
                            match apply(item.file_path, config.wallpaper_style.clone()).await {
                                Ok(path) => return Ok(path),
                                Err(error) => last_error = error,
                            }
                        }
                        Err(error) => last_error = error.to_string(),
                    }
                }
            }
            Err(error) => last_error = error.to_string(),
        }
    }
    Err(last_error)
}

pub async fn apply(path: PathBuf, style: String) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        WallpaperSetter::set_wallpaper_style(&style)?;
        WallpaperSetter::set_wallpaper(&path)?;
        Ok(path.to_string_lossy().to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;
    #[tokio::test(start_paused = true)]
    async fn schedule_resets_without_duplicates_and_disables() {
        let mut config = AppConfig {
            auto_update_enabled: true,
            auto_update_interval_minutes: 5,
            ..Default::default()
        };
        let (tx, rx) = watch::channel(config.clone());
        let count = std::sync::Arc::new(std::sync::atomic::AtomicUsize::new(0));
        let calls = count.clone();
        let task = tokio::spawn(run(rx, move |_| {
            let calls = calls.clone();
            async move {
                calls.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
            }
        }));
        tokio::task::yield_now().await;
        tokio::time::advance(Duration::from_secs(300)).await;
        tokio::task::yield_now().await;
        assert_eq!(count.load(std::sync::atomic::Ordering::SeqCst), 1);
        config.auto_update_interval_minutes = 10;
        tx.send_replace(config.clone());
        tokio::task::yield_now().await;
        tokio::time::advance(Duration::from_secs(300)).await;
        tokio::task::yield_now().await;
        assert_eq!(count.load(std::sync::atomic::Ordering::SeqCst), 1);
        tokio::time::advance(Duration::from_secs(300)).await;
        tokio::task::yield_now().await;
        assert_eq!(count.load(std::sync::atomic::Ordering::SeqCst), 2);
        config.auto_update_enabled = false;
        tx.send_replace(config);
        tokio::task::yield_now().await;
        tokio::time::advance(Duration::from_secs(600)).await;
        tokio::task::yield_now().await;
        assert_eq!(count.load(std::sync::atomic::Ordering::SeqCst), 2);
        drop(tx);
        task.await.unwrap();
    }
}
