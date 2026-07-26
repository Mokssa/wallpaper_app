mod config;
mod downloader;
mod wallpaper_setter;

use config::AppConfig;
use downloader::{WallpaperDownloader, WallpaperItem};
use wallpaper_setter::WallpaperSetter;

use eframe::egui;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::mpsc::{channel, Receiver, Sender};

enum AppMessage {
    DownloadSuccess(WallpaperItem),
    DownloadError(String),
    #[allow(dead_code)]
    StatusUpdate(String),
}

#[derive(PartialEq)]
enum NavTab {
    Gallery,
    Explore,
    Settings,
}

struct WallpaperApp {
    config: AppConfig,
    active_tab: NavTab,
    wallpapers: Vec<WallpaperItem>,
    status_msg: String,
    tx: Sender<AppMessage>,
    rx: Receiver<AppMessage>,
    is_downloading: bool,
    current_wallpaper_path: Option<String>,
}

fn setup_custom_fonts(ctx: &egui::Context) {
    let mut fonts = egui::FontDefinitions::default();

    // 优先读取 Windows 系统自带的微软雅黑/黑体字体，支持全量中文字符渲染
    let font_paths = [
        "C:\\Windows\\Fonts\\msyh.ttc",
        "C:\\Windows\\Fonts\\msyh.ttf",
        "C:\\Windows\\Fonts\\msyhl.ttc",
        "C:\\Windows\\Fonts\\simhei.ttf",
        "C:\\Windows\\Fonts\\simsun.ttc",
    ];

    for path in font_paths {
        if let Ok(font_data) = fs::read(path) {
            fonts.font_data.insert(
                "cjk_font".to_owned(),
                egui::FontData::from_owned(font_data),
            );

            // 将中文字体加入最高优先级，确保所有中文 glyph 均能正确渲染
            fonts
                .families
                .entry(egui::FontFamily::Proportional)
                .or_default()
                .insert(0, "cjk_font".to_owned());

            fonts
                .families
                .entry(egui::FontFamily::Monospace)
                .or_default()
                .insert(0, "cjk_font".to_owned());

            break;
        }
    }

    ctx.set_fonts(fonts);
}

impl WallpaperApp {
    fn new(cc: &eframe::CreationContext<'_>) -> Self {
        egui_extras::install_image_loaders(&cc.egui_ctx);
        setup_custom_fonts(&cc.egui_ctx);

        let config = AppConfig::load();
        let (tx, rx) = channel();

        // 样式配置：优雅的暗黑视窗与高对比度柔和字体
        let mut visual = egui::Visuals::dark();
        visual.window_rounding = egui::Rounding::same(12.0);
        visual.panel_fill = egui::Color32::from_rgb(18, 20, 29);
        visual.widgets.noninteractive.bg_fill = egui::Color32::from_rgb(24, 27, 40);
        visual.widgets.inactive.bg_fill = egui::Color32::from_rgb(32, 36, 54);
        visual.widgets.hovered.bg_fill = egui::Color32::from_rgb(45, 52, 78);
        visual.widgets.active.bg_fill = egui::Color32::from_rgb(99, 102, 241);
        cc.egui_ctx.set_visuals(visual);

        let current_wp = WallpaperSetter::get_current_wallpaper();

        let mut app = Self {
            config,
            active_tab: NavTab::Gallery,
            wallpapers: Vec::new(),
            status_msg: "就绪".to_string(),
            tx,
            rx,
            is_downloading: false,
            current_wallpaper_path: current_wp,
        };

        app.reload_local_wallpapers();
        app
    }

    fn reload_local_wallpapers(&mut self) {
        self.wallpapers.clear();
        let cache_dir = Path::new(&self.config.cache_dir);
        if cache_dir.exists() {
            if let Ok(entries) = fs::read_dir(cache_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.extension().and_then(|s| s.to_str()) == Some("json") {
                        if let Ok(content) = fs::read_to_string(&path) {
                            if let Ok(item) = serde_json::from_str::<WallpaperItem>(&content) {
                                if item.file_path.exists() {
                                    self.wallpapers.push(item);
                                }
                            }
                        }
                    }
                }
            }
        }
        self.wallpapers.sort_by(|a, b| b.download_date.cmp(&a.download_date));
    }

    fn trigger_fetch_bing(&mut self, ctx: egui::Context) {
        if self.is_downloading {
            return;
        }
        self.is_downloading = true;
        self.status_msg = "正在从 Bing 获取每日壁纸...".to_string();

        let tx = self.tx.clone();
        let target_dir = PathBuf::from(&self.config.cache_dir);

        tokio::spawn(async move {
            match WallpaperDownloader::fetch_bing_wallpaper(&target_dir).await {
                Ok(item) => {
                    let _ = tx.send(AppMessage::DownloadSuccess(item));
                }
                Err(e) => {
                    let _ = tx.send(AppMessage::DownloadError(format!("Bing 壁纸获取失败: {}", e)));
                }
            }
            ctx.request_repaint();
        });
    }

    fn trigger_fetch_unsplash(&mut self, ctx: egui::Context) {
        if self.is_downloading {
            return;
        }
        self.is_downloading = true;
        self.status_msg = "正在从 Unsplash 获取随机壁纸...".to_string();

        let tx = self.tx.clone();
        let target_dir = PathBuf::from(&self.config.cache_dir);
        let query = self.config.query.clone();

        tokio::spawn(async move {
            match WallpaperDownloader::fetch_unsplash_wallpaper(&target_dir, &query).await {
                Ok(item) => {
                    let _ = tx.send(AppMessage::DownloadSuccess(item));
                }
                Err(e) => {
                    let _ = tx.send(AppMessage::DownloadError(format!("Unsplash 壁纸获取失败: {}", e)));
                }
            }
            ctx.request_repaint();
        });
    }
}

impl eframe::App for WallpaperApp {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        // 处理异步消息
        while let Ok(msg) = self.rx.try_recv() {
            match msg {
                AppMessage::DownloadSuccess(item) => {
                    self.is_downloading = false;
                    self.status_msg = format!("成功下载壁纸: {}", item.title);
                    self.wallpapers.insert(0, item);
                }
                AppMessage::DownloadError(err) => {
                    self.is_downloading = false;
                    self.status_msg = err;
                }
                AppMessage::StatusUpdate(status) => {
                    self.status_msg = status;
                }
            }
        }

        // 顶栏面板
        egui::TopBottomPanel::top("header_panel")
            .exact_height(54.0)
            .show(ctx, |ui| {
                ui.horizontal_centered(|ui| {
                    ui.add_space(12.0);
                    ui.heading("🖼 WallpaperApp");
                    ui.label(egui::RichText::new("Rust Edition").size(11.0).color(egui::Color32::from_rgb(99, 102, 241)));

                    ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                        ui.add_space(12.0);
                        if ui.selectable_label(self.active_tab == NavTab::Settings, "⚙ 设置").clicked() {
                            self.active_tab = NavTab::Settings;
                        }
                        if ui.selectable_label(self.active_tab == NavTab::Explore, "✨ 发现新壁纸").clicked() {
                            self.active_tab = NavTab::Explore;
                        }
                        if ui.selectable_label(self.active_tab == NavTab::Gallery, "🎨 本地壁纸库").clicked() {
                            self.active_tab = NavTab::Gallery;
                        }
                    });
                });
            });

        // 底栏面板 (状态栏)
        egui::TopBottomPanel::bottom("footer_panel")
            .exact_height(30.0)
            .show(ctx, |ui| {
                ui.horizontal_centered(|ui| {
                    ui.add_space(12.0);
                    ui.label(egui::RichText::new(&self.status_msg).size(12.0).color(egui::Color32::from_rgb(160, 166, 185)));
                });
            });

        // 主体内容
        egui::CentralPanel::default().show(ctx, |ui| {
            match self.active_tab {
                NavTab::Gallery => self.show_gallery(ui, ctx),
                NavTab::Explore => self.show_explore(ui, ctx),
                NavTab::Settings => self.show_settings(ui),
            }
        });
    }
}

impl WallpaperApp {
    fn show_gallery(&mut self, ui: &mut egui::Ui, _ctx: &egui::Context) {
        ui.add_space(10.0);
        ui.horizontal(|ui| {
            ui.heading("本地已缓存壁纸");
            ui.label(format!("(共 {} 张)", self.wallpapers.len()));
            ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                if ui.button("🔄 刷新列表").clicked() {
                    self.reload_local_wallpapers();
                }
            });
        });
        ui.separator();

        if self.wallpapers.is_empty() {
            ui.vertical_centered(|ui| {
                ui.add_space(60.0);
                ui.label("📷 本地尚无缓存壁纸，切换到“发现新壁纸”即可一键获取！");
            });
            return;
        }

        egui::ScrollArea::vertical().show(ui, |ui| {
            ui.horizontal_wrapped(|ui| {
                let mut to_set_wp = None;
                let mut to_delete = None;

                for (idx, item) in self.wallpapers.iter().enumerate() {
                    ui.allocate_ui(egui::vec2(220.0, 240.0), |ui| {
                        egui::Frame::group(ui.style())
                            .rounding(egui::Rounding::same(8.0))
                            .inner_margin(8.0)
                            .show(ui, |ui| {
                                ui.set_min_size(egui::vec2(204.0, 224.0));
                                
                                // 图片缩略图
                                let uri = format!("file://{}", item.file_path.display());
                                ui.add(
                                    egui::Image::new(uri)
                                        .max_size(egui::vec2(200.0, 120.0))
                                        .rounding(egui::Rounding::same(6.0))
                                );

                                ui.add_space(4.0);
                                ui.add(egui::Label::new(egui::RichText::new(&item.title).strong()).truncate());
                                ui.label(egui::RichText::new(format!("📅 {}", item.download_date)).size(10.0).color(egui::Color32::GRAY));

                                ui.add_space(6.0);
                                ui.horizontal(|ui| {
                                    if ui.button("🖥 设为壁纸").clicked() {
                                        to_set_wp = Some(item.file_path.clone());
                                    }
                                    if ui.button("🗑 删除").clicked() {
                                        to_delete = Some(idx);
                                    }
                                });
                            });
                    });
                }

                if let Some(path) = to_set_wp {
                    match WallpaperSetter::set_wallpaper(&path) {
                        Ok(_) => {
                            self.status_msg = format!("成功将桌面壁纸设置为: {}", path.display());
                            self.current_wallpaper_path = Some(path.to_string_lossy().to_string());
                        }
                        Err(e) => {
                            self.status_msg = format!("设置壁纸失败: {}", e);
                        }
                    }
                }

                if let Some(idx) = to_delete {
                    let item = self.wallpapers.remove(idx);
                    let _ = fs::remove_file(&item.file_path);
                    let meta_path = item.file_path.with_extension("json");
                    let _ = fs::remove_file(meta_path);
                    self.status_msg = format!("已删除壁纸: {}", item.title);
                }
            });
        });
    }

    fn show_explore(&mut self, ui: &mut egui::Ui, ctx: &egui::Context) {
        ui.add_space(10.0);
        ui.heading("在线发现高清壁纸");
        ui.label("挑选最喜爱的在线美图源，一键下载并自动同步为桌面壁纸。");
        ui.separator();

        ui.add_space(20.0);
        ui.horizontal(|ui| {
            egui::Frame::group(ui.style())
                .inner_margin(16.0)
                .rounding(egui::Rounding::same(10.0))
                .show(ui, |ui| {
                    ui.set_width(260.0);
                    ui.heading("🌞 必应每日壁纸");
                    ui.add_space(8.0);
                    ui.label("每日官方精选故事壁纸，包含地理风光与自然奇观。");
                    ui.add_space(12.0);
                    if ui.add_enabled(!self.is_downloading, egui::Button::new("📥 下载今日必应壁纸")).clicked() {
                        self.trigger_fetch_bing(ctx.clone());
                    }
                });

            ui.add_space(20.0);

            egui::Frame::group(ui.style())
                .inner_margin(16.0)
                .rounding(egui::Rounding::same(10.0))
                .show(ui, |ui| {
                    ui.set_width(300.0);
                    ui.heading("🌌 Unsplash 随机美图");
                    ui.add_space(8.0);
                    ui.label("根据关键词从 Unsplash 摄影师社区随机匹配 4K 壁纸。");
                    ui.add_space(6.0);
                    ui.horizontal(|ui| {
                        ui.label("关键词:");
                        ui.text_edit_singleline(&mut self.config.query);
                    });
                    ui.add_space(8.0);
                    if ui.add_enabled(!self.is_downloading, egui::Button::new("🎲 随机获取一张")).clicked() {
                        let _ = self.config.save();
                        self.trigger_fetch_unsplash(ctx.clone());
                    }
                });
        });
    }

    fn show_settings(&mut self, ui: &mut egui::Ui) {
        ui.add_space(10.0);
        ui.heading("应用设置");
        ui.separator();

        ui.add_space(10.0);
        egui::Grid::new("settings_grid")
            .num_columns(2)
            .spacing([20.0, 12.0])
            .show(ui, |ui| {
                ui.label("默认壁纸关键词:");
                if ui.text_edit_singleline(&mut self.config.query).changed() {
                    let _ = self.config.save();
                }
                ui.end_row();

                ui.label("缓存存储路径:");
                ui.label(&self.config.cache_dir);
                ui.end_row();

                ui.label("定时更新间隔 (分钟):");
                if ui.add(egui::Slider::new(&mut self.config.auto_update_interval_minutes, 5..=1440)).changed() {
                    let _ = self.config.save();
                }
                ui.end_row();

                ui.label("开启后台定时更新:");
                if ui.checkbox(&mut self.config.auto_update_enabled, "启用自动轮换壁纸").changed() {
                    let _ = self.config.save();
                }
                ui.end_row();
            });

        ui.add_space(20.0);
        ui.separator();
        if let Some(ref current) = self.current_wallpaper_path {
            ui.label(format!("当前 Windows 壁纸: {}", current));
        }
    }
}

#[tokio::main]
async fn main() -> Result<(), eframe::Error> {
    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size([960.0, 640.0])
            .with_min_inner_size([720.0, 480.0])
            .with_title("WallpaperApp - Rust Edition"),
        ..Default::default()
    };

    eframe::run_native(
        "WallpaperApp",
        options,
        Box::new(|cc| Ok(Box::new(WallpaperApp::new(cc)))),
    )
}
