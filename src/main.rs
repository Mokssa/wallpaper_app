// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod config;
mod downloader;
mod gallery;
mod history;
mod network;
mod providers;
mod rotation;
mod storage;
mod thumbnails;
mod wallpaper_setter;

use auto_launch::AutoLaunch;
use base64::Engine;
use config::AppConfig;
use downloader::{OnlineWallpaper, WallpaperDownloader, WallpaperItem};
use history::{BrowseHistoryItem, HistoryStore};
use std::{
    fs,
    path::{Path, PathBuf},
    sync::Arc,
};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, State,
};
use wallpaper_setter::WallpaperSetter;
#[cfg(target_os = "windows")]
use window_vibrancy::apply_mica;

struct AppState {
    config: tokio::sync::watch::Sender<AppConfig>,
    save_lock: tokio::sync::Mutex<()>,
    history: Arc<HistoryStore>,
}

#[tauri::command]
fn get_config(state: State<'_, Arc<AppState>>) -> AppConfig {
    state.config.borrow().clone()
}

#[tauri::command]
async fn save_config(mut config: AppConfig, state: State<'_, Arc<AppState>>) -> Result<(), String> {
    let _guard = state.save_lock.lock().await;
    config.normalize();
    let saved = config.clone();
    tokio::task::spawn_blocking(move || saved.save())
        .await
        .map_err(|e| e.to_string())??;
    state.config.send_replace(config);
    Ok(())
}

#[tauri::command]
async fn select_cache_dir() -> Option<String> {
    rfd::AsyncFileDialog::new()
        .set_title("选择壁纸保存目录")
        .pick_folder()
        .await
        .map(|folder| folder.path().to_string_lossy().to_string())
}

#[tauri::command]
async fn get_local_image_path(
    file_path: String,
    thumbnail: bool,
    app: tauri::AppHandle,
    state: State<'_, Arc<AppState>>,
) -> Result<String, String> {
    let root = PathBuf::from(&state.config.borrow().cache_dir);
    let path = tokio::task::spawn_blocking(move || {
        let image = gallery::image_path(&root, Path::new(&file_path))?;
        if thumbnail {
            thumbnails::thumbnail(&image)
        } else {
            Ok(image)
        }
    })
    .await
    .map_err(|e| e.to_string())??;
    let path = gallery::clean_windows_path(path);
    app.asset_protocol_scope()
        .allow_file(&path)
        .map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
async fn read_file_data_url(
    file_path: String,
    state: State<'_, Arc<AppState>>,
) -> Result<String, String> {
    let root = PathBuf::from(&state.config.borrow().cache_dir);
    tokio::task::spawn_blocking(move || {
        let path = gallery::image_path(&root, Path::new(&file_path))?;
        if path.metadata().map_err(|e| e.to_string())?.len() > 128 * 1024 * 1024 {
            return Err("Image too large".into());
        }
        let extension = network::validate_image(&path)?;
        let mime = if extension == "jpg" {
            "jpeg"
        } else {
            extension
        };
        let bytes = fs::read(&path).map_err(|e| e.to_string())?;
        Ok(format!(
            "data:image/{};base64,{}",
            mime,
            base64::engine::general_purpose::STANDARD.encode(bytes)
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn fetch_remote_image_base64(url: String) -> Result<String, String> {
    WallpaperDownloader::fetch_image_as_base64(&url)
        .await
        .ok_or_else(|| "Failed to fetch image".into())
}

#[tauri::command]
async fn get_cached_wallpapers(
    state: State<'_, Arc<AppState>>,
) -> Result<Vec<WallpaperItem>, String> {
    let root = PathBuf::from(&state.config.borrow().cache_dir);
    tokio::task::spawn_blocking(move || gallery::scan(&root))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn fetch_online_wallpapers(
    source: String,
    query: String,
    page: usize,
    limit: usize,
    state: State<'_, Arc<AppState>>,
) -> Result<Vec<OnlineWallpaper>, String> {
    let config = state.config.borrow().clone();
    WallpaperDownloader::fetch_online_list(
        &source,
        &query,
        page,
        limit,
        &config.unsplash_access_key,
        &config.pexels_api_key,
    )
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
async fn download_online_wallpaper(
    item: OnlineWallpaper,
    state: State<'_, Arc<AppState>>,
) -> Result<WallpaperItem, String> {
    let root = PathBuf::from(&state.config.borrow().cache_dir);
    WallpaperDownloader::download_online_wallpaper(&item, &root)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn download_and_set_online_wallpaper(
    item: OnlineWallpaper,
    state: State<'_, Arc<AppState>>,
) -> Result<WallpaperItem, String> {
    let config = state.config.borrow().clone();
    let downloaded =
        WallpaperDownloader::download_online_wallpaper(&item, Path::new(&config.cache_dir))
            .await
            .map_err(|e| e.to_string())?;
    rotation::apply(downloaded.file_path.clone(), config.wallpaper_style).await?;
    Ok(downloaded)
}

#[tauri::command]
async fn set_desktop_wallpaper(
    path_str: String,
    state: State<'_, Arc<AppState>>,
) -> Result<(), String> {
    let config = state.config.borrow().clone();
    let path = gallery::image_path(Path::new(&config.cache_dir), Path::new(&path_str))?;
    rotation::apply(path, config.wallpaper_style)
        .await
        .map(|_| ())
}

#[tauri::command]
async fn delete_wallpaper(
    file_path: String,
    state: State<'_, Arc<AppState>>,
) -> Result<(), String> {
    let root = PathBuf::from(&state.config.borrow().cache_dir);
    tokio::task::spawn_blocking(move || gallery::delete(&root, Path::new(&file_path)))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn delete_wallpapers_batch(
    file_paths: Vec<String>,
    state: State<'_, Arc<AppState>>,
) -> Result<gallery::BatchDeleteResult, String> {
    let root = PathBuf::from(&state.config.borrow().cache_dir);
    tokio::task::spawn_blocking(move || gallery::delete_batch(&root, file_paths))
        .await
        .map_err(|e| e.to_string())
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
    let _ = window.hide();
}

#[tauri::command]
fn show_main_window(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[tauri::command]
fn get_auto_launch_enabled() -> Result<bool, String> {
    let app_path = std::env::current_exe().map_err(|e| e.to_string())?;
    let auto = AutoLaunch::new("wallpaper_app", &app_path.to_string_lossy(), &[] as &[&str]);
    auto.is_enabled().map_err(|e| e.to_string())
}

#[tauri::command]
fn set_auto_launch_enabled(enabled: bool) -> Result<(), String> {
    let app_path = std::env::current_exe().map_err(|e| e.to_string())?;
    let auto = AutoLaunch::new("wallpaper_app", &app_path.to_string_lossy(), &[] as &[&str]);

    if enabled {
        auto.enable().map_err(|e| e.to_string())
    } else {
        auto.disable().map_err(|e| e.to_string())
    }
}

#[tauri::command]
fn open_in_browser(url: String) -> Result<(), String> {
    let url = network::validate_url(&url)?;
    #[cfg(target_os = "windows")]
    {
        use windows_sys::Win32::UI::Shell::ShellExecuteW;
        let action: Vec<u16> = "open".encode_utf16().chain(Some(0)).collect();
        let target: Vec<u16> = url.as_str().encode_utf16().chain(Some(0)).collect();
        let result = unsafe {
            ShellExecuteW(
                0,
                action.as_ptr(),
                target.as_ptr(),
                std::ptr::null(),
                std::ptr::null(),
                1,
            )
        };
        if result as isize <= 32 {
            return Err(format!("Could not open URL: {}", result as isize));
        }
    }
    Ok(())
}

#[tauri::command]
async fn open_cache_folder(state: State<'_, Arc<AppState>>) -> Result<(), String> {
    let path = PathBuf::from(&state.config.borrow().cache_dir);
    tokio::fs::create_dir_all(&path)
        .await
        .map_err(|e| e.to_string())?;
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        std::process::Command::new("explorer")
            .arg(path)
            .creation_flags(0x08000000)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct UpdateInfo {
    pub has_update: bool,
    pub current_version: String,
    pub latest_version: String,
    pub release_name: String,
    pub release_notes: String,
    pub published_at: String,
    pub release_url: String,
    pub download_url: Option<String>,
}

pub fn compare_semver(latest: &str, current: &str) -> bool {
    match (
        semver::Version::parse(latest.trim_start_matches('v')),
        semver::Version::parse(current.trim_start_matches('v')),
    ) {
        (Ok(latest), Ok(current)) => latest > current,
        _ => false,
    }
}

#[tauri::command]
async fn check_app_update() -> Result<UpdateInfo, String> {
    let current_version = env!("CARGO_PKG_VERSION").to_string();
    let client = network::client();

    let api_url = "https://api.github.com/repos/Mokssa/wallpaper_app/releases/latest";
    let api_res = client
        .get(api_url)
        .timeout(std::time::Duration::from_secs(12))
        .header("Accept", "application/vnd.github.v3+json")
        .send()
        .await;

    // 策略 A：若 GitHub REST API 成功返回 (HTTP 200)，优先从标准 JSON 解析完整更新日志与元数据
    if let Ok(res) = api_res {
        if res.status().is_success() {
            if let Ok(json) = res.json::<serde_json::Value>().await {
                let tag_name = json["tag_name"].as_str().unwrap_or("").trim().to_string();
                if !tag_name.is_empty() {
                    let release_name = json["name"].as_str().unwrap_or(&tag_name).to_string();
                    let release_notes = json["body"].as_str().unwrap_or("").to_string();
                    let published_at = json["published_at"].as_str().unwrap_or("").to_string();
                    let release_url = json["html_url"]
                        .as_str()
                        .unwrap_or("https://github.com/Mokssa/wallpaper_app/releases")
                        .to_string();

                    let mut download_url = None;
                    if let Some(assets) = json["assets"].as_array() {
                        for asset in assets {
                            let name = asset["name"].as_str().unwrap_or("");
                            let browser_download_url = asset["browser_download_url"].as_str();
                            if name.ends_with(".zip") || name.ends_with(".exe") {
                                if let Some(dl) = browser_download_url {
                                    download_url = Some(dl.to_string());
                                    if name.ends_with(".zip") {
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    if download_url.is_none() {
                        download_url = Some(release_url.clone());
                    }

                    let clean_latest = tag_name.trim_start_matches('v').trim().to_string();
                    let clean_current = current_version.trim_start_matches('v').trim().to_string();
                    let has_update = compare_semver(&clean_latest, &clean_current);

                    return Ok(UpdateInfo {
                        has_update,
                        current_version,
                        latest_version: clean_latest,
                        release_name,
                        release_notes,
                        published_at,
                        release_url,
                        download_url,
                    });
                }
            }
        }
    }

    // If the API fails, try the release page redirect with the same bounded timeout.
    let web_url = "https://github.com/Mokssa/wallpaper_app/releases/latest";
    let web_res = client
        .get(web_url)
        .timeout(std::time::Duration::from_secs(12))
        .send()
        .await
        .map_err(|e| format!("连接 GitHub 页面失败: {}", e))?;

    let final_url = web_res.url().to_string();
    // 重定向地址格式形如 https://github.com/Mokssa/wallpaper_app/releases/tag/v0.1.0
    let tag_name = if let Some(pos) = final_url.rfind("/tag/") {
        final_url[pos + 5..].trim().to_string()
    } else {
        return Err("未能解析 GitHub 最新发行版版本号".to_string());
    };

    let clean_latest = tag_name.trim_start_matches('v').trim().to_string();
    let clean_current = current_version.trim_start_matches('v').trim().to_string();
    let has_update = compare_semver(&clean_latest, &clean_current);

    let release_url = final_url.clone();
    let download_url = format!("https://github.com/Mokssa/wallpaper_app/releases/download/{}/Wallpaper_{}_x64_portable.zip", tag_name, tag_name);

    Ok(UpdateInfo {
        has_update,
        current_version,
        latest_version: if clean_latest.is_empty() {
            env!("CARGO_PKG_VERSION").to_string()
        } else {
            clean_latest
        },
        release_name: format!("Wallpaper {}", tag_name),
        release_notes:
            "发现新版本！点击下方按钮可前往 GitHub Releases 页面查看完整更新日志并下载安装程序。"
                .to_string(),
        published_at: String::new(),
        release_url,
        download_url: Some(download_url),
    })
}

#[tauri::command]
fn get_browse_history(state: State<'_, Arc<AppState>>) -> Result<Vec<BrowseHistoryItem>, String> {
    state.history.list()
}

#[tauri::command]
async fn record_browse_history(
    item: BrowseHistoryItem,
    state: State<'_, Arc<AppState>>,
) -> Result<(), String> {
    let history = state.history.clone();
    tokio::task::spawn_blocking(move || history.record(item))
        .await
        .map_err(|e| e.to_string())?
}
#[tauri::command]
async fn clear_browse_history(state: State<'_, Arc<AppState>>) -> Result<(), String> {
    let history = state.history.clone();
    tokio::task::spawn_blocking(move || history.clear())
        .await
        .map_err(|e| e.to_string())?
}
#[tauri::command]
async fn delete_browse_history_item(
    id: String,
    state: State<'_, Arc<AppState>>,
) -> Result<(), String> {
    let history = state.history.clone();
    tokio::task::spawn_blocking(move || history.delete(&id))
        .await
        .map_err(|e| e.to_string())?
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let config = AppConfig::load().map_err(|error| {
                rfd::MessageDialog::new()
                    .set_title("Wallpaper — configuration error")
                    .set_description(format!(
                        "{error}\n\nSettings were preserved. Repair the file and restart the app."
                    ))
                    .set_level(rfd::MessageLevel::Error)
                    .show();
                std::io::Error::other(error)
            })?;
            let history_path = storage::data_dir().join("history.json");
            storage::migrate_legacy(&history_path, "history.json")
                .map_err(std::io::Error::other)?;
            let history =
                Arc::new(HistoryStore::open(history_path).map_err(std::io::Error::other)?);
            let (config_tx, config_rx) = tokio::sync::watch::channel(config);
            app.manage(Arc::new(AppState {
                config: config_tx,
                save_lock: tokio::sync::Mutex::new(()),
                history,
            }));
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(rotation::run(config_rx, move |config| {
                let handle = handle.clone();
                async move {
                    match rotation::rotate(config).await {
                        Ok(path) => {
                            let _ = handle.emit("rotation_completed", path);
                        }
                        Err(error) => {
                            eprintln!("Auto rotation failed: {error}");
                            let _ = handle.emit("rotation_failed", error);
                        }
                    }
                }
            }));
            if let Some(window) = app.get_webview_window("main") {
                #[cfg(target_os = "windows")]
                {
                    let _ = apply_mica(&window, Some(true));
                }
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
                let _ = window.center();
            }

            // 创建系统托盘菜单
            let show_item = MenuItem::with_id(app, "show", "显示主窗口", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            // 创建系统托盘图标
            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::DoubleClick { .. } = event {
                        if let Some(app) = tray.app_handle().get_webview_window("main") {
                            let _ = app.show();
                            let _ = app.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .invoke_handler(tauri::generate_handler![
            get_config,
            save_config,
            select_cache_dir,
            open_cache_folder,
            read_file_data_url,
            get_local_image_path,
            download_online_wallpaper,
            fetch_remote_image_base64,
            get_cached_wallpapers,
            fetch_online_wallpapers,
            download_and_set_online_wallpaper,
            set_desktop_wallpaper,
            delete_wallpaper,
            delete_wallpapers_batch,
            get_current_wallpaper,
            window_minimize,
            window_toggle_maximize,
            window_close,
            show_main_window,
            get_auto_launch_enabled,
            set_auto_launch_enabled,
            open_in_browser,
            check_app_update,
            get_browse_history,
            record_browse_history,
            clear_browse_history,
            delete_browse_history_item
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compare_semver_updates() {
        // Newer versions trigger update
        assert!(compare_semver("0.2.0", "0.1.0"));
        assert!(compare_semver("1.0.0", "0.9.9"));
        assert!(compare_semver("0.1.1", "0.1.0"));
        assert!(compare_semver("2.0.0", "1.99.99"));

        // Same or older versions do not trigger update
        assert!(!compare_semver("0.1.0", "0.1.0"));
        assert!(!compare_semver("0.0.9", "0.1.0"));
        assert!(!compare_semver("0.1.0", "0.2.0"));
        assert!(!compare_semver("1.0.0", "1.0.1"));

        // Suffix handling
        assert!(compare_semver("0.2.0-beta", "0.1.0"));
        assert!(!compare_semver("0.1.0-rc1", "0.1.0"));
    }

    #[tokio::test]
    #[ignore = "requires live GitHub service"]
    async fn test_check_app_update_live() {
        let res = check_app_update().await;
        assert!(res.is_ok(), "check_app_update failed: {:?}", res);
        let info = res.unwrap();
        assert!(!info.latest_version.is_empty());
        assert_eq!(info.current_version, env!("CARGO_PKG_VERSION"));
    }
}
