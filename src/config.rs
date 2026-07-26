use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub query: String,
    pub cache_dir: String,
    pub auto_update_interval_minutes: u64,
    pub auto_update_enabled: bool,
    pub batch_count: usize,
    pub wallpaper_style: String,
    pub unsplash_access_key: String,
    pub load_mode: String,  // "pagination" | "infinite"
    pub card_ratio: String, // "uniform" | "original"
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            query: "".to_string(), // 1. 搜索默认为空
            cache_dir: "cache/wallpapers".to_string(),
            auto_update_interval_minutes: 60,
            auto_update_enabled: false,
            batch_count: 6,
            wallpaper_style: "fill".to_string(),
            unsplash_access_key: "".to_string(),
            load_mode: "pagination".to_string(),
            card_ratio: "uniform".to_string(),
        }
    }
}

impl AppConfig {
    pub fn config_path() -> PathBuf {
        PathBuf::from("config/settings.json")
    }

    pub fn load() -> Self {
        let path = Self::config_path();
        if path.exists() {
            if let Ok(content) = fs::read_to_string(&path) {
                if let Ok(mut config) = serde_json::from_str::<AppConfig>(&content) {
                    // 如果老配置文件中的 query 依然是默认字符串，将其重置为空
                    if config.query == "nature,wallpaper,architecture" || config.query == "nature,wallpaper" {
                        config.query = "".to_string();
                    }
                    return config;
                }
            }
        }
        let default_config = Self::default();
        let _ = default_config.save();
        default_config
    }

    pub fn save(&self) -> Result<(), Box<dyn std::error::Error>> {
        let path = Self::config_path();
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        let json = serde_json::to_string_pretty(self)?;
        fs::write(path, json)?;
        Ok(())
    }
}
