use std::path::Path;

pub struct WallpaperSetter;

impl WallpaperSetter {
    pub fn set_wallpaper(path: &Path) -> Result<(), String> {
        let abs_path = path.canonicalize().map_err(|e| e.to_string())?;
        let path_str = abs_path.to_str().ok_or("Invalid path encoding")?;
        wallpaper::set_from_path(path_str).map_err(|e| e.to_string())?;
        wallpaper::set_mode(wallpaper::Mode::Crop).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_current_wallpaper() -> Option<String> {
        wallpaper::get().ok()
    }
}
