use serde::{Deserialize, Serialize};
use std::{
    path::PathBuf,
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};

pub const MAX_HISTORY_ITEMS: usize = 200;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct BrowseHistoryItem {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub author: String,
    pub thumb_url: String,
    pub raw_url: String,
    pub source: String,
    #[serde(default)]
    pub copyright_link: Option<String>,
    #[serde(default = "current_timestamp")]
    pub viewed_at: u64,
}

pub fn current_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

pub struct HistoryStore {
    path: PathBuf,
    items: Mutex<Vec<BrowseHistoryItem>>,
}

impl HistoryStore {
    pub fn open(path: PathBuf) -> Result<Self, String> {
        let mut items =
            crate::storage::read_json::<Vec<BrowseHistoryItem>>(&path)?.unwrap_or_default();
        items.truncate(MAX_HISTORY_ITEMS);
        Ok(Self {
            path,
            items: Mutex::new(items),
        })
    }
    pub fn list(&self) -> Result<Vec<BrowseHistoryItem>, String> {
        Ok(self.items.lock().map_err(|e| e.to_string())?.clone())
    }
    fn update(&self, change: impl FnOnce(&mut Vec<BrowseHistoryItem>)) -> Result<(), String> {
        let mut items = self.items.lock().map_err(|e| e.to_string())?;
        let mut next = items.clone();
        change(&mut next);
        crate::storage::write_json(&self.path, &next)?;
        *items = next;
        Ok(())
    }
    pub fn record(&self, mut item: BrowseHistoryItem) -> Result<(), String> {
        if item.viewed_at == 0 {
            item.viewed_at = current_timestamp();
        }
        self.update(|items| {
            items.retain(|h| {
                !((!item.id.is_empty() && h.id == item.id && h.source == item.source)
                    || (!item.raw_url.is_empty() && h.raw_url == item.raw_url))
            });
            items.insert(0, item);
            items.truncate(MAX_HISTORY_ITEMS);
        })
    }
    pub fn clear(&self) -> Result<(), String> {
        self.update(|items| items.clear())
    }
    pub fn delete(&self, id: &str) -> Result<(), String> {
        self.update(|items| items.retain(|h| h.id != id && h.raw_url != id))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn item(id: usize) -> BrowseHistoryItem {
        BrowseHistoryItem {
            id: id.to_string(),
            title: "Title".into(),
            author: "Artist".into(),
            thumb_url: "https://example.com/thumb.jpg".into(),
            raw_url: format!("https://example.com/{id}.jpg"),
            source: "bing".into(),
            copyright_link: None,
            viewed_at: 0,
        }
    }
    #[test]
    fn real_persistence_deduplication_and_capacity() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("history.json");
        let store = HistoryStore::open(path.clone()).unwrap();
        for id in 0..205 {
            store.record(item(id)).unwrap();
        }
        store.record(item(200)).unwrap();
        let list = store.list().unwrap();
        assert_eq!(list.len(), 200);
        assert_eq!(list[0].id, "200");
        assert!(list[0].viewed_at > 0);
        assert_eq!(HistoryStore::open(path).unwrap().list().unwrap(), list);
        store.delete("200").unwrap();
        assert_eq!(store.list().unwrap().len(), 199);
        store.clear().unwrap();
        assert!(store.list().unwrap().is_empty());
    }
    #[test]
    fn old_history_can_be_used_as_download_argument() {
        let legacy = r#"{"id":"old","title":"Old","thumb_url":"https://example.com/t.jpg","raw_url":"https://example.com/r.jpg","source":"bing"}"#;
        let item: BrowseHistoryItem = serde_json::from_str(legacy).unwrap();
        let json = serde_json::to_value(item).unwrap();
        let download: crate::downloader::OnlineWallpaper = serde_json::from_value(json).unwrap();
        assert_eq!(download.id, "old");
    }
    #[test]
    fn concurrent_updates_do_not_lose_items() {
        let dir = tempfile::tempdir().unwrap();
        let store =
            std::sync::Arc::new(HistoryStore::open(dir.path().join("history.json")).unwrap());
        std::thread::scope(|scope| {
            for id in 0..20 {
                let store = store.clone();
                scope.spawn(move || store.record(item(id)).unwrap());
            }
        });
        assert_eq!(store.list().unwrap().len(), 20);
    }
}
