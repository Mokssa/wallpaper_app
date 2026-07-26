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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OnlineWallpaper {
    pub id: String,
    pub title: String,
    pub author: String,
    pub thumb_url: String,
    pub raw_url: String,
    pub source: String,
}

pub struct WallpaperDownloader;

impl WallpaperDownloader {
    fn build_client() -> reqwest::Client {
        reqwest::Client::builder()
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
            .timeout(std::time::Duration::from_secs(15))
            .build()
            .unwrap_or_default()
    }

    /// 获取在线壁纸列表（支持分页）
    pub async fn fetch_online_list(source: &str, query: &str, page: usize, limit: usize) -> Result<Vec<OnlineWallpaper>, Box<dyn std::error::Error + Send + Sync>> {
        let client = Self::build_client();
        let page = if page == 0 { 1 } else { page };
        let limit = if limit == 0 { 12 } else { limit };

        let mut list = Vec::new();

        match source {
            "bing" => {
                let api_url = format!("https://www.bing.com/HPImageArchive.aspx?format=js&idx={}&n={}&mkt=zh-CN", (page - 1) * 7, limit.min(8));
                let res = client.get(&api_url).send().await?.json::<serde_json::Value>().await?;
                if let Some(images) = res["images"].as_array() {
                    for (i, img) in images.iter().enumerate() {
                        let urlbase = img["url"].as_str().unwrap_or("");
                        if urlbase.is_empty() { continue; }
                        let full_url = format!("https://www.bing.com{}", urlbase);
                        let copyright = img["copyright"].as_str().unwrap_or("Bing Daily Wallpaper").to_string();
                        
                        list.push(OnlineWallpaper {
                            id: format!("bing_{}_{}", page, i + 1),
                            title: copyright,
                            author: "Microsoft Bing".to_string(),
                            thumb_url: full_url.clone(),
                            raw_url: full_url,
                            source: "Bing 每日精选".to_string(),
                        });
                    }
                }
            }
            "wallhaven" => {
                let q_param = if query.is_empty() { "nature" } else { query };
                let api_url = format!("https://wallhaven.cc/api/v1/search?q={}&page={}&sorting=views", urlencoding::encode(q_param), page);
                let res = client.get(&api_url).send().await?.json::<serde_json::Value>().await?;
                if let Some(data) = res["data"].as_array() {
                    for img in data {
                        let id = img["id"].as_str().unwrap_or("");
                        let path = img["path"].as_str().unwrap_or("");
                        let thumbs = &img["thumbs"];
                        let thumb = thumbs["small"].as_str().or_else(|| thumbs["original"].as_str()).unwrap_or(path);
                        let category = img["category"].as_str().unwrap_or("Wallhaven");

                        if !path.is_empty() {
                            list.push(OnlineWallpaper {
                                id: format!("wallhaven_{}", id),
                                title: format!("Wallhaven #{}", id),
                                author: format!("Category: {}", category),
                                thumb_url: thumb.to_string(),
                                raw_url: path.to_string(),
                                source: "Wallhaven".to_string(),
                            });
                        }
                    }
                }
            }
            _ => {
                // 默认使用 Picsum 4K 精选摄影库 (稳定无错支持分页)
                let api_url = format!("https://picsum.photos/v2/list?page={}&limit={}", page, limit);
                let res = client.get(&api_url).send().await?.json::<serde_json::Value>().await?;
                if let Some(array) = res.as_array() {
                    for img in array {
                        let id = img["id"].as_str().unwrap_or("");
                        let author = img["author"].as_str().unwrap_or("Unknown Artist");
                        
                        let thumb_url = format!("https://picsum.photos/id/{}/400/240", id);
                        let raw_url = format!("https://picsum.photos/id/{}/1920/1080", id);

                        list.push(OnlineWallpaper {
                            id: format!("picsum_{}", id),
                            title: format!("Photo by {}", author),
                            author: author.to_string(),
                            thumb_url,
                            raw_url,
                            source: "Picsum 摄影集".to_string(),
                        });
                    }
                }
            }
        }

        Ok(list)
    }

    /// 下载在线壁纸到缓存
    pub async fn download_online_wallpaper(item: &OnlineWallpaper, target_dir: &Path) -> Result<WallpaperItem, Box<dyn std::error::Error + Send + Sync>> {
        let client = Self::build_client();
        let res = client.get(&item.raw_url).send().await?;
        let img_bytes = res.bytes().await?;

        fs::create_dir_all(target_dir)?;
        let file_path = target_dir.join(format!("{}.jpg", item.id));
        fs::write(&file_path, &img_bytes)?;

        let local_item = WallpaperItem {
            id: item.id.clone(),
            title: item.title.clone(),
            author: item.author.clone(),
            file_path,
            url: item.raw_url.clone(),
            download_date: Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
        };

        let meta_path = target_dir.join(format!("{}.json", local_item.id));
        let meta_json = serde_json::to_string_pretty(&local_item)?;
        fs::write(meta_path, meta_json)?;

        Ok(local_item)
    }
}
