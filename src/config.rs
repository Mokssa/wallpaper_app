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
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            query: "nature,wallpaper,architecture".to_string(),
            cache_dir: "cache/wallpapers".to_string(),
            auto_update_interval_minutes: 60,
            auto_update_enabled: false,
            batch_count: 6,
            wallpaper_style: "fill".to_string(),
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
                if let Ok(config) = serde_json::from_str::<AppConfig>(&content) {
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
