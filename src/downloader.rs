use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
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
    pub copyright_link: Option<String>,
}

pub struct WallpaperDownloader;

impl WallpaperDownloader {
    fn build_client() -> reqwest::Client {
        reqwest::Client::builder()
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36")
            .timeout(std::time::Duration::from_secs(8))
            .redirect(reqwest::redirect::Policy::limited(5))
            .build()
            .unwrap_or_default()
    }

    fn url_hash(url: &str) -> u64 {
        let mut h = DefaultHasher::new();
        url.hash(&mut h);
        h.finish()
    }

    /// 获取缩略图磁盘缓存路径
    fn thumb_cache_path(url: &str) -> PathBuf {
        let hash = Self::url_hash(url);
        PathBuf::from("cache/thumbs").join(format!("{:016x}.jpg", hash))
    }

    /// 仅在按需备用时拉取特定图片转 Base64（优先读磁盘缓存）
    pub async fn fetch_image_as_base64(url: &str) -> Option<String> {
        let cache_path = Self::thumb_cache_path(url);

        // 命中磁盘缓存 → 直接返回，零网络开销
        if cache_path.exists() {
            if let Ok(bytes) = fs::read(&cache_path) {
                if !bytes.is_empty() {
                    let encoded = base64::engine::general_purpose::STANDARD.encode(&bytes);
                    return Some(format!("data:image/jpeg;base64,{}", encoded));
                }
            }
        }

        // 缓存未命中 → 下载并写入缓存
        let client = Self::build_client();
        if let Ok(res) = client.get(url).send().await {
            let content_type = res.headers()
                .get(reqwest::header::CONTENT_TYPE)
                .and_then(|v| v.to_str().ok())
                .unwrap_or("image/jpeg")
                .to_string();

            if let Ok(bytes) = res.bytes().await {
                if !bytes.is_empty() {
                    // 写入缓存目录
                    if let Some(parent) = cache_path.parent() {
                        let _ = fs::create_dir_all(parent);
                    }
                    let _ = fs::write(&cache_path, &bytes);

                    let encoded = base64::engine::general_purpose::STANDARD.encode(&bytes);
                    return Some(format!("data:{};base64,{}", content_type, encoded));
                }
            }
        }
        None
    }

    /// 极速轻量 API 抓取引擎 (毫秒级响应，零延迟返回真实网络 URL)
    pub async fn fetch_online_list(
        source: &str,
        query: &str,
        page: usize,
        limit: usize,
        unsplash_key: &str
    ) -> Result<Vec<OnlineWallpaper>, Box<dyn std::error::Error + Send + Sync>> {
        let client = Self::build_client();
        let page = if page == 0 { 1 } else { page };
        let limit = if limit == 0 { 12 } else { limit };

        let mut list = Vec::new();

        match source {
            "bing" => {
                // Bing 微软官方每日壁纸
                let idx = (page - 1) * 7;
                let api_url = format!("https://www.bing.com/HPImageArchive.aspx?format=js&idx={}&n={}&mkt=zh-CN", idx, limit.min(8));
                if let Ok(res) = client.get(&api_url).send().await {
                    if let Ok(json_res) = res.json::<serde_json::Value>().await {
                        if let Some(images) = json_res["images"].as_array() {
                            for (i, img) in images.iter().enumerate() {
                                let urlbase = img["urlbase"].as_str().unwrap_or("");
                                let copyright = img["copyright"].as_str().unwrap_or("Microsoft Bing 每日壁纸").to_string();
                                let hsh = img["hsh"].as_str().unwrap_or("0");
                                
                                let (thumb_url, raw_url) = if !urlbase.is_empty() {
                                    (
                                        format!("https://www.bing.com{}_1920x1080.jpg", urlbase),
                                        format!("https://www.bing.com{}_UHD.jpg", urlbase)
                                    )
                                } else {
                                    let raw_url_path = img["url"].as_str().unwrap_or("");
                                    let full = if raw_url_path.starts_with("http") {
                                        raw_url_path.to_string()
                                    } else {
                                        format!("https://www.bing.com{}", raw_url_path)
                                    };
                                    (full.clone(), full)
                                };
                                
                                list.push(OnlineWallpaper {
                                    id: format!("bing_{}_{}", hsh, i + 1),
                                    title: copyright,
                                    author: "Microsoft Bing".to_string(),
                                    thumb_url,
                                    raw_url,
                                    source: "Bing 每日壁纸".to_string(),
                                    copyright_link: img["copyrightlink"].as_str().map(|s| s.to_string()),
                                });
                            }
                        }
                    }
                }
            }

            "unsplash" => {
                // Unsplash 官方 API
                let q_param = if query.is_empty() { "nature" } else { query };
                let access_key = unsplash_key.trim();

                let api_url = format!(
                    "https://api.unsplash.com/search/photos?query={}&page={}&per_page={}&orientation=landscape",
                    urlencoding::encode(q_param),
                    page,
                    limit
                );
                let mut req = client.get(&api_url);
                if !access_key.is_empty() {
                    req = req.header("Authorization", format!("Client-ID {}", access_key));
                }

                if let Ok(res) = req.send().await {
                    if let Ok(json_res) = res.json::<serde_json::Value>().await {
                        if let Some(results) = json_res["results"].as_array() {
                            for img in results {
                                let id = img["id"].as_str().unwrap_or("");
                                if id.is_empty() { continue; }

                                let alt_desc = img["alt_description"].as_str()
                                    .or_else(|| img["description"].as_str())
                                    .unwrap_or("Unsplash 摄影大图");
                                
                                let author = img["user"]["name"].as_str()
                                    .unwrap_or("Unsplash Artist");

                                let thumb_url = img["urls"]["regular"].as_str()
                                    .or_else(|| img["urls"]["small"].as_str())
                                    .unwrap_or("");

                                let raw_url = format!("{}&w=3840&q=85", img["urls"]["raw"].as_str().unwrap_or(thumb_url));

                                if !thumb_url.is_empty() {
                                    list.push(OnlineWallpaper {
                                        id: format!("unsplash_{}", id),
                                        title: alt_desc.to_string(),
                                        author: author.to_string(),
                                        thumb_url: thumb_url.to_string(),
                                        raw_url,
                                        source: "Unsplash API".to_string(),
                                        copyright_link: img["links"]["html"].as_str().map(|s| s.to_string()),
                                    });
                                }
                            }
                        }
                    }
                }
            }

            "wallhaven" => {
                // Wallhaven 社区 API
                let q_param = if query.is_empty() { "nature" } else { query };
                let api_url = format!(
                    "https://wallhaven.cc/api/v1/search?q={}&page={}&sorting=views&purity=100&ratios=16x9",
                    urlencoding::encode(q_param),
                    page
                );
                if let Ok(res) = client.get(&api_url).send().await {
                    if let Ok(json_res) = res.json::<serde_json::Value>().await {
                        if let Some(data) = json_res["data"].as_array() {
                            for img in data {
                                let id = img["id"].as_str().unwrap_or("");
                                let path = img["path"].as_str().unwrap_or("");
                                let thumbs = &img["thumbs"];
                                let thumb = thumbs["large"].as_str()
                                    .or_else(|| thumbs["small"].as_str())
                                    .unwrap_or(path);
                                let category = img["category"].as_str().unwrap_or("General");
                                let res_str = img["resolution"].as_str().unwrap_or("4K");

                                if !path.is_empty() {
                                    list.push(OnlineWallpaper {
                                        id: format!("wallhaven_{}", id),
                                        title: format!("Wallhaven 壁纸 #{} ({})", id, res_str),
                                        author: format!("分类: {}", category),
                                        thumb_url: thumb.to_string(),
                                        raw_url: path.to_string(),
                                        source: "Wallhaven".to_string(),
                                        copyright_link: img["url"].as_str().map(|s| s.to_string()),
                                    });
                                }
                            }
                        }
                    }
                }
            }

            _ => {
                // Picsum 官方大图 API
                let api_url = format!("https://picsum.photos/v2/list?page={}&limit={}", page, limit);
                if let Ok(res) = client.get(&api_url).send().await {
                    if let Ok(array) = res.json::<serde_json::Value>().await {
                        if let Some(imgs) = array.as_array() {
                            for img in imgs {
                                let id = img["id"].as_str().unwrap_or("");
                                let author = img["author"].as_str().unwrap_or("Featured Artist");
                                
                                let thumb_url = format!("https://picsum.photos/id/{}/600/380", id);
                                let raw_url = format!("https://picsum.photos/id/{}/3840/2160", id);

                                list.push(OnlineWallpaper {
                                    id: format!("picsum_{}", id),
                                    title: format!("摄影作品 by {}", author),
                                    author: author.to_string(),
                                    thumb_url,
                                    raw_url,
                                    source: "Picsum 4K".to_string(),
                                    copyright_link: img["url"].as_str().map(|s| s.to_string()),
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
