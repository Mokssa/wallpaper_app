import importlib.util
import subprocess
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.utils.paths import get_app_root, get_source_root

APP_ROOT = get_app_root()
SOURCE_ROOT = get_source_root()

APP_ICON_PATH = SOURCE_ROOT / 'assets' / 'logo.ico'


def ensure_requirements() -> None:
    if getattr(sys, "frozen", False):
        return
    requirements_path = BASE_DIR / 'requirements.txt'
    if not requirements_path.is_file():
        return

    missing = []
    for line in requirements_path.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        package_name = line.split('=', 1)[0].split('>', 1)[0].split('<', 1)[0].split('[', 1)[0].strip()
        if importlib.util.find_spec(package_name) is None:
            missing.append(line)

    if not missing:
        return

    print(f"Installing missing dependencies from {requirements_path.name}...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", str(requirements_path)])
    print("Dependency installation completed. Please restart the app.")


ensure_requirements()

from PySide6.QtWidgets import QApplication
from PySide6.QtGui import QIcon
from PySide6.QtCore import QTimer

from app.core.wallpaper_service import WallpaperService
from app.ui.main_window import MainWindow
from app.config.config_manager import ConfigManager
from app.config.windows_startup import is_startup_enabled
from app.scheduler.task_scheduler import TaskScheduler
from app.logging.logger import setup_logger
from app.ui.theme_manager import apply_theme


def main() -> None:
    app = QApplication([])
    app.setApplicationName("WallpaperApp")
    app.setApplicationDisplayName("WallpaperApp")
    if APP_ICON_PATH.is_file():
        app.setWindowIcon(QIcon(str(APP_ICON_PATH)))
    config_manager = ConfigManager()
    config = config_manager.load()
    config.startup_launch = is_startup_enabled()
    logger = setup_logger(config.logs_dir)
    service = WallpaperService(config=config, logger=logger)
    window = MainWindow(service=service, scheduler=None, config_manager=config_manager)
    scheduler = TaskScheduler(service=service, config_manager=config_manager, logger=logger)
    scheduler.on_batch_ready = lambda _paths: window.reload_local_images()
    window.scheduler = scheduler
    apply_theme(app, config.theme_mode)
    window.apply_theme_mode(config.theme_mode)
    app.setQuitOnLastWindowClosed(False)
    app.setWindowIcon(window.windowIcon() if not window.windowIcon().isNull() else app.windowIcon())
    window.show()
    scheduler.start(run_initial_fetch=False)
    if config.auto_update_on_start:
        QTimer.singleShot(1000, window.on_refresh_clicked)
    app.exec()


if __name__ == "__main__":
    main()
