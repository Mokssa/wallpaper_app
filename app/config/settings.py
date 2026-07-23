from dataclasses import dataclass, asdict
from pathlib import Path

DEFAULT_QUERY = "wallpaper"
VALID_ORIENTATIONS = {"landscape", "portrait", "squarish"}
VALID_CONTENT_FILTERS = {"low", "high"}
VALID_WALLPAPER_STYLES = {"fill", "fit", "stretch", "center", "tile", "span"}
VALID_THEME_MODES = {"system", "light", "dark"}


def _clean_text(value: object, default: str = "") -> str:
    if value is None:
        return default
    if isinstance(value, (str, Path, int, float, bool)):
        text = str(value).strip()
        return text or default
    return default


def _clean_int(value: object, default: int, minimum: int, maximum: int) -> int:
    if isinstance(value, bool):
        return default
    try:
        number = int(str(value).strip())
    except (TypeError, ValueError):
        try:
            number = int(float(str(value).strip()))
        except (TypeError, ValueError):
            return default
    return max(minimum, min(maximum, number))


def _clean_bool(value: object, default: bool) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    if isinstance(value, (int, float)):
        return bool(value)
    text = str(value).strip().lower()
    if text in {"1", "true", "yes", "on", "y", "t", "是", "开", "开启"}:
        return True
    if text in {"0", "false", "no", "off", "n", "f", "否", "关", "关闭"}:
        return False
    return default


def _normalize_choice(value: object, allowed: set[str], default: str) -> str:
    text = _clean_text(value, default).lower()
    return text if text in allowed else default


def _split_query_tokens(value: object) -> list[str]:
    if value is None:
        return []
    if isinstance(value, (list, tuple, set)):
        raw = "\n".join(_clean_text(item) for item in value)
    else:
        raw = _clean_text(value)
    if not raw:
        return []
    for separator in ("\r", "，", ",", "；", ";", "、", "|"):
        raw = raw.replace(separator, "\n")
    tokens = [part.strip() for part in raw.split("\n")]
    cleaned: list[str] = []
    seen: set[str] = set()
    for token in tokens:
        if not token:
            continue
        normalized = token.casefold()
        if normalized in seen:
            continue
        seen.add(normalized)
        cleaned.append(token)
    return cleaned


def parse_query_terms(value: object, default: str = DEFAULT_QUERY) -> list[str]:
    terms = _split_query_tokens(value)
    return terms or [default]


def normalize_query_text(value: object, default: str = DEFAULT_QUERY) -> str:
    return "\n".join(parse_query_terms(value, default=default))


def normalize_path_text(value: object, default: str) -> str:
    text = _clean_text(value, default)
    return text or default


@dataclass
class AppConfig:
    unsplash_access_key: str = ""
    query: str = "wallpaper"
    orientation: str = "landscape"
    content_filter: str = "low"
    batch_count: int = 10
    refresh_interval_hours: int = 24
    auto_update_on_start: bool = True
    startup_launch: bool = False
    theme_mode: str = "system"
    cache_dir: str = "data/wallpapers"
    logs_dir: str = "data/logs"
    wallpaper_style: str = "fill"

    def to_dict(self) -> dict:
        return asdict(self)

    def normalized(self) -> "AppConfig":
        return AppConfig(
            unsplash_access_key=_clean_text(self.unsplash_access_key, ""),
            query=normalize_query_text(self.query),
            orientation=_normalize_choice(self.orientation, VALID_ORIENTATIONS, "landscape"),
            content_filter=_normalize_choice(self.content_filter, VALID_CONTENT_FILTERS, "low"),
            batch_count=_clean_int(self.batch_count, 10, 1, 30),
            refresh_interval_hours=_clean_int(self.refresh_interval_hours, 24, 1, 168),
            auto_update_on_start=_clean_bool(self.auto_update_on_start, True),
            startup_launch=_clean_bool(self.startup_launch, False),
            theme_mode=_normalize_choice(self.theme_mode, VALID_THEME_MODES, "system"),
            cache_dir=normalize_path_text(self.cache_dir, "data/wallpapers"),
            logs_dir=normalize_path_text(self.logs_dir, "data/logs"),
            wallpaper_style=_normalize_choice(self.wallpaper_style, VALID_WALLPAPER_STYLES, "fill"),
        )

    def query_terms(self) -> list[str]:
        return parse_query_terms(self.query)
