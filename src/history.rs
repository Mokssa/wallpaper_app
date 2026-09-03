use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

pub const MAX_HISTORY_ITEMS: usize = 200;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct BrowseHistoryItem {
    pub id: String,
    pub title: String,
    pub thumb_url: String,
    pub raw_url: String,
    pub source: String,
    #[serde(default = "current_timestamp")]
    pub viewed_at: u64,
}

pub fn current_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

pub fn history_path() -> PathBuf {
    PathBuf::from("config/history.json")
}

pub fn load_browse_history() -> Vec<BrowseHistoryItem> {
    let path = history_path();
    if path.exists() {
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(items) = serde_json::from_str::<Vec<BrowseHistoryItem>>(&content) {
                return items;
            }
        }
    }
    Vec::new()
}

pub fn save_browse_history(items: &[BrowseHistoryItem]) -> Result<(), String> {
    let path = history_path();
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    let content = serde_json::to_string_pretty(items).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn record_browse_history(mut item: BrowseHistoryItem) -> Result<(), String> {
    if item.viewed_at == 0 {
        item.viewed_at = current_timestamp();
    }
    let mut items = load_browse_history();

    // Deduplicate: remove any item matching id or raw_url
    items.retain(|h| {
        let same_id = !item.id.is_empty() && h.id == item.id;
        let same_raw = !item.raw_url.is_empty() && h.raw_url == item.raw_url;
        !same_id && !same_raw
    });

    // Insert at front
    items.insert(0, item);

    // Cap at MAX_HISTORY_ITEMS
    if items.len() > MAX_HISTORY_ITEMS {
        items.truncate(MAX_HISTORY_ITEMS);
    }

    save_browse_history(&items)
}

pub fn clear_browse_history() -> Result<(), String> {
    save_browse_history(&[])
}

pub fn delete_browse_history_item(id: &str) -> Result<(), String> {
    let mut items = load_browse_history();
    items.retain(|h| h.id != id && h.raw_url != id);
    save_browse_history(&items)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_history_serialization_roundtrip() {
        let item = BrowseHistoryItem {
            id: "test-1".to_string(),
            title: "Test Wallpaper".to_string(),
            thumb_url: "https://example.com/thumb.jpg".to_string(),
            raw_url: "https://example.com/raw.jpg".to_string(),
            source: "bing".to_string(),
            viewed_at: 1700000000,
        };
        let serialized = serde_json::to_string(&item).unwrap();
        let deserialized: BrowseHistoryItem = serde_json::from_str(&serialized).unwrap();
        assert_eq!(item, deserialized);
    }

    #[test]
    fn test_deduplication_and_ordering() {
        let mut list = Vec::new();
        let item1 = BrowseHistoryItem {
            id: "w-1".to_string(),
            title: "Item 1".to_string(),
            thumb_url: "t1".to_string(),
            raw_url: "r1".to_string(),
            source: "pexels".to_string(),
            viewed_at: 100,
        };
        let item2 = BrowseHistoryItem {
            id: "w-2".to_string(),
            title: "Item 2".to_string(),
            thumb_url: "t2".to_string(),
            raw_url: "r2".to_string(),
            source: "unsplash".to_string(),
            viewed_at: 200,
        };
        list.insert(0, item1.clone());
        list.insert(0, item2.clone());
        assert_eq!(list[0].id, "w-2");

        let item1_updated = BrowseHistoryItem {
            viewed_at: 300,
            ..item1
        };
        list.retain(|h| h.id != item1_updated.id);
        list.insert(0, item1_updated);

        assert_eq!(list[0].id, "w-1");
        assert_eq!(list[0].viewed_at, 300);
        assert_eq!(list[1].id, "w-2");
    }

    #[test]
    fn test_capacity_limit() {
        let mut list = Vec::new();
        for i in 0..250 {
            list.push(BrowseHistoryItem {
                id: format!("item-{}", i),
                title: format!("Title {}", i),
                thumb_url: "thumb".to_string(),
                raw_url: format!("raw-{}", i),
                source: "pexels".to_string(),
                viewed_at: i as u64,
            });
        }
        if list.len() > MAX_HISTORY_ITEMS {
            list.truncate(MAX_HISTORY_ITEMS);
        }
        assert_eq!(list.len(), 200);
    }

    #[test]
    fn test_delete_browse_history_item() {
        let mut list = vec![
            BrowseHistoryItem {
                id: "w-1".to_string(),
                title: "Wall 1".to_string(),
                thumb_url: "t1".to_string(),
                raw_url: "r1".to_string(),
                source: "bing".to_string(),
                viewed_at: 100,
            },
            BrowseHistoryItem {
                id: "w-2".to_string(),
                title: "Wall 2".to_string(),
                thumb_url: "t2".to_string(),
                raw_url: "r2".to_string(),
                source: "bing".to_string(),
                viewed_at: 200,
            },
        ];
        list.retain(|h| h.id != "w-1" && h.raw_url != "w-1");
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].id, "w-2");
    }
}
