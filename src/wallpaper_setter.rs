use std::path::Path;

#[cfg(target_os = "windows")]
use windows_sys::Win32::{
    Foundation::BOOL,
    UI::WindowsAndMessaging::{
        SystemParametersInfoW, SPI_SETDESKWALLPAPER,
        SPIF_SENDCHANGE, SPIF_UPDATEINIFILE,
    },
};

#[cfg(target_os = "windows")]
use winreg::{enums::*, RegKey};

pub struct WallpaperSetter;

impl WallpaperSetter {
    /// 通过 Win32 SystemParametersInfoW 直接设置壁纸（替代 wallpaper crate）
    pub fn set_wallpaper(path: &Path) -> Result<(), String> {
        #[cfg(target_os = "windows")]
        {
            let abs = path.canonicalize().map_err(|e| e.to_string())?;
            let mut path_str = abs.to_string_lossy().to_string();
            // canonicalize 在 Windows 上会产生 \\?\ 前缀，SystemParametersInfoW 不接受
            if path_str.starts_with("\\\\?\\") {
                path_str = path_str[4..].to_string();
            }
            let wide: Vec<u16> = path_str.encode_utf16().chain(std::iter::once(0)).collect();
            let ok: BOOL = unsafe {
                SystemParametersInfoW(
                    SPI_SETDESKWALLPAPER,
                    0,
                    wide.as_ptr() as *mut _,
                    SPIF_UPDATEINIFILE | SPIF_SENDCHANGE,
                )
            };
            if ok == 0 {
                return Err("SystemParametersInfoW 调用失败".to_string());
            }
            Ok(())
        }
        #[cfg(not(target_os = "windows"))]
        Err("仅支持 Windows 平台".to_string())
    }

    /// 通过注册表写入壁纸填充方式（fill/fit/stretch/tile/center/span）
    pub fn set_wallpaper_style(style: &str) -> Result<(), String> {
        #[cfg(target_os = "windows")]
        {
            let (ws, tw): (&str, &str) = match style {
                "fill"    => ("10", "0"),
                "fit"     => ("6",  "0"),
                "stretch" => ("2",  "0"),
                "tile"    => ("0",  "1"),
                "center"  => ("0",  "0"),
                "span"    => ("22", "0"),
                _         => ("10", "0"),
            };
            let hkcu = RegKey::predef(HKEY_CURRENT_USER);
            let desktop = hkcu
                .open_subkey_with_flags("Control Panel\\Desktop", KEY_SET_VALUE)
                .map_err(|e| e.to_string())?;
            desktop.set_value("WallpaperStyle", &ws.to_string()).map_err(|e| e.to_string())?;
            desktop.set_value("TileWallpaper",  &tw.to_string()).map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    /// 从注册表读取当前壁纸路径（不依赖 wallpaper crate）
    pub fn get_current_wallpaper() -> Option<String> {
        #[cfg(target_os = "windows")]
        {
            let hkcu = RegKey::predef(HKEY_CURRENT_USER);
            let desktop = hkcu.open_subkey("Control Panel\\Desktop").ok()?;
            let path: String = desktop.get_value("Wallpaper").ok()?;
            if path.is_empty() { None } else { Some(path) }
        }
        #[cfg(not(target_os = "windows"))]
        None
    }
}
