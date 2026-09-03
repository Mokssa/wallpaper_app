// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod config;
mod downloader;
mod history;
mod wallpaper_setter;

use config::AppConfig;
use downloader::{OnlineWallpaper, WallpaperDownloader, WallpaperItem};
use history::{BrowseHistoryItem, load_browse_history, record_browse_history as save_history_item, clear_browse_history as clear_history_data, delete_browse_history_item as delete_history_item};
use wallpaper_setter::WallpaperSetter;

use base64::Engine;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{Manager, menu::{Menu, MenuItem}, tray::{TrayIconBuilder, TrayIconEvent}};
use auto_launch::AutoLaunch;

#[cfg(target_os = "windows")]
use window_vibrancy::apply_mica;

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
        .ok_or_else(|| "Failed to fetch image as base64".to_string())
}

#[tauri::command]
fn get_cached_wallpapers() -> Vec<WallpaperItem> {
    let config = AppConfig::load();
    let cache_dir = Path::new(&config.cache_dir);
    let mut wallpapers = Vec::new();
    let mut tracked_files = std::collections::HashSet::new();

    if cache_dir.exists() {
        let meta_dir = cache_dir.join("metadata");
        let _ = fs::create_dir_all(&meta_dir);

        // 1. 自动将根目录下遗留的历史 json 文件移入 metadata 子目录，还用户一个纯净的图片文件夹
        if let Ok(entries) = fs::read_dir(cache_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("json") {
                    if let Some(filename) = path.file_name() {
                        let target_json = meta_dir.join(filename);
                        let _ = fs::rename(&path, target_json);
                    }
                }
            }
        }

        // 2. 读取 metadata 子目录下的所有元数据 json
        if let Ok(entries) = fs::read_dir(&meta_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().and_then(|s| s.to_str()) == Some("json") {
                    if let Ok(content) = fs::read_to_string(&path) {
                        if let Ok(item) = serde_json::from_str::<WallpaperItem>(&content) {
                            if item.file_path.exists() {
                                tracked_files.insert(item.file_path.clone());
                                wallpapers.push(item);
                            }
                        }
                    }
                }
            }
        }

        // 3. 扫描根目录下的所有真实图片文件（兼容用户自己拷入的壁纸）
        if let Ok(entries) = fs::read_dir(cache_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() && !tracked_files.contains(&path) {
                    if let Some(ext) = path.extension().and_then(|s| s.to_str()) {
                        let ext_lower = ext.to_lowercase();
                        if ext_lower == "jpg" || ext_lower == "jpeg" || ext_lower == "png" || ext_lower == "webp" || ext_lower == "bmp" {
                            let file_stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("本地壁纸");
                            let modified_time = entry.metadata().ok()
                                .and_then(|m| m.modified().ok())
                                .map(|t| chrono::DateTime::<chrono::Local>::from(t).format("%Y-%m-%d %H:%M:%S").to_string())
                                .unwrap_or_else(|| chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string());
                            
                            wallpapers.push(WallpaperItem {
                                id: file_stem.to_string(),
                                title: file_stem.to_string(),
                                author: "本地导入".to_string(),
                                file_path: path.clone(),
                                url: path.to_string_lossy().to_string(),
                                download_date: modified_time,
                            });
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
async fn download_and_set_online_wallpaper(item: OnlineWallpaper) -> Result<WallpaperItem, String> {
    let config = AppConfig::load();
    let target_dir = PathBuf::from(&config.cache_dir);
    let downloaded = WallpaperDownloader::download_online_wallpaper(&item, &target_dir)
        .await
        .map_err(|e| e.to_string())?;

    WallpaperSetter::set_wallpaper(&downloaded.file_path)?;
    let _ = WallpaperSetter::set_wallpaper_style(&config.wallpaper_style);
    Ok(downloaded)
}

#[tauri::command]
fn set_desktop_wallpaper(path_str: String) -> Result<(), String> {
    let config = AppConfig::load();
    let path = Path::new(&path_str);
    WallpaperSetter::set_wallpaper(path)?;
    let _ = WallpaperSetter::set_wallpaper_style(&config.wallpaper_style);
    Ok(())
}

#[tauri::command]
fn delete_wallpaper(file_path: String) -> Result<(), String> {
    let path = Path::new(&file_path);
    if path.exists() {
        let _ = fs::remove_file(path);
    }
    
    // 删除 metadata 子目录下的对应 json
    if let Some(parent) = path.parent() {
        if let Some(stem) = path.file_stem() {
            let meta_json = parent.join("metadata").join(format!("{}.json", stem.to_string_lossy()));
            if meta_json.exists() {
                let _ = fs::remove_file(meta_json);
            }
        }
    }

    let json_path = path.with_extension("json");
    if json_path.exists() {
        let _ = fs::remove_file(json_path);
    }
    Ok(())
}

#[tauri::command]
fn delete_wallpapers_batch(file_paths: Vec<String>) -> Result<usize, String> {
    let mut deleted_count = 0;
    for file_path in file_paths {
        if delete_wallpaper(file_path).is_ok() {
            deleted_count += 1;
        }
    }
    Ok(deleted_count)
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
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let _ = std::process::Command::new("cmd")
            .args(["/c", "start", "", &url])
            .creation_flags(0x08000000) // CREATE_NO_WINDOW
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn open_cache_folder() -> Result<(), String> {
    let config = AppConfig::load();
    let path = PathBuf::from(&config.cache_dir);
    if !path.exists() {
        let _ = fs::create_dir_all(&path);
    }

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let _ = std::process::Command::new("explorer")
            .arg(path.to_string_lossy().to_string())
            .creation_flags(0x08000000)
            .spawn()
            .map_err(|e| format!("打开文件夹失败: {}", e))?;
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
    let parse_ver = |v: &str| -> Vec<u64> {
        v.split('.')
            .map(|part| {
                part.chars()
                    .take_while(|c| c.is_ascii_digit())
                    .collect::<String>()
                    .parse::<u64>()
                    .unwrap_or(0)
            })
            .collect()
    };

    let latest_parts = parse_ver(latest);
    let current_parts = parse_ver(current);

    for i in 0..latest_parts.len().max(current_parts.len()) {
        let l = latest_parts.get(i).copied().unwrap_or(0);
        let c = current_parts.get(i).copied().unwrap_or(0);
        if l > c {
            return true;
        } else if l < c {
            return false;
        }
    }
    false
}

#[tauri::command]
async fn check_app_update() -> Result<UpdateInfo, String> {
    let current_version = env!("CARGO_PKG_VERSION").to_string();
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(12))
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .build()
        .map_err(|e| format!("创建网络请求客户端失败: {}", e))?;

    let api_url = "https://api.github.com/repos/Mokssa/wallpaper_app/releases/latest";
    let api_res = client.get(api_url)
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
                    let release_url = json["html_url"].as_str().unwrap_or("https://github.com/Mokssa/wallpaper_app/releases").to_string();

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

    // 策略 B（无限制兜底）：当 API 触发 403 限流或阻断时，直接请求 Releases 重定向页面 (无 API 速率限制)
    let web_url = "https://github.com/Mokssa/wallpaper_app/releases/latest";
    let web_res = client.get(web_url)
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
        latest_version: if clean_latest.is_empty() { env!("CARGO_PKG_VERSION").to_string() } else { clean_latest },
        release_name: format!("Wallpaper {}", tag_name),
        release_notes: "发现新版本！点击下方按钮可前往 GitHub Releases 页面查看完整更新日志并下载安装程序。".to_string(),
        published_at: String::new(),
        release_url,
        download_url: Some(download_url),
    })
}

#[tauri::command]
fn get_browse_history() -> Vec<BrowseHistoryItem> {
    load_browse_history()
}

#[tauri::command]
fn record_browse_history(item: BrowseHistoryItem) -> Result<(), String> {
    save_history_item(item)
}

#[tauri::command]
fn clear_browse_history() -> Result<(), String> {
    clear_history_data()
}

#[tauri::command]
fn delete_browse_history_item(id: String) -> Result<(), String> {
    delete_history_item(&id)
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
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
                        std::process::exit(0);
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
        .plugin(tauri_plugin_single_instance_init())
        .invoke_handler(tauri::generate_handler![
            get_config,
            save_config,
            select_cache_dir,
            open_cache_folder,
            read_file_data_url,
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

fn tauri_plugin_single_instance_init() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    tauri::plugin::Builder::new("wallpaper_app_core").build()
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
    async fn test_check_app_update_live() {
        let res = check_app_update().await;
        assert!(res.is_ok(), "check_app_update failed: {:?}", res);
        let info = res.unwrap();
        assert!(!info.latest_version.is_empty());
        assert_eq!(info.current_version, env!("CARGO_PKG_VERSION"));
    }

    #[test]
    fn test_delete_wallpapers_batch() {
        let temp_dir = std::env::temp_dir().join("wallpaper_app_batch_test");
        let _ = fs::create_dir_all(&temp_dir);
        let f1 = temp_dir.join("test_batch_1.jpg");
        let f2 = temp_dir.join("test_batch_2.jpg");
        let _ = fs::write(&f1, "dummy1");
        let _ = fs::write(&f2, "dummy2");
        assert!(f1.exists());
        assert!(f2.exists());

        let count = delete_wallpapers_batch(vec![
            f1.to_string_lossy().to_string(),
            f2.to_string_lossy().to_string(),
        ]).expect("batch delete should succeed");

        assert_eq!(count, 2);
        assert!(!f1.exists());
        assert!(!f2.exists());
        let _ = fs::remove_dir_all(temp_dir);
    }

    #[test]
    fn test_browse_history_commands() {
        let item = BrowseHistoryItem {
            id: "hist-test-1".to_string(),
            title: "Test History Title".to_string(),
            thumb_url: "thumb_test.jpg".to_string(),
            raw_url: "raw_test.jpg".to_string(),
            source: "bing".to_string(),
            viewed_at: 1234567,
        };
        let _ = record_browse_history(item.clone());
        let list = get_browse_history();
        assert!(list.iter().any(|h| h.id == "hist-test-1"));

        let item2 = BrowseHistoryItem {
            id: "hist-test-2".to_string(),
            title: "Test History Title 2".to_string(),
            thumb_url: "thumb_test2.jpg".to_string(),
            raw_url: "raw_test2.jpg".to_string(),
            source: "bing".to_string(),
            viewed_at: 1234568,
        };
        let _ = record_browse_history(item2);
        let _ = delete_browse_history_item("hist-test-1".to_string());
        let list_after_delete = get_browse_history();
        assert!(!list_after_delete.iter().any(|h| h.id == "hist-test-1"));
        assert!(list_after_delete.iter().any(|h| h.id == "hist-test-2"));

        let _ = clear_browse_history();
        let list_cleared = get_browse_history();
        assert!(list_cleared.is_empty());
    }
}
