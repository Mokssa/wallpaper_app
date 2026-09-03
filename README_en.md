<div align="center">

# Wallpaper 4K

**Ultra-lightweight Cross-Source Desktop Wallpaper Manager Built with Tauri v2 + Rust**

Fusing Windows 11 WinUI 3 Fluent Design with Material You Aesthetics

[简体中文](README.md) • [English](README_en.md) • [日本語](README_ja.md) • [한국어](README_ko.md)

<br/>

[![GitHub Release](https://img.shields.io/github/v/release/Mokssa/wallpaper_app?color=8b5cf6&style=flat-square)](https://github.com/Mokssa/wallpaper_app/releases)
[![Rust](https://img.shields.io/badge/Rust-2021-ea580c?style=flat-square&logo=rust)](https://www.rust-lang.org/)
[![Tauri](https://img.shields.io/badge/Tauri-v2.0-24c8db?style=flat-square&logo=tauri)](https://tauri.app/)
[![License](https://img.shields.io/badge/License-MIT-10b981?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-0078d4?style=flat-square&logo=windows)](https://www.microsoft.com/windows)

</div>

---

## 📸 Screenshots

<div align="center">

### Explore Wallpapers
Browse millions of 4K ultra-clear images from top online sources with smart search and tag filtering.
<img src="docs/screenshots/explore.png" alt="Explore Wallpapers" width="85%" style="border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); margin-bottom: 24px;" />

### Local Gallery & Batch Management
Single-click wallpaper application, single deletion with confirmation, multi-select checkboxes, and safe batch deletion.
<img src="docs/screenshots/gallery_batch.png" alt="Local Gallery and Batch Management" width="85%" style="border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); margin-bottom: 24px;" />

### Browsing History Gallery
Automatically persists clicked wallpapers into local history. Review past discoveries anytime, re-apply as wallpaper, or clear history with secondary confirmation.
<img src="docs/screenshots/history.png" alt="Browsing History Gallery" width="85%" style="border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); margin-bottom: 24px;" />

### Material You & Typography Settings
12 preset dynamic themes, custom color picker, pure black AMOLED mode, and 4 curated font style presets.
<img src="docs/screenshots/settings.png" alt="Settings & Theming" width="85%" style="border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); margin-bottom: 24px;" />

### Dedicated About Page & Update Engine
Clear software version and ecosystem links with zero-rate-limit dual-strategy GitHub Release update checker.
<img src="docs/screenshots/about.png" alt="About & Update Checker" width="85%" style="border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); margin-bottom: 24px;" />

</div>

---

## ✨ Features

- **Multi-Source Aggregation** — Seamlessly integrated with Bing Daily, Pexels Photos, Unsplash Art, and Wallhaven Anime/CG.
- **Pure Infinite Scroll** — Fully powered by smooth waterfall infinite scrolling. Automatically fills high-DPI viewports without cumbersome pagination bars.
- **Dedicated Browsing History** — Automatically captures every inspected wallpaper into local persistence. Easily review, re-apply as desktop wallpaper, and safely clear history.
- **Local Gallery & Safe Batch Deletion** — Both single delete and batch multi-select delete are guarded by Material 3 modal confirmation dialogs to prevent accidental deletions.
- **Full Internationalization (i18n)** — Native support for Simplified Chinese (zh-CN), English (en-US), Japanese (ja-JP), and Korean (ko-KR). Automatically adapts to user system locale with fallback to zh-CN.
- **Material Design 3 + WinUI 3 Aesthetics** —
  - **12 Dynamic Themes**: Ocean Teal, Azure Blue, Mint Green, Sunset Amber, Emerald Forest, Crimson Flame, Evening Sunset, Cyberpunk Neon, Glacier Blue, Matcha Green, Mocha Brown, and Deep Space.
  - **Custom Color Palette (Color Picker)**: Pick any hex color to generate a complete Material You dynamic color system.
  - **Pure Black AMOLED Mode**: Deep black background for eye comfort and power efficiency.
  - **Curated Display Fonts**: HarmonyOS Rounded, Soft YouYuan, Modern Segoe UI, and Geometric MiSans.
- **Dual-Strategy Rate-Limit-Free Update Inspector** —
  - Primary: REST API fetch for detailed release notes.
  - Fallback: Auto-redirect parsing via HTTP 302 to bypass GitHub 403 Forbidden unauthenticated rate limits.
- **High Performance & Low Memory Footprint** — Built with Rust 2021 + native Win32 `SystemParametersInfoW`. Uses only a few dozen megabytes of RAM.
- **Background Auto-Rotation & System Tray** — Start on boot, minimize to system tray on close, double-click to restore, and automatic timed wallpaper rotation.

---

## 🛠️ Architecture

| Component | Technology | Description |
|---|---|---|
| **Desktop Framework** | [Tauri v2](https://v2.tauri.app/) | Rust-powered lightweight desktop runtime |
| **Backend Core** | Rust 2021 + Tokio + Reqwest | High-concurrency async I/O and secure networking |
| **Wallpaper Engine** | Win32 `SystemParametersInfoW` + Windows Registry | Native wallpaper setter with 6 fill styles |
| **Frontend UI** | Native HTML5 / CSS3 / ES2022 | Zero bloated dependencies, M3 ripple engine, instant load |
| **Vibrancy Effects** | window-vibrancy | Native Windows 11 Mica & Acrylic blur effects |
| **CI / CD Packaging** | GitHub Actions | Automatic release builds for portable .zip and setup .exe |

---

## 🚀 Getting Started

### Prerequisites
- Windows 10 (Build 19041+) or Windows 11
- [Rust](https://rustup.rs) toolchain & MSVC C++ build tools
- Node.js 18+ (for token tests and style validation)

### Build from Source

```powershell
# 1. Clone repository
git clone https://github.com/Mokssa/wallpaper_app.git
cd wallpaper_app

# 2. Install dependencies
npm install

# 3. Run full test suite (Rust unit tests + 285+ frontend tests)
cargo test
npm test

# 4. Run in dev mode
cargo tauri dev

# 5. Build production release
cargo tauri build
```

Binary output is generated at `target/release/wallpaper_app.exe`.

---

## ⚙️ Configuration

A default configuration file is automatically created at `config/settings.json`:

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
  "language": "en-US",
  "load_mode": "pagination",
  "card_ratio": "uniform",
  "unsplash_access_key": "",
  "pexels_api_key": ""
}
```

> **🔒 Privacy Assurance**: All API keys and settings are strictly stored in your local configuration file. This application contains zero telemetry, tracking, or remote analytics.

---

## 📄 License

Licensed under the [MIT License](LICENSE). Free for personal and commercial use.
