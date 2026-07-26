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

#[derive(PartialEq, Clone, Copy)]
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

fn apply_winui3_theme(ctx: &egui::Context) {
    let mut visuals = egui::Visuals::dark();

    // WinUI 3 Dark Mica Palette (#202020 & #2c2c2c)
    visuals.panel_fill = egui::Color32::from_rgb(32, 32, 32);
    visuals.window_fill = egui::Color32::from_rgb(44, 44, 44);

    let border_stroke = egui::Stroke::new(1.0, egui::Color32::from_rgba_premultiplied(255, 255, 255, 18));

    // 非交互容器
    visuals.widgets.noninteractive.bg_fill = egui::Color32::from_rgb(44, 44, 44);
    visuals.widgets.noninteractive.bg_stroke = border_stroke;
    visuals.widgets.noninteractive.rounding = egui::Rounding::same(8.0);

    // 默认按钮
    visuals.widgets.inactive.bg_fill = egui::Color32::from_rgb(48, 48, 48);
    visuals.widgets.inactive.bg_stroke = border_stroke;
    visuals.widgets.inactive.rounding = egui::Rounding::same(6.0);

    // 悬停态
    visuals.widgets.hovered.bg_fill = egui::Color32::from_rgb(58, 58, 58);
    visuals.widgets.hovered.bg_stroke = egui::Stroke::new(1.0, egui::Color32::from_rgba_premultiplied(255, 255, 255, 35));
    visuals.widgets.hovered.rounding = egui::Rounding::same(6.0);

    // 激活/选中态 - WinUI 3 微软经典高亮蓝 (#0078d4 / #4cc2ff)
    visuals.widgets.active.bg_fill = egui::Color32::from_rgb(76, 194, 255);
    visuals.widgets.active.fg_stroke = egui::Stroke::new(1.0, egui::Color32::BLACK);
    visuals.widgets.active.rounding = egui::Rounding::same(6.0);

    visuals.selection.bg_fill = egui::Color32::from_rgb(76, 194, 255);
    visuals.window_rounding = egui::Rounding::same(8.0);

    ctx.set_visuals(visuals);
}

fn render_setting_card<F: FnOnce(&mut egui::Ui)>(ui: &mut egui::Ui, title: &str, desc: &str, add_contents: F) {
    egui::Frame::group(ui.style())
        .fill(egui::Color32::from_rgb(42, 42, 42))
        .stroke(egui::Stroke::new(1.0, egui::Color32::from_rgba_premultiplied(255, 255, 255, 12)))
        .rounding(egui::Rounding::same(8.0))
        .inner_margin(egui::Margin::symmetric(16.0, 12.0))
        .show(ui, |ui| {
            ui.horizontal(|ui| {
                ui.vertical(|ui| {
                    ui.label(egui::RichText::new(title).size(14.0).strong().color(egui::Color32::WHITE));
                    ui.label(egui::RichText::new(desc).size(11.0).color(egui::Color32::from_rgb(150, 150, 150)));
                });

                ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), add_contents);
            });
        });
    ui.add_space(8.0);
}

impl WallpaperApp {
    fn new(cc: &eframe::CreationContext<'_>) -> Self {
        egui_extras::install_image_loaders(&cc.egui_ctx);
        setup_custom_fonts(&cc.egui_ctx);
        apply_winui3_theme(&cc.egui_ctx);

        let config = AppConfig::load();
        let (tx, rx) = channel();

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
        while let Ok(msg) = self.rx.try_recv() {
            match msg {
                AppMessage::DownloadSuccess(item) => {
                    self.is_downloading = false;
                    self.status_msg = format!("已成功下载壁纸: {}", item.title);
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

        // WinUI 3 风格：左侧 NavigationRail 侧边栏
        egui::SidePanel::left("winui_nav_panel")
            .resizable(false)
            .exact_width(210.0)
            .frame(
                egui::Frame::none()
                    .fill(egui::Color32::from_rgb(26, 26, 26))
                    .inner_margin(egui::Margin::same(12.0))
            )
            .show(ctx, |ui| {
                ui.add_space(8.0);
                
                // 应用 Header Logo
                ui.horizontal(|ui| {
                    ui.add_space(6.0);
                    ui.label(egui::RichText::new("🖼").size(22.0));
                    ui.vertical(|ui| {
                        ui.label(egui::RichText::new("壁纸随心换").strong().size(15.0).color(egui::Color32::WHITE));
                        ui.label(egui::RichText::new("WinUI 3 Style").size(10.0).color(egui::Color32::from_rgb(140, 140, 140)));
                    });
                });

                ui.add_space(20.0);

                // WinUI 3 风格侧边栏菜单项组件
                let mut nav_item = |ui: &mut egui::Ui, tab: NavTab, icon: &str, title: &str| {
                    let is_selected = self.active_tab == tab;
                    
                    let bg_color = if is_selected {
                        egui::Color32::from_rgb(44, 44, 44)
                    } else {
                        egui::Color32::TRANSPARENT
                    };

                    let response = ui.allocate_ui(egui::vec2(186.0, 38.0), |ui| {
                        egui::Frame::none()
                            .fill(bg_color)
                            .rounding(egui::Rounding::same(6.0))
                            .inner_margin(egui::Margin::symmetric(10.0, 8.0))
                            .show(ui, |ui| {
                                ui.horizontal(|ui| {
                                    // 激活状态时的左侧竖直高亮指示条 (Active Indicator)
                                    if is_selected {
                                        let (rect, _) = ui.allocate_exact_size(egui::vec2(3.0, 16.0), egui::Sense::hover());
                                        ui.painter().rect_filled(rect, 2.0, egui::Color32::from_rgb(76, 194, 255));
                                        ui.add_space(6.0);
                                    } else {
                                        ui.add_space(9.0);
                                    }
                                    
                                    ui.label(egui::RichText::new(icon).size(15.0));
                                    ui.add_space(4.0);
                                    let text_color = if is_selected { egui::Color32::WHITE } else { egui::Color32::from_rgb(200, 200, 200) };
                                    ui.label(egui::RichText::new(title).size(13.0).color(text_color));
                                });
                            })
                    });

                    if response.response.interact(egui::Sense::click()).clicked() {
                        self.active_tab = tab;
                    }
                };

                nav_item(ui, NavTab::Gallery, "🎨", "本地壁纸库");
                ui.add_space(4.0);
                nav_item(ui, NavTab::Explore, "✨", "发现新壁纸");
                ui.add_space(4.0);
                nav_item(ui, NavTab::Settings, "⚙", "软件设置");

                ui.with_layout(egui::Layout::bottom_up(egui::Align::LEFT), |ui| {
                    ui.add_space(6.0);
                    ui.horizontal(|ui| {
                        ui.add_space(6.0);
                        ui.label(egui::RichText::new("v1.0.0 • Rust").size(10.0).color(egui::Color32::from_rgb(110, 110, 110)));
                    });
                });
            });

        // 底部 Fluent 状态条
        egui::TopBottomPanel::bottom("winui_status_bar")
            .exact_height(28.0)
            .frame(
                egui::Frame::none()
                    .fill(egui::Color32::from_rgb(24, 24, 24))
                    .inner_margin(egui::Margin::symmetric(12.0, 4.0))
            )
            .show(ctx, |ui| {
                ui.horizontal_centered(|ui| {
                    ui.label(egui::RichText::new("🛈 ").size(12.0).color(egui::Color32::from_rgb(76, 194, 255)));
                    ui.label(egui::RichText::new(&self.status_msg).size(11.0).color(egui::Color32::from_rgb(170, 170, 170)));
                });
            });

        // 右侧 Fluent 内容容器
        egui::CentralPanel::default()
            .frame(
                egui::Frame::none()
                    .fill(egui::Color32::from_rgb(32, 32, 32))
                    .inner_margin(egui::Margin::same(20.0))
            )
            .show(ctx, |ui| {
                match self.active_tab {
                    NavTab::Gallery => self.show_gallery_winui(ui, ctx),
                    NavTab::Explore => self.show_explore_winui(ui, ctx),
                    NavTab::Settings => self.show_settings_winui(ui),
                }
            });
    }
}

impl WallpaperApp {
    fn show_gallery_winui(&mut self, ui: &mut egui::Ui, _ctx: &egui::Context) {
        // Fluent 页头标题
        ui.horizontal(|ui| {
            ui.vertical(|ui| {
                ui.heading(egui::RichText::new("本地壁纸库").size(22.0).strong().color(egui::Color32::WHITE));
                ui.label(egui::RichText::new(format!("共已缓存 {} 张高清壁纸，点击可快速切换", self.wallpapers.len())).size(12.0).color(egui::Color32::from_rgb(150, 150, 150)));
            });

            ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                if ui.add(egui::Button::new("🔄  刷新列表")).clicked() {
                    self.reload_local_wallpapers();
                }
            });
        });

        ui.add_space(16.0);

        if self.wallpapers.is_empty() {
            egui::Frame::group(ui.style())
                .fill(egui::Color32::from_rgb(38, 38, 38))
                .rounding(egui::Rounding::same(8.0))
                .inner_margin(40.0)
                .show(ui, |ui| {
                    ui.vertical_centered(|ui| {
                        ui.label(egui::RichText::new("📷").size(36.0));
                        ui.add_space(8.0);
                        ui.label(egui::RichText::new("尚无本地已缓存壁纸").size(15.0).strong());
                        ui.label(egui::RichText::new("点击左侧“发现新壁纸”，一键在线下载高质感壁纸吧！").size(12.0).color(egui::Color32::GRAY));
                    });
                });
            return;
        }

        // WinUI 3 卡片流展现
        egui::ScrollArea::vertical().show(ui, |ui| {
            ui.horizontal_wrapped(|ui| {
                let mut to_set_wp = None;
                let mut to_delete = None;

                for (idx, item) in self.wallpapers.iter().enumerate() {
                    ui.allocate_ui(egui::vec2(224.0, 244.0), |ui| {
                        egui::Frame::group(ui.style())
                            .fill(egui::Color32::from_rgb(42, 42, 42))
                            .rounding(egui::Rounding::same(8.0))
                            .stroke(egui::Stroke::new(1.0, egui::Color32::from_rgba_premultiplied(255, 255, 255, 12)))
                            .inner_margin(8.0)
                            .show(ui, |ui| {
                                ui.set_min_size(egui::vec2(208.0, 228.0));

                                // 缩略图
                                let uri = format!("file://{}", item.file_path.display());
                                ui.add(
                                    egui::Image::new(uri)
                                        .max_size(egui::vec2(208.0, 124.0))
                                        .rounding(egui::Rounding::same(6.0))
                                );

                                ui.add_space(8.0);
                                ui.add(egui::Label::new(egui::RichText::new(&item.title).size(13.0).strong().color(egui::Color32::WHITE)).truncate());
                                ui.label(egui::RichText::new(format!("🕒 {}", item.download_date)).size(10.0).color(egui::Color32::from_rgb(140, 140, 140)));

                                ui.add_space(8.0);
                                ui.horizontal(|ui| {
                                    let btn_set = egui::Button::new(egui::RichText::new("🖥 设为壁纸").size(11.0))
                                        .fill(egui::Color32::from_rgb(76, 194, 255))
                                        .stroke(egui::Stroke::NONE);

                                    if ui.add(btn_set).clicked() {
                                        to_set_wp = Some(item.file_path.clone());
                                    }

                                    if ui.button(egui::RichText::new("🗑 删除").size(11.0)).clicked() {
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

    fn show_explore_winui(&mut self, ui: &mut egui::Ui, ctx: &egui::Context) {
        ui.vertical(|ui| {
            ui.heading(egui::RichText::new("发现新壁纸").size(22.0).strong().color(egui::Color32::WHITE));
            ui.label(egui::RichText::new("从微软 Bing 每日壁纸或 Unsplash 全球摄影社区获取高分辨率图片").size(12.0).color(egui::Color32::from_rgb(150, 150, 150)));
        });

        ui.add_space(20.0);

        // WinUI 3 特色卡片组件
        ui.horizontal(|ui| {
            // 卡片 1: 必应壁纸
            egui::Frame::group(ui.style())
                .fill(egui::Color32::from_rgb(42, 42, 42))
                .stroke(egui::Stroke::new(1.0, egui::Color32::from_rgba_premultiplied(255, 255, 255, 12)))
                .inner_margin(20.0)
                .rounding(egui::Rounding::same(8.0))
                .show(ui, |ui| {
                    ui.set_width(310.0);
                    ui.horizontal(|ui| {
                        ui.label(egui::RichText::new("🌞").size(26.0));
                        ui.vertical(|ui| {
                            ui.label(egui::RichText::new("Bing 每日壁纸").size(16.0).strong().color(egui::Color32::WHITE));
                            ui.label(egui::RichText::new("来自微软官方每日图文大片").size(11.0).color(egui::Color32::GRAY));
                        });
                    });

                    ui.add_space(14.0);
                    ui.label("包含自然、地理人文及动物故事图景。");
                    ui.add_space(16.0);

                    let btn = egui::Button::new(egui::RichText::new("📥 下载今日必应美图").strong())
                        .fill(egui::Color32::from_rgb(76, 194, 255));

                    if ui.add_enabled(!self.is_downloading, btn).clicked() {
                        self.trigger_fetch_bing(ctx.clone());
                    }
                });

            ui.add_space(20.0);

            // 卡片 2: Unsplash 壁纸
            egui::Frame::group(ui.style())
                .fill(egui::Color32::from_rgb(42, 42, 42))
                .stroke(egui::Stroke::new(1.0, egui::Color32::from_rgba_premultiplied(255, 255, 255, 12)))
                .inner_margin(20.0)
                .rounding(egui::Rounding::same(8.0))
                .show(ui, |ui| {
                    ui.set_width(330.0);
                    ui.horizontal(|ui| {
                        ui.label(egui::RichText::new("🌌").size(26.0));
                        ui.vertical(|ui| {
                            ui.label(egui::RichText::new("Unsplash 4K 壁纸").size(16.0).strong().color(egui::Color32::WHITE));
                            ui.label(egui::RichText::new("全球高品质摄影师社区选图").size(11.0).color(egui::Color32::GRAY));
                        });
                    });

                    ui.add_space(14.0);
                    ui.horizontal(|ui| {
                        ui.label("主题关键词:");
                        ui.add_space(4.0);
                        ui.text_edit_singleline(&mut self.config.query);
                    });

                    ui.add_space(16.0);
                    let btn = egui::Button::new(egui::RichText::new("🎲 随机抓取一张").strong())
                        .fill(egui::Color32::from_rgb(76, 194, 255));

                    if ui.add_enabled(!self.is_downloading, btn).clicked() {
                        let _ = self.config.save();
                        self.trigger_fetch_unsplash(ctx.clone());
                    }
                });
        });
    }

    fn show_settings_winui(&mut self, ui: &mut egui::Ui) {
        ui.vertical(|ui| {
            ui.heading(egui::RichText::new("软件设置").size(22.0).strong().color(egui::Color32::WHITE));
            ui.label(egui::RichText::new("管理偏好设置、缓存路径与自动化行为").size(12.0).color(egui::Color32::from_rgb(150, 150, 150)));
        });

        ui.add_space(20.0);

        render_setting_card(ui, "默认检索关键词", "用于 Unsplash 壁纸分类（如 nature, architecture, city）", |ui| {
            if ui.add(egui::TextEdit::singleline(&mut self.config.query).desired_width(180.0)).changed() {
                let _ = self.config.save();
            }
        });

        render_setting_card(ui, "图片缓存路径", "存放所有已下载壁纸及 Sidecar JSON 元数据", |ui| {
            ui.label(egui::RichText::new(&self.config.cache_dir).color(egui::Color32::from_rgb(180, 180, 180)));
        });

        render_setting_card(ui, "自动切换时间间隔", "设置定时在后台更新壁纸的时间窗 (分钟)", |ui| {
            if ui.add(egui::Slider::new(&mut self.config.auto_update_interval_minutes, 5..=1440).suffix(" 分钟")).changed() {
                let _ = self.config.save();
            }
        });

        render_setting_card(ui, "后台自动轮换壁纸", "在应用运行时是否开启后台定时器进行自动下载与更新", |ui| {
            if ui.checkbox(&mut self.config.auto_update_enabled, "").changed() {
                let _ = self.config.save();
            }
        });

        ui.add_space(16.0);
        if let Some(ref current) = self.current_wallpaper_path {
            egui::Frame::group(ui.style())
                .fill(egui::Color32::from_rgb(34, 34, 34))
                .inner_margin(12.0)
                .show(ui, |ui| {
                    ui.label(egui::RichText::new(format!("📌 当前设置的 Windows 桌面壁纸: {}", current)).size(11.0).color(egui::Color32::from_rgb(140, 140, 140)));
                });
        }
    }
}

#[tokio::main]
async fn main() -> Result<(), eframe::Error> {
    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size([980.0, 640.0])
            .with_min_inner_size([760.0, 520.0])
            .with_title("壁纸随心换 (WallpaperApp) - WinUI 3 Style"),
        ..Default::default()
    };

    eframe::run_native(
        "WallpaperApp",
        options,
        Box::new(|cc| Ok(Box::new(WallpaperApp::new(cc)))),
    )
}
