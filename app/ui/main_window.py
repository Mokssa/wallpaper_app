from __future__ import annotations

from pathlib import Path

from PySide6.QtCore import QByteArray, QEvent, QObject, QThread, QTimer, Qt, QSize, Signal, Slot
from PySide6.QtGui import QAction, QColor, QIcon, QPainter, QPainterPath, QPen, QPixmap
from PySide6.QtWidgets import (
    QApplication,
    QAbstractItemView,
    QFrame,
    QHBoxLayout,
    QLabel,
    QListView,
    QListWidget,
    QListWidgetItem,
    QMainWindow,
    QMenu,
    QMessageBox,
    QSizePolicy,
    QSpacerItem,
    QSplitter,
    QStyle,
    QSystemTrayIcon,
    QToolButton,
    QVBoxLayout,
    QStyledItemDelegate,
    QWidget,
)

from app.ui.settings_dialog import SettingsDialog
from app.ui.theme_manager import apply_theme, theme_is_dark
from app.config.windows_startup import set_startup_enabled
from app.utils.paths import get_app_root, get_source_root


THUMBNAIL_SIZE = QSize(248, 156)
ITEM_CARD_SIZE = QSize(280, 188)
ITEM_ROLE_PATH = Qt.UserRole + 1
ITEM_ROLE_META = Qt.UserRole + 2
ITEM_ROLE_THUMB = Qt.UserRole + 3
GALLERY_BATCH_SIZE = 24
GALLERY_WHEEL_PIXEL_FACTOR = 0.25
GALLERY_WHEEL_ANGLE_STEP = 100
GALLERY_SCROLL_SINGLE_STEP = 100
APP_TITLE = '壁纸应用'


class GalleryListWidget(QListWidget):
    def wheelEvent(self, event) -> None:
        scroll_bar = self.verticalScrollBar()
        pixel_delta = event.pixelDelta().y()
        if pixel_delta:
            scroll_bar.setValue(scroll_bar.value() - int(pixel_delta * GALLERY_WHEEL_PIXEL_FACTOR))
            event.accept()
            return
        angle_delta = event.angleDelta().y()
        if angle_delta:
            scroll_bar.setValue(scroll_bar.value() - int((angle_delta / 120.0) * GALLERY_WHEEL_ANGLE_STEP))
            event.accept()
            return
        super().wheelEvent(event)


class BatchWorker(QObject):
    status = Signal(str)
    finished = Signal(object)
    failed = Signal(str)

    def __init__(self, service, batch_count) -> None:
        super().__init__()
        self.service = service
        self.batch_count = batch_count

    @Slot()
    def run(self) -> None:
        try:
            cached_paths = self.service.fetch_and_cache_batch(self.batch_count, reporter=self.status.emit)
            self.finished.emit(cached_paths)
        except Exception as exc:
            self.status.emit('刷新失败，已保留当前壁纸不变。')
            self.failed.emit(str(exc))


class ThumbnailWarmupWorker(QObject):
    finished = Signal(object)
    failed = Signal(str)

    def __init__(self, service, image_paths: list[Path]) -> None:
        super().__init__()
        self.service = service
        self.image_paths = [Path(path) for path in image_paths]

    @Slot()
    def run(self) -> None:
        try:
            built_paths: list[Path] = []
            for path in self.image_paths:
                try:
                    self.service.ensure_thumbnail(path)
                    built_paths.append(path)
                except Exception:
                    continue
            self.finished.emit(built_paths)
        except Exception as exc:
            self.failed.emit(str(exc))


class ThumbnailDelegate(QStyledItemDelegate):
    def paint(self, painter, option, index) -> None:
        painter.save()
        painter.setRenderHint(QPainter.Antialiasing, True)
        painter.setRenderHint(QPainter.SmoothPixmapTransform, True)

        card = option.rect.adjusted(4, 4, -4, -4)
        if card.width() <= 0 or card.height() <= 0:
            painter.restore()
            return

        thumb_value = index.data(ITEM_ROLE_THUMB)
        pixmap = QPixmap()
        if thumb_value:
            thumb_path = Path(str(thumb_value))
            if thumb_path.is_file():
                pixmap = QPixmap(str(thumb_path))
        if pixmap.isNull():
            icon = index.data(Qt.DecorationRole)
            if isinstance(icon, QIcon):
                pixmap = icon.pixmap(card.size())

        radius = 12
        clip = QPainterPath()
        clip.addRoundedRect(card, radius, radius)
        painter.setClipPath(clip)
        painter.fillRect(card, QColor('#eef2f7'))
        if not pixmap.isNull():
            scaled = pixmap.scaled(card.size(), Qt.KeepAspectRatioByExpanding, Qt.SmoothTransformation)
            x = card.x() + (card.width() - scaled.width()) // 2
            y = card.y() + (card.height() - scaled.height()) // 2
            painter.drawPixmap(x, y, scaled)

        painter.setClipping(False)
        if option.state & QStyle.State_Selected:
            painter.setPen(QPen(QColor('#2a7fff'), 2))
        elif option.state & QStyle.State_MouseOver:
            painter.setPen(QPen(QColor(37, 99, 235, 90), 1))
        else:
            painter.setPen(QPen(QColor(148, 163, 184, 72), 1))
        painter.setBrush(Qt.NoBrush)
        painter.drawRoundedRect(card, radius, radius)
        painter.restore()

    def sizeHint(self, option, index):
        return ITEM_CARD_SIZE

class MainWindow(QMainWindow):
    def __init__(self, service, scheduler, config_manager) -> None:
        super().__init__()
        self.service = service
        self.scheduler = scheduler
        self.config_manager = config_manager
        self.batch_thread = None
        self.batch_worker = None
        self.thumbnail_thread = None
        self.thumbnail_worker = None
        self._pending_gallery_paths: list[Path] = []
        self._pending_gallery_index = 0
        self._pending_gallery_selection: str | None = None
        self._pending_gallery_scroll_value: int | None = None
        self._pending_gallery_preserve_scroll: bool = False
        self._pending_refresh_summary: str | None = None
        self._gallery_batch_size = GALLERY_BATCH_SIZE
        self._restore_geometry: QByteArray | None = None
        self._restore_is_fullscreen: bool = False
        self._gallery_populate_timer = QTimer(self)
        self._gallery_populate_timer.setInterval(0)
        self._gallery_populate_timer.timeout.connect(self._append_gallery_batch)
        self._preview_path: Path | None = None
        self._preview_pixmap: QPixmap | None = None
        self._placeholder_icon = self.style().standardIcon(QStyle.SP_FileIcon)

        self.setWindowTitle(APP_TITLE)
        self.resize(1380, 920)
        self.setMinimumSize(1180, 780)
        self.setWindowIcon(self._load_app_icon())
        self._theme_mode = "system"

        central = QWidget(self)
        root_layout = QVBoxLayout(central)
        root_layout.setContentsMargins(14, 10, 10, 10)
        root_layout.setSpacing(10)

        top_bar = QHBoxLayout()
        top_bar.setContentsMargins(0, 0, 0, 0)
        top_bar.setSpacing(8)
        self.status_label = QLabel('已就绪', self)
        self.status_label.setStyleSheet('QLabel { color: #3b4a5a; font-size: 11px; }')
        self._status_default_text = self.status_label.text()
        self._status_reset_timer = QTimer(self)
        self._status_reset_timer.setSingleShot(True)
        self._status_reset_timer.setInterval(5000)
        self._status_reset_timer.timeout.connect(self._restore_status_text)
        self.open_settings_button = QToolButton(self)
        self.open_settings_button.setText('设置')
        self.refresh_list_button = QToolButton(self)
        self.refresh_list_button.setText('刷新')
        self._style_small_button(self.open_settings_button)
        self._style_small_button(self.refresh_list_button)
        self.open_settings_button.clicked.connect(self.on_open_settings)
        self.refresh_list_button.clicked.connect(self.on_refresh_clicked)
        top_bar.addWidget(self.status_label)
        top_bar.addItem(QSpacerItem(10, 10, QSizePolicy.Expanding, QSizePolicy.Minimum))
        top_bar.addWidget(self.open_settings_button)
        top_bar.addWidget(self.refresh_list_button)
        root_layout.addLayout(top_bar)

        self.gallery_hint = QLabel('本地缓存图片（单击预览，双击设为壁纸）：', self)
        self.gallery_hint.setStyleSheet('QLabel { color: #475569; font-size: 12px; font-weight: 600; }')
        root_layout.addWidget(self.gallery_hint)

        splitter = QSplitter(Qt.Horizontal, self)
        splitter.setChildrenCollapsible(False)
        splitter.setHandleWidth(6)

        gallery_host = QWidget(self)
        gallery_layout = QVBoxLayout(gallery_host)
        gallery_layout.setContentsMargins(12, 0, 10, 0)
        gallery_layout.setSpacing(0)

        self.gallery_list = GalleryListWidget(self)
        self.gallery_list.setViewMode(QListView.IconMode)
        self.gallery_list.setResizeMode(QListView.Adjust)
        self.gallery_list.setMovement(QListView.Static)
        self.gallery_list.setFlow(QListView.LeftToRight)
        self.gallery_list.setWrapping(True)
        self.gallery_list.setLayoutMode(QListView.Batched)
        self.gallery_list.setBatchSize(self._gallery_batch_size)
        self.gallery_list.setUniformItemSizes(True)
        self.gallery_list.setSpacing(28)
        self.gallery_list.setIconSize(THUMBNAIL_SIZE)
        self.gallery_list.setGridSize(QSize(284, 192))
        self.gallery_list.setSelectionMode(QAbstractItemView.SingleSelection)
        self.gallery_list.setVerticalScrollMode(QAbstractItemView.ScrollPerPixel)
        self.gallery_list.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        self.gallery_list.setVerticalScrollBarPolicy(Qt.ScrollBarAsNeeded)
        self.gallery_list.setWordWrap(True)
        self.gallery_list.setFrameShape(QFrame.NoFrame)
        self.gallery_list.setLineWidth(0)
        self.gallery_list.setItemDelegate(ThumbnailDelegate(self.gallery_list))
        self.gallery_list.verticalScrollBar().setSingleStep(GALLERY_SCROLL_SINGLE_STEP)
        self.gallery_list.setStyleSheet(
            'QListWidget { border: none; background: transparent; outline: none; padding-right: 18px; }'
            'QListWidget::item { margin: 0px; padding: 0px; background: transparent; border: none; }'
            'QListWidget::item:selected { background: transparent; }'
            'QScrollBar:vertical { width: 10px; background: transparent; margin: 10px 0px 10px 8px; border: none; }'
            'QScrollBar::handle:vertical { background: rgba(148, 163, 184, 0.38); min-height: 36px; border-radius: 5px; }'
            'QScrollBar::handle:vertical:hover { background: rgba(148, 163, 184, 0.58); }'
            'QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical { height: 0px; background: none; border: none; }'
            'QScrollBar::add-page:vertical, QScrollBar::sub-page:vertical { background: transparent; }'
        )
        self.gallery_list.itemClicked.connect(self.on_gallery_item_clicked)
        self.gallery_list.itemDoubleClicked.connect(self.on_gallery_item_double_clicked)
        self.gallery_list.setContextMenuPolicy(Qt.CustomContextMenu)
        self.gallery_list.customContextMenuRequested.connect(self.on_gallery_context_menu_requested)
        gallery_layout.addWidget(self.gallery_list)

        self.preview_panel = QFrame(self)
        self.preview_panel.setObjectName('previewPanel')
        self.preview_panel.setMinimumWidth(560)
        self.preview_panel.setMaximumWidth(680)
        self.preview_panel.setStyleSheet(
            'QFrame#previewPanel {'
            'background: qlineargradient(x1:0, y1:0, x2:1, y2:1, stop:0 rgba(255,255,255,0.96), stop:1 rgba(247,249,252,0.94));'
            'border: 1px solid rgba(226, 232, 240, 0.72);'
            'border-radius: 16px;'
            'margin: 2px;'
            'padding: 0px;'
            '}'
        )
        preview_layout = QVBoxLayout(self.preview_panel)
        preview_layout.setContentsMargins(14, 14, 14, 14)
        preview_layout.setSpacing(7)

        preview_head = QHBoxLayout()
        preview_head.setContentsMargins(0, 0, 0, 0)
        preview_head.setSpacing(8)
        self.preview_selected_label = QLabel('请选择一张图片预览', self)
        self.preview_selected_label.setFrameShape(QFrame.NoFrame)
        self.preview_selected_label.setStyleSheet('QLabel { color: #1f2937; font-size: 12px; font-weight: 600; background: transparent; border: none; }')
        self.apply_button = QToolButton(self)
        self.apply_button.setText('设为壁纸')
        self._style_small_button(self.apply_button)
        self.apply_button.clicked.connect(self.apply_selected_wallpaper)
        preview_head.addWidget(self.preview_selected_label, 1)
        preview_head.addWidget(self.apply_button)
        preview_layout.addLayout(preview_head)

        self.preview_image = QLabel('选中图片后，这里会显示预览', self)
        self.preview_image.setFrameShape(QFrame.NoFrame)
        self.preview_image.setAlignment(Qt.AlignCenter)
        self.preview_image.setMinimumHeight(320)
        self.preview_image.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Expanding)
        self.preview_image.setStyleSheet(
            'QLabel { background: #f8fafc; color: #64748b; border: none; border-radius: 14px; }'
        )
        self.preview_image.installEventFilter(self)
        preview_layout.addWidget(self.preview_image)

        meta_panel = QWidget(self)
        meta_panel.setStyleSheet('QWidget { background: transparent; border: none; }')
        meta_layout = QVBoxLayout(meta_panel)
        meta_layout.setContentsMargins(0, 0, 0, 0)
        meta_layout.setSpacing(2)
        self.preview_title = QLabel('标题：-', self)
        self.preview_formal_name = QLabel('正式名称：-', self)
        self.preview_dimensions = QLabel('尺寸：-', self)
        self.preview_name = QLabel('文件名：-', self)
        self.preview_path = QLabel('路径：-', self)
        self.preview_photographer = QLabel('摄影师：-', self)
        self.preview_page = QLabel('Unsplash 页面：-', self)
        for label in (
            self.preview_title,
            self.preview_formal_name,
            self.preview_dimensions,
            self.preview_name,
            self.preview_path,
            self.preview_photographer,
            self.preview_page,
        ):
            label.setFrameShape(QFrame.NoFrame)
            label.setLineWidth(0)
            label.setWordWrap(True)
            label.setTextInteractionFlags(Qt.TextSelectableByMouse)
            label.setStyleSheet('QLabel { color: #1f2937; font-size: 11px; background: transparent; border: none; padding: 0px; margin: 0px; }')
            meta_layout.addWidget(label)
        meta_layout.addStretch(1)
        preview_layout.addWidget(meta_panel)

        splitter.addWidget(gallery_host)
        splitter.addWidget(self.preview_panel)
        splitter.setStretchFactor(0, 64)
        splitter.setStretchFactor(1, 36)
        splitter.setSizes([930, 560])
        root_layout.addWidget(splitter, 1)
        self.setCentralWidget(central)

        self._apply_window_theme("system")
        self._build_tray()
        QTimer.singleShot(0, self.reload_local_images)

    def eventFilter(self, obj, event):
        if obj is self.preview_image and event.type() in (QEvent.Resize, QEvent.Show):
            self._update_preview_pixmap()
        return super().eventFilter(obj, event)

    def _style_small_button(self, button: QToolButton) -> None:
        button.setAutoRaise(True)
        button.setToolButtonStyle(Qt.ToolButtonTextOnly)
        button.setCursor(Qt.PointingHandCursor)
        button.setMinimumHeight(26)
        button.setMinimumWidth(74)
        button.setSizePolicy(QSizePolicy.Fixed, QSizePolicy.Fixed)
        self._apply_small_button_theme(button)

    def _apply_small_button_theme(self, button: QToolButton) -> None:
        if theme_is_dark(self._theme_mode):
            button.setStyleSheet(
                'QToolButton { padding: 3px 12px; border: 1px solid rgba(100, 116, 139, 0.7); border-radius: 8px; background: rgba(30, 41, 59, 0.96); color: #e5e7eb; }'
                'QToolButton:hover { background: rgba(51, 65, 85, 1.0); border-color: rgba(96, 165, 250, 0.65); }'
                'QToolButton:pressed { background: rgba(15, 23, 42, 1.0); }'
            )
        else:
            button.setStyleSheet(
                'QToolButton { padding: 3px 12px; border: 1px solid rgba(148, 163, 184, 0.45); border-radius: 8px; background: rgba(255, 255, 255, 0.88); color: #0f172a; }'
                'QToolButton:hover { background: rgba(255, 255, 255, 1.0); border-color: rgba(42, 127, 255, 0.55); }'
                'QToolButton:pressed { background: rgba(234, 242, 255, 1.0); }'
            )

    def _apply_window_theme(self, theme_mode: str) -> None:
        self._theme_mode = theme_mode
        dark = theme_is_dark(theme_mode)
        if not hasattr(self, 'status_label'):
            return
        if dark:
            self.preview_panel.setStyleSheet(
                'QFrame#previewPanel {'
                'background: rgba(15, 23, 42, 0.96);'
                'border: 1px solid rgba(71, 85, 105, 0.8);'
                'border-radius: 16px;'
                'margin: 2px;'
                'padding: 0px;'
                '}'
            )
            self.setStyleSheet(
                'QMainWindow { background: #0f172a; }'
                'QLabel { color: #e5e7eb; }'
                'QListWidget { background: transparent; }'
                'QToolButton { background: rgba(30, 41, 59, 0.96); color: #e5e7eb; border: 1px solid rgba(100, 116, 139, 0.7); }'
                'QToolButton:hover { background: rgba(51, 65, 85, 1.0); border-color: rgba(96, 165, 250, 0.65); }'
                'QToolButton:pressed { background: rgba(15, 23, 42, 1.0); }'
            )
            self.status_label.setStyleSheet('QLabel { color: #cbd5e1; font-size: 11px; }')
            self.gallery_hint.setStyleSheet('QLabel { color: #cbd5e1; font-size: 12px; font-weight: 600; }')
            self.preview_selected_label.setStyleSheet('QLabel { color: #f8fafc; font-size: 12px; font-weight: 600; background: transparent; border: none; }')
            self.preview_image.setStyleSheet(
                'QLabel { background: #111827; color: #94a3b8; border: none; border-radius: 14px; }'
            )
            for label in (
                self.preview_title,
                self.preview_formal_name,
                self.preview_dimensions,
                self.preview_name,
                self.preview_path,
                self.preview_photographer,
                self.preview_page,
            ):
                label.setStyleSheet('QLabel { color: #e5e7eb; font-size: 11px; background: transparent; border: none; padding: 0px; margin: 0px; }')
        else:
            self.preview_panel.setStyleSheet(
                'QFrame#previewPanel {'
                'background: qlineargradient(x1:0, y1:0, x2:1, y2:1, stop:0 rgba(255,255,255,0.96), stop:1 rgba(247,249,252,0.94));'
                'border: 1px solid rgba(226, 232, 240, 0.72);'
                'border-radius: 16px;'
                'margin: 2px;'
                'padding: 0px;'
                '}'
            )
            self.setStyleSheet('QMainWindow { background: #f4f7fb; }')
            self.status_label.setStyleSheet('QLabel { color: #3b4a5a; font-size: 11px; }')
            self.gallery_hint.setStyleSheet('QLabel { color: #475569; font-size: 12px; font-weight: 600; }')
            self.preview_selected_label.setStyleSheet('QLabel { color: #1f2937; font-size: 12px; font-weight: 600; background: transparent; border: none; }')
            self.preview_image.setStyleSheet(
                'QLabel { background: #f8fafc; color: #64748b; border: none; border-radius: 14px; }'
            )
            for label in (
                self.preview_title,
                self.preview_formal_name,
                self.preview_dimensions,
                self.preview_name,
                self.preview_path,
                self.preview_photographer,
                self.preview_page,
            ):
                label.setStyleSheet('QLabel { color: #1f2937; font-size: 11px; background: transparent; border: none; padding: 0px; margin: 0px; }')

    def apply_theme_mode(self, theme_mode: str) -> None:
        self._apply_window_theme(theme_mode)

    def _build_tray(self) -> None:
        self.tray = QSystemTrayIcon(self)
        tray_icon = self.windowIcon()
        if tray_icon.isNull():
            tray_icon = self._placeholder_icon
        self.tray.setIcon(tray_icon)
        menu = QMenu(self)
        open_settings_action = QAction('设置', self)
        quit_action = QAction('退出', self)
        open_settings_action.triggered.connect(self.on_open_settings)
        quit_action.triggered.connect(self._quit_app)
        menu.addAction(open_settings_action)
        menu.addAction(quit_action)
        self.tray.setContextMenu(menu)
        self.tray.setToolTip(APP_TITLE)
        self.tray.activated.connect(self._on_tray_activated)
        self.tray.show()

    def _quit_app(self) -> None:
        self._capture_restore_state()
        if self.scheduler is not None:
            self.scheduler.stop()
        self.tray.hide()
        self.close()
        QApplication.quit()

    def _show_window(self) -> None:
        self.show()
        if self._restore_is_fullscreen:
            self.setWindowState(self.windowState() | Qt.WindowFullScreen)
        else:
            if self._restore_geometry is not None:
                self.restoreGeometry(self._restore_geometry)
            self.setWindowState(self.windowState() & ~Qt.WindowFullScreen & ~Qt.WindowMinimized)
        self.raise_()
        self.activateWindow()

    def _capture_restore_state(self) -> None:
        self._restore_is_fullscreen = self.isFullScreen()
        if self._restore_is_fullscreen:
            geometry = self.normalGeometry()
            if geometry is not None and not geometry.isNull():
                self._restore_geometry = geometry
        else:
            geometry = self.saveGeometry()
            if geometry is not None and not geometry.isNull():
                self._restore_geometry = geometry

    def closeEvent(self, event) -> None:
        self._capture_restore_state()
        if self.tray.isVisible():
            self.hide()
            event.ignore()
            return
        if self.scheduler is not None:
            self.scheduler.stop()
        event.accept()

    def changeEvent(self, event) -> None:
        super().changeEvent(event)
        if event.type() == QEvent.WindowStateChange:
            self._capture_restore_state()

    def resizeEvent(self, event) -> None:
        super().resizeEvent(event)
        if not self.isFullScreen():
            self._restore_geometry = self.saveGeometry()
        self._update_preview_pixmap()

    def moveEvent(self, event) -> None:
        super().moveEvent(event)
        if not self.isFullScreen():
            self._restore_geometry = self.saveGeometry()

    def _load_app_icon(self) -> QIcon:
        source_root = get_source_root()
        for file_name in ('logo.ico',):
            icon_path = source_root / 'assets' / file_name
            if icon_path.is_file():
                return QIcon(str(icon_path))
        return self.style().standardIcon(QStyle.SP_FileDialogDetailedView)

    def _set_refresh_notice(self, text: str) -> None:
        self.status_label.setText(text)
        self._status_reset_timer.start()

    def _restore_status_text(self) -> None:
        self.status_label.setText(self._status_default_text)

    def _on_tray_activated(self, reason) -> None:
        if reason in (QSystemTrayIcon.Trigger, QSystemTrayIcon.DoubleClick):
            if self.isVisible() and not self.isMinimized():
                self._capture_restore_state()
                self.hide()
            else:
                self._show_window()

    @staticmethod
    def _path_key(path: str | Path) -> str:
        return str(Path(path).resolve())

    def _set_preview(self, path: str | Path, meta: dict | None = None) -> None:
        image_path = Path(path)
        meta = meta or self.service.get_cached_wallpaper_metadata(image_path)
        pixmap = QPixmap(str(image_path))
        if pixmap.isNull():
            thumb_path = self.service.get_thumbnail_path(image_path)
            if thumb_path.is_file():
                pixmap = QPixmap(str(thumb_path))
        width = meta.get('width')
        height = meta.get('height')
        if (width is None or height is None) and not pixmap.isNull():
            width = pixmap.width()
            height = pixmap.height()
        formal_name = meta.get('formal_name') or meta.get('title') or image_path.stem
        title = meta.get('title') or meta.get('description') or meta.get('alt_description') or formal_name
        photographer = meta.get('photographer_name') or '-'
        page = meta.get('unsplash_page') or '-'
        self._preview_path = image_path
        self._preview_pixmap = pixmap if not pixmap.isNull() else None
        self.preview_selected_label.setText(image_path.name)
        self.preview_name.setText(f'文件名：{image_path.name}')
        self.preview_path.setText(f'路径：{image_path}')
        self.preview_dimensions.setText(f'尺寸：{width if width is not None else "?"} x {height if height is not None else "?"}')
        self.preview_formal_name.setText(f'正式名称：{formal_name}')
        self.preview_title.setText(f'标题：{title}')
        self.preview_photographer.setText(f'摄影师：{photographer}')
        self.preview_page.setText(f'Unsplash 页面：{page}')
        self._update_preview_pixmap()

    def _update_preview_pixmap(self) -> None:
        if self._preview_pixmap is None or self._preview_pixmap.isNull():
            self.preview_image.setPixmap(QPixmap())
            self.preview_image.setText('选中图片后，这里会显示预览')
            return
        target_size = self.preview_image.size().expandedTo(QSize(1, 1))
        scaled = self._preview_pixmap.scaled(target_size, Qt.KeepAspectRatio, Qt.SmoothTransformation)
        self.preview_image.setPixmap(scaled)
        self.preview_image.setText('')

    def _clear_preview(self) -> None:
        self._preview_path = None
        self._preview_pixmap = None
        self.preview_selected_label.setText('请选择一张图片预览')
        self.preview_title.setText('标题：-')
        self.preview_formal_name.setText('正式名称：-')
        self.preview_dimensions.setText('尺寸：-')
        self.preview_name.setText('文件名：-')
        self.preview_path.setText('路径：-')
        self.preview_photographer.setText('摄影师：-')
        self.preview_page.setText('Unsplash 页面：-')
        self.preview_image.setPixmap(QPixmap())
        self.preview_image.setText('选中图片后，这里会显示预览')

    def _apply_wallpaper_path(self, path: str | Path) -> bool:
        try:
            applied = self.service.set_wallpaper_from_path(path)
            self.status_label.setText(f'已应用本地图片：{applied.name}')
            return True
        except Exception as exc:
            QMessageBox.critical(self, '应用失败', str(exc))
            return False

    def _reset_auto_update_timer(self) -> None:
        if self.scheduler is None:
            return
        try:
            self.scheduler.restart(run_initial_fetch=False)
            self.status_label.setText('已应用本地图片，并重置自动更新计时。')
        except Exception as exc:
            self.service.logger.warning('Failed to reset scheduler after manual wallpaper apply: %s', exc)

    def _gallery_item(self, path: Path) -> QListWidgetItem:
        thumb_path = self.service.get_thumbnail_path(path)
        icon = QIcon(str(thumb_path)) if thumb_path.is_file() else self._placeholder_icon
        item = QListWidgetItem(icon, '')
        item.setData(ITEM_ROLE_PATH, str(path))
        item.setData(ITEM_ROLE_META, None)
        item.setData(ITEM_ROLE_THUMB, str(thumb_path))
        item.setToolTip(f'{path.name}\n{path}')
        item.setSizeHint(QSize(276, 184))
        return item

    def reload_local_images(self, preselect_path: str | Path | None = None, preserve_scroll: bool = False) -> None:
        if preselect_path is not None:
            self._pending_gallery_selection = str(preselect_path)
        else:
            current = self.gallery_list.currentItem()
            self._pending_gallery_selection = current.data(ITEM_ROLE_PATH) if current else None
        self._pending_gallery_preserve_scroll = preserve_scroll
        self._pending_gallery_scroll_value = self.gallery_list.verticalScrollBar().value() if preserve_scroll else None
        self._pending_gallery_paths = sorted(
            self.service.list_cached_wallpapers(),
            key=lambda path: path.stat().st_mtime,
            reverse=True,
        )
        self._pending_gallery_index = 0
        self.gallery_list.clear()
        self._gallery_populate_timer.stop()
        if not self._pending_gallery_paths:
            if self._pending_refresh_summary:
                self._set_refresh_notice(self._pending_refresh_summary)
                self._pending_refresh_summary = None
            else:
                self.status_label.setText('暂无可用的本地缓存图片。')
            self._clear_preview()
            self._pending_gallery_selection = None
            self._pending_gallery_preserve_scroll = False
            self._pending_gallery_scroll_value = None
            return
        self.status_label.setText(f'正在加载本地缓存图片，共 {len(self._pending_gallery_paths)} 张...')
        self._gallery_populate_timer.start(0)

    def _append_gallery_batch(self) -> None:
        if self._pending_gallery_index >= len(self._pending_gallery_paths):
            self._gallery_populate_timer.stop()
            self._finish_gallery_population()
            return
        end = min(self._pending_gallery_index + self._gallery_batch_size, len(self._pending_gallery_paths))
        for path in self._pending_gallery_paths[self._pending_gallery_index:end]:
            self.gallery_list.addItem(self._gallery_item(path))
        self._pending_gallery_index = end
        if self._pending_gallery_index >= len(self._pending_gallery_paths):
            self._gallery_populate_timer.stop()
            self._finish_gallery_population()

    def _finish_gallery_population(self) -> None:
        total = self.gallery_list.count()
        if total:
            target_item = None
            if self._pending_gallery_selection:
                normalized_selection = self._path_key(self._pending_gallery_selection)
                for row in range(total):
                    candidate = self.gallery_list.item(row)
                    if candidate is None:
                        continue
                    candidate_path = candidate.data(ITEM_ROLE_PATH)
                    if candidate_path and self._path_key(candidate_path) == normalized_selection:
                        target_item = candidate
                        break
            if target_item is None:
                target_item = self.gallery_list.item(0)
            if target_item is not None:
                self.gallery_list.setCurrentItem(target_item)
                path = target_item.data(ITEM_ROLE_PATH)
                if path:
                    self._set_preview(path, self.service.get_cached_wallpaper_metadata(path))
            elif not self._pending_gallery_preserve_scroll:
                target_item = self.gallery_list.item(0)
                if target_item is not None:
                    self.gallery_list.setCurrentItem(target_item)
                    path = target_item.data(ITEM_ROLE_PATH)
                    if path:
                        self._set_preview(path, self.service.get_cached_wallpaper_metadata(path))
            if self._pending_refresh_summary:
                self._set_refresh_notice(self._pending_refresh_summary)
                self._pending_refresh_summary = None
            else:
                self.status_label.setText(f'已加载本地缓存图片，共 {total} 张。')
        else:
            if self._pending_refresh_summary:
                self._set_refresh_notice(self._pending_refresh_summary)
                self._pending_refresh_summary = None
            else:
                self.status_label.setText('暂无可用的本地缓存图片。')
            self._clear_preview()
        self._pending_gallery_selection = None
        self._warmup_missing_thumbnails(self._pending_gallery_paths)
        if self._pending_gallery_preserve_scroll and self._pending_gallery_scroll_value is not None:
            scroll_value = self._pending_gallery_scroll_value
            QTimer.singleShot(0, lambda value=scroll_value: self._restore_gallery_scroll_position(value))
        self._pending_gallery_preserve_scroll = False
        self._pending_gallery_scroll_value = None

    def _restore_gallery_scroll_position(self, value: int) -> None:
        scroll_bar = self.gallery_list.verticalScrollBar()
        scroll_bar.setValue(max(scroll_bar.minimum(), min(value, scroll_bar.maximum())))

    def _warmup_missing_thumbnails(self, image_paths: list[Path]) -> None:
        missing_paths = [path for path in image_paths if not self.service.get_thumbnail_path(path).is_file()]
        if not missing_paths:
            return
        if self.thumbnail_thread is not None and self.thumbnail_thread.isRunning():
            return
        self.thumbnail_thread = QThread(self)
        self.thumbnail_worker = ThumbnailWarmupWorker(self.service, missing_paths)
        self.thumbnail_worker.moveToThread(self.thumbnail_thread)
        self.thumbnail_thread.started.connect(self.thumbnail_worker.run)
        self.thumbnail_worker.finished.connect(self._on_thumbnail_warmup_finished)
        self.thumbnail_worker.failed.connect(self._on_thumbnail_warmup_failed)
        self.thumbnail_worker.finished.connect(self.thumbnail_thread.quit)
        self.thumbnail_worker.failed.connect(self.thumbnail_thread.quit)
        self.thumbnail_worker.finished.connect(self.thumbnail_worker.deleteLater)
        self.thumbnail_worker.failed.connect(self.thumbnail_worker.deleteLater)
        self.thumbnail_thread.finished.connect(self._clear_thumbnail_worker_refs)
        self.thumbnail_thread.finished.connect(self.thumbnail_thread.deleteLater)
        self.thumbnail_thread.start()

    def _refresh_thumbnail_items(self, built_paths: list[Path]) -> None:
        if not built_paths:
            return
        lookup = {self._path_key(path) for path in built_paths}
        for row in range(self.gallery_list.count()):
            item = self.gallery_list.item(row)
            if item is None:
                continue
            item_path = item.data(ITEM_ROLE_PATH)
            if not item_path or self._path_key(item_path) not in lookup:
                continue
            thumb_path = self.service.get_thumbnail_path(item_path)
            if thumb_path.is_file():
                item.setIcon(QIcon(str(thumb_path)))
                item.setData(ITEM_ROLE_THUMB, str(thumb_path))

    def _on_thumbnail_warmup_finished(self, paths: object) -> None:
        built_paths = [Path(path) for path in paths] if paths else []
        self._refresh_thumbnail_items(built_paths)

    def _on_thumbnail_warmup_failed(self, message: str) -> None:
        self.service.logger.warning('Thumbnail warmup failed: %s', message)

    def _clear_thumbnail_worker_refs(self) -> None:
        self.thumbnail_thread = None
        self.thumbnail_worker = None

    def _set_refresh_busy(self, busy: bool) -> None:
        self.refresh_list_button.setEnabled(not busy)
        self.refresh_list_button.setText('刷新中...' if busy else '刷新')

    def on_refresh_clicked(self) -> None:
        if self.batch_thread is not None and self.batch_thread.isRunning():
            self.status_label.setText('刷新已在进行中，请稍候。')
            return
        self._pending_refresh_summary = None
        self.status_label.setText(f'正在向 Unsplash 请求候选图（{self.service.config.batch_count} 张）...')
        self._start_batch_fetch()

    def _on_batch_status(self, message: str) -> None:
        if message:
            self._set_refresh_notice(message)

    def on_gallery_item_clicked(self, item: QListWidgetItem) -> None:
        path = item.data(ITEM_ROLE_PATH)
        if path:
            self._set_preview(path, self.service.get_cached_wallpaper_metadata(path))

    def on_gallery_context_menu_requested(self, pos) -> None:
        item = self.gallery_list.itemAt(pos)
        if item is None:
            return
        menu = QMenu(self)
        delete_action = QAction('删除图片', self)
        delete_action.triggered.connect(lambda: self.delete_gallery_item(item))
        menu.addAction(delete_action)
        menu.exec(self.gallery_list.viewport().mapToGlobal(pos))

    def delete_gallery_item(self, item: QListWidgetItem) -> None:
        path_value = item.data(ITEM_ROLE_PATH)
        if not path_value:
            return
        path = Path(path_value)
        try:
            current_preview = self._preview_path
            result = self.service.delete_cached_wallpaper(path)
            removed_count = len(result.get('removed', []))
            row = self.gallery_list.row(item)
            was_current_preview = bool(current_preview and self._path_key(current_preview) == self._path_key(path))
            removed_item = self.gallery_list.takeItem(row)
            if removed_item is not None:
                del removed_item
            next_item = self.gallery_list.item(min(row, self.gallery_list.count() - 1)) if self.gallery_list.count() else None
            if next_item is not None:
                self.gallery_list.setCurrentItem(next_item)
                next_path = next_item.data(ITEM_ROLE_PATH)
                if next_path:
                    if was_current_preview:
                        self._set_preview(next_path, self.service.get_cached_wallpaper_metadata(next_path))
            elif was_current_preview:
                self._clear_preview()
            self.status_label.setText(f'已删除图片：{path.name}，清理了 {removed_count} 个缓存文件。')
        except Exception as exc:
            QMessageBox.warning(self, '删除失败', str(exc))
    def on_gallery_item_double_clicked(self, item: QListWidgetItem) -> None:
        path = item.data(ITEM_ROLE_PATH)
        if path:
            self._set_preview(path, self.service.get_cached_wallpaper_metadata(path))
            if self._apply_wallpaper_path(path):
                self._reset_auto_update_timer()

    def apply_selected_wallpaper(self) -> None:
        current = self.gallery_list.currentItem()
        if current is None:
            QMessageBox.information(self, '提示', '请先选择一张图片。')
            return
        path = current.data(ITEM_ROLE_PATH)
        if path and self._apply_wallpaper_path(path):
            self._reset_auto_update_timer()

    def _start_batch_fetch(self) -> None:
        if self.batch_thread is not None and self.batch_thread.isRunning():
            return
        self._set_refresh_busy(True)
        self.batch_thread = QThread(self)
        self.batch_worker = BatchWorker(self.service, self.service.config.batch_count)
        self.batch_worker.moveToThread(self.batch_thread)
        self.batch_thread.started.connect(self.batch_worker.run)
        self.batch_worker.status.connect(self._on_batch_status)
        self.batch_worker.finished.connect(self._on_batch_finished)
        self.batch_worker.failed.connect(self._on_batch_failed)
        self.batch_worker.finished.connect(self.batch_thread.quit)
        self.batch_worker.failed.connect(self.batch_thread.quit)
        self.batch_worker.finished.connect(self.batch_worker.deleteLater)
        self.batch_worker.failed.connect(self.batch_worker.deleteLater)
        self.batch_thread.finished.connect(self._clear_batch_worker_refs)
        self.batch_thread.finished.connect(self.batch_thread.deleteLater)
        self.batch_thread.start()

    def _clear_batch_worker_refs(self) -> None:
        self.batch_thread = None
        self.batch_worker = None
        self._set_refresh_busy(False)

    def _on_batch_finished(self, paths: object) -> None:
        cached_paths = [Path(path) for path in paths] if paths else []
        if cached_paths:
            self._pending_refresh_summary = f'本次刷新完成，成功缓存 {len(cached_paths)} 张本地图片。'
        else:
            self._pending_refresh_summary = '本次刷新完成，但没有缓存到可用图片。'
        self.reload_local_images()

    def _on_batch_failed(self, message: str) -> None:
        self._pending_refresh_summary = None
        self.status_label.setText('刷新失败，已保留当前壁纸不变。')
        QMessageBox.warning(self, '刷新失败', message)

    def on_open_settings(self) -> None:
        config = self.config_manager.load()
        dialog = SettingsDialog(self, config=config)
        if dialog.exec():
            config.unsplash_access_key = dialog.key_edit.text().strip()
            config.query = dialog.query_edit.toPlainText()
            config.orientation = dialog.orientation_combo.currentData() or config.orientation
            config.content_filter = dialog.filter_combo.currentData() or config.content_filter
            config.refresh_interval_hours = dialog.hours_spin.value()
            config.batch_count = dialog.batch_count_spin.value()
            config.cache_dir = dialog.cache_dir_edit.text().strip() or config.cache_dir
            config.wallpaper_style = dialog.style_combo.currentData() or config.wallpaper_style
            config.auto_update_on_start = dialog.startup_check.isChecked()
            config.startup_launch = dialog.startup_launch_check.isChecked()
            config.theme_mode = dialog.theme_mode_combo.currentData() or "system"
            config = config.normalized()
            self.config_manager.save(config)
            self.service.config = config
            self.service.refresh_dependencies()
            try:
                set_startup_enabled(config.startup_launch)
            except Exception as exc:
                QMessageBox.warning(self, '开机自启设置失败', str(exc))
            apply_theme(QApplication.instance(), config.theme_mode)
            self.apply_theme_mode(config.theme_mode)
            for button in (self.open_settings_button, self.refresh_list_button, self.apply_button):
                self._apply_small_button_theme(button)
            if self.scheduler is not None:
                self.scheduler.restart(run_initial_fetch=False)
            self.status_label.setText('设置已保存。')










