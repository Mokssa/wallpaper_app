---
name: tauri-ui-design-system
description: "Tauri v2 界面与 UI 设计系统规范指南。包含桌面端 UI 组件规范 (Shadcn / Fluent UI)、Mica/Acrylic 窗口材质与透明度配置、暗黑模式同步、自定义标题栏拖拽区控制及 CSS 微动画最佳实践。"
---

# Tauri v2 界面与 UI 设计系统规范指南

本 Skill 旨在指导 AI Agent 与开发者为基于 **Tauri v2** 的桌面应用构建高颜值、响应灵敏、符合现代桌面视觉标准（Mica/Acrylic/Fluent/macOS Web Native）的 UI 界面。

---

## 1. 设计令牌体系 (Design Tokens)

### 🎨 几何与间距 (Geometry & Spacing)
桌面应用在视觉与触感上需要比常规 Web 页面更加精致和紧凑。

* **控件圆角 (Control Radius)**: `4px` (`--radius-control`) —— 适用于按钮、输入框、下拉选框、Segment 切换器。
* **卡片圆角 (Card Radius)**: `8px` (`--radius-card`) —— 适用于壁纸展示卡片、设置面板、对话框、气泡提示。
* **内边距与间距 (Padding & Gap)**:
  * 窗口主容器 Padding: `16px`
  * 卡片内部 Padding: `12px ~ 16px`
  * 网格/组件 Gap: `8px ~ 12px` (卡片间距), `20px` (大版块间距)

### 🔤 字体与字号体系
优先采用系统原生渲染字体族：
* **Windows**: `"Segoe UI Variable Text", "Segoe UI", sans-serif`
* **macOS**: `"-apple-system", "BlinkMacSystemFont", "SF Pro Text", sans-serif`
* **字号梯度**:
  * Caption (说明/次级): `12px` (`line-height: 16px`)
  * Body (正文/控件): `14px` (`line-height: 20px`)
  * Body Strong (加粗正文): `14px` (`font-weight: 600`)
  * Subtitle (模块标题): `18px ~ 20px` (`font-weight: 600`)
  * Title (页面大标题): `24px ~ 28px` (`font-weight: 600`)

---

## 2. Tauri v2 窗口材质与透明通道配置

为了在 Tauri 应用中呈现现代桌面级的 Mica（云母）或 Acrylic（亚克力）高斯模糊透射效果，必须保持前端 Webview 的底色透明。

### 1) 窗口配置 (`tauri.conf.json`)
```json
{
  "app": {
    "windows": [
      {
        "title": "Wallpaper App",
        "width": 1020,
        "height": 680,
        "decorations": false,
        "transparent": true,
        "shadow": true
      }
    ]
  }
}
```

### 2) CSS 根节点透明与变量驱动 (`theme.css`)
```css
/* 全局透明基底：切记不可在 html / body / #app 上设置不透明背景 */
html, body, #app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  background: transparent !important;
  user-select: none;
  font-family: var(--font-main);
  color: var(--text-primary);
  overflow: hidden;
}

:root {
  /* 明亮模式 Token */
  --bg-card: rgba(255, 255, 255, 0.70);
  --bg-card-hover: rgba(255, 255, 255, 0.85);
  --bg-control: rgba(255, 255, 255, 0.60);
  --bg-control-hover: rgba(255, 255, 255, 0.90);
  --border-card: rgba(0, 0, 0, 0.08);
  --text-primary: #1c1c1c;
  --text-secondary: #5e5e5e;
  --accent: #0067c0;
  --accent-hover: #1875d1;
  --radius-card: 8px;
  --radius-control: 4px;
}

@media (prefers-color-scheme: dark) {
  :root {
    /* 深色模式 Token */
    --bg-card: rgba(255, 255, 255, 0.05);
    --bg-card-hover: rgba(255, 255, 255, 0.09);
    --bg-control: rgba(255, 255, 255, 0.07);
    --bg-control-hover: rgba(255, 255, 255, 0.12);
    --border-card: rgba(255, 255, 255, 0.09);
    --text-primary: #ffffff;
    --text-secondary: #9e9e9e;
    --accent: #60cdff;
    --accent-hover: #4cc2ff;
  }
}
```

---

## 3. 桌面端标准组件规范

### 1) 自定义标题栏 (Titlebar) 与拖拽控制
* 使用 `data-tauri-drag-region` 标记拖拽区域。
* 可点击元素（如按钮、搜索输入框）必须加上 `data-tauri-drag-region="false"` 或阻止冒泡，避免无法响应点击。

```html
<header class="app-titlebar">
  <div class="drag-handle" data-tauri-drag-region>
    <img src="/logo.svg" class="app-logo" alt="Logo" />
    <span class="app-name">壁纸漫游</span>
  </div>
  <div class="titlebar-actions" data-tauri-drag-region="false">
    <button id="btn-min" class="window-btn">&#xE921;</button>
    <button id="btn-max" class="window-btn">&#xE922;</button>
    <button id="btn-close" class="window-btn close">&#xE8BB;</button>
  </div>
</header>
```

### 2) 高颜值壁纸卡片 (Wallpaper Card)
带有悬浮光泽、缩放效果与动态操作遮罩：

```css
.wallpaper-card {
  position: relative;
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-card);
  backdrop-filter: blur(16px);
  overflow: hidden;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), 
              box-shadow 0.2s ease,
              border-color 0.2s ease;
  cursor: pointer;
}

.wallpaper-card:hover {
  transform: translateY(-3px) scale(1.01);
  border-color: var(--accent);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
}

.wallpaper-card img {
  width: 100%;
  height: 180px;
  object-fit: cover;
  display: block;
  transition: transform 0.3s ease;
}

.wallpaper-card:hover img {
  transform: scale(1.04);
}
```

### 3) Fluent / Shadcn 样式按钮 (Buttons)
```css
.btn-primary {
  background: var(--accent);
  color: #ffffff;
  border: none;
  border-radius: var(--radius-control);
  padding: 6px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: background 0.15s ease, transform 0.1s ease;
}

.btn-primary:hover {
  background: var(--accent-hover);
}

.btn-primary:active {
  transform: scale(0.97);
}
```

---

## 4. 桌面级微动画与 GPU 性能优化

1. **悬浮与反馈缓动 (Easing Curves)**：
   使用标准桌面弹性曲线 `cubic-bezier(0.16, 1, 0.3, 1)` 或 `cubic-bezier(0, 0, 0.2, 1)`，避免线性（`linear`）死板动画。
2. **GPU 图层隔离 (Containment & Repaint Avoidance)**：
   当壁纸列表等大面积高斯模糊（`backdrop-filter`）卡片滚动或调整窗口大小时，建议在容器样式中加入：
   ```css
   .wallpaper-grid {
     contain: content;
     will-change: transform;
   }
   ```
3. **消除闪烁与白屏**：
   在图片加载前提供统一的骨架屏（Skeleton Shimmer）或渐进式模糊淡入（Fade-in）过渡。

---

## 5. AI Agent 样式生成守则

1. ❌ **禁止**在 `body` 或 `#app` 根容器设置 `background-color: #fff` 或不透明颜色，以免破坏系统级透射材质。
2. ✅ **遵循** 4px 控件圆角与 8px 容器圆角法则，保持统一的界面节奏感。
3. ✅ **务必**给自定义标题栏的可点击控件标注 `data-tauri-drag-region="false"`。
4. ✅ **务必**支持深浅色模式（Theme Tokens），确保文字对比度符合 W3C 标准。
