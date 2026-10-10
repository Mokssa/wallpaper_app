use base64::Engine;
use chrono::Local;
use serde::{Deserialize, Serialize};
use std::collections::hash_map::DefaultHasher;
use std::fs;
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};

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
    #[serde(default)]
    pub author: String,
    pub thumb_url: String,
    pub raw_url: String,
    pub source: String,
    pub copyright_link: Option<String>,
}

pub struct WallpaperDownloader;

impl WallpaperDownloader {
    fn url_hash(url: &str) -> u64 {
        let mut hash = DefaultHasher::new();
        url.hash(&mut hash);
        hash.finish()
    }

    pub async fn fetch_image_as_base64(url: &str) -> Option<String> {
        let dir = crate::storage::cache_dir().join("remote-previews");
        let path = dir.join(format!("{:016x}.image", Self::url_hash(url)));
        if !path.exists() {
            let (temp, _) = crate::network::download(url, &dir, 32 * 1024 * 1024)
                .await
                .ok()?;
            temp.persist(&path).ok()?;
        }
        tokio::task::spawn_blocking(move || {
            let ext = crate::network::validate_image(&path).ok()?;
            let bytes = fs::read(&path).ok()?;
            let mime = if ext == "jpg" { "jpeg" } else { ext };
            Some(format!(
                "data:image/{};base64,{}",
                mime,
                base64::engine::general_purpose::STANDARD.encode(bytes)
            ))
        })
        .await
        .ok()
        .flatten()
    }

    /// Fetch provider metadata using the shared HTTP client.
    pub async fn fetch_online_list(
        source: &str,
        query: &str,
        page: usize,
        limit: usize,
        unsplash_key: &str,
        pexels_key: &str,
    ) -> Result<Vec<OnlineWallpaper>, Box<dyn std::error::Error + Send + Sync>> {
        let page = if page == 0 { 1 } else { page };
        let limit = if limit == 0 { 12 } else { limit.min(80) };

        let mut list = Vec::new();

        match source {
            "bing" => return crate::providers::bing(query, page, limit).await,
            "unsplash" => {
                return crate::providers::unsplash(query, page, limit, unsplash_key).await
            }
            "wallhaven" => return crate::providers::wallhaven(query, page).await,
            "pexels" => {
                if !pexels_key.trim().is_empty() {
                    return crate::providers::pexels(query, page, limit, pexels_key).await;
                }
                let safe_page = if page == 0 { 1 } else { page };
                let safe_limit = if limit == 0 { 16 } else { limit };

                // 智能分类识别
                let q_lower = query.trim().to_lowercase();
                let category_key = match q_lower.as_str() {
                    "" | "curated" | "normal" | "all" => "curated",
                    "nature" | "自然风光" | "自然" | "风景" => "nature",
                    "city" | "城市建筑" | "城市" | "建筑" => "city",
                    "ocean" | "海洋沙滩" | "海洋" | "大海" | "沙滩" => "ocean",
                    "dark" | "暗黑极简" | "暗黑" | "极简" | "黑色" => "dark",
                    "aerial" | "航拍摄影" | "航拍" | "鸟瞰" => "aerial",
                    "night" | "璀璨夜景" | "夜景" | "星空" => "night",
                    _ => "curated",
                };

                // No API key: show the finite built-in curated catalog.
                if list.is_empty() {
                    type CatalogImage<'a> = (&'a str, &'a str, &'a str, &'a str);
                    type CatalogCategory<'a> = (&'a str, &'a [CatalogImage<'a>]);
                    let pexels_catalog: &[CatalogCategory<'_>] = &[
                        (
                            "curated",
                            &[
                                ("13248795", "jpeg", "Büşra Ş", "日落晚霞与静谧河流"),
                                ("39066553", "jpeg", "Dr Photographer", "水滨绿意与清澈水面"),
                                ("9653855", "jpeg", "Atahan Demir", "细腻沙滩金色浪花"),
                                ("38672000", "jpeg", "Pexels Featured", "极简黄昏飞鸟剪影"),
                                ("1402787", "jpeg", "Johannes Plenio", "晨曦穿透静谧原始森林"),
                                ("2662116", "jpeg", "Jaime Reimer", "雪山倒影与冰川湖泊"),
                                ("169647", "jpeg", "Peng Liu", "现代都市摩天大楼天际线"),
                                ("1624496", "jpeg", "Johannes Plenio", "璀璨银河与星空穹顶"),
                                (
                                    "1450353",
                                    "jpeg",
                                    "Oliver Sjöström",
                                    "热带海岛清澈渐变玻璃海",
                                ),
                                (
                                    "1287145",
                                    "jpeg",
                                    "Eberhard Grossgasteiger",
                                    "阿尔卑斯山脉雪峰暮色",
                                ),
                                ("3225517", "jpeg", "Michael Block", "壮丽峡湾瀑布奔流"),
                                (
                                    "572897",
                                    "jpeg",
                                    "Eberhard Grossgasteiger",
                                    "落基山脉倒映如镜",
                                ),
                                ("3408744", "jpeg", "Stein Egil Liland", "北欧峡湾与金色日落"),
                                (
                                    "1671325",
                                    "jpeg",
                                    "Eberhard Grossgasteiger",
                                    "高山针叶林与缭绕晨雾",
                                ),
                                ("417074", "jpeg", "James Wheeler", "壮丽湖泊与秋季彩林"),
                                ("1421903", "jpeg", "James Wheeler", "高山深潭与秋意红叶"),
                                ("326055", "jpeg", "Pixabay", "金色麦田与澄澈蓝天"),
                                ("414171", "jpeg", "Pixabay", "静谧高山湖泊倒映"),
                                ("531756", "jpeg", "Pixabay", "晨光普照青翠山谷"),
                                ("624015", "jpeg", "Frans Van Heerden", "壮美山川瀑布全景"),
                                ("709552", "jpeg", "Ian Turnell", "湍急河流与秋林古石"),
                                ("775201", "jpeg", "Kaique Rocha", "险峻山峰与云雾缭绕"),
                                ("814499", "jpeg", "Martin Damboldt", "湖光山色日暮余晖"),
                                ("1054218", "jpeg", "Mali Maeder", "静谧林海与雪山遥望"),
                            ],
                        ),
                        (
                            "nature",
                            &[
                                ("13248795", "jpeg", "Büşra Ş", "日落晚霞与静谧河流"),
                                ("39066553", "jpeg", "Dr Photographer", "水滨绿意与清澈水面"),
                                ("1402787", "jpeg", "Johannes Plenio", "晨曦穿透静谧原始森林"),
                                ("2662116", "jpeg", "Jaime Reimer", "雪山倒影与冰川湖泊"),
                                ("3225517", "jpeg", "Michael Block", "壮丽峡湾瀑布奔流"),
                                (
                                    "1287145",
                                    "jpeg",
                                    "Eberhard Grossgasteiger",
                                    "阿尔卑斯山脉雪峰暮色",
                                ),
                                ("1761279", "jpeg", "Jacob Colvin", "原始森林公路与蜿蜒薄雾"),
                                (
                                    "572897",
                                    "jpeg",
                                    "Eberhard Grossgasteiger",
                                    "落基山脉倒映如镜",
                                ),
                                ("3408744", "jpeg", "Stein Egil Liland", "北欧峡湾与金色日落"),
                                (
                                    "1671325",
                                    "jpeg",
                                    "Eberhard Grossgasteiger",
                                    "高山针叶林与缭绕晨雾",
                                ),
                                ("417074", "jpeg", "James Wheeler", "壮丽湖泊与秋季彩林"),
                                ("1421903", "jpeg", "James Wheeler", "高山深潭与秋意红叶"),
                                ("326055", "jpeg", "Pixabay", "金色麦田与澄澈蓝天"),
                                ("414171", "jpeg", "Pixabay", "静谧高山湖泊倒映"),
                                ("531756", "jpeg", "Pixabay", "晨光普照青翠山谷"),
                                ("624015", "jpeg", "Frans Van Heerden", "壮美山川瀑布全景"),
                                ("709552", "jpeg", "Ian Turnell", "湍急河流与秋林古石"),
                                ("775201", "jpeg", "Kaique Rocha", "险峻山峰与云雾缭绕"),
                                ("814499", "jpeg", "Martin Damboldt", "湖光山色日暮余晖"),
                                ("1054218", "jpeg", "Mali Maeder", "静谧林海与雪山遥望"),
                                ("1103970", "jpeg", "Johannes Plenio", "梦幻极光与冷杉树冠"),
                                ("1183099", "jpeg", "Simon Berger", "冰岛苔原与苍凉奇境"),
                                (
                                    "1366919",
                                    "jpeg",
                                    "Eberhard Grossgasteiger",
                                    "深邃雪山与浮云漫卷",
                                ),
                                ("2387873", "jpeg", "Johannes Plenio", "高山旷野与漫天星辰"),
                            ],
                        ),
                        (
                            "city",
                            &[
                                ("169647", "jpeg", "Peng Liu", "现代都市摩天大楼天际线"),
                                (
                                    "374870",
                                    "jpeg",
                                    "Aleksandar Pasaric",
                                    "赛博朋克夜色霓虹都市",
                                ),
                                ("2440021", "jpeg", "Nextvoyage", "俯瞰繁华大都市立交桥"),
                                ("1519088", "jpeg", "David McBee", "日落余晖下的摩天大楼"),
                                (
                                    "378570",
                                    "jpeg",
                                    "Aleksandar Pasaric",
                                    "繁华街景夜色与车水马龙",
                                ),
                                (
                                    "3052361",
                                    "jpeg",
                                    "Aleksandar Pasaric",
                                    "上海陆家嘴夜景航拍",
                                ),
                                ("219692", "jpeg", "Pixabay", "旧金山金门大桥夕阳"),
                                ("466685", "jpeg", "Pixabay", "纽约帝国大厦日暮"),
                                ("1538177", "jpeg", "Dmitry Zvolskiy", "欧洲古典建筑街区晨光"),
                                (
                                    "2614818",
                                    "jpeg",
                                    "Aleksandar Pasaric",
                                    "重庆洪崖洞梦幻夜景",
                                ),
                                (
                                    "2506923",
                                    "jpeg",
                                    "Aleksandar Pasaric",
                                    "雾都天际线与灯火辉煌",
                                ),
                                (
                                    "1738986",
                                    "jpeg",
                                    "Aleksandar Pasaric",
                                    "夜幕下的都市璀璨街景",
                                ),
                                (
                                    "2246476",
                                    "jpeg",
                                    "Aleksandar Pasaric",
                                    "光影交织的摩天建筑群",
                                ),
                                ("1486785", "jpeg", "Aleksandar Pasaric", "迷离雨夜都市反光"),
                                ("1643383", "jpeg", "Aleksandar Pasaric", "梦幻粉紫都市夜空"),
                                (
                                    "2341830",
                                    "jpeg",
                                    "Aleksandar Pasaric",
                                    "未来感都市高架立体交通",
                                ),
                                (
                                    "2412606",
                                    "jpeg",
                                    "Aleksandar Pasaric",
                                    "极简都市天际线倒影",
                                ),
                                ("313782", "jpeg", "Pixabay", "欧洲运河水滨古典建筑"),
                                ("290386", "jpeg", "Pixabay", "曼哈顿都市全景"),
                                ("374710", "jpeg", "Aleksandar Pasaric", "霓虹斑斓的窄巷深处"),
                                ("1400249", "jpeg", "Aleksandar Pasaric", "繁华商务区夜景"),
                                (
                                    "2168974",
                                    "jpeg",
                                    "Aleksandar Pasaric",
                                    "日暮下的桥梁与车流",
                                ),
                                (
                                    "2422588",
                                    "jpeg",
                                    "Aleksandar Pasaric",
                                    "雨夜霓虹漫反射街道",
                                ),
                                ("1005644", "jpeg", "Tom Fisk", "高空鸟瞰夜幕道路网络"),
                            ],
                        ),
                        (
                            "ocean",
                            &[
                                ("9653855", "jpeg", "Atahan Demir", "细腻沙滩金色浪花"),
                                ("1001682", "jpeg", "Pok Rie", "蔚蓝深海与日光折射"),
                                ("189349", "jpeg", "Sebastian Voortman", "日落海滩与层层叠浪"),
                                (
                                    "1450353",
                                    "jpeg",
                                    "Oliver Sjöström",
                                    "热带海岛清澈渐变玻璃海",
                                ),
                                ("1295138", "jpeg", "George Desipris", "热带沙滩与轻拂棕榈树"),
                                ("221471", "jpeg", "Pixabay", "夕阳西下的无垠大海"),
                                ("1032650", "jpeg", "Tom Fisk", "鸟瞰海中孤岛与珊瑚礁"),
                                ("1680140", "jpeg", "Jess Loiterton", "航拍海浪拍打白沙滩"),
                                (
                                    "1174732",
                                    "jpeg",
                                    "Valentin Antonini",
                                    "地中海悬崖与碧蓝海水",
                                ),
                                (
                                    "1705254",
                                    "jpeg",
                                    "Asad Photo Maldives",
                                    "马尔代夫水上屋海景",
                                ),
                                ("1430677", "jpeg", "Frank Cone", "层叠浪花轻抚沙滩"),
                                ("1835718", "jpeg", "Tom Fisk", "航拍碧蓝海水与白色细沙"),
                                ("248797", "jpeg", "Pixabay", "热带日落与宁静海洋"),
                                ("1295036", "jpeg", "George Desipris", "海龟在清澈海水中漫游"),
                                ("1488315", "jpeg", "Oliver Sjöström", "清晨的第一缕海浪阳光"),
                                ("237272", "jpeg", "Pixabay", "椰林树影与碧海晴空"),
                            ],
                        ),
                        (
                            "dark",
                            &[
                                ("38672000", "jpeg", "Pexels Featured", "极简黄昏飞鸟剪影"),
                                (
                                    "1933239",
                                    "jpeg",
                                    "Eberhard Grossgasteiger",
                                    "暗黑岩石与极简迷雾",
                                ),
                                ("2387873", "jpeg", "Johannes Plenio", "深邃暗夜与极简星空"),
                                ("1629236", "jpeg", "Suissounet", "暗黑极简山脉轮廓"),
                                ("1274260", "jpeg", "Markus Spiske", "暗色极简微光粒子"),
                                ("247431", "jpeg", "Pixabay", "深邃宇宙银河星系"),
                                ("1005644", "jpeg", "Tom Fisk", "暗黑夜景公路微光"),
                                ("1421903", "jpeg", "James Wheeler", "静谧暗影水面倒映"),
                                ("167699", "jpeg", "Pixabay", "暗夜森林与微光剪影"),
                                ("1624438", "jpeg", "Johannes Plenio", "极简暗色地平线"),
                                ("1434608", "jpeg", "Stephan Seeber", "暮光余韵与剪影山峦"),
                                ("1252869", "jpeg", "Simon Berger", "夜幕下的纯净深蓝"),
                            ],
                        ),
                        (
                            "aerial",
                            &[
                                ("1486974", "jpeg", "Tom Fisk", "鸟瞰热带雨林蜿蜒河流"),
                                ("210186", "jpeg", "Pixabay", "航拍蔚蓝海岸与白色公路"),
                                ("3876407", "jpeg", "Kelly Lacy", "无人机航拍秋季层林尽染"),
                                ("1032650", "jpeg", "Tom Fisk", "鸟瞰海中孤岛与珊瑚礁"),
                                ("1680140", "jpeg", "Jess Loiterton", "航拍海浪拍打白沙滩"),
                                ("1659438", "jpeg", "Tom Fisk", "鸟瞰冰岛黑色沙滩河流"),
                                ("2440021", "jpeg", "Nextvoyage", "航拍繁华都市多层立交"),
                                ("1591373", "jpeg", "Pok Rie", "航拍翠绿梯田与村落"),
                                ("1835718", "jpeg", "Tom Fisk", "航拍碧海浅滩与渐变蓝"),
                                ("1005644", "jpeg", "Tom Fisk", "航拍夜色下的立交高架"),
                                ("3052361", "jpeg", "Aleksandar Pasaric", "航拍现代都市夜景"),
                                ("1174732", "jpeg", "Valentin Antonini", "鸟瞰地中海蔚蓝海湾"),
                            ],
                        ),
                        (
                            "night",
                            &[
                                ("1624496", "jpeg", "Johannes Plenio", "璀璨银河与星空穹顶"),
                                ("1252869", "jpeg", "Simon Berger", "极光与雪地木屋夜色"),
                                ("167699", "jpeg", "Pixabay", "璀璨星空与森林剪影"),
                                ("247431", "jpeg", "Pixabay", "深邃宇宙银河星系"),
                                (
                                    "374870",
                                    "jpeg",
                                    "Aleksandar Pasaric",
                                    "赛博朋克夜色霓虹都市",
                                ),
                                (
                                    "1933316",
                                    "jpeg",
                                    "Eberhard Grossgasteiger",
                                    "高山星空与流星划过",
                                ),
                                ("1624438", "jpeg", "Johannes Plenio", "梦幻星空与倒影之水"),
                                ("1434608", "jpeg", "Stephan Seeber", "暮光星辰与高山轮廓"),
                                (
                                    "1738986",
                                    "jpeg",
                                    "Aleksandar Pasaric",
                                    "夜幕下的都市璀璨街景",
                                ),
                                (
                                    "2614818",
                                    "jpeg",
                                    "Aleksandar Pasaric",
                                    "重庆洪崖洞梦幻夜景",
                                ),
                                ("1103970", "jpeg", "Johannes Plenio", "梦幻极光与冷杉树冠"),
                                (
                                    "2246476",
                                    "jpeg",
                                    "Aleksandar Pasaric",
                                    "光影交织的都市夜景",
                                ),
                            ],
                        ),
                    ];

                    let items_for_cat = pexels_catalog
                        .iter()
                        .find(|(k, _)| *k == category_key)
                        .map(|(_, items)| *items)
                        .unwrap_or(pexels_catalog[0].1);

                    let start_idx = (safe_page - 1) * safe_limit;
                    if start_idx >= items_for_cat.len() {
                        return Ok(list);
                    }
                    let end_idx = (start_idx + safe_limit).min(items_for_cat.len());

                    for &(pid, ext, author, title) in &items_for_cat[start_idx..end_idx] {
                        let thumb_url = format!("https://images.pexels.com/photos/{}/pexels-photo-{}.{}?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", pid, pid, ext);
                        let raw_url = format!(
                            "https://images.pexels.com/photos/{}/pexels-photo-{}.{}",
                            pid, pid, ext
                        );

                        list.push(OnlineWallpaper {
                            id: format!("pexels_{}_{}", category_key, pid),
                            title: format!("Pexels · {}", title),
                            author: author.to_string(),
                            thumb_url,
                            raw_url,
                            source: "Pexels".to_string(),
                            copyright_link: Some(format!(
                                "https://www.pexels.com/zh-cn/photo/{}/",
                                pid
                            )),
                        });
                    }
                }
            }
            _ => return Err("Unknown wallpaper source".into()),
        }

        Ok(list)
    }

    pub async fn download_online_wallpaper(
        item: &OnlineWallpaper,
        target_dir: &Path,
    ) -> Result<WallpaperItem, Box<dyn std::error::Error + Send + Sync>> {
        static DOWNLOAD_LOCK: std::sync::OnceLock<tokio::sync::Mutex<()>> =
            std::sync::OnceLock::new();
        let _guard = DOWNLOAD_LOCK
            .get_or_init(|| tokio::sync::Mutex::new(()))
            .lock()
            .await;
        tokio::fs::create_dir_all(target_dir).await?;
        let target_dir = target_dir.canonicalize()?;
        let id: String = item
            .id
            .chars()
            .filter(|c| c.is_ascii_alphanumeric() || *c == '_' || *c == '-')
            .take(80)
            .collect();
        if id.is_empty() {
            return Err("Invalid wallpaper identifier".into());
        }
        let safe_id = format!("{}_{:016x}", id, Self::url_hash(&item.raw_url));
        let mut urls = vec![item.raw_url.clone()];
        if item.thumb_url != item.raw_url && !item.thumb_url.is_empty() {
            urls.push(item.thumb_url.clone());
        }
        if item.source.eq_ignore_ascii_case("pexels") {
            if let Ok(mut url) = crate::network::validate_url(&item.raw_url) {
                let path = url.path().to_string();
                if let Some(base) = path.strip_suffix(".jpeg") {
                    url.set_path(&format!("{base}.png"));
                    urls.push(url.to_string());
                } else if let Some(base) = path.strip_suffix(".png") {
                    url.set_path(&format!("{base}.jpeg"));
                    urls.push(url.to_string());
                }
            }
        }
        let mut last_error = String::from("No image URL supplied");
        for url in urls {
            match crate::network::download(&url, &target_dir, 128 * 1024 * 1024).await {
                Ok((temp, extension)) => {
                    let file_path = target_dir.join(format!("{safe_id}.{extension}"));
                    temp.persist(&file_path)?;
                    let local = WallpaperItem {
                        id: safe_id,
                        title: item.title.clone(),
                        author: item.author.clone(),
                        file_path,
                        url: item.raw_url.clone(),
                        download_date: Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
                    };
                    let metadata_dir = target_dir.join("metadata");
                    fs::create_dir_all(&metadata_dir)?;
                    let metadata_dir = metadata_dir.canonicalize()?;
                    if !metadata_dir.starts_with(&target_dir) {
                        return Err("Metadata directory escapes wallpaper directory".into());
                    }
                    let meta = metadata_dir.join(format!("{}.json", local.id));
                    let metadata_item = local.clone();
                    tokio::task::spawn_blocking(move || {
                        crate::storage::write_json(&meta, &metadata_item)
                    })
                    .await??;
                    return Ok(local);
                }
                Err(error) => last_error = error,
            }
        }
        Err(format!("Wallpaper download failed: {last_error}").into())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn download_uses_actual_format_and_a_safe_filename() {
        let directory = tempfile::tempdir().unwrap();
        let mut bytes = std::io::Cursor::new(Vec::new());
        image::DynamicImage::new_rgb8(2, 2)
            .write_to(&mut bytes, image::ImageFormat::Png)
            .unwrap();
        let url = crate::network::tests::image_server(bytes.into_inner(), "200 OK").await;
        let item = OnlineWallpaper {
            id: "../../outside".into(),
            title: "Sample".into(),
            author: "Artist".into(),
            thumb_url: url.clone(),
            raw_url: url,
            source: "Pexels".into(),
            copyright_link: None,
        };
        let saved = WallpaperDownloader::download_online_wallpaper(&item, directory.path())
            .await
            .unwrap();
        assert!(saved
            .file_path
            .starts_with(directory.path().canonicalize().unwrap()));
        assert_eq!(saved.file_path.extension().unwrap(), "png");
        assert!(!saved.id.contains(".."));
        let stored: WallpaperItem = serde_json::from_slice(
            &fs::read(
                directory
                    .path()
                    .join("metadata")
                    .join(format!("{}.json", saved.id)),
            )
            .unwrap(),
        )
        .unwrap();
        assert_eq!(stored.author, "Artist");
        assert_eq!(crate::gallery::scan(directory.path()).unwrap().len(), 1);
    }

    #[tokio::test]
    async fn curated_catalog_exhausts_and_unknown_sources_fail() {
        assert!(
            !WallpaperDownloader::fetch_online_list("pexels", "", 1, 6, "", "")
                .await
                .unwrap()
                .is_empty()
        );
        assert!(
            WallpaperDownloader::fetch_online_list("pexels", "", 100, 6, "", "")
                .await
                .unwrap()
                .is_empty()
        );
        assert!(
            WallpaperDownloader::fetch_online_list("unknown", "", 1, 6, "", "")
                .await
                .is_err()
        );
    }

    #[tokio::test]
    #[ignore = "requires live Bing service"]
    async fn test_bing_pagination() {
        let page1 = WallpaperDownloader::fetch_online_list("bing", "zh-CN", 1, 8, "", "")
            .await
            .unwrap();
        let page2 = WallpaperDownloader::fetch_online_list("bing", "zh-CN", 2, 8, "", "")
            .await
            .unwrap();
        println!(
            "Bing page 1 count: {}, page 2 count: {}",
            page1.len(),
            page2.len()
        );
        assert!(!page1.is_empty(), "Bing page 1 should not be empty");
        assert!(!page2.is_empty(), "Bing page 2 should not be empty");

        // 验证第一页第一张与第二页最后一张不同 (确实拿到了更早的历史日期)
        assert_ne!(
            page1[0].id,
            page2[page2.len() - 1].id,
            "Page 2 should contain earlier historical wallpapers"
        );

        // 验证地区切换隔离
        let page_us = WallpaperDownloader::fetch_online_list("bing", "en-US", 1, 8, "", "")
            .await
            .unwrap();
        assert!(!page_us.is_empty(), "Bing en-US should not be empty");
        assert!(
            page_us[0].id.starts_with("bing_en-US_"),
            "ID should be prefixed with bing_en-US_"
        );
    }
}
