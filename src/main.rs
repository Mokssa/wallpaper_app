// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod config;
mod downloader;
mod wallpaper_setter;

use config::AppConfig;
use downloader::{OnlineWallpaper, WallpaperDownloader, WallpaperItem};
use wallpaper_setter::WallpaperSetter;

use base64::Engine;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;

#[cfg(target_os = "windows")]
use window_vibrancy::{apply_acrylic, apply_mica};

#[tauri::command]
fn get_config() -> AppConfig {
    AppConfig::load()
}

#[tauri::command]
fn save_config(config: AppConfig) -> Result<(), String> {
    config.save().map_err(|e| e.to_string())
}

#[tauri::command]
fn select_cache_dir() -> Option<String> {
    let folder = rfd::FileDialog::new()
        .set_title("选择壁纸保存目录")
        .pick_folder()?;
    Some(folder.to_string_lossy().to_string())
}

#[tauri::command]
fn read_file_data_url(file_path: String) -> Option<String> {
    let path = Path::new(&file_path);
    if path.exists() {
        if let Ok(bytes) = fs::read(path) {
            let encoded = base64::engine::general_purpose::STANDARD.encode(bytes);
            let ext = path.extension().and_then(|s| s.to_str()).unwrap_or("jpg");
            let mime = match ext.to_lowercase().as_str() {
                "png" => "image/png",
                "webp" => "image/webp",
                _ => "image/jpeg",
            };
            return Some(format!("data:{};base64,{}", mime, encoded));
        }
    }
    None
}

#[tauri::command]
async fn fetch_remote_image_base64(url: String) -> Result<String, String> {
    WallpaperDownloader::fetch_image_as_base64(&url)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_cached_wallpapers() -> Vec<WallpaperItem> {
    let config = AppConfig::load();
    let cache_dir = Path::new(&config.cache_dir);
    let mut wallpapers = Vec::new();

    if cache_dir.exists() {
        if let Ok(entries) = fs::read_dir(cache_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().and_then(|s| s.to_str()) == Some("json") {
                    if let Ok(content) = fs::read_to_string(&path) {
                        if let Ok(item) = serde_json::from_str::<WallpaperItem>(&content) {
                            if item.file_path.exists() {
                                wallpapers.push(item);
                            }
                        }
                    }
                }
            }
        }
    }
    wallpapers.sort_by(|a, b| b.download_date.cmp(&a.download_date));
    wallpapers
}

#[tauri::command]
async fn fetch_online_wallpapers(source: String, query: String, page: usize, limit: usize) -> Result<Vec<OnlineWallpaper>, String> {
    let config = AppConfig::load();
    WallpaperDownloader::fetch_online_list(&source, &query, page, limit, &config.unsplash_access_key)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn download_and_set_online_wallpaper(item: OnlineWallpaper) -> Result<WallpaperItem, String> {
    let config = AppConfig::load();
    let target_dir = PathBuf::from(&config.cache_dir);
    let downloaded = WallpaperDownloader::download_online_wallpaper(&item, &target_dir)
        .await
        .map_err(|e| e.to_string())?;

    WallpaperSetter::set_wallpaper(&downloaded.file_path)?;
    Ok(downloaded)
}

#[tauri::command]
fn set_desktop_wallpaper(path_str: String) -> Result<(), String> {
    let path = Path::new(&path_str);
    WallpaperSetter::set_wallpaper(path)
}

#[tauri::command]
fn delete_wallpaper(file_path: String) -> Result<(), String> {
    let path = Path::new(&file_path);
    if path.exists() {
        let _ = fs::remove_file(path);
    }
    let json_path = path.with_extension("json");
    if json_path.exists() {
        let _ = fs::remove_file(json_path);
    }
    Ok(())
}

#[tauri::command]
fn get_current_wallpaper() -> Option<String> {
    WallpaperSetter::get_current_wallpaper()
}

// 窗口控制命令
#[tauri::command]
fn window_minimize(window: tauri::Window) {
    let _ = window.minimize();
}

#[tauri::command]
fn window_toggle_maximize(window: tauri::Window) {
    if let Ok(is_max) = window.is_maximized() {
        if is_max {
            let _ = window.unmaximize();
        } else {
            let _ = window.maximize();
        }
    }
}

#[tauri::command]
fn window_close(window: tauri::Window) {
    let _ = window.close();
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();

            #[cfg(target_os = "windows")]
            {
                // 绑定 Windows 11 原生 Mica 材质，回退为 Acrylic 亚克力
                if let Err(_) = apply_mica(&window, Some(true)) {
                    let _ = apply_acrylic(&window, Some((24, 24, 24, 180)));
                }
            }

            Ok(())
        })
        .plugin(tauri_plugin_single_instance_init())
        .invoke_handler(tauri::generate_handler![
            get_config,
            save_config,
            select_cache_dir,
            read_file_data_url,
            fetch_remote_image_base64,
            get_cached_wallpapers,
            fetch_online_wallpapers,
            download_and_set_online_wallpaper,
            set_desktop_wallpaper,
            delete_wallpaper,
            get_current_wallpaper,
            window_minimize,
            window_toggle_maximize,
            window_close
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn tauri_plugin_single_instance_init() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    tauri::plugin::Builder::new("wallpaper_app_core").build()
}
