from __future__ import annotations

import os

try:
    import winreg
except ImportError:  # pragma: no cover
    winreg = None

from PySide6.QtGui import QColor, QPalette
from PySide6.QtWidgets import QApplication


def _read_windows_theme_is_light() -> bool:
    if os.name != "nt" or winreg is None:
        return True
    keys = (
        (winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize", "AppsUseLightTheme"),
        (winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize", "SystemUsesLightTheme"),
    )
    for hive, path, value_name in keys:
        try:
            with winreg.OpenKey(hive, path) as key:
                value, _ = winreg.QueryValueEx(key, value_name)
                return bool(int(value))
        except OSError:
            continue
    return True


def resolve_theme_mode(theme_mode: str) -> str:
    mode = (theme_mode or "system").strip().lower()
    if mode not in {"light", "dark", "system"}:
        return "system"
    return mode


def effective_theme(theme_mode: str) -> str:
    mode = resolve_theme_mode(theme_mode)
    if mode == "system":
        return "light" if _read_windows_theme_is_light() else "dark"
    return mode


def apply_theme(app: QApplication, theme_mode: str) -> None:
    resolved = effective_theme(theme_mode)
    palette = QPalette()
    if resolved == "dark":
        app.setStyle("Fusion")
        palette.setColor(QPalette.Window, QColor("#1e1e1e"))
        palette.setColor(QPalette.WindowText, QColor("#f3f4f6"))
        palette.setColor(QPalette.Base, QColor("#111827"))
        palette.setColor(QPalette.AlternateBase, QColor("#1f2937"))
        palette.setColor(QPalette.ToolTipBase, QColor("#111827"))
        palette.setColor(QPalette.ToolTipText, QColor("#f9fafb"))
        palette.setColor(QPalette.Text, QColor("#f3f4f6"))
        palette.setColor(QPalette.Button, QColor("#262626"))
        palette.setColor(QPalette.ButtonText, QColor("#f3f4f6"))
        palette.setColor(QPalette.BrightText, QColor("#ef4444"))
        palette.setColor(QPalette.Highlight, QColor("#2563eb"))
        palette.setColor(QPalette.HighlightedText, QColor("#ffffff"))
    else:
        app.setStyle("Fusion")
        palette.setColor(QPalette.Window, QColor("#f4f7fb"))
        palette.setColor(QPalette.WindowText, QColor("#0f172a"))
        palette.setColor(QPalette.Base, QColor("#ffffff"))
        palette.setColor(QPalette.AlternateBase, QColor("#eef2f7"))
        palette.setColor(QPalette.ToolTipBase, QColor("#ffffff"))
        palette.setColor(QPalette.ToolTipText, QColor("#111827"))
        palette.setColor(QPalette.Text, QColor("#0f172a"))
        palette.setColor(QPalette.Button, QColor("#ffffff"))
        palette.setColor(QPalette.ButtonText, QColor("#0f172a"))
        palette.setColor(QPalette.BrightText, QColor("#dc2626"))
        palette.setColor(QPalette.Highlight, QColor("#2a7fff"))
        palette.setColor(QPalette.HighlightedText, QColor("#ffffff"))
    app.setPalette(palette)


def theme_is_dark(theme_mode: str) -> bool:
    return effective_theme(theme_mode) == "dark"
