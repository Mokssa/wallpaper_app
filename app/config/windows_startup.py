from __future__ import annotations

import os
import sys
from pathlib import Path

from app.utils.paths import get_app_root

try:
    import winreg
except ImportError:  # pragma: no cover
    winreg = None


RUN_KEY_PATH = r"Software\Microsoft\Windows\CurrentVersion\Run"
APP_NAME = "WallpaperApp"


def _is_windows() -> bool:
    return os.name == "nt" and winreg is not None


def get_startup_command() -> str:
    if getattr(sys, "frozen", False):
        return f'"{Path(sys.executable).resolve()}"'
    python_exe = get_app_root() / ".venv" / "Scripts" / "python.exe"
    if not python_exe.is_file():
        python_exe = Path(sys.executable)
    app_main = get_app_root() / "wallpaper_app" / "main.py"
    return f'"{python_exe}" "{app_main}"'


def is_startup_enabled() -> bool:
    if not _is_windows():
        return False
    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, RUN_KEY_PATH, 0, winreg.KEY_READ) as key:
            value, _ = winreg.QueryValueEx(key, APP_NAME)
            return bool(value)
    except OSError:
        return False


def set_startup_enabled(enabled: bool) -> None:
    if not _is_windows():
        raise RuntimeError("Windows startup registration is only available on Windows.")
    if enabled:
        command = get_startup_command()
        with winreg.CreateKey(winreg.HKEY_CURRENT_USER, RUN_KEY_PATH) as key:
            winreg.SetValueEx(key, APP_NAME, 0, winreg.REG_SZ, command)
    else:
        try:
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, RUN_KEY_PATH, 0, winreg.KEY_SET_VALUE) as key:
                winreg.DeleteValue(key, APP_NAME)
        except FileNotFoundError:
            pass
        except OSError:
            pass
