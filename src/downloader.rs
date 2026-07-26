use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use chrono::Local;
use base64::Engine;

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
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
            .timeout(std::time::Duration::from_secs(12))
            .redirect(reqwest::redirect::Policy::limited(10))
            .build()
            .unwrap_or_default()
    }

    /// 后端直接下载图片并转换为 Base64 Data URL，彻底绕过前端 WebView 跨域与网络重定向限制
    pub async fn fetch_image_as_base64(url: &str) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
        let client = Self::build_client();
        let res = client.get(url).send().await?;
        let content_type = res.headers()
            .get(reqwest::header::CONTENT_TYPE)
            .and_then(|v| v.to_str().ok())
            .unwrap_or("image/jpeg")
            .to_string();
        
        let bytes = res.bytes().await?;
        let encoded = base64::engine::general_purpose::STANDARD.encode(bytes);
        Ok(format!("data:{};base64,{}", content_type, encoded))
    }

    /// 获取在线壁纸列表（支持分页与稳定 CDN 直连）
    pub async fn fetch_online_list(source: &str, query: &str, page: usize, limit: usize) -> Result<Vec<OnlineWallpaper>, Box<dyn std::error::Error + Send + Sync>> {
        let client = Self::build_client();
        let page = if page == 0 { 1 } else { page };
        let limit = if limit == 0 { 12 } else { limit };

        let mut list = Vec::new();

        match source {
            "bing" => {
                let idx = (page - 1) * 7;
                let api_url = format!("https://cn.bing.com/HPImageArchive.aspx?format=js&idx={}&n={}&mkt=zh-CN", idx, limit.min(8));
                if let Ok(res) = client.get(&api_url).send().await {
                    if let Ok(json_res) = res.json::<serde_json::Value>().await {
                        if let Some(images) = json_res["images"].as_array() {
                            for (i, img) in images.iter().enumerate() {
                                let urlbase = img["url"].as_str().unwrap_or("");
                                if urlbase.is_empty() { continue; }
                                
                                let full_url = if urlbase.starts_with("http") {
                                    urlbase.to_string()
                                } else {
                                    format!("https://cn.bing.com{}", urlbase)
                                };
                                
                                let copyright = img["copyright"].as_str().unwrap_or("Bing 官方每日壁纸").to_string();
                                
                                list.push(OnlineWallpaper {
                                    id: format!("bing_{}_{}", page, i + 1),
                                    title: copyright,
                                    author: "Microsoft Bing".to_string(),
                                    thumb_url: full_url.clone(),
                                    raw_url: full_url,
                                    source: "Bing 每日壁纸".to_string(),
                                });
                            }
                        }
                    }
                }
            }
            "wallhaven" => {
                let q_param = if query.is_empty() { "nature" } else { query };
                let api_url = format!("https://wallhaven.cc/api/v1/search?q={}&page={}&sorting=views", urlencoding::encode(q_param), page);
                if let Ok(res) = client.get(&api_url).send().await {
                    if let Ok(json_res) = res.json::<serde_json::Value>().await {
                        if let Some(data) = json_res["data"].as_array() {
                            for img in data {
                                let id = img["id"].as_str().unwrap_or("");
                                let path = img["path"].as_str().unwrap_or("");
                                let thumbs = &img["thumbs"];
                                let thumb = thumbs["small"].as_str().or_else(|| thumbs["original"].as_str()).unwrap_or(path);
                                let category = img["category"].as_str().unwrap_or("Wallhaven");

                                if !path.is_empty() {
                                    list.push(OnlineWallpaper {
                                        id: format!("wallhaven_{}", id),
                                        title: format!("Wallhaven 精选 #{}", id),
                                        author: format!("分类: {}", category),
                                        thumb_url: thumb.to_string(),
                                        raw_url: path.to_string(),
                                        source: "Wallhaven".to_string(),
                                    });
                                }
                            }
                        }
                    }
                }
            }
            _ => {
                // Picsum 高清精选图库
                let api_url = format!("https://picsum.photos/v2/list?page={}&limit={}", page, limit);
                if let Ok(res) = client.get(&api_url).send().await {
                    if let Ok(array) = res.json::<serde_json::Value>().await {
                        if let Some(imgs) = array.as_array() {
                            for img in imgs {
                                let id = img["id"].as_str().unwrap_or("");
                                let author = img["author"].as_str().unwrap_or("Featured Artist");
                                
                                let thumb_url = format!("https://picsum.photos/id/{}/500/300", id);
                                let raw_url = format!("https://picsum.photos/id/{}/1920/1080", id);

                                list.push(OnlineWallpaper {
                                    id: format!("picsum_{}", id),
                                    title: format!("摄影作品 by {}", author),
                                    author: author.to_string(),
                                    thumb_url,
                                    raw_url,
                                    source: "Picsum 4K 摄影".to_string(),
                                });
                            }
                        }
                    }
                }
            }
        }

        Ok(list)
    }

    /// 下载在线壁纸到本地缓存
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
