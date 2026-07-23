from PySide6.QtCore import QTimer


class TaskScheduler:
    def __init__(self, service, config_manager, logger, on_batch_ready=None) -> None:
        self.service = service
        self.config_manager = config_manager
        self.logger = logger
        self.on_batch_ready = on_batch_ready
        self.timer = QTimer()
        self.timer.timeout.connect(self._run)

    def start(self, run_initial_fetch: bool = True) -> None:
        config = self.config_manager.load()
        interval_ms = max(1, int(config.refresh_interval_hours)) * 60 * 60 * 1000
        self.timer.start(interval_ms)
        self.logger.info("Scheduler started with interval %s hours.", config.refresh_interval_hours)
        if run_initial_fetch and config.auto_update_on_start:
            self._run()

    def restart(self, run_initial_fetch: bool = True) -> None:
        self.stop()
        self.start(run_initial_fetch=run_initial_fetch)

    def stop(self) -> None:
        self.timer.stop()

    def _run(self) -> None:
        try:
            cached_paths = self.service.fetch_and_cache_batch()
            if self.on_batch_ready is not None:
                self.on_batch_ready(cached_paths)
        except Exception as exc:
            self.logger.error("Wallpaper update failed: %s", exc)
