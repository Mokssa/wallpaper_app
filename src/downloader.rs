use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use chrono::Local;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WallpaperItem {
    pub id: String,
    pub title: String,
    pub author: String,
    pub file_path: PathBuf,
    pub url: String,
    pub download_date: String,
}

pub struct WallpaperDownloader;

impl WallpaperDownloader {
    pub async fn fetch_bing_wallpaper(target_dir: &Path) -> Result<WallpaperItem, Box<dyn std::error::Error + Send + Sync>> {
        let client = reqwest::Client::new();
        let api_url = "https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN";
        let res = client.get(api_url).send().await?.json::<serde_json::Value>().await?;
        
        let images = res["images"].as_array().ok_or("Invalid Bing API response")?;
        if images.is_empty() {
            return Err("No image found in Bing API".into());
        }
        
        let img_obj = &images[0];
        let urlbase = img_obj["url"].as_str().ok_or("Missing image url")?;
        let full_url = format!("https://www.bing.com{}", urlbase);
        let title = img_obj["copyright"].as_str().unwrap_or("Bing Daily Wallpaper").to_string();
        let id = format!("bing_{}", Local::now().format("%Y%m%d_%H%M%S"));

        fs::create_dir_all(target_dir)?;
        let file_path = target_dir.join(format!("{}.jpg", id));

        let img_bytes = client.get(&full_url).send().await?.bytes().await?;
        fs::write(&file_path, &img_bytes)?;

        let item = WallpaperItem {
            id,
            title,
            author: "Bing".to_string(),
            file_path,
            url: full_url,
            download_date: Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
        };

        let meta_path = target_dir.join(format!("{}.json", item.id));
        let meta_json = serde_json::to_string_pretty(&item)?;
        fs::write(meta_path, meta_json)?;

        Ok(item)
    }

    pub async fn fetch_unsplash_wallpaper(target_dir: &Path, query: &str) -> Result<WallpaperItem, Box<dyn std::error::Error + Send + Sync>> {
        let client = reqwest::Client::new();
        let query_param = if query.is_empty() { "wallpaper,nature" } else { query };
        let full_url = format!("https://source.unsplash.com/featured/1920x1080/?{}", query_param);
        
        let res = client.get(&full_url).send().await?;
        let final_url = res.url().to_string();
        let img_bytes = res.bytes().await?;

        let id = format!("unsplash_{}", Local::now().format("%Y%m%d_%H%M%S"));
        fs::create_dir_all(target_dir)?;
        let file_path = target_dir.join(format!("{}.jpg", id));
        fs::write(&file_path, &img_bytes)?;

        let item = WallpaperItem {
            id: id.clone(),
            title: format!("Unsplash Wallpaper ({})", query_param),
            author: "Unsplash Photographer".to_string(),
            file_path,
            url: final_url,
            download_date: Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
        };

        let meta_path = target_dir.join(format!("{}.json", item.id));
        let meta_json = serde_json::to_string_pretty(&item)?;
        fs::write(meta_path, meta_json)?;

        Ok(item)
    }
}
