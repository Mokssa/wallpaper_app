# Wallpaper

基于 Tauri v2 和 Rust 构建的轻量级 Windows 桌面壁纸管理工具，遵循 WinUI 3 Fluent Design 设计规范。

## 功能特性

- **多图源浏览** — 支持 Bing 每日壁纸、Unsplash 官方 API、Picsum 4K 摄影大图、Wallhaven 壁纸社区
- **一键应用** — 下载并立即设置为桌面壁纸
- **6 种填充模式** — 填充 / 适应 / 拉伸 / 平铺 / 居中 / 跨屏，直接写入 Windows 注册表生效
- **本地图库** — 壁纸缓存至本地并附带元数据，支持在应用内管理与删除
- **缩略图缓存** — 首次加载后缓存至磁盘，后续浏览无需重复请求
- **分页与无限滚动** — 两种加载模式可自由切换
- **自动轮换** — 可配置时间间隔，后台自动更换壁纸
- **系统托盘** — 关闭窗口最小化至托盘，双击还原
- **开机自启** — 可选随系统启动并驻留托盘
- **Mica / Acrylic** — 原生 Windows 11 背景模糊效果

## 技术栈

| 层级 | 技术 |
|---|---|
| 桌面框架 | Tauri v2 |
| 后端 | Rust + Tokio + Reqwest |
| 壁纸设置 | Win32 `SystemParametersInfoW` |
| 填充样式 | Windows 注册表（`Control Panel\Desktop`）|
| 前端 | 原生 HTML / CSS / JS |
| 视觉效果 | window-vibrancy（Mica / Acrylic）|

## 编译

需要安装 [Rust](https://rustup.rs) 工具链及 MSVC 构建工具。

```powershell
# 调试构建
cargo build

# 正式构建（推荐，无控制台窗口，已优化）
cargo build --release
```

> 若系统开启了智能应用控制（Smart App Control），需将编译输出目录指向受信任路径：
> ```powershell
> $env:CARGO_TARGET_DIR = "C:\Users\<用户名>\cargo_targets\wallpaper_app"
> cargo build --release
> ```

编译产物位于 `target\release\wallpaper_app.exe`。

## 配置

配置文件为可执行文件同级目录下的 `config/settings.json`。

| 键名 | 默认值 | 说明 |
|---|---|---|
| `cache_dir` | `cache/wallpapers` | 本地壁纸缓存路径 |
| `wallpaper_style` | `fill` | 桌面填充模式 |
| `auto_update_enabled` | `false` | 是否启用后台自动轮换 |
| `auto_update_interval_minutes` | `60` | 自动轮换间隔（分钟）|
| `unsplash_access_key` | `""` | Unsplash API 密钥（可选，提升请求配额）|
| `load_mode` | `pagination` | 加载模式：`pagination` 分页 / `infinite` 无限滚动 |
| `card_ratio` | `uniform` | 卡片比例：`uniform` 统一 16:10 / `original` 原始比例 |

## 许可证

MIT
