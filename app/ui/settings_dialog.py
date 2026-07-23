from PySide6.QtWidgets import (
    QCheckBox,
    QComboBox,
    QDialog,
    QDialogButtonBox,
    QFormLayout,
    QLineEdit,
    QSpinBox,
    QTextEdit,
)

from app.config.settings import normalize_query_text


class SettingsDialog(QDialog):
    def __init__(self, parent=None, config=None) -> None:
        super().__init__(parent)
        self.setWindowTitle("设置")

        self.key_edit = QLineEdit(self)
        self.key_edit.setEchoMode(QLineEdit.Password)

        self.query_edit = QTextEdit(self)
        self.query_edit.setAcceptRichText(False)
        self.query_edit.setPlaceholderText("每行一个关键词，也可以用逗号分隔。留空时默认使用 wallpaper。")
        self.query_edit.setFixedHeight(96)

        self.orientation_combo = QComboBox(self)
        self.orientation_combo.addItem("横向", "landscape")
        self.orientation_combo.addItem("竖向", "portrait")
        self.orientation_combo.addItem("方形", "squarish")

        self.filter_combo = QComboBox(self)
        self.filter_combo.addItem("宽松", "low")
        self.filter_combo.addItem("严格", "high")

        self.hours_spin = QSpinBox(self)
        self.hours_spin.setRange(1, 168)

        self.batch_count_spin = QSpinBox(self)
        self.batch_count_spin.setRange(1, 30)

        self.startup_check = QCheckBox("启动时自动刷新", self)
        self.startup_launch_check = QCheckBox("开机自启", self)

        self.cache_dir_edit = QLineEdit(self)

        self.style_combo = QComboBox(self)
        self.style_combo.addItem("填充", "fill")
        self.style_combo.addItem("适应", "fit")
        self.style_combo.addItem("拉伸", "stretch")
        self.style_combo.addItem("居中", "center")
        self.style_combo.addItem("平铺", "tile")
        self.style_combo.addItem("跨屏", "span")

        self.theme_mode_combo = QComboBox(self)
        self.theme_mode_combo.addItem("跟随 Windows 系统", "system")
        self.theme_mode_combo.addItem("亮色", "light")
        self.theme_mode_combo.addItem("暗色", "dark")

        layout = QFormLayout(self)
        layout.addRow("Unsplash 访问密钥", self.key_edit)
        layout.addRow("关键词", self.query_edit)
        layout.addRow("图片方向", self.orientation_combo)
        layout.addRow("内容筛选", self.filter_combo)
        layout.addRow("刷新间隔（小时）", self.hours_spin)
        layout.addRow("每次拉取数量", self.batch_count_spin)
        layout.addRow("缓存目录", self.cache_dir_edit)
        layout.addRow("壁纸显示方式", self.style_combo)
        layout.addRow("界面主题", self.theme_mode_combo)
        layout.addRow("", self.startup_check)
        layout.addRow("", self.startup_launch_check)

        buttons = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel, parent=self)
        buttons.accepted.connect(self.accept)
        buttons.rejected.connect(self.reject)
        layout.addRow(buttons)

        if config is not None:
            self.key_edit.setText(getattr(config, "unsplash_access_key", ""))
            self.query_edit.setPlainText(normalize_query_text(getattr(config, "query", "wallpaper")))
            self.hours_spin.setValue(getattr(config, "refresh_interval_hours", 24))
            self.batch_count_spin.setValue(getattr(config, "batch_count", 10))
            self.cache_dir_edit.setText(getattr(config, "cache_dir", "data/wallpapers"))
            self.startup_check.setChecked(getattr(config, "auto_update_on_start", True))
            self.startup_launch_check.setChecked(getattr(config, "startup_launch", False))

            orientation = getattr(config, "orientation", "landscape")
            orientation_index = self.orientation_combo.findData(orientation)
            self.orientation_combo.setCurrentIndex(orientation_index if orientation_index >= 0 else 0)

            content_filter = getattr(config, "content_filter", "low")
            filter_index = self.filter_combo.findData(content_filter)
            self.filter_combo.setCurrentIndex(filter_index if filter_index >= 0 else 0)

            wallpaper_style = getattr(config, "wallpaper_style", "fill")
            style_index = self.style_combo.findData(wallpaper_style)
            self.style_combo.setCurrentIndex(style_index if style_index >= 0 else 0)

            theme_mode = getattr(config, "theme_mode", "system")
            theme_index = self.theme_mode_combo.findData(theme_mode)
            self.theme_mode_combo.setCurrentIndex(theme_index if theme_index >= 0 else 0)
