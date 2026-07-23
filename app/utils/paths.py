from __future__ import annotations

import sys
from pathlib import Path


def get_app_root() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parents[3]


def get_source_root() -> Path:
    if getattr(sys, "frozen", False):
        meipass = getattr(sys, "_MEIPASS", None)
        if meipass:
            return Path(meipass)
    return Path(__file__).resolve().parents[2]


def resolve_app_path(path_value: str | Path, *, base_dir: Path | None = None) -> Path:
    path = Path(path_value)
    if path.is_absolute():
        return path
    return (base_dir or get_app_root()) / path
