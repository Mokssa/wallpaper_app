import logging
from pathlib import Path

from app.utils.paths import get_app_root, resolve_app_path


def setup_logger(log_dir: str = "data/logs") -> logging.Logger:
    logger = logging.getLogger("wallpaper_app")
    if logger.handlers:
        return logger

    logger.setLevel(logging.INFO)
    log_path = resolve_app_path(log_dir, base_dir=get_app_root())
    log_path.mkdir(parents=True, exist_ok=True)
    log_file = log_path / "app.log"

    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)s | %(name)s | %(message)s"
    )

    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(formatter)
    logger.addHandler(stream_handler)

    return logger
