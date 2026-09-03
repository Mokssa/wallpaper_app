<div align="center">

# Wallpaper 4K

**基于 Tauri v2 + Rust 构建的超轻量跨图源桌面壁纸工具**

融合 Windows 11 WinUI 3 Fluent Design 与 Material You 质感美学

[简体中文](README.md) • [English](README_en.md) • [日本語](README_ja.md) • [한국어](README_ko.md)

<br/>

[![GitHub Release](https://img.shields.io/github/v/release/Mokssa/wallpaper_app?color=8b5cf6&style=flat-square)](https://github.com/Mokssa/wallpaper_app/releases)
[![Rust](https://img.shields.io/badge/Rust-2021-ea580c?style=flat-square&logo=rust)](https://www.rust-lang.org/)
[![Tauri](https://img.shields.io/badge/Tauri-v2.0-24c8db?style=flat-square&logo=tauri)](https://tauri.app/)
[![License](https://img.shields.io/badge/License-MIT-10b981?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-0078d4?style=flat-square&logo=windows)](https://www.microsoft.com/windows)

</div>

---

## 📸 软件预览 (Screenshots)

<div align="center">

### 发现壁纸 (Explore)
海量跨图源 4K/超清大图浏览，多分类标签与智能搜索。
<img src="docs/screenshots/explore.png" alt="发现壁纸" width="85%" style="border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); margin-bottom: 24px;" />

### 本地壁纸与批量管理 (Local Gallery & Batch Mode)
支持一键设为壁纸、单张删除二次确认、批量勾选与批量安全删除。
<img src="docs/screenshots/gallery_batch.png" alt="本地壁纸与批量管理" width="85%" style="border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); margin-bottom: 24px;" />

### 浏览记录画廊 (Browsing History)
点击查看过的壁纸自动持久化存入浏览历史，支持快速重设为桌面壁纸与二次确认清空。
<img src="docs/screenshots/history.png" alt="浏览记录" width="85%" style="border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); margin-bottom: 24px;" />

### 个性化与主题设置 (Material You & Typography)
12 套质感主题配色、全功能自定义取色板、纯黑 AMOLED 模式与 4 套精选字体风格。
<img src="docs/screenshots/settings.png" alt="个性化设置" width="85%" style="border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); margin-bottom: 24px;" />

### 独立关于页面 (About & Update Engine)
独立展示软件版本与生态，集成双轨无限制 GitHub Release 检查更新引擎。
<img src="docs/screenshots/about.png" alt="关于与版本检查" width="85%" style="border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); margin-bottom: 24px;" />

</div>

---

## ✨ 核心特性

- **多图源无缝聚合** — 原生集成 Bing 每日壁纸、Pexels 摄影精选、Unsplash 艺术图库、Wallhaven 动漫/CG 社区。
- **纯净无限滚动体验** — 全面采用丝滑平顺的无限瀑布流加载，高分屏自适应填满视口，告别繁琐翻页。
- **浏览记录独立画廊** — 每次点击壁纸自动持久化存入本地历史，专属导航栏随时回顾、一键设为壁纸与二次确认清空。
- **本地壁纸与安全批量管理** — 本地壁纸单张删除与批量多选删除，均配备 Material 3 模态二次确认弹窗，杜绝误操作。
- **四国语言国际化 (i18n)** — 全面支持简体中文 (zh-CN)、英语 (en-US)、日语 (ja-JP)、韩语 (ko-KR)。默认自适应用户系统语言，无法匹配时自动安全回退至简体中文。
- **Material Design 3 + WinUI 3 视觉美学** —
  - **12 套主题调色盘**：天青海蓝、松石薄荷、樱花绯粉、暮光金橙、森林翡翠、热烈烈焰、落日余晖、赛博霓虹、极地冰川、清雅抹茶、浓郁摩卡、深海邃夜。
  - **自定义调色板 (Color Picker)**：自由选取任意十六进制主色调，智能计算派生完整的暗色/亮色 Token 体系。
  - **纯黑 AMOLED 模式**：极客纯黑底色，省电护眼且对比鲜明。
  - **精选屏显字体**：鸿蒙舒适圆体、软萌可爱幼圆、现代极简屏显 (Segoe UI)、几何质感 (MiSans)。
- **双轨无限制版本更新检测** —
  - 智能优先调用 GitHub Release REST 接口获取完整更新日志。
  - 当触发 GitHub 未鉴权 IP 频率限制 (403 Forbidden) 时，自动平滑回退至 HTTP 302 重定向解析通道，无视任何速率限制。
- **原生极速与低内存占用** — 基于 Rust 2021 + Windows 原生 Win32 API (`SystemParametersInfoW`) 设置壁纸，内存占用极低（运行仅占用数十 MB 内存）。
- **后台轮换与托盘驻留** — 支持开机自启、关闭窗口最小化至系统托盘、双击托盘图标快速还原、多图源后台定时自动轮换。

---

## 🛠️ 技术架构

| 模块 | 技术选型 | 说明 |
|---|---|---|
| **应用架构** | [Tauri v2](https://v2.tauri.app/) | 基于 Rust 的跨平台超轻量桌面框架 |
| **底层核心** | Rust 2021 + Tokio + Reqwest | 高并发异步 I/O、安全网络请求 |
| **壁纸引擎** | Win32 `SystemParametersInfoW` + Windows 注册表 | 原生修改桌面壁纸与 6 种填充样式 |
| **UI 呈现** | 原生 HTML5 / CSS3 / ES2022 | 零臃肿依赖、M3 动态波纹引擎、纯净瞬发加载 |
| **窗口特效** | window-vibrancy | 原生 Windows 11 Mica / Acrylic 模糊特效 |
| **自动化构建** | GitHub Actions | 标签触发自动打包全平台 Release 安装包与便携版 Zip |

---

## 🚀 快速开始

### 系统需求
- Windows 10 (Build 19041+) 或 Windows 11
- 已安装 [Rust](https://rustup.rs) 工具链及 Visual Studio C++ 生成工具 (MSVC)
- Node.js 18+ (用于前端样式校验与测试)

### 本地编译构建

```powershell
# 1. 克隆代码仓库
git clone https://github.com/Mokssa/wallpaper_app.git
cd wallpaper_app

# 2. 安装前端开发测试依赖
npm install

# 3. 运行完整自动化测试套件 (Rust 单元测试 + 前端 285+ 测试用例)
cargo test
npm test

# 4. 调试模式运行
cargo tauri dev

# 5. 正式发布打包 (生成便携版与安装包)
cargo tauri build
```

编译产物位于 `target/release/wallpaper_app.exe`。

---

## ⚙️ 配置文件说明

应用程序在初次运行时会在当前工作目录下生成 `config/settings.json`：

```json
{
  "cache_dir": "cache/wallpapers",
  "wallpaper_style": "fill",
  "auto_update_enabled": false,
  "auto_update_interval_minutes": 60,
  "random_source": "all",
  "theme_color": "indigo",
  "custom_theme_color": null,
  "amoled_mode": false,
  "font_family": "misans",
  "language": "zh-CN",
  "load_mode": "pagination",
  "card_ratio": "uniform",
  "unsplash_access_key": "",
  "pexels_api_key": ""
}
```

> **🔒 隐私承诺**：所有 API 密钥与个人偏好严格存储于本地配置文件中，本软件不包含任何数据追踪、遥测或远程上传行为。

---

## 📄 开源许可证

本项目基于 [MIT License](LICENSE) 开放源代码，您可以自由商用、修改与分发。
