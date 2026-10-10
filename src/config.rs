use serde::{Deserialize, Serialize};
use std::path::PathBuf;

fn default_font_family() -> String {
    "rounded".to_string()
}

fn default_language() -> String {
    "zh-CN".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct AppConfig {
    pub schema_version: u32,
    pub random_source: String,
    pub theme_color: String,
    pub custom_theme_color: Option<String>,
    pub amoled_mode: bool,
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
    pub font_family: String, // "rounded" | "youyuan" | "fluent" | "misans"
    #[serde(default = "default_language")]
    pub language: String, // "zh-CN" | "en-US" | "ja-JP" | "ko-KR"
}

pub fn default_cache_dir() -> String {
    dirs::document_dir()
        .unwrap_or_else(crate::storage::data_dir)
        .join("wallpaper_app")
        .to_string_lossy()
        .to_string()
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            schema_version: 0,
            random_source: "all".into(),
            theme_color: "indigo".into(),
            custom_theme_color: None,
            amoled_mode: false,
            query: "".to_string(),          // 1. 搜索默认为空
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
            language: "zh-CN".to_string(),
        }
    }
}

impl AppConfig {
    pub fn config_path() -> PathBuf {
        crate::storage::data_dir().join("settings.json")
    }

    pub fn load() -> Result<Self, String> {
        let path = Self::config_path();
        crate::storage::migrate_legacy(&path, "settings.json")?;
        let mut config = crate::storage::read_json::<Self>(&path)?.unwrap_or_default();
        if config.query == "nature,wallpaper,architecture" || config.query == "nature,wallpaper" {
            config.query.clear();
        }
        if config.cache_dir == "cache/wallpapers" || config.cache_dir.is_empty() {
            config.cache_dir = default_cache_dir();
        } else if PathBuf::from(&config.cache_dir).is_relative() {
            config.cache_dir = std::env::current_dir()
                .map_err(|e| e.to_string())?
                .join(&config.cache_dir)
                .to_string_lossy()
                .to_string();
        }
        config.normalize();
        config.save()?;
        Ok(config)
    }

    pub fn normalize(&mut self) {
        self.auto_update_interval_minutes = self.auto_update_interval_minutes.clamp(5, 1440);
        self.batch_count = self.batch_count.clamp(1, 24);
        self.load_mode = "infinite".into();
        if !["all", "local", "bing", "pexels", "unsplash", "wallhaven"]
            .contains(&self.random_source.as_str())
        {
            self.random_source = "all".into();
        }
        if !["fill", "fit", "stretch", "tile", "center", "span"]
            .contains(&self.wallpaper_style.as_str())
        {
            self.wallpaper_style = "fill".into();
        }
    }

    pub fn save(&self) -> Result<(), String> {
        if !PathBuf::from(&self.cache_dir).is_absolute() {
            return Err("Wallpaper directory must be an absolute path".into());
        }
        crate::storage::write_json(&Self::config_path(), self)
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
        assert!(!config.auto_update_enabled);
        assert_eq!(config.batch_count, 6);
        assert_eq!(config.wallpaper_style, "fill");
        assert_eq!(config.load_mode, "pagination");
        assert_eq!(config.card_ratio, "uniform");
        assert_eq!(config.font_family, "rounded");
        assert_eq!(config.language, "zh-CN");
    }

    #[test]
    fn test_corrupted_json_recovery_fallback() {
        let malformed_json = "{ \"query\": \"broken\", \"auto_update_interval_minutes\": ";
        let parsed = serde_json::from_str::<AppConfig>(malformed_json);
        assert!(
            parsed.is_err(),
            "Malformed JSON should return Deserialization Error"
        );

        let non_json = "NOT_A_JSON_FILE_CONTENT_RAW_BINARY_DATA";
        let parsed_non_json = serde_json::from_str::<AppConfig>(non_json);
        assert!(
            parsed_non_json.is_err(),
            "Arbitrary text should return Deserialization Error"
        );
    }

    #[test]
    fn test_partial_config_backward_compatibility() {
        // Missing font_family, language and pexels_api_key should receive default values
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

        let config: AppConfig = serde_json::from_str(partial_json)
            .expect("Should deserialize partial config with defaults");
        assert_eq!(config.query, "minimalist");
        assert_eq!(
            config.font_family, "rounded",
            "Missing font_family should default to rounded"
        );
        assert_eq!(
            config.language, "zh-CN",
            "Missing language should default to zh-CN"
        );
        assert_eq!(
            config.pexels_api_key, "",
            "Missing pexels_api_key should default to empty string"
        );
    }

    #[test]
    fn preferences_survive_real_serialization_and_invalid_intervals_are_clamped() {
        let mut config: AppConfig = serde_json::from_str(
            r##"{
            "theme_color":"custom", "custom_theme_color":"#123456", "amoled_mode":true,
            "random_source":"local", "auto_update_interval_minutes":0
        }"##,
        )
        .unwrap();
        config.normalize();
        let restored: AppConfig =
            serde_json::from_slice(&serde_json::to_vec(&config).unwrap()).unwrap();
        assert_eq!(restored.theme_color, "custom");
        assert_eq!(restored.custom_theme_color.as_deref(), Some("#123456"));
        assert!(restored.amoled_mode);
        assert_eq!(restored.random_source, "local");
        assert_eq!(restored.auto_update_interval_minutes, 5);
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

        let mut config: AppConfig =
            serde_json::from_str(legacy_json).expect("Should parse legacy json");
        if config.query == "nature,wallpaper,architecture" || config.query == "nature,wallpaper" {
            config.query = "".to_string();
        }
        if config.cache_dir == "cache/wallpapers" || config.cache_dir.is_empty() {
            config.cache_dir = default_cache_dir();
        }

        assert_eq!(config.query, "", "Legacy query should be cleared to empty");
        assert_ne!(
            config.cache_dir, "cache/wallpapers",
            "Legacy cache_dir should be upgraded"
        );
    }
}
