---
name: wallpaper-api-provider
description: "集成、解析与配置多种在线壁纸/图片 API 数据源（Bing 每日壁纸、Picsum Photos、Unsplash API、Wallhaven API 等）。提供 API 端点参数规范、鉴权规则、响应数据解析与原生 Rust/JS 请求示例。"
---

# Wallpaper API Provider Integration (在线壁纸源集成指南)

本 Skill 提供了针对主流高清壁纸及在线图片服务（Bing 每日壁纸、Picsum Photos、Unsplash API、Wallhaven API）的官方接口规范、数据解析逻辑以及 Tauri v2 (Rust/JS) 接入示例。

---

## 1. Wallhaven 壁纸社区 (Wallhaven API v1)

社区级高清与超高清壁纸源，支持按分辨率（如 4K/8K）、标签分类与 SFW/NSFW 过滤。

* **官方文档**: [https://wallhaven.cc/help/api](https://wallhaven.cc/help/api)
* **Base URL**: `https://wallhaven.cc/api/v1`
* **鉴权说明 (Authentication)**: 搜索 SFW 内容无需 Key；访问 NSFW 或个人收藏列表需在 Query 参数中携带 `apikey=<YOUR_API_KEY>`。

### 核心 Endpoint: 壁纸搜索与过滤 (`GET /search`)
* **URL**: `https://wallhaven.cc/api/v1/search`
* **查询参数 (Query Parameters)**:
  * `q`: 关键字或标签（例如 `landscape`, `anime`, `nature`）
  * `categories`: 3 位二进制开关 `[General, Anime, People]`。例如 `110` 表示选择 General + Anime。
  * `purity`: 3 位二进制纯净度 `[SFW, Sketchy, NSFW]`。默认 `100`（仅 SFW）。
  * `sorting`: 排序方式 (`date_added`, `relevance`, `random`, `views`, `toplist`)
  * `resolutions`: 目标分辨率（例如 `1920x1080,3840x2160`）
  * `ratios`: 宽高比（例如 `16x9,16x10`）
* **响应关键字段 (Response JSON)**:
  * `data[].path`: 壁纸原图高清直链 URL（如 `https://w.wallhaven.cc/full/ex/wallhaven-ex99...jpg`）
  * `data[].thumbs.large`: 预览大图 URL
  * `data[].resolution`: 图片分辨率（如 `"3840x2160"`）

---

## 2. Bing 官方每日壁纸 (Microsoft Bing API)

微软 Bing 官方每日壁纸，无需 API Key，高稳定、高质感。

* **Base URL**: `https://www.bing.com`
* **鉴权说明**: 无需 Authentication。

### 核心 Endpoint: 每日壁纸列表 (`GET /HPImageArchive.aspx`)
* **URL**: `https://www.bing.com/HPImageArchive.aspx`
* **查询参数**:
  * `format=js`: 指定返回 JSON 格式
  * `idx`: 相对今天偏移天数（`0` 表示今天，`1` 表示昨天，最多支持前 `7` 天）
  * `n`: 返回条数（最大 `8`）
  * `mkt`: 地区语言代码（例如 `zh-CN`, `en-US`）
* **地址拼接解析逻辑**:
  1. 提取响应中 `images[0].urlbase` 字段。
  2. 拼接超高清 UHD / 4K 图像链接：
     * UHD 尺寸: `"https://www.bing.com" + urlbase + "_UHD.jpg"`
     * 1080P 尺寸: `"https://www.bing.com" + urlbase + "_1920x1080.jpg"`
  3. 提取 `images[0].copyright` 获取壁纸名称与版权说明。

---

## 3. Unsplash 官方 API (Unsplash Developer API)

全球无版权摄影大图社区。

* **开发者门户**: [https://unsplash.com/developers](https://unsplash.com/developers)
* **Base URL**: `https://api.unsplash.com`
* **鉴权说明**: 必须在 HTTP Header 中附带 Client-ID：
  `Authorization: Client-ID YOUR_ACCESS_KEY`

### 常用 Endpoint 1: 随机大图/壁纸 (`GET /photos/random`)
* **URL**: `https://api.unsplash.com/photos/random`
* **查询参数**:
  * `query`: 关键词（例如 `nature`, `wallpaper`）
  * `orientation`: 图片方向 (`landscape`, `portrait`, `squarish`)
  * `count`: 获取数量（最大 30）
* **响应关键字段**:
  * `urls.raw`: 原图基础 URL（支持动态拼接参数如 `&w=3840&q=80` 进行 4K 裁切）
  * `urls.full`: 高清完整图直链
  * `urls.regular`: 1080p 预览图
  * `user.name`: 摄影师姓名（按 Unsplash 条款需展示署名）

---

## 4. Picsum Photos 摄影图库 (Lorem Picsum)

免费、极简且快速的随机摄影图片服务，非常适合占位或高质感随机壁纸。

* **Base URL**: `https://picsum.photos`
* **鉴权说明**: 无需 API Key。

### 常用用法:
1. **直链动态尺寸请求** (支持直接作为图片 `src` 或 Rust 下载):
   * 4K 随机图: `https://picsum.photos/3840/2160`
   * 高斯模糊图: `https://picsum.photos/1920/1080?blur=2`
   * 灰度黑白图: `https://picsum.photos/1920/1080?grayscale`
2. **批量列表接口 (`GET /v2/list`)**:
   * **URL**: `https://picsum.photos/v2/list?page=1&limit=20`
   * **响应字段**: `id`, `author`, `download_url`

---

## 5. 代码接入示例 (Rust reqwest & JavaScript Fetch)

### JavaScript / TypeScript Fetch 请求示例
```javascript
/**
 * 统一壁纸源数据获取接口
 * @param {'bing' | 'picsum' | 'unsplash' | 'wallhaven'} source 
 * @param {Object} options 
 */
export async function fetchWallpaper(source, options = {}) {
  switch (source) {
    case 'bing': {
      const idx = options.idx || 0;
      const res = await fetch(`https://www.bing.com/HPImageArchive.aspx?format=js&idx=${idx}&n=1&mkt=zh-CN`);
      const data = await res.json();
      const imgObj = data.images[0];
      return {
        id: `bing-${imgObj.hsh}`,
        url: `https://www.bing.com${imgObj.urlbase}_UHD.jpg`,
        thumbUrl: `https://www.bing.com${imgObj.urlbase}_1920x1080.jpg`,
        title: imgObj.copyright,
        author: 'Microsoft Bing',
        source: 'Bing'
      };
    }

    case 'picsum': {
      const width = options.width || 3840;
      const height = options.height || 2160;
      const randomId = Math.floor(Math.random() * 1000);
      return {
        id: `picsum-${randomId}`,
        url: `https://picsum.photos/${width}/${height}?random=${randomId}`,
        thumbUrl: `https://picsum.photos/640/360?random=${randomId}`,
        title: `Picsum Photo #${randomId}`,
        author: 'Picsum Community',
        source: 'Picsum'
      };
    }

    case 'unsplash': {
      const accessKey = options.unsplashAccessKey;
      if (!accessKey) throw new Error('Unsplash Access Key is required');
      const query = encodeURIComponent(options.keyword || 'nature');
      const res = await fetch(`https://api.unsplash.com/photos/random?orientation=landscape&query=${query}`, {
        headers: { Authorization: `Client-ID ${accessKey}` }
      });
      const data = await res.json();
      return {
        id: `unsplash-${data.id}`,
        url: `${data.urls.raw}&w=3840&q=85`,
        thumbUrl: data.urls.regular,
        title: data.description || data.alt_description || 'Unsplash Photo',
        author: data.user.name,
        source: 'Unsplash'
      };
    }

    case 'wallhaven': {
      const query = encodeURIComponent(options.keyword || 'landscape');
      const res = await fetch(`https://wallhaven.cc/api/v1/search?q=${query}&sorting=random&ratios=16x9&purity=100`);
      const data = await res.json();
      const item = data.data[0];
      return {
        id: `wallhaven-${item.id}`,
        url: item.path,
        thumbUrl: item.thumbs.large,
        title: `Wallhaven #${item.id} (${item.resolution})`,
        author: 'Wallhaven Community',
        source: 'Wallhaven'
      };
    }

    default:
      throw new Error(`Unsupported wallpaper source: ${source}`);
  }
}
```

### Rust (`reqwest` + `serde`) 后端抓取示例
```rust
use serde::{Deserialize, Serialize};
use reqwest::Client;

#[derive(Debug, Serialize, Deserialize)]
pub struct WallpaperItem {
    pub id: String,
    pub url: String,
    pub thumb_url: String,
    pub title: String,
    pub author: String,
    pub source: String,
}

pub async fn fetch_bing_wallpaper() -> Result<WallpaperItem, Box<dyn std::error::Error>> {
    let client = Client::new();
    let res = client
        .get("https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN")
        .send()
        .await?
        .json::<serde_json::Value>()
        .await?;

    let img = &res["images"][0];
    let urlbase = img["urlbase"].as_str().unwrap_or_default();
    let copyright = img["copyright"].as_str().unwrap_or("Bing Wallpaper");

    Ok(WallpaperItem {
        id: format!("bing-{}", img["hsh"].as_str().unwrap_or("0")),
        url: format!("https://www.bing.com{}_UHD.jpg", urlbase),
        thumb_url: format!("https://www.bing.com{}_1920x1080.jpg", urlbase),
        title: copyright.to_string(),
        author: "Microsoft Bing".to_string(),
        source: "Bing".to_string(),
    })
}
```

---

## 6. 开发最佳实践与注意事项

1. **CORS 与 Tauri 跨域限制**: 在前端 `fetch` 第三方壁纸 API 时可能受 CORS 限制，优先建议通过 Tauri 2.0 Rust 后端命令 (`#[tauri::command]`) 或网络抓取功能进行请求转发。
2. **壁纸缓存机制**: 避免重复下载超大原图（4K/UHD 通常 3MB-15MB），可使用本地临时文件夹缓存已下载的壁纸图片。
3. **分辨率适配**: 提取壁纸后根据当前显示器分辨率动态匹配 `16:9` / `21:9` 或选择最优裁切尺寸。
