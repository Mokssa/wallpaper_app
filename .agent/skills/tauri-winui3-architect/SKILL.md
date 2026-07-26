---
name: tauri-winui3-architect
description: "构建、优化和调试基于 Tauri v2 + Rust 的 Windows 11 WinUI 3 / Fluent Design System 桌面应用程序。包含 Mica/Acrylic 背景效果绑定、自定义 WinUI 3 原生风格标题栏、全套 Fluent Design Tokens (CSS/Dark mode)、标准组件库规范及 Tauri v2 最佳实践指南。"
---

# Tauri v2 + Rust WinUI 3 (Fluent Design System) 架构指南

本 Skill 旨在指导开发者与 AI Agent 高效构建符合 **Windows 11 Fluent Design System (WinUI 3)** 视觉规范的桌面级 **Tauri v2 + Rust** 应用程序。

---

## 1. WinUI 3 / Fluent Design System 设计令牌 (Design Tokens)

### 🎨 几何与间距 (Geometry & Spacing)
* **卡片圆角 (Card Radius)**: `8px` (`--radius-card`)
* **控件圆角 (Control Radius)**: `4px` (按钮、输入框、下拉框等，`--radius-control`)
* **弹窗/气泡圆角 (Dialog/Flyout Radius)**: `8px` (`--radius-dialog`)
* **网格间距 (Grid Basis)**: 4px / 8px 基础网格
  * 内边距 (Padding): 容器 `16px`，卡片 `12px ~ 16px`，控件 `6px 12px`
  * 间距 (Gap): 组件间 `8px` / `12px`，大版块 `20px` / `24px`

### 🔤 字体系统 (Segoe UI Variable)
优先采用 Windows 11 默认的 **Segoe UI Variable** / **Segoe UI**：
* **Caption**: `12px` / Regular (`400`) / 次级文本色
* **Body**: `14px` / Regular (`400`) / 主文本色
* **Body Strong**: `14px` / SemiBold (`600`) / 加粗文本
* **Subtitle**: `20px` / SemiBold (`600`) / 模块小标题
* **Title**: `28px` / SemiBold (`600`) / 页面主标题
* **Large Title**: `40px` / Display / 醒目大标题

### ✨ 深度与材质 (Depth & Materials)
* **Mica (云母材质)**: 用于窗口根节点，将桌面背景平滑透射至应用内部（Win11 原生支持）。
* **Mica Alt (深色/变体云母)**: 适用于多标签页应用或侧边栏分割。
* **Acrylic (亚克力材质)**: 用于浮层、下拉菜单、对话框、气泡提示及侧边导航栏。
* **Smoke / Backdrop Blur**: 在前端配合 `backdrop-filter: blur(20px)` 模拟极佳的层级深度。

---

## 2. Tauri v2 架构与 Window 配置 (`tauri.conf.json`)

为了让 Rust 层的 Mica / Acrylic 材质无缝穿透前端 Webview，**必须在窗口配置中启用透明和无边框属性**：

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "WallpaperApp",
  "version": "0.1.0",
  "identifier": "com.wallpaperapp.dev",
  "build": {
    "frontendDist": "ui"
  },
  "app": {
    "windows": [
      {
        "title": "Wallpaper App",
        "width": 1020,
        "height": 680,
        "minWidth": 900,
        "minHeight": 600,
        "resizable": true,
        "decorations": false,
        "transparent": true,
        "shadow": true,
        "center": true
      }
    ],
    "security": {
      "csp": null
    }
  }
}
```

---

## 3. Rust 后端视效绑定 (`src-tauri` 或 `src/lib.rs`)

引入 `window-vibrancy` crate，在应用启动阶段绑定 Mica / Acrylic 效果。

### 依赖配置 (`Cargo.toml`)
```toml
[dependencies]
tauri = { version = "2.0", features = ["image-png", "image-ico"] }
window-vibrancy = "0.5"
```

### Rust 初始化逻辑 (`src/lib.rs` 或 `src/main.rs`)
```rust
use tauri::Manager;
#[cfg(target_os = "windows")]
use window_vibrancy::{apply_mica, apply_acrylic, apply_mica_alt};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();

            #[cfg(target_os = "windows")]
            {
                // 优先尝试绑定 Windows 11 Mica 效果
                if let Err(_) = apply_mica(&window, Some(true)) {
                    // Windows 10 回退为 Acrylic 材质
                    let _ = apply_acrylic(&window, Some((18, 18, 18, 125)));
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

## 4. 全套 Fluent Design CSS 变量与设计系统 (`fluent_theme.css`)

```css
/* Fluent 2 / WinUI 3 CSS Design Tokens */
:root {
  /* 明亮主题 (Light Theme Tokens) */
  --bg-app: transparent;
  --bg-card: rgba(255, 255, 255, 0.70);
  --bg-card-hover: rgba(255, 255, 255, 0.85);
  --bg-control: rgba(255, 255, 255, 0.60);
  --bg-control-hover: rgba(255, 255, 255, 0.90);
  --bg-control-active: rgba(240, 240, 240, 0.90);
  
  --border-card: rgba(0, 0, 0, 0.08);
  --border-card-hover: rgba(0, 0, 0, 0.14);
  --border-control: rgba(0, 0, 0, 0.12);
  --border-control-bottom: rgba(0, 0, 0, 0.35);

  --text-primary: #1a1a1a;
  --text-secondary: #5c5c5c;
  --text-disabled: #9e9e9e;
  
  --accent: #0067c0;
  --accent-hover: #1875d1;
  --accent-active: #005aab;
  --accent-text: #ffffff;

  --status-success: #0f7b0f;
  --status-warning: #9d5d00;
  --status-danger: #c42b1c;
  --bg-infobar: rgba(249, 249, 249, 0.85);

  --radius-card: 8px;
  --radius-control: 4px;
  --radius-dialog: 8px;

  --font-fluent: "Segoe UI Variable Text", "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
  --shadow-card: 0 2px 4px rgba(0, 0, 0, 0.04), 0 0 2px rgba(0, 0, 0, 0.06);
  --shadow-flyout: 0 8px 16px rgba(0, 0, 0, 0.14), 0 0 2px rgba(0, 0, 0, 0.10);
}

@media (prefers-color-scheme: dark) {
  :root {
    /* 深色主题 (Dark Theme Tokens) */
    --bg-card: rgba(255, 255, 255, 0.05);
    --bg-card-hover: rgba(255, 255, 255, 0.08);
    --bg-control: rgba(255, 255, 255, 0.06);
    --bg-control-hover: rgba(255, 255, 255, 0.10);
    --bg-control-active: rgba(255, 255, 255, 0.04);
    
    --border-card: rgba(255, 255, 255, 0.08);
    --border-card-hover: rgba(255, 255, 255, 0.15);
    --border-control: rgba(255, 255, 255, 0.10);
    --border-control-bottom: rgba(255, 255, 255, 0.20);

    --text-primary: #ffffff;
    --text-secondary: #9e9e9e;
    --text-disabled: #5c5c5c;

    --accent: #60cdff;
    --accent-hover: #4cc2ff;
    --accent-active: #3aa8e6;
    --accent-text: #000000;

    --status-success: #6ccb5f;
    --status-warning: #fce100;
    --status-danger: #ff99a4;
    --bg-infobar: rgba(39, 39, 39, 0.85);

    --shadow-card: 0 2px 4px rgba(0, 0, 0, 0.25);
    --shadow-flyout: 0 8px 16px rgba(0, 0, 0, 0.45);
  }
}

/* 前端容器基础透明配置 (为 Mica/Acrylic 效果留出透射通道) */
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  background: transparent !important;
  color: var(--text-primary);
  font-family: var(--font-fluent);
  user-select: none;
  overflow: hidden;
  box-sizing: border-box;
}

*, *::before, *::after {
  box-sizing: inherit;
}
```

---

## 5. WinUI 3 标准组件规范与 HTML/CSS 结构

### 1) WinUI 3 极简 Window Titlebar (自定义标题栏与拖拽区)
```html
<div class="fluent-titlebar">
  <div class="titlebar-drag-region" data-tauri-drag-region>
    <img src="/icons/32x32.png" class="titlebar-icon" alt="App Icon" />
    <span class="titlebar-title">Wallpaper App</span>
  </div>
  <div class="titlebar-actions">
    <button class="titlebar-btn" id="btn-minimize" title="最小化">&#xE921;</button>
    <button class="titlebar-btn" id="btn-maximize" title="最大化">&#xE922;</button>
    <button class="titlebar-btn close" id="btn-close" title="关闭">&#xE8BB;</button>
  </div>
</div>
```
```css
.fluent-titlebar {
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 12px;
  font-size: 12px;
  background: transparent;
  border-bottom: 1px solid var(--border-card);
}

.titlebar-drag-region {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
}

.titlebar-icon {
  width: 16px;
  height: 16px;
}

.titlebar-actions {
  display: flex;
  height: 100%;
}

.titlebar-btn {
  width: 46px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-family: "Segoe Fluent Icons", "Segoe MDL2 Assets", sans-serif;
  font-size: 10px;
  cursor: default;
  transition: background 0.1s ease;
}

.titlebar-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

.titlebar-btn.close:hover {
  background: var(--status-danger);
  color: #ffffff;
}
```

### 2) Fluent Card (圆角卡片)
```css
.fluent-card {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-card);
  backdrop-filter: blur(20px);
  padding: 16px;
  box-shadow: var(--shadow-card);
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
}

.fluent-card:hover {
  background: var(--bg-card-hover);
  border-color: var(--border-card-hover);
}
```

### 3) Fluent Button & Accent Button
```css
.fluent-btn {
  background: var(--bg-control);
  border: 1px solid var(--border-control);
  border-bottom-color: var(--border-control-bottom);
  border-radius: var(--radius-control);
  color: var(--text-primary);
  padding: 6px 16px;
  font-size: 14px;
  font-family: var(--font-fluent);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.1s ease;
}

.fluent-btn:hover {
  background: var(--bg-control-hover);
}

.fluent-btn:active {
  background: var(--bg-control-active);
  transform: scale(0.98);
}

.fluent-btn-accent {
  background: var(--accent);
  color: var(--accent-text);
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-weight: 600;
}

.fluent-btn-accent:hover {
  background: var(--accent-hover);
}

.fluent-btn-accent:active {
  background: var(--accent-active);
}
```

### 4) InfoBar (信息提示条)
```html
<div class="fluent-infobar status-success">
  <span class="infobar-icon">&#xE73E;</span>
  <div class="infobar-content">
    <strong>壁纸设置成功</strong>：已将选中的高画质壁纸应用至当前桌面。
  </div>
</div>
```
```css
.fluent-infobar {
  background: var(--bg-infobar);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-card);
  padding: 12px 16px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-size: 13px;
  backdrop-filter: blur(12px);
}

.fluent-infobar.status-success { border-left: 4px solid var(--status-success); }
.fluent-infobar.status-warning { border-left: 4px solid var(--status-warning); }
.fluent-infobar.status-danger { border-left: 4px solid var(--status-danger); }
```

---

## 6. AI Agent 代码生成与实践守则

1. **绝对禁止在 Webview 容器顶层 (`html`/`body`/`#app`) 设置不透明背景色**：必须保持 `background: transparent !important;`，否则将破坏 Mica/Acrylic 系统的透射效果。
2. **严守 8px 与 4px 圆角法则**：外层大卡片、对话框、Flyout 一律使用 `8px`；内部控件（按钮、输入框、下拉框、Switch 等）一律使用 `4px`。
3. **全局响应主题变化**：使用 CSS 自定义变量处理 Light/Dark 模式，并在 JS/Rust 中动态监听系统主题变化。
4. **Tauri v2 窗口控制指令**：标题栏最小化/最大化/关闭按钮须绑定 `@tauri-apps/api/window` 对应的接口：
   ```js
   import { getCurrentWindow } from '@tauri-apps/api/window';
   const appWindow = getCurrentWindow();
   
   document.getElementById('btn-minimize')?.addEventListener('click', () => appWindow.minimize());
   document.getElementById('btn-maximize')?.addEventListener('click', () => appWindow.toggleMaximize());
   document.getElementById('btn-close')?.addEventListener('click', () => appWindow.close());
   ```
5. **性能优化**：在大量元素列表（如高清壁纸网格）中，建议搭配 `will-change: transform` 与 CSS `contain: content;`，避免频繁触发重绘导致的 Mica 卡顿。
