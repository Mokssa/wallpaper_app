from pathlib import Path
import ctypes


class WinWallpaperSetter:
    def set_wallpaper(self, image_path: Path, style: str = "fill") -> None:
        if not image_path.exists():
            raise FileNotFoundError(image_path)
        self._apply_style(style)
        result = ctypes.windll.user32.SystemParametersInfoW(20, 0, str(image_path), 3)
        if not result:
            raise RuntimeError("Failed to set wallpaper on Windows.")

    def _apply_style(self, style: str) -> None:
        _ = style
