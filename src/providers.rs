use crate::{downloader::OnlineWallpaper, network};
use serde_json::Value;
use std::time::Duration;
type ProviderResult = Result<Vec<OnlineWallpaper>, Box<dyn std::error::Error + Send + Sync>>;

pub async fn pexels(query: &str, page: usize, limit: usize, key: &str) -> ProviderResult {
    let curated = query.trim().is_empty() || query.trim() == "curated";
    let mut url = reqwest::Url::parse(if curated {
        "https://api.pexels.com/v1/curated"
    } else {
        "https://api.pexels.com/v1/search"
    })?;
    url.query_pairs_mut()
        .append_pair("page", &page.to_string())
        .append_pair("per_page", &limit.clamp(1, 80).to_string());
    if !curated {
        url.query_pairs_mut()
            .append_pair("query", query)
            .append_pair("orientation", "landscape");
    }
    let json: Value = network::client()
        .get(url)
        .header("Authorization", key.trim())
        .timeout(Duration::from_secs(15))
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    let photos = json["photos"].as_array().ok_or("Invalid Pexels response")?;
    Ok(photos
        .iter()
        .filter_map(|photo| {
            let id = photo["id"].as_u64()?;
            let src = &photo["src"];
            let thumb = src["large2x"]
                .as_str()
                .or_else(|| src["large"].as_str())
                .or_else(|| src["medium"].as_str())?;
            Some(OnlineWallpaper {
                id: format!("pexels_{id}"),
                title: photo["alt"]
                    .as_str()
                    .filter(|s| !s.trim().is_empty())
                    .map(str::to_string)
                    .unwrap_or_else(|| format!("Pexels #{id}")),
                author: photo["photographer"].as_str().unwrap_or("Pexels").into(),
                thumb_url: thumb.into(),
                raw_url: src["original"].as_str().unwrap_or(thumb).into(),
                source: "Pexels".into(),
                copyright_link: photo["url"].as_str().map(str::to_string),
            })
        })
        .collect())
}

pub async fn bing(query: &str, page: usize, limit: usize) -> ProviderResult {
    if page > 2 {
        return Ok(Vec::new());
    }
    let market = match query.trim() {
        "en-US" | "ja-JP" | "en-GB" | "de-DE" | "fr-FR" => query.trim(),
        _ => "zh-CN",
    };
    let url = format!(
        "https://www.bing.com/HPImageArchive.aspx?format=js&idx={}&n={}&mkt={}",
        (page - 1) * 8,
        limit.clamp(1, 8),
        market
    );
    let json: Value = network::client()
        .get(url)
        .timeout(Duration::from_secs(15))
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    let images = json["images"].as_array().ok_or("Invalid Bing response")?;
    Ok(images
        .iter()
        .filter_map(|img| {
            let base = img["urlbase"].as_str().filter(|s| !s.is_empty())?;
            Some(OnlineWallpaper {
                id: format!(
                    "bing_{}_{}_{}",
                    market,
                    img["startdate"].as_str().unwrap_or(""),
                    img["hsh"].as_str().unwrap_or("")
                ),
                title: img["title"].as_str().unwrap_or("Bing 每日壁纸").into(),
                author: img["copyright"].as_str().unwrap_or("Microsoft Bing").into(),
                raw_url: format!("https://www.bing.com{base}_UHD.jpg"),
                thumb_url: format!("https://www.bing.com{base}_1920x1080.jpg"),
                source: "Bing 每日壁纸".into(),
                copyright_link: img["copyrightlink"].as_str().map(str::to_string),
            })
        })
        .collect())
}

pub async fn unsplash(query: &str, page: usize, limit: usize, key: &str) -> ProviderResult {
    if key.trim().is_empty() {
        return Err("UNSPLASH_KEY_REQUIRED".into());
    }
    let query = if query.is_empty() { "wallpaper" } else { query };
    let url = format!("https://api.unsplash.com/search/photos?query={}&page={page}&per_page={}&orientation=landscape",
        urlencoding::encode(query), limit.min(30));
    let response = network::client()
        .get(url)
        .timeout(Duration::from_secs(15))
        .header("Authorization", format!("Client-ID {}", key.trim()))
        .header("Accept-Version", "v1")
        .send()
        .await?;
    if response.status() == 401 || response.status() == 403 {
        return Err("UNSPLASH_KEY_INVALID".into());
    }
    let json: Value = response.error_for_status()?.json().await?;
    let results = json["results"]
        .as_array()
        .ok_or("Invalid Unsplash response")?;
    Ok(results
        .iter()
        .filter_map(|img| {
            let id = img["id"].as_str()?;
            let raw = img["urls"]["raw"].as_str()?;
            let mut raw_url = network::validate_url(raw).ok()?;
            raw_url
                .query_pairs_mut()
                .append_pair("q", "85")
                .append_pair("fm", "jpg")
                .append_pair("crop", "entropy")
                .append_pair("cs", "srgb")
                .append_pair("w", "3840");
            Some(OnlineWallpaper {
                id: format!("unsplash_{id}"),
                title: img["description"]
                    .as_str()
                    .or_else(|| img["alt_description"].as_str())
                    .unwrap_or("Unsplash Wallpaper")
                    .into(),
                author: img["user"]["name"]
                    .as_str()
                    .unwrap_or("Unsplash Artist")
                    .into(),
                thumb_url: img["urls"]["regular"].as_str().unwrap_or(raw).into(),
                raw_url: raw_url.to_string(),
                source: "Unsplash".into(),
                copyright_link: img["links"]["html"].as_str().map(str::to_string),
            })
        })
        .collect())
}

pub async fn wallhaven(query: &str, page: usize) -> ProviderResult {
    let parts: Vec<_> = query.split('|').collect();
    let value = |i: usize, default: &str| parts.get(i).copied().unwrap_or(default).to_string();
    let sort = value(2, "views");
    let mut url = reqwest::Url::parse("https://wallhaven.cc/api/v1/search")?;
    url.query_pairs_mut()
        .append_pair("q", &value(0, ""))
        .append_pair("categories", &value(1, "111"))
        .append_pair("purity", "100")
        .append_pair("sorting", &sort)
        .append_pair("ratios", &value(3, "16x9,16x10"))
        .append_pair("page", &page.to_string());
    if sort == "toplist" || sort == "views" {
        url.query_pairs_mut()
            .append_pair("topRange", &value(4, "1M"));
    }
    if sort == "random" && !value(5, "").is_empty() {
        url.query_pairs_mut().append_pair("seed", &value(5, ""));
    }
    let json: Value = network::client()
        .get(url)
        .timeout(Duration::from_secs(15))
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    let data = json["data"]
        .as_array()
        .ok_or("Invalid Wallhaven response")?;
    Ok(data
        .iter()
        .filter_map(|img| {
            let id = img["id"].as_str()?;
            let raw = img["path"].as_str()?;
            Some(OnlineWallpaper {
                id: format!("wallhaven_{id}"),
                title: format!(
                    "Wallhaven #{id} ({})",
                    img["resolution"].as_str().unwrap_or("")
                ),
                author: img["category"].as_str().unwrap_or("General").into(),
                raw_url: raw.into(),
                thumb_url: img["thumbs"]["large"].as_str().unwrap_or(raw).into(),
                source: "Wallhaven".into(),
                copyright_link: img["url"].as_str().map(str::to_string),
            })
        })
        .collect())
}
