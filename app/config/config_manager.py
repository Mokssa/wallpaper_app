import json
from dataclasses import fields
from pathlib import Path

from app.config.settings import AppConfig
from app.utils.paths import get_app_root, resolve_app_path


class ConfigManager:
    def __init__(self, config_path: str = "config/settings.json") -> None:
        base_dir = get_app_root()
        self.config_path = base_dir / "config" / "settings.json"

    def load(self) -> AppConfig:
        if not self.config_path.exists():
            return self._normalize_paths(AppConfig().normalized())
        try:
            data = json.loads(self.config_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return self._normalize_paths(AppConfig().normalized())
        if not isinstance(data, dict):
            return self._normalize_paths(AppConfig().normalized())
        current = AppConfig()
        merged = current.to_dict()
        allowed_fields = {field.name for field in fields(AppConfig)}
        merged.update({key: value for key, value in data.items() if key in allowed_fields})
        return self._normalize_paths(AppConfig(**merged).normalized())

    def save(self, config: AppConfig) -> None:
        self.config_path.parent.mkdir(parents=True, exist_ok=True)
        self.config_path.write_text(
            json.dumps(self._normalize_paths(config.normalized()).to_dict(), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def _normalize_paths(self, config: AppConfig) -> AppConfig:
        normalized = config.to_dict()
        cache_dir = resolve_app_path(normalized.get("cache_dir", "data/wallpapers"), base_dir=get_app_root())
        logs_dir = resolve_app_path(normalized.get("logs_dir", "data/logs"), base_dir=get_app_root())
        normalized["cache_dir"] = str(cache_dir)
        normalized["logs_dir"] = str(logs_dir)
        normalized["query"] = config.query
        return AppConfig(**normalized)
