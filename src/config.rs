use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

fn default_font_family() -> String {
    "rounded".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub query: String,
    pub cache_dir: String,
    pub auto_update_interval_minutes: u64,
    pub auto_update_enabled: bool,
    pub batch_count: usize,
    pub wallpaper_style: String,
    pub unsplash_access_key: String,
    #[serde(default)]
    pub pexels_api_key: String,
    pub load_mode: String,  // "pagination" | "infinite"
    pub card_ratio: String, // "uniform" | "original"
    #[serde(default = "default_font_family")]
    pub font_family: String, // "rounded" | "youyuan" | "fluent" | "wenkai" | "misans"
}

pub fn default_cache_dir() -> String {
    if let Some(doc_dir) = dirs::document_dir() {
        let wallpaper_dir = doc_dir.join("wallpaper_app");
        let _ = fs::create_dir_all(&wallpaper_dir);
        return wallpaper_dir.to_string_lossy().to_string();
    }
    if let Ok(user_profile) = std::env::var("USERPROFILE") {
        let wallpaper_dir = PathBuf::from(user_profile).join("Documents").join("wallpaper_app");
        let _ = fs::create_dir_all(&wallpaper_dir);
        return wallpaper_dir.to_string_lossy().to_string();
    }
    "cache/wallpapers".to_string()
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            query: "".to_string(), // 1. 搜索默认为空
            cache_dir: default_cache_dir(), // 默认路径: 用户的【文档/wallpaper_app】
            auto_update_interval_minutes: 60,
            auto_update_enabled: false,
            batch_count: 6,
            wallpaper_style: "fill".to_string(),
            unsplash_access_key: "".to_string(),
            pexels_api_key: "".to_string(),
            load_mode: "pagination".to_string(),
            card_ratio: "uniform".to_string(),
            font_family: "rounded".to_string(),
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
                    // 如果老配置文件中的路径是老的相对路径 cache/wallpapers，自动升级为文档/wallpaper_app
                    if config.cache_dir == "cache/wallpapers" || config.cache_dir.is_empty() {
                        config.cache_dir = default_cache_dir();
                        let _ = config.save();
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config_invariants() {
        let config = AppConfig::default();
        assert_eq!(config.query, "");
        assert_eq!(config.auto_update_interval_minutes, 60);
        assert_eq!(config.auto_update_enabled, false);
        assert_eq!(config.batch_count, 6);
        assert_eq!(config.wallpaper_style, "fill");
        assert_eq!(config.load_mode, "pagination");
        assert_eq!(config.card_ratio, "uniform");
        assert_eq!(config.font_family, "rounded");
    }

    #[test]
    fn test_corrupted_json_recovery_fallback() {
        let malformed_json = "{ \"query\": \"broken\", \"auto_update_interval_minutes\": ";
        let parsed = serde_json::from_str::<AppConfig>(malformed_json);
        assert!(parsed.is_err(), "Malformed JSON should return Deserialization Error");

        let non_json = "NOT_A_JSON_FILE_CONTENT_RAW_BINARY_DATA";
        let parsed_non_json = serde_json::from_str::<AppConfig>(non_json);
        assert!(parsed_non_json.is_err(), "Arbitrary text should return Deserialization Error");
    }

    #[test]
    fn test_partial_config_backward_compatibility() {
        // Missing font_family and pexels_api_key should receive default values
        let partial_json = r#"{
            "query": "minimalist",
            "cache_dir": "D:/Wallpapers",
            "auto_update_interval_minutes": 120,
            "auto_update_enabled": true,
            "batch_count": 8,
            "wallpaper_style": "fit",
            "unsplash_access_key": "custom-key",
            "load_mode": "infinite",
            "card_ratio": "original"
        }"#;

        let config: AppConfig = serde_json::from_str(partial_json).expect("Should deserialize partial config with defaults");
        assert_eq!(config.query, "minimalist");
        assert_eq!(config.font_family, "rounded", "Missing font_family should default to rounded");
        assert_eq!(config.pexels_api_key, "", "Missing pexels_api_key should default to empty string");
    }

    #[test]
    fn test_legacy_query_and_cache_migration_logic() {
        let legacy_json = r#"{
            "query": "nature,wallpaper,architecture",
            "cache_dir": "cache/wallpapers",
            "auto_update_interval_minutes": 60,
            "auto_update_enabled": false,
            "batch_count": 6,
            "wallpaper_style": "fill",
            "unsplash_access_key": "",
            "pexels_api_key": "",
            "load_mode": "pagination",
            "card_ratio": "uniform",
            "font_family": "rounded"
        }"#;

        let mut config: AppConfig = serde_json::from_str(legacy_json).expect("Should parse legacy json");
        if config.query == "nature,wallpaper,architecture" || config.query == "nature,wallpaper" {
            config.query = "".to_string();
        }
        if config.cache_dir == "cache/wallpapers" || config.cache_dir.is_empty() {
            config.cache_dir = default_cache_dir();
        }

        assert_eq!(config.query, "", "Legacy query should be cleared to empty");
        assert_ne!(config.cache_dir, "cache/wallpapers", "Legacy cache_dir should be upgraded");
    }
}

