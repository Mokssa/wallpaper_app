// ==========================================================================
// WallpaperApp - Modern Flutter & Material Design 3 (M3) Client Script
// With Segoe UI + Microsoft YaHei UI, Fullscreen Lightbox & Smart Browser IPC
// ==========================================================================

// 全平台全版本兼容的 Tauri IPC 桥接绑定
function getTauriInvoke() {
  if (window.__TAURI__) {
    if (window.__TAURI__.core && typeof window.__TAURI__.core.invoke === 'function') {
      return window.__TAURI__.core.invoke;
    }
    if (typeof window.__TAURI__.invoke === 'function') {
      return window.__TAURI__.invoke;
    }
    if (window.__TAURI__.tauri && typeof window.__TAURI__.tauri.invoke === 'function') {
      return window.__TAURI__.tauri.invoke;
    }
  }
  return null;
}

const invoke = async (cmd, args) => {
  const realInvoke = getTauriInvoke();
  if (realInvoke) {
    return await realInvoke(cmd, args);
  }
  console.warn(`[Tauri IPC Bridge Waiting] window.__TAURI__ unavailable for cmd: ${cmd}`, args);
  return null;
};

// Application State
let appConfig = {
  query: "",
  cache_dir: "cache/wallpapers",
  auto_update_interval_minutes: 60,
  auto_update_enabled: false,
  unsplash_access_key: "",
  load_mode: "pagination",
  card_ratio: "uniform",
  theme_color: "violet",
  amoled_mode: false,
  random_source: "all",
};

let cachedWallpapers = [];
let onlineWallpapers = [];
let seenOnlineUrls = new Set();
let currentSource = 'pexels';
let currentPexelsTag = 'curated';
let onlinePage = 1;
const pageLimit = 24;
let hasMoreOnline = true;
let isInfiniteLoading = false;
let isOnlineLoading = false;
let searchDebounceTimer = null;
let currentDetailItem = null;
let currentDetailType = 'online';
let snackbarTimer = null;

// Lightbox State (全屏缩放与拖拽)
let lbZoom = 1.0;
let lbPosX = 0;
let lbPosY = 0;
let isLbDragging = false;
let lbStartX = 0;
let lbStartY = 0;

// DOM Elements
const btnMinimize = document.getElementById('btn-minimize');
const btnMaximize = document.getElementById('btn-maximize');
const btnClose = document.getElementById('btn-close');

const mainScrollEl = document.getElementById('flutter-main-scroll');
const navItems = document.querySelectorAll('.nav-item');
const tabPages = document.querySelectorAll('.tab-page');
const btnQuickRandom = document.getElementById('btn-quick-random');

// Gallery DOM
const galleryGrid = document.getElementById('gallery-grid');
const galleryEmptyState = document.getElementById('gallery-empty-state');
const galleryCountBadge = document.getElementById('gallery-count-badge');
const btnRefreshGallery = document.getElementById('btn-refresh-gallery');
const btnOpenCacheFolder = document.getElementById('btn-open-cache-folder');
const btnGotoExplore = document.getElementById('btn-goto-explore');

// Gallery Batch Management DOM
const btnGalleryBatchToggle = document.getElementById('btn-gallery-batch-toggle');
const btnGalleryBatchToggleText = document.getElementById('btn-gallery-batch-toggle-text');
const galleryBatchToolbar = document.getElementById('gallery-batch-toolbar');
const checkBatchSelectAll = document.getElementById('check-batch-select-all');
const batchSelectedBadge = document.getElementById('batch-selected-badge');
const btnBatchDelete = document.getElementById('btn-batch-delete');
const btnBatchExit = document.getElementById('btn-batch-exit');

// Explore DOM
const segmentedButtons = document.querySelectorAll('#segmented-source-group .segmented-btn');
const inputOnlineQuery = document.getElementById('input-online-query');
const btnSearchOnline = document.getElementById('btn-search-online');
const onlineGrid = document.getElementById('online-grid');

const infiniteLoader = document.getElementById('infinite-loader');

// History DOM
const tabHistory = document.getElementById('tab-history');
const historyGrid = document.getElementById('history-grid');
const historyCountBadge = document.getElementById('history-count-badge');
const historyEmptyState = document.getElementById('history-empty-state');
const btnClearHistory = document.getElementById('btn-clear-history');
const btnHistoryGotoExplore = document.getElementById('btn-history-goto-explore');

// Settings DOM
const themePaletteChips = document.querySelectorAll('.theme-palette-chip');
const checkAmoledMode = document.getElementById('check-amoled-mode');
const selectConfigRandomSource = document.getElementById('select-config-random-source');
const selectConfigCardratio = document.getElementById('select-config-cardratio');
const inputConfigQuery = document.getElementById('input-config-query');
const inputConfigUnsplashKey = document.getElementById('input-config-unsplash-key');
const inputConfigPexelsKey = document.getElementById('input-config-pexels-key');
const labelCacheDir = document.getElementById('label-cache-dir');
const btnBrowseDir = document.getElementById('btn-browse-dir');
const inputConfigInterval = document.getElementById('input-config-interval');
const checkConfigAutoupdate = document.getElementById('check-config-autoupdate');
const checkAutoLaunch = document.getElementById('check-auto-launch');
const selectConfigLanguage = document.getElementById('select-config-language');

// Generic M3 Confirmation Dialog DOM
const confirmDialogBackdrop = document.getElementById('confirm-dialog-backdrop');
const confirmDialogTitle = document.getElementById('confirm-dialog-title');
const confirmDialogMessage = document.getElementById('confirm-dialog-message');
const btnConfirmCancel = document.getElementById('btn-confirm-cancel');
const btnConfirmOk = document.getElementById('btn-confirm-ok');

// About Page DOM Links
const linkAboutRepo = document.getElementById('link-about-repo');
const linkAboutReleases = document.getElementById('link-about-releases');
const linkAboutIssues = document.getElementById('link-about-issues');

// Modal Elements
const detailModal = document.getElementById('detail-modal');
const btnCloseModal = document.getElementById('btn-close-modal');
const dialogPreviewBox = document.getElementById('dialog-preview-box');
const modalImg = document.getElementById('modal-wallpaper-img');
const modalMetaResolution = document.getElementById('modal-meta-resolution');
const modalMetaLinkText = document.getElementById('modal-meta-link-text');
const btnOpenBrowser = document.getElementById('btn-open-browser');
const btnCopyLink = document.getElementById('btn-copy-link');
const modalBtnLightbox = document.getElementById('modal-btn-lightbox');
const modalBtnDelete = document.getElementById('modal-btn-delete');
const modalBtnDownload = document.getElementById('modal-btn-download');
const modalBtnApply = document.getElementById('modal-btn-apply');

// Lightbox Elements (全屏画廊)
const fullscreenLightbox = document.getElementById('fullscreen-lightbox');
const lbViewport = document.getElementById('lb-viewport');
const lbImage = document.getElementById('lb-image');
const lbZoomLevel = document.getElementById('lb-zoom-level');
const lbBtnZoomIn = document.getElementById('lb-btn-zoom-in');
const lbBtnZoomOut = document.getElementById('lb-btn-zoom-out');
const lbBtnReset = document.getElementById('lb-btn-reset');
const lbBtnApply = document.getElementById('lb-btn-apply');
const lbBtnClose = document.getElementById('lb-btn-close');

// Flutter SnackBar DOM
const flutterSnackbar = document.getElementById('flutter-snackbar');
const snackbarText = document.getElementById('snackbar-text');

// Update Modal & Check Update Elements
const btnCheckUpdate = document.getElementById('btn-check-update');
const btnCheckUpdateText = document.getElementById('btn-check-update-text');
const iconUpdateRefresh = document.getElementById('icon-update-refresh');
const appVersionLabel = document.getElementById('app-version-label');
const updateModal = document.getElementById('update-modal');
const btnCloseUpdate = document.getElementById('btn-close-update');
const btnUpdateCancel = document.getElementById('btn-update-cancel');
const btnUpdateDownload = document.getElementById('btn-update-download');
const updateBadgeCurrent = document.getElementById('update-badge-current');
const updateBadgeLatest = document.getElementById('update-badge-latest');
const updateModalNotes = document.getElementById('update-modal-notes');

// ==========================================================================
// 1) Material Design 3 (M3) Dynamic Theme Engine
// ==========================================================================

const ALL_KNOWN_THEMES = [
  'indigo', 'ocean', 'emerald', 'sunset', 'crimson', 'lavender', 'amber',
  'violet', 'blue', 'teal', 'pink', 'green',
  'cyber', 'glacier', 'matcha', 'mocha', 'navy', 'rose', 'slate', 'custom'
];

const THEME_CANONICAL_MAP = {
  'indigo': 'indigo',
  'ocean': 'ocean',
  'emerald': 'emerald',
  'sunset': 'sunset',
  'crimson': 'crimson',
  'lavender': 'lavender',
  'amber': 'amber',
  'cyber': 'cyber',
  'glacier': 'glacier',
  'matcha': 'matcha',
  'mocha': 'mocha',
  'navy': 'navy',
  'rose': 'rose',
  'slate': 'slate',
  'custom': 'custom',
  // Backward-compatible alias mappings:
  'violet': 'indigo',
  'blue': 'ocean',
  'teal': 'ocean',
  'green': 'emerald',
  'pink': 'lavender'
};

const CANONICAL_DEFAULT_CHIP = {
  'indigo': 'violet',
  'ocean': 'blue',
  'emerald': 'green',
  'sunset': 'sunset',
  'crimson': 'crimson',
  'lavender': 'pink',
  'amber': 'amber',
  'cyber': 'cyber',
  'glacier': 'glacier',
  'matcha': 'matcha',
  'mocha': 'mocha',
  'navy': 'navy',
  'rose': 'rose',
  'slate': 'slate',
  'custom': 'custom'
};

// ==========================================================================
// 1.0) High-Precision Color Conversion & M3 Dynamic Tokens Generator
// ==========================================================================

function hexToRgb(hex) {
  let c = (hex || '').replace(/^#/, '').trim();
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(c)) {
    return { r: 139, g: 92, b: 246 };
  }
  const num = parseInt(c, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = ((b - r) / d + 2); break;
      case b: h = ((r - g) / d + 4); break;
    }
    h *= 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

function hslToRgb(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
}

function hslToHex(h, s, l) {
  const { r, g, b } = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

function generateAndApplyCustomThemeTokens(seedHex) {
  const cleanHex = (typeof seedHex === 'string' && /^#?[0-9a-fA-F]{3,6}$/.test(seedHex.trim()))
    ? (seedHex.trim().startsWith('#') ? seedHex.trim() : '#' + seedHex.trim())
    : '#8b5cf6';
  const { r, g, b } = hexToRgb(cleanHex);
  const [h, s, l] = rgbToHsl(r, g, b);

  // M3 适配明度微调：若在合理明度区间 (45% ~ 80%)，严格保留用户输入原色，避免浮点往返误差；极端明暗时平滑调和
  const isOptimalLightness = l >= 45 && l <= 80;
  const primaryL = Math.max(45, Math.min(l, 80));
  const primaryS = Math.max(s, 50);
  const primaryHex = isOptimalLightness ? cleanHex.toLowerCase() : hslToHex(h, primaryS, primaryL);

  // 亮度与反差色计算 (YIQ / WCAG)
  const prRgb = hexToRgb(primaryHex);
  const yiq = (prRgb.r * 299 + prRgb.g * 587 + prRgb.b * 114) / 1000;
  const onPrimaryHex = yiq >= 145 ? '#0f172a' : '#ffffff';

  // 容器色与强调色
  const containerHex = hslToHex(h, Math.min(primaryS, 75), 22);
  const onContainerHex = hslToHex(h, Math.min(primaryS, 65), 92);
  const hoverHex = hslToHex(h, Math.min(primaryS, 95), Math.min(primaryL + 6, 84));
  const activeHex = hslToHex(h, Math.min(primaryS, 95), Math.max(primaryL - 8, 38));
  const inversePrimaryHex = hslToHex(h, Math.min(primaryS, 85), 38);

  // 次要色与伴生渐变 (色相偏移 +25°)
  const secondaryHex = hslToHex((h + 25) % 360, Math.max(s - 10, 45), primaryL);
  const tertiaryHex = hslToHex((h + 60) % 360, Math.max(s - 15, 40), primaryL);
  const primaryGradient = `linear-gradient(135deg, ${primaryHex} 0%, ${secondaryHex} 50%, ${tertiaryHex} 100%)`;

  // M3 层次背景表面色体系 (基于主色调微妙着色)
  const surfaceHex = hslToHex(h, 22, 5);
  const surfaceDimHex = hslToHex(h, 22, 3);
  const surfaceBrightHex = hslToHex(h, 16, 18);
  const surfaceLowestHex = hslToHex(h, 20, 6);
  const surfaceLowHex = hslToHex(h, 18, 9);
  const surfaceContainerHex = hslToHex(h, 16, 13);
  const surfaceHighHex = hslToHex(h, 15, 17);
  const surfaceHighestHex = hslToHex(h, 14, 22);
  const onSurfaceHex = hslToHex(h, 30, 93);

  // 描边与光晕
  const outlineRgba = `rgba(${prRgb.r}, ${prRgb.g}, ${prRgb.b}, 0.22)`;
  const outlineVarRgba = `rgba(${prRgb.r}, ${prRgb.g}, ${prRgb.b}, 0.08)`;
  const outlineFocusRgba = `rgba(${prRgb.r}, ${prRgb.g}, ${prRgb.b}, 0.60)`;
  const glowRgba = `rgba(${prRgb.r}, ${prRgb.g}, ${prRgb.b}, 0.50)`;

  let customStyleTag = document.getElementById('m3-custom-theme-vars');
  if (!customStyleTag) {
    customStyleTag = document.createElement('style');
    customStyleTag.id = 'm3-custom-theme-vars';
    document.head.appendChild(customStyleTag);
  }

  customStyleTag.textContent = `
    body.theme-custom {
      --md-sys-color-primary: ${primaryHex};
      --md-sys-color-on-primary: ${onPrimaryHex};
      --md-sys-color-primary-container: ${containerHex};
      --md-sys-color-on-primary-container: ${onContainerHex};
      --md-sys-color-inverse-primary: ${inversePrimaryHex};
      --md-sys-color-primary-gradient: ${primaryGradient};
      --md-sys-color-primary-hover: ${hoverHex};
      --md-sys-color-primary-active: ${activeHex};
      --md-sys-color-secondary: ${secondaryHex};
      --md-sys-color-tertiary: ${tertiaryHex};
      --md-sys-color-surface: ${surfaceHex};
      --md-sys-color-surface-dim: ${surfaceDimHex};
      --md-sys-color-surface-bright: ${surfaceBrightHex};
      --md-sys-color-surface-container-lowest: ${surfaceLowestHex};
      --md-sys-color-surface-container-low: ${surfaceLowHex};
      --md-sys-color-surface-container: ${surfaceContainerHex};
      --md-sys-color-surface-container-high: ${surfaceHighHex};
      --md-sys-color-surface-container-highest: ${surfaceHighestHex};
      --md-sys-color-outline: ${outlineRgba};
      --md-sys-color-outline-variant: ${outlineVarRgba};
      --md-sys-color-outline-focus: ${outlineFocusRgba};
      --md-sys-color-on-surface: ${onSurfaceHex};
      --md-sys-color-on-surface-variant: #94a3b8;
      --md-sys-color-inverse-surface: #f8fafc;
      --md-sys-color-inverse-on-surface: #0f172a;
      --md-sys-elevation-primary-glow: 0 6px 20px -3px ${glowRgba};
    }
    .theme-palette-chip[data-theme="custom"].active {
      border-color: ${primaryHex} !important;
      box-shadow: 0 0 0 1px ${primaryHex}, 0 0 18px -2px ${glowRgba}, 0 4px 12px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.18) !important;
    }
    .theme-palette-chip[data-theme="custom"].active .palette-check-badge {
      background: ${primaryHex} !important;
    }
    .theme-palette-chip[data-theme="custom"].active .palette-check-badge svg {
      stroke: ${onPrimaryHex} !important;
    }
  `;

  // 同步更新取色板交互预览 DOM
  const previewCircle = document.getElementById('custom-palette-preview');
  if (previewCircle) {
    previewCircle.style.background = primaryGradient;
  }
  const indicator = document.getElementById('custom-color-indicator');
  if (indicator) {
    indicator.style.backgroundColor = primaryHex;
  }
  const hexCode = document.getElementById('custom-color-code');
  if (hexCode) {
    hexCode.textContent = primaryHex.toUpperCase();
  }
  const hexDisplay = document.getElementById('custom-theme-hex-display');
  if (hexDisplay) {
    hexDisplay.textContent = `当前主色: ${primaryHex.toUpperCase()} (已自适应全套 Material You 调色板)`;
  }
  const colorInput = document.getElementById('input-custom-theme-color');
  if (colorInput && colorInput.value.toLowerCase() !== primaryHex.toLowerCase()) {
    colorInput.value = primaryHex;
  }
}

function updateSourceIconsForTheme(themeName, isAmoled) {
  const pexelsIcons = document.querySelectorAll('img.source-brand-icon[alt="Pexels"], img.source-brand-icon[src*="pexels"], img[src*="assets/icons/pexels"], img[src*="icons/pexels"]');
  let pexelsSrc = 'assets/icons/pexels.png';

  // 针对与 Pexels 青绿原色相近的主题（青色 Teal/Ocean、绿色 Green/Emerald、冰川 Glacier、赛博 Cyber），自动选用高对比度白色/深色版图标
  if (themeName === 'teal' || themeName === 'emerald' || themeName === 'green' || themeName === 'ocean' || themeName === 'blue' || themeName === 'glacier' || themeName === 'cyber' || themeName === 'matcha') {
    pexelsSrc = 'assets/icons/pexels_light.png';
  } else if (themeName === 'amber' || themeName === 'sunset' || themeName === 'mocha') {
    pexelsSrc = 'assets/icons/pexels_dark.png';
  } else {
    pexelsSrc = 'assets/icons/pexels.png';
  }

  pexelsIcons.forEach(img => {
    img.src = pexelsSrc;
  });
}

function applyTheme(themeName, isAmoled = false, customColorHex = null) {
  const cleanTheme = (typeof themeName === 'string' ? themeName.trim().toLowerCase() : '') || 'indigo';
  const rawTheme = /^[a-z0-9_-]+$/.test(cleanTheme) ? cleanTheme : 'indigo';
  const canonical = THEME_CANONICAL_MAP[rawTheme] || rawTheme;

  // 1. Cleanly remove all known theme classes
  ALL_KNOWN_THEMES.forEach(t => document.body.classList.remove(`theme-${t}`));

  // 2. Add raw theme class and canonical class (if different)
  document.body.classList.add(`theme-${rawTheme}`);
  if (canonical !== rawTheme) {
    document.body.classList.add(`theme-${canonical}`);
  }
  document.body.classList.toggle('theme-amoled', !!isAmoled);

  // 3. 处理自定义主题取色板与动态 Tokens
  if (rawTheme === 'custom') {
    const colorToApply = customColorHex || localStorage.getItem('wp_custom_theme_color') || appConfig.custom_theme_color || '#8b5cf6';
    generateAndApplyCustomThemeTokens(colorToApply);
    try {
      localStorage.setItem('wp_custom_theme_color', colorToApply);
    } catch (e) {}
    appConfig.custom_theme_color = colorToApply;
  } else {
    // 即使当前是预置主题，也同步保持取色盘预览圆圈展示所保存的颜色
    const savedCustom = customColorHex || localStorage.getItem('wp_custom_theme_color') || appConfig.custom_theme_color || '#8b5cf6';
    const previewCircle = document.getElementById('custom-palette-preview');
    if (previewCircle) {
      previewCircle.style.background = `linear-gradient(135deg, ${savedCustom} 0%, #ec4899 100%)`;
    }
    const indicator = document.getElementById('custom-color-indicator');
    if (indicator) indicator.style.backgroundColor = savedCustom;
    const hexCode = document.getElementById('custom-color-code');
    if (hexCode) hexCode.textContent = (savedCustom || '#8B5CF6').toUpperCase();
  }

  // 4. Update active state on theme chips
  const themePaletteChips = document.querySelectorAll('.theme-palette-chip');
  const hasExactChip = document.querySelector(`.theme-palette-chip[data-theme="${rawTheme}"]`);
  const defaultFallbackChip = CANONICAL_DEFAULT_CHIP[canonical] || canonical;
  themePaletteChips.forEach(chip => {
    const chipTheme = (chip.getAttribute('data-theme') || '').toLowerCase();
    const isActive = hasExactChip ? (chipTheme === rawTheme) : (chipTheme === defaultFallbackChip);
    chip.classList.toggle('active', isActive);
  });

  const checkAmoledMode = document.getElementById('check-amoled-mode');
  if (checkAmoledMode) {
    checkAmoledMode.checked = !!isAmoled;
  }

  // 5. Update contrast-adaptive brand icons
  updateSourceIconsForTheme(rawTheme, isAmoled);

  // 6. Update local state & fast localStorage cache
  appConfig.theme_color = rawTheme;
  appConfig.amoled_mode = !!isAmoled;
  try {
    localStorage.setItem('wp_theme_color', rawTheme);
    localStorage.setItem('wp_amoled_mode', isAmoled ? '1' : '0');
  } catch (e) {}
}

function setupThemeSystem() {
  const savedTheme = localStorage.getItem('wp_theme_color') || appConfig.theme_color || 'indigo';
  const savedAmoled = localStorage.getItem('wp_amoled_mode') === '1' || !!appConfig.amoled_mode;
  const savedCustomColor = localStorage.getItem('wp_custom_theme_color') || appConfig.custom_theme_color || '#8b5cf6';
  appConfig.custom_theme_color = savedCustomColor;

  applyTheme(savedTheme, savedAmoled, savedCustomColor);

  const themePaletteChips = document.querySelectorAll('.theme-palette-chip');
  const checkAmoledMode = document.getElementById('check-amoled-mode');
  const inputCustomColor = document.getElementById('input-custom-theme-color');

  themePaletteChips.forEach(chip => {
    if (!chip.hasAttribute('tabindex')) {
      chip.setAttribute('tabindex', '0');
    }
    if (!chip.hasAttribute('role')) {
      chip.setAttribute('role', 'button');
    }
    const selectThemeHandler = () => {
      const selectedTheme = chip.getAttribute('data-theme') || 'indigo';
      const isAmoled = checkAmoledMode ? checkAmoledMode.checked : false;

      // 若点击自定义胶囊且已激活自定义，直接触发原生调色盘选择弹窗
      if (selectedTheme === 'custom' && appConfig.theme_color === 'custom' && inputCustomColor) {
        inputCustomColor.click();
        return;
      }

      applyTheme(selectedTheme, isAmoled);
      saveConfig();
      const themeLabel = chip.querySelector('.palette-name')?.textContent || selectedTheme;
      showSnackBar(`已切换至 ${themeLabel} 主题`);
    };
    chip.addEventListener('click', selectThemeHandler);
    chip.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectThemeHandler();
      }
    });
  });

  // 绑定取色板实时拖动与选色事件
  if (inputCustomColor) {
    inputCustomColor.addEventListener('input', (e) => {
      const hex = e.target.value;
      const isAmoled = checkAmoledMode ? checkAmoledMode.checked : false;
      applyTheme('custom', isAmoled, hex);
    });

    inputCustomColor.addEventListener('change', (e) => {
      const hex = e.target.value;
      const isAmoled = checkAmoledMode ? checkAmoledMode.checked : false;
      applyTheme('custom', isAmoled, hex);
      saveConfig();
      showSnackBar(`自定义主题色已更新: ${hex.toUpperCase()}`);
    });
  }

  if (checkAmoledMode) {
    checkAmoledMode.addEventListener('change', () => {
      applyTheme(appConfig.theme_color || 'indigo', checkAmoledMode.checked);
      saveConfig();
      showSnackBar(`AMOLED 纯黑模式已${checkAmoledMode.checked ? '开启' : '关闭'}`);
    });
  }
}

// ==========================================================================
// 1.1) Typography & Font Customization Engine (圆润/幼圆/现代/小米几何)
// ==========================================================================

const ALL_VALID_FONTS = ['rounded', 'youyuan', 'fluent', 'misans'];

function applyFontFamily(fontName) {
  const font = ALL_VALID_FONTS.includes(fontName) ? fontName : 'rounded';

  ALL_VALID_FONTS.forEach(f => document.body.classList.remove(`font-${f}`));
  document.body.classList.add(`font-${font}`);

  const fontPresetChips = document.querySelectorAll('.font-preset-chip');
  fontPresetChips.forEach(chip => {
    if (chip.getAttribute('data-font') === font) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });

  appConfig.font_family = font;
  try {
    localStorage.setItem('wp_font_family', font);
  } catch (e) {}
}

function setupFontSystem() {
  const savedFont = localStorage.getItem('wp_font_family') || appConfig.font_family || 'rounded';
  applyFontFamily(savedFont);

  const fontPresetChips = document.querySelectorAll('.font-preset-chip');
  fontPresetChips.forEach(chip => {
    if (!chip.hasAttribute('tabindex')) {
      chip.setAttribute('tabindex', '0');
    }
    if (!chip.hasAttribute('role')) {
      chip.setAttribute('role', 'button');
    }
    const selectFontHandler = () => {
      const selectedFont = chip.getAttribute('data-font') || 'rounded';
      applyFontFamily(selectedFont);
      saveConfig();
      const fontTitle = chip.querySelector('.font-preset-title')?.textContent || selectedFont;
      showSnackBar(`界面字体已切换至 ${fontTitle}`);
    };
    chip.addEventListener('click', selectFontHandler);
    chip.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectFontHandler();
      }
    });
  });
}

// ==========================================================================
// 2) Flutter SnackBar Toast Feedback System
// ==========================================================================
function showSnackBar(msg, isError = false) {
  if (!flutterSnackbar || !snackbarText) return;

  snackbarText.textContent = msg;
  if (isError) {
    flutterSnackbar.style.borderColor = 'rgba(239, 68, 68, 0.4)';
  } else {
    flutterSnackbar.style.borderColor = 'var(--md-sys-color-primary)';
  }

  flutterSnackbar.classList.add('show');

  if (snackbarTimer) clearTimeout(snackbarTimer);
  snackbarTimer = setTimeout(() => {
    flutterSnackbar.classList.remove('show');
  }, 3000);
}

// ==========================================================================
// 3) Navigation & Window Controls
// ==========================================================================
function setupWindowControls() {
  if (btnMinimize) btnMinimize.addEventListener('click', () => invoke('window_minimize'));
  if (btnMaximize) btnMaximize.addEventListener('click', () => invoke('window_toggle_maximize'));
  if (btnClose) btnClose.addEventListener('click', () => invoke('window_close'));
}

function switchTab(tabName) {
  navItems.forEach(item => {
    if (item.getAttribute('data-tab') === tabName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  tabPages.forEach(page => {
    if (page.id === `tab-${tabName}`) {
      page.classList.add('active');
    } else {
      page.classList.remove('active');
    }
  });

  if (tabName === 'history') {
    loadHistory();
  }

  if (tabName === 'explore') {
    setTimeout(checkAndFillViewport, 80);
  }
}

function setupNavigation() {
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabName = item.getAttribute('data-tab');
      switchTab(tabName);
    });
  });

  if (btnGotoExplore) {
    btnGotoExplore.addEventListener('click', () => {
      switchTab('explore');
    });
  }

  if (btnHistoryGotoExplore) {
    btnHistoryGotoExplore.addEventListener('click', () => {
      switchTab('explore');
    });
  }
}

// ==========================================================================
// 4) Details Modal Dialog (渐进式超清原图与真实分辨率)
// ==========================================================================
function openWallpaperDetails(item, type = 'online', imgSrc = '') {
  currentDetailItem = item;
  currentDetailType = type;
  if (item) recordBrowseHistory(item);

  const rawUrl = item ? (item.raw_url || item.url || item.file_path || item.thumb_url) : imgSrc;
  const thumbUrl = item ? (item.thumb_url || imgSrc) : imgSrc;

  // 1. 先用缩略图瞬间占位，避免任何等待
  modalImg.src = thumbUrl || rawUrl;

  // 分辨率展示：若本地壁纸或数据源已知分辨率则立即秒显，否则采用优雅微型骨架屏占位
  const knownRes = (item && item.resolution) ? String(item.resolution).replace('x', ' × ') : null;
  if (modalMetaResolution) {
    if (knownRes) {
      modalMetaResolution.classList.remove('skeleton');
      modalMetaResolution.textContent = knownRes;
    } else {
      modalMetaResolution.textContent = '';
      modalMetaResolution.classList.add('skeleton');
    }
  }

  // 2. 加载真实超高清原图并展示真实 4K/8K 分辨率
  if (rawUrl) {
    const hdImage = new Image();
    hdImage.src = rawUrl;
    hdImage.onload = () => {
      if (detailModal.classList.contains('active') && currentDetailItem === item) {
        modalImg.src = rawUrl;
        if (modalMetaResolution && hdImage.naturalWidth) {
          modalMetaResolution.classList.remove('skeleton');
          modalMetaResolution.textContent = `${hdImage.naturalWidth} × ${hdImage.naturalHeight}`;
        }
      }
    };
    hdImage.onerror = async () => {
      // 遇到防盗链或 CORS 时通过 Rust 端原生引擎直连抓取 Base64 原图
      try {
        const base64 = await invoke('fetch_remote_image_base64', { url: rawUrl });
        if (base64 && detailModal.classList.contains('active') && currentDetailItem === item) {
          modalImg.src = base64;
          if (modalMetaResolution && modalImg.naturalWidth) {
            modalMetaResolution.classList.remove('skeleton');
            modalMetaResolution.textContent = `${modalImg.naturalWidth} × ${modalImg.naturalHeight}`;
          }
        }
      } catch (e) {}
      if (modalMetaResolution && modalMetaResolution.classList.contains('skeleton')) {
        modalMetaResolution.classList.remove('skeleton');
        modalMetaResolution.textContent = knownRes || '4K UHD';
      }
    };
  } else if (!knownRes && modalMetaResolution) {
    modalMetaResolution.classList.remove('skeleton');
    modalMetaResolution.textContent = '4K UHD';
  }

  // 源地址链接 (真实原图下载直链)
  const sourceUrl = rawUrl || '';
  if (modalMetaLinkText) {
    modalMetaLinkText.textContent = sourceUrl || '本地文件';
    modalMetaLinkText.title = sourceUrl;
  }

  if (type === 'local') {
    if (modalBtnDelete) modalBtnDelete.style.display = 'inline-flex';
    if (modalBtnDownload) modalBtnDownload.style.display = 'none';
  } else {
    if (modalBtnDelete) modalBtnDelete.style.display = 'none';
    if (modalBtnDownload) modalBtnDownload.style.display = 'inline-flex';
  }

  detailModal.classList.add('active');
}

function closeWallpaperDetails() {
  detailModal.classList.remove('active');
  currentDetailItem = null;
  if (modalMetaResolution) {
    modalMetaResolution.classList.remove('skeleton');
  }
}

// 打开外部默认浏览器
function openExternalLink(url) {
  if (!url || !url.startsWith('http')) {
    showSnackBar('本地文件路径无需在浏览器中打开');
    return;
  }
  invoke('open_in_browser', { url }).then(() => {
    showSnackBar('已在默认浏览器中打开链接');
  }).catch((err) => {
    showSnackBar(`打开浏览器失败: ${err}`, true);
  });
}

// ==========================================================================
// 4.5) M3 Update Dialog & Online Version Inspector
// ==========================================================================

let currentUpdateInfo = null;

function openUpdateModal(updateInfo) {
  if (!updateModal) return;
  currentUpdateInfo = updateInfo;

  if (updateBadgeCurrent) {
    updateBadgeCurrent.textContent = `当前: v${updateInfo.current_version || '0.1.0'}`;
  }
  if (updateBadgeLatest) {
    updateBadgeLatest.textContent = `最新: v${updateInfo.latest_version}`;
  }
  if (updateModalNotes) {
    const rawNotes = updateInfo.release_notes ? updateInfo.release_notes.trim() : '';
    updateModalNotes.textContent = rawNotes || '暂无详细更新日志。建议升级至最新版本以获得更流畅的体验与最新功能。';
  }

  updateModal.classList.add('active');
}

function closeUpdateModal() {
  if (updateModal) {
    updateModal.classList.remove('active');
  }
}

// ==========================================================================
// 4.6) Generic M3 Confirmation Dialog Controller (二次确认)
// ==========================================================================

let pendingConfirmAction = null;

function openConfirmDialog({ title, message, okText, okDanger = true, onConfirm }) {
  if (!confirmDialogBackdrop) {
    if (typeof onConfirm === 'function') onConfirm();
    return;
  }
  if (confirmDialogTitle && title) confirmDialogTitle.textContent = title;
  if (confirmDialogMessage && message) confirmDialogMessage.textContent = message;
  if (btnConfirmOk && okText) btnConfirmOk.textContent = okText;
  if (btnConfirmOk) {
    if (okDanger) {
      btnConfirmOk.className = 'm3-btn m3-btn-danger';
    } else {
      btnConfirmOk.className = 'm3-btn m3-btn-filled';
    }
  }
  pendingConfirmAction = onConfirm;
  confirmDialogBackdrop.style.display = 'flex';
}

function closeConfirmDialog() {
  if (confirmDialogBackdrop) {
    confirmDialogBackdrop.style.display = 'none';
  }
  pendingConfirmAction = null;
}

async function checkUpdateAction(isManual = true) {
  if (btnCheckUpdate) {
    btnCheckUpdate.disabled = true;
  }
  if (iconUpdateRefresh) {
    iconUpdateRefresh.classList.add('spinning');
  }
  if (btnCheckUpdateText) {
    btnCheckUpdateText.textContent = '检查中...';
  }

  try {
    const info = await invoke('check_app_update');
    if (info && info.current_version && appVersionLabel) {
      appVersionLabel.textContent = `当前版本: v${info.current_version}`;
    }

    if (info && info.has_update) {
      openUpdateModal(info);
      showSnackBar(`发现新版本 v${info.latest_version}`);
    } else if (isManual) {
      showSnackBar(`当前已是最新版本 (v${info?.current_version || '0.1.0'})`);
    }
  } catch (err) {
    console.error('Failed to check for updates:', err);
    if (isManual) {
      showSnackBar(`检查更新失败: ${err}`, true);
    }
  } finally {
    if (btnCheckUpdate) {
      btnCheckUpdate.disabled = false;
    }
    if (iconUpdateRefresh) {
      iconUpdateRefresh.classList.remove('spinning');
    }
    if (btnCheckUpdateText) {
      btnCheckUpdateText.textContent = '检查更新';
    }
  }
}

// ==========================================================================
// 5) Fullscreen Lightbox & Interactive Photo Viewer (全屏放大超清原图)
// ==========================================================================
function openLightbox(imgSrc, item, type = 'online') {
  currentDetailItem = item;
  currentDetailType = type;
  if (item) recordBrowseHistory(item);

  lbZoom = 1.0;
  lbPosX = 0;
  lbPosY = 0;
  updateLightboxTransform();

  const rawUrl = item ? (item.raw_url || item.url || item.file_path || item.thumb_url) : imgSrc;
  const thumbUrl = item ? (item.thumb_url || imgSrc) : imgSrc;

  // 1. 先用缩略图瞬间秒开占位
  lbImage.src = thumbUrl || rawUrl;
  fullscreenLightbox.classList.add('active');

  // 2. 异步加载 Wallhaven / Unsplash / Bing 真实 4K/8K 原图并无缝无感替换为极清大图
  if (rawUrl && rawUrl !== thumbUrl) {
    const hdImg = new Image();
    hdImg.src = rawUrl;
    hdImg.onload = () => {
      if (fullscreenLightbox.classList.contains('active') && currentDetailItem === item) {
        lbImage.src = rawUrl;
      }
    };
    hdImg.onerror = async () => {
      try {
        const base64 = await invoke('fetch_remote_image_base64', { url: rawUrl });
        if (base64 && fullscreenLightbox.classList.contains('active') && currentDetailItem === item) {
          lbImage.src = base64;
        }
      } catch (e) {}
    };
  }
}

function closeLightbox() {
  fullscreenLightbox.classList.remove('active');
  lbZoom = 1.0;
  lbPosX = 0;
  lbPosY = 0;
  updateLightboxTransform();
}

function updateLightboxTransform() {
  if (!lbImage) return;
  lbImage.style.transform = `translate(${lbPosX}px, ${lbPosY}px) scale(${lbZoom})`;
  if (lbZoomLevel) {
    lbZoomLevel.textContent = `${Math.round(lbZoom * 100)}%`;
  }
}

function setupLightboxInteractions() {
  if (!fullscreenLightbox || !lbViewport) return;

  // 鼠标滚轮平滑缩放
  lbViewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const newZoom = Math.min(Math.max(lbZoom * zoomFactor, 0.4), 6.0);
    lbZoom = newZoom;
    if (lbZoom <= 1.0) {
      lbPosX = 0;
      lbPosY = 0;
    }
    updateLightboxTransform();
  }, { passive: false });

  // 鼠标拖拽平移
  lbViewport.addEventListener('mousedown', (e) => {
    if (e.target === lbBtnClose || e.target.closest('.lightbox-floating-toolbar')) return;
    isLbDragging = true;
    lbStartX = e.clientX - lbPosX;
    lbStartY = e.clientY - lbPosY;
    lbViewport.classList.add('dragging');
  });

  window.addEventListener('mousemove', (e) => {
    if (!isLbDragging) return;
    lbPosX = e.clientX - lbStartX;
    lbPosY = e.clientY - lbStartY;
    updateLightboxTransform();
  });

  window.addEventListener('mouseup', () => {
    if (isLbDragging) {
      isLbDragging = false;
      lbViewport.classList.remove('dragging');
    }
  });

  // 双击切换 100% 自适应与 220% 放大
  lbViewport.addEventListener('dblclick', (e) => {
    if (e.target.closest('.lightbox-floating-toolbar')) return;
    if (lbZoom > 1.2) {
      lbZoom = 1.0;
      lbPosX = 0;
      lbPosY = 0;
    } else {
      lbZoom = 2.2;
    }
    updateLightboxTransform();
  });

  // 工具栏按钮
  if (lbBtnZoomIn) {
    lbBtnZoomIn.addEventListener('click', () => {
      lbZoom = Math.min(lbZoom * 1.25, 6.0);
      updateLightboxTransform();
    });
  }

  if (lbBtnZoomOut) {
    lbBtnZoomOut.addEventListener('click', () => {
      lbZoom = Math.max(lbZoom * 0.8, 0.4);
      if (lbZoom <= 1.0) { lbPosX = 0; lbPosY = 0; }
      updateLightboxTransform();
    });
  }

  if (lbBtnReset) {
    lbBtnReset.addEventListener('click', () => {
      lbZoom = 1.0;
      lbPosX = 0;
      lbPosY = 0;
      updateLightboxTransform();
    });
  }

  if (lbBtnApply) {
    lbBtnApply.addEventListener('click', async () => {
      if (!currentDetailItem) return;
      if (currentDetailType === 'local') {
        await setWallpaperAction(currentDetailItem.file_path, currentDetailItem.title);
      } else {
        await downloadAndSetOnlineAction(currentDetailItem);
      }
    });
  }

  if (lbBtnClose) lbBtnClose.addEventListener('click', closeLightbox);

  // 全局键盘快捷键 (Lightbox 与 Modal)
  window.addEventListener('keydown', (e) => {
    // 若当前焦点在输入框/选择框，不触发快捷键
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
      return;
    }

    if (fullscreenLightbox && fullscreenLightbox.classList.contains('active')) {
      switch (e.key) {
        case 'Escape':
          closeLightbox();
          break;
        case '+':
        case '=':
          lbZoom = Math.min(lbZoom * 1.25, 6.0);
          updateLightboxTransform();
          break;
        case '-':
        case '_':
          lbZoom = Math.max(lbZoom * 0.8, 0.4);
          if (lbZoom <= 1.0) { lbPosX = 0; lbPosY = 0; }
          updateLightboxTransform();
          break;
        case '0':
          lbZoom = 1.0;
          lbPosX = 0;
          lbPosY = 0;
          updateLightboxTransform();
          break;
        case 'ArrowLeft':
          lbPosX += 40;
          updateLightboxTransform();
          break;
        case 'ArrowRight':
          lbPosX -= 40;
          updateLightboxTransform();
          break;
        case 'ArrowUp':
          lbPosY += 40;
          updateLightboxTransform();
          break;
        case 'ArrowDown':
          lbPosY -= 40;
          updateLightboxTransform();
          break;
      }
    } else if (confirmDialogBackdrop && confirmDialogBackdrop.style.display === 'flex') {
      if (e.key === 'Escape') {
        closeConfirmDialog();
      } else if (e.key === 'Enter') {
        if (typeof pendingConfirmAction === 'function') {
          pendingConfirmAction();
        }
        closeConfirmDialog();
      }
    } else if (detailModal && detailModal.classList.contains('active')) {
      if (e.key === 'Escape') {
        closeWallpaperDetails();
      }
    } else if (updateModal && updateModal.classList.contains('active')) {
      if (e.key === 'Escape') {
        closeUpdateModal();
      }
    } else if (isBatchMode && e.key === 'Escape') {
      toggleBatchMode(false);
    }
  });
}

function setupRandomSourceChips() {
  const chips = document.querySelectorAll('#random-source-chip-grid .source-chip-item');
  if (!chips.length) return;

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const val = chip.getAttribute('data-source') || 'all';
      appConfig.random_source = val;
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      saveConfig();
      showSnackBar(`随机图源已设置为: ${chip.querySelector('span:last-child')?.textContent || val}`);
    });
  });
}

function updateRandomSourceChipsUI(val) {
  const chips = document.querySelectorAll('#random-source-chip-grid .source-chip-item');
  if (!chips.length) return;

  chips.forEach(chip => {
    if (chip.getAttribute('data-source') === val) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });
}

// ==========================================================================
// 6) Config Management
// ==========================================================================
async function loadConfig() {
  try {
    const res = await invoke('get_config');
    if (res) {
      appConfig = { ...appConfig, ...res };
      updateConfigUI();
    }
  } catch (err) {
    console.error('Failed to load config:', err);
  }
}

function updateConfigUI() {
  updateRandomSourceChipsUI(appConfig.random_source || 'all');
  if (inputConfigQuery) inputConfigQuery.value = appConfig.query || '';
  if (inputOnlineQuery) inputOnlineQuery.value = appConfig.query || '';
  if (selectConfigCardratio) selectConfigCardratio.value = appConfig.card_ratio || 'uniform';
  if (inputConfigUnsplashKey) inputConfigUnsplashKey.value = appConfig.unsplash_access_key || '';
  if (inputConfigPexelsKey) inputConfigPexelsKey.value = appConfig.pexels_api_key || '';
  if (labelCacheDir) labelCacheDir.textContent = appConfig.cache_dir || 'cache/wallpapers';
  if (inputConfigInterval) inputConfigInterval.value = appConfig.auto_update_interval_minutes || 60;
  if (checkConfigAutoupdate) checkConfigAutoupdate.checked = !!appConfig.auto_update_enabled;

  // Seamlessly synchronize Theme and Font from backend AppConfig
  if (appConfig.theme_color) {
    applyTheme(appConfig.theme_color, !!appConfig.amoled_mode, appConfig.custom_theme_color);
  }
  if (appConfig.font_family) {
    applyFontFamily(appConfig.font_family);
  }

  // Synchronize Language
  if (appConfig.language && typeof setLanguage === 'function') {
    setLanguage(appConfig.language);
  }
  if (selectConfigLanguage && appConfig.language) {
    selectConfigLanguage.value = appConfig.language;
  }

  if (checkAutoLaunch) {
    invoke('get_auto_launch_enabled').then(enabled => {
      checkAutoLaunch.checked = !!enabled;
    }).catch(err => {
      console.warn('Failed to get auto launch status:', err);
    });
  }

  applyDisplaySettings();
}

function applyDisplaySettings() {
  const isUniform = (appConfig.card_ratio !== 'original');
  if (galleryGrid) {
    galleryGrid.classList.toggle('ratio-uniform', isUniform);
    galleryGrid.classList.toggle('ratio-original', !isUniform);
  }
  if (onlineGrid) {
    onlineGrid.classList.toggle('ratio-uniform', isUniform);
    onlineGrid.classList.toggle('ratio-original', !isUniform);
  }
  if (historyGrid) {
    historyGrid.classList.toggle('ratio-uniform', isUniform);
    historyGrid.classList.toggle('ratio-original', !isUniform);
  }

  if (infiniteLoader) infiniteLoader.style.display = 'none'; // 仅在滚动触发拉取时按需显示
  setTimeout(checkAndFillViewport, 80);
}

function renderSkeletonGrid(container, count = 8) {
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const card = document.createElement('div');
    card.className = 'm3-wallpaper-card';
    const wrapper = document.createElement('div');
    wrapper.className = 'm3-card-img-wrapper skeleton';
    card.appendChild(wrapper);
    container.appendChild(card);
  }
}

async function saveConfig() {
  try {
    appConfig.random_source = selectConfigRandomSource ? selectConfigRandomSource.value : (appConfig.random_source || "all");
    appConfig.query = inputConfigQuery ? inputConfigQuery.value.trim() : "";
    appConfig.load_mode = "infinite";
    appConfig.card_ratio = selectConfigCardratio ? selectConfigCardratio.value : "uniform";
    appConfig.theme_color = appConfig.theme_color || "indigo";
    appConfig.custom_theme_color = appConfig.custom_theme_color || localStorage.getItem('wp_custom_theme_color') || "#8b5cf6";
    appConfig.amoled_mode = !!appConfig.amoled_mode;
    appConfig.font_family = appConfig.font_family || "rounded";
    appConfig.unsplash_access_key = inputConfigUnsplashKey ? inputConfigUnsplashKey.value.trim() : (appConfig.unsplash_access_key || "");
    appConfig.pexels_api_key = inputConfigPexelsKey ? inputConfigPexelsKey.value.trim() : (appConfig.pexels_api_key || "");
    appConfig.auto_update_interval_minutes = inputConfigInterval ? parseInt(inputConfigInterval.value) || 60 : 60;
    appConfig.auto_update_enabled = checkConfigAutoupdate ? checkConfigAutoupdate.checked : false;

    await invoke('save_config', { config: appConfig });
    applyDisplaySettings();
  } catch (err) {
    showSnackBar(`保存设置失败: ${err}`, true);
  }
}

async function pickCacheDir() {
  try {
    const selected = await invoke('select_cache_dir');
    if (selected) {
      appConfig.cache_dir = selected;
      if (labelCacheDir) labelCacheDir.textContent = selected;
      await invoke('save_config', { config: appConfig });
      showSnackBar(`壁纸存储路径已更新`);
      await loadWallpapers();
    }
  } catch (err) {
    showSnackBar(`选择路径失败: ${err}`, true);
  }
}

// ==========================================================================
// 7) Local Gallery Rendering & Actions (支持批量选择、二次确认与全屏预览)
// ==========================================================================
async function renderGallery(items) {
  cachedWallpapers = Array.isArray(items) ? items : [];
  galleryGrid.innerHTML = '';

  if (galleryCountBadge) {
    galleryCountBadge.textContent = `${cachedWallpapers.length} 张`;
  }

  if (cachedWallpapers.length === 0) {
    galleryEmptyState.style.display = 'flex';
    galleryGrid.style.display = 'none';
    toggleBatchMode(false);
    return;
  }

  galleryEmptyState.style.display = 'none';
  galleryGrid.style.display = 'grid';

  for (const item of cachedWallpapers) {
    const card = document.createElement('div');
    card.className = 'm3-wallpaper-card';
    card.setAttribute('data-filepath', item.file_path);

    if (isBatchMode) {
      card.classList.add('batch-mode');
      const cb = document.createElement('div');
      cb.className = 'gallery-card-checkbox';
      cb.innerHTML = '<svg viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12"/></svg>';
      card.appendChild(cb);
      if (selectedWallpapers.has(item.file_path)) {
        card.classList.add('batch-selected');
      }
    }

    const imgWrapper = document.createElement('div');
    imgWrapper.className = 'm3-card-img-wrapper skeleton';

    let imgSrc = '';
    try {
      imgSrc = await invoke('read_file_data_url', { filePath: item.file_path });
    } catch (e) {
      console.warn('Failed to read image data url:', e);
    }
    if (!imgSrc) imgSrc = item.file_path;

    const img = document.createElement('img');
    img.className = 'm3-card-img';
    img.alt = 'Wallpaper';
    img.src = imgSrc;

    img.onload = () => {
      imgWrapper.classList.remove('skeleton');
      img.classList.add('loaded');
    };
    if (img.complete) {
      imgWrapper.classList.remove('skeleton');
      img.classList.add('loaded');
    }

    // Hover Action Buttons
    const actions = document.createElement('div');
    actions.className = 'm3-card-actions';

    const btnApply = document.createElement('button');
    btnApply.className = 'm3-action-icon-btn';
    btnApply.title = typeof t === 'function' ? t('action_set_wallpaper') : '设为桌面壁纸';
    btnApply.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
    btnApply.addEventListener('click', async (e) => {
      e.stopPropagation();
      await setWallpaperAction(item.file_path, item.title);
    });

    const btnDelete = document.createElement('button');
    btnDelete.className = 'm3-action-icon-btn';
    btnDelete.title = typeof t === 'function' ? t('action_delete_wallpaper') : '删除此壁纸';
    btnDelete.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
    btnDelete.addEventListener('click', (e) => {
      e.stopPropagation();
      const confirmTitle = typeof t === 'function' ? t('confirm_delete_single_title') : '确认删除壁纸？';
      const confirmMsg = typeof t === 'function' ? t('confirm_delete_single_msg') : '确定要从本地永久删除这张壁纸吗？此操作不可恢复。';
      const deleteText = typeof t === 'function' ? t('confirm_dialog_delete') : '删除';
      openConfirmDialog({
        title: confirmTitle,
        message: confirmMsg,
        okText: deleteText,
        okDanger: true,
        onConfirm: async () => {
          try {
            await invoke('delete_wallpaper', { filePath: item.file_path });
            showSnackBar(typeof t === 'function' ? t('toast_delete_success') : '已删除壁纸');
            await loadWallpapers();
          } catch (err) {
            showSnackBar(`删除壁纸失败: ${err}`, true);
          }
        }
      });
    });

    actions.appendChild(btnApply);
    actions.appendChild(btnDelete);

    imgWrapper.appendChild(img);
    card.appendChild(imgWrapper);
    card.appendChild(actions);

    card.addEventListener('click', () => {
      if (isBatchMode) {
        toggleCardSelection(item.file_path);
      } else {
        openLightbox(imgSrc, item, 'local');
      }
    });

    galleryGrid.appendChild(card);
  }

  updateBatchUI();
}

// ==========================================================================
// 7.1) Local Gallery Batch Management Engine (批量选择与批量删除)
// ==========================================================================

let isBatchMode = false;
const selectedWallpapers = new Set();

function toggleBatchMode(force = null) {
  isBatchMode = force !== null ? force : !isBatchMode;
  if (!isBatchMode) {
    selectedWallpapers.clear();
  }
  if (galleryBatchToolbar) {
    galleryBatchToolbar.style.display = isBatchMode ? 'flex' : 'none';
  }
  if (btnGalleryBatchToggleText) {
    btnGalleryBatchToggleText.textContent = isBatchMode
      ? (typeof t === 'function' ? t('gallery_batch_exit') : '退出管理')
      : (typeof t === 'function' ? t('gallery_batch_btn') : '批量管理');
  }
  updateBatchUI();
}

function updateBatchUI() {
  if (!galleryGrid) return;
  const cards = galleryGrid.querySelectorAll('.m3-wallpaper-card');
  cards.forEach(card => {
    const filePath = card.getAttribute('data-filepath');
    if (isBatchMode) {
      card.classList.add('batch-mode');
      let cb = card.querySelector('.gallery-card-checkbox');
      if (!cb) {
        cb = document.createElement('div');
        cb.className = 'gallery-card-checkbox';
        cb.innerHTML = '<svg viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12"/></svg>';
        card.appendChild(cb);
      }
      if (selectedWallpapers.has(filePath)) {
        card.classList.add('batch-selected');
      } else {
        card.classList.remove('batch-selected');
      }
    } else {
      card.classList.remove('batch-mode', 'batch-selected');
      const cb = card.querySelector('.gallery-card-checkbox');
      if (cb) cb.remove();
    }
  });

  const count = selectedWallpapers.size;
  if (batchSelectedBadge) {
    batchSelectedBadge.textContent = typeof t === 'function'
      ? t('gallery_selected_count', { count })
      : `已选择 ${count} 项`;
  }
  if (btnBatchDelete) {
    btnBatchDelete.disabled = count === 0;
  }
  if (checkBatchSelectAll) {
    checkBatchSelectAll.checked = cachedWallpapers.length > 0 && count === cachedWallpapers.length;
    checkBatchSelectAll.indeterminate = count > 0 && count < cachedWallpapers.length;
  }
}

function toggleCardSelection(filePath) {
  if (selectedWallpapers.has(filePath)) {
    selectedWallpapers.delete(filePath);
  } else {
    selectedWallpapers.add(filePath);
  }
  updateBatchUI();
}

function selectAllBatch(selectAll) {
  if (selectAll) {
    cachedWallpapers.forEach(item => {
      if (item && item.file_path) {
        selectedWallpapers.add(item.file_path);
      }
    });
  } else {
    selectedWallpapers.clear();
  }
  updateBatchUI();
}

function executeBatchDelete() {
  const count = selectedWallpapers.size;
  if (count === 0) {
    showSnackBar(typeof t === 'function' ? t('toast_select_at_least_one') : '请先选择需要删除的壁纸', true);
    return;
  }

  const title = typeof t === 'function' ? t('confirm_delete_batch_title') : '确认批量删除壁纸？';
  const msg = typeof t === 'function'
    ? t('confirm_delete_batch_msg', { count })
    : `确定要从本地永久删除选中的 ${count} 张壁纸吗？此操作不可恢复。`;
  const delBtnText = typeof t === 'function' ? t('confirm_dialog_delete') : '删除';

  openConfirmDialog({
    title,
    message: msg,
    okText: `${delBtnText} (${count})`,
    okDanger: true,
    onConfirm: async () => {
      try {
        const filePaths = Array.from(selectedWallpapers);
        await invoke('delete_wallpapers_batch', { filePaths });
        showSnackBar(typeof t === 'function' ? t('toast_batch_delete_success', { count }) : `已成功批量删除 ${count} 张本地壁纸`);
        toggleBatchMode(false);
        await loadWallpapers();
      } catch (err) {
        showSnackBar(`批量删除失败: ${err}`, true);
      }
    }
  });
}

async function loadWallpapers() {
  try {
    const items = await invoke('get_cached_wallpapers');
    await renderGallery(items);
  } catch (err) {
    showSnackBar(`获取本地壁纸失败: ${err}`, true);
    renderGallery([]);
  }
}

async function setWallpaperAction(filePath, title) {
  try {
    showSnackBar(`正在应用壁纸...`);
    await invoke('set_desktop_wallpaper', { pathStr: filePath });
    showSnackBar(`已成功设为 Windows 桌面壁纸！`);
  } catch (err) {
    showSnackBar(`设置壁纸失败: ${err}`, true);
  }
}

async function downloadOnlyAction(item) {
  try {
    showSnackBar(`正在保存壁纸...`);
    await invoke('download_and_set_online_wallpaper', { item });
    showSnackBar(`壁纸已成功保存到本地图库！`);
    await loadWallpapers();
  } catch (err) {
    showSnackBar(`保存壁纸失败: ${err}`, true);
  }
}

async function downloadAndSetOnlineAction(item) {
  try {
    showSnackBar(`正在下载并应用壁纸...`);
    await invoke('download_and_set_online_wallpaper', { item });
    showSnackBar(`已成功下载并设为桌面壁纸！`);
    await loadWallpapers();
  } catch (err) {
    showSnackBar(`应用壁纸失败: ${err}`, true);
  }
}

// ==========================================================================
// 7.2) Browsing History Engine (浏览记录持久化与渲染引擎)
// ==========================================================================

async function recordBrowseHistory(item) {
  if (!item) return;
  try {
    const rawUrl = item.raw_url || item.url || item.file_path || item.thumb_url || '';
    const thumbUrl = item.thumb_url || item.thumbnail_url || item.file_path || rawUrl || '';
    const histItem = {
      id: String(item.id || item.file_path || rawUrl || Date.now()),
      title: String(item.title || item.name || 'Wallpaper'),
      thumb_url: String(thumbUrl),
      raw_url: String(rawUrl),
      source: String(item.source || currentSource || 'online'),
      viewed_at: Math.floor(Date.now() / 1000)
    };
    await invoke('record_browse_history', { item: histItem });
  } catch (err) {
    console.warn('Failed to record browse history:', err);
  }
}

async function loadHistory() {
  if (!historyGrid) return;
  try {
    const items = await invoke('get_browse_history');
    renderHistory(items || []);
  } catch (err) {
    console.error('Failed to load browse history:', err);
    renderHistory([]);
  }
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  const d = new Date(timestamp * 1000);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hours}:${mins}`;
}

function renderHistory(items) {
  if (!historyGrid) return;

  if (historyCountBadge) {
    historyCountBadge.textContent = typeof t === 'function' ? t('history_count', { count: items.length }) : `${items.length} 张`;
  }

  if (!items || items.length === 0) {
    if (historyEmptyState) historyEmptyState.style.display = 'flex';
    historyGrid.style.display = 'none';
    historyGrid.innerHTML = '';
    return;
  }

  if (historyEmptyState) historyEmptyState.style.display = 'none';
  historyGrid.style.display = 'grid';
  historyGrid.innerHTML = '';

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'm3-wallpaper-card history-card';

    const imgWrapper = document.createElement('div');
    imgWrapper.className = 'm3-card-img-wrapper skeleton';

    const img = document.createElement('img');
    img.className = 'm3-card-img';
    img.alt = item.title || 'Wallpaper';
    img.loading = 'lazy';

    const imgSrc = item.thumb_url || item.raw_url;
    if (imgSrc.startsWith('http://') || imgSrc.startsWith('https://') || imgSrc.startsWith('data:')) {
      img.src = imgSrc;
    } else {
      invoke('read_file_data_url', { filePath: imgSrc }).then(dataUrl => {
        if (dataUrl) img.src = dataUrl;
        else img.src = imgSrc;
      }).catch(() => {
        img.src = imgSrc;
      });
    }

    img.onload = () => {
      imgWrapper.classList.remove('skeleton');
      img.classList.add('loaded');
    };
    if (img.complete) {
      imgWrapper.classList.remove('skeleton');
      img.classList.add('loaded');
    }

    // Hover Action Buttons
    const actions = document.createElement('div');
    actions.className = 'm3-card-actions';

    const btnApply = document.createElement('button');
    btnApply.className = 'm3-action-icon-btn';
    btnApply.title = typeof t === 'function' ? t('action_set_wallpaper') : '设为桌面壁纸';
    btnApply.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
    btnApply.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (item.raw_url && (item.raw_url.startsWith('http://') || item.raw_url.startsWith('https://'))) {
        await downloadAndSetOnlineAction(item);
      } else {
        await setWallpaperAction(item.raw_url || item.thumb_url, item.title);
      }
    });
    actions.appendChild(btnApply);

    if (item.raw_url && (item.raw_url.startsWith('http://') || item.raw_url.startsWith('https://'))) {
      const btnDownload = document.createElement('button');
      btnDownload.className = 'm3-action-icon-btn';
      btnDownload.title = typeof t === 'function' ? t('modal_btn_download') : '保存到本地';
      btnDownload.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
      btnDownload.addEventListener('click', async (e) => {
        e.stopPropagation();
        await downloadOnlyAction(item);
      });
      actions.appendChild(btnDownload);
    }

    // Single item delete from history button
    const btnDelete = document.createElement('button');
    btnDelete.className = 'm3-action-icon-btn action-delete-history';
    btnDelete.title = typeof t === 'function' ? t('history_delete_item') : '从记录中移除';
    btnDelete.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>';
    btnDelete.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await invoke('delete_browse_history_item', { id: item.id || item.raw_url });
        card.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
        card.style.opacity = '0';
        card.style.transform = 'scale(0.85)';
        setTimeout(() => {
          if (card.parentNode) card.parentNode.removeChild(card);
          const remaining = historyGrid.querySelectorAll('.history-card').length;
          if (historyCountBadge) {
            historyCountBadge.textContent = typeof t === 'function' ? t('history_count', { count: remaining }) : `${remaining} 张`;
          }
          if (remaining === 0) {
            if (historyEmptyState) historyEmptyState.style.display = 'flex';
            historyGrid.style.display = 'none';
          }
        }, 250);
        showSnackBar(typeof t === 'function' ? t('toast_history_item_deleted') : '已从浏览记录移除');
      } catch (err) {
        showSnackBar(String(err), true);
      }
    });
    actions.appendChild(btnDelete);

    imgWrapper.appendChild(img);
    imgWrapper.appendChild(actions);

    // Card Info Footer
    const infoBar = document.createElement('div');
    infoBar.className = 'history-card-info';

    const titleEl = document.createElement('div');
    titleEl.className = 'history-card-title';
    const displayTitle = item.title || item.name || 'Wallpaper';
    titleEl.textContent = displayTitle;
    titleEl.title = displayTitle;

    const metaEl = document.createElement('div');
    metaEl.className = 'history-card-meta';

    const sourceTag = document.createElement('span');
    const srcKey = (item.source || 'online').toLowerCase();
    sourceTag.className = `history-source-tag source-${srcKey}`;
    const sourceLabels = {
      bing: 'Bing',
      pexels: 'Pexels',
      unsplash: 'Unsplash',
      wallhaven: 'Wallhaven',
      local: 'Local'
    };
    sourceTag.textContent = sourceLabels[srcKey] || (item.source || 'Online');

    const timeTag = document.createElement('span');
    timeTag.className = 'history-time-tag';
    timeTag.textContent = formatRelativeTime(item.viewed_at);

    metaEl.appendChild(sourceTag);
    metaEl.appendChild(timeTag);

    infoBar.appendChild(titleEl);
    infoBar.appendChild(metaEl);

    card.appendChild(imgWrapper);
    card.appendChild(infoBar);

    card.addEventListener('click', () => {
      if (item.raw_url && (item.raw_url.startsWith('http://') || item.raw_url.startsWith('https://'))) {
        openWallpaperDetails(item, 'online', item.raw_url || item.thumb_url);
      } else {
        openLightbox(imgSrc, item, 'local');
      }
    });

    historyGrid.appendChild(card);
  });
}

// ==========================================================================
// 8) 智能随机换一张
// ==========================================================================
async function handleQuickRandom() {
  const selectedSource = appConfig.random_source || (selectConfigRandomSource ? selectConfigRandomSource.value : 'all');

  showSnackBar('正在随机挑选精美壁纸...');

  try {
    if (selectedSource === 'local') {
      if (cachedWallpapers.length > 0) {
        const randomItem = cachedWallpapers[Math.floor(Math.random() * cachedWallpapers.length)];
        await setWallpaperAction(randomItem.file_path, randomItem.title);
      } else {
        showSnackBar('本地图库暂无壁纸，请前往发现壁纸下载', true);
      }
      return;
    }

    if (selectedSource !== 'all') {
      const randomPage = (selectedSource === 'bing') ? 1 : (Math.floor(Math.random() * 4) + 1);
      const list = await invoke('fetch_online_wallpapers', {
        source: selectedSource,
        query: appConfig.query || '',
        page: randomPage,
        limit: 12,
      });

      if (Array.isArray(list) && list.length > 0) {
        // 随机重试保护机制：最多尝试 3 个不同候选，确保 100% 成功设为壁纸
        let applied = false;
        const shuffled = [...list].sort(() => Math.random() - 0.5);
        for (let i = 0; i < Math.min(3, shuffled.length); i++) {
          try {
            await downloadAndSetOnlineAction(shuffled[i]);
            applied = true;
            break;
          } catch (e) {
            console.warn('Random wallpaper candidate failed, trying next:', e);
          }
        }
        if (!applied) {
          showSnackBar(`壁纸下载应用遇到网络波动，请重试`, true);
        }
      } else {
        showSnackBar(`未能在图库中获取到随机壁纸`, true);
      }
      return;
    }

    // 全部图源 (混合随机)
    const onlineSources = ['pexels', 'bing', 'unsplash', 'wallhaven'];
    const pickOnlineSource = onlineSources[Math.floor(Math.random() * onlineSources.length)];
    const randomPage = (pickOnlineSource === 'bing') ? 1 : (Math.floor(Math.random() * 4) + 1);

    if (cachedWallpapers.length > 0 && Math.random() < 0.3) {
      const randomLocal = cachedWallpapers[Math.floor(Math.random() * cachedWallpapers.length)];
      await setWallpaperAction(randomLocal.file_path, randomLocal.title);
      return;
    }

    const list = await invoke('fetch_online_wallpapers', {
      source: pickOnlineSource,
      query: appConfig.query || '',
      page: randomPage,
      limit: 12,
    });

    if (Array.isArray(list) && list.length > 0) {
      let applied = false;
      const shuffled = [...list].sort(() => Math.random() - 0.5);
      for (let i = 0; i < Math.min(3, shuffled.length); i++) {
        try {
          await downloadAndSetOnlineAction(shuffled[i]);
          applied = true;
          break;
        } catch (e) {
          console.warn('Random wallpaper candidate failed, trying next:', e);
        }
      }
      if (!applied && cachedWallpapers.length > 0) {
        const randomLocal = cachedWallpapers[Math.floor(Math.random() * cachedWallpapers.length)];
        await setWallpaperAction(randomLocal.file_path, randomLocal.title);
      }
    } else if (cachedWallpapers.length > 0) {
      const randomLocal = cachedWallpapers[Math.floor(Math.random() * cachedWallpapers.length)];
      await setWallpaperAction(randomLocal.file_path, randomLocal.title);
    } else {
      showSnackBar('随机抓取壁纸失败，请检查网络连接', true);
    }

  } catch (err) {
    console.error('Failed to quick random:', err);
    showSnackBar(`随机换壁纸失败: ${err}`, true);
  }
}

// ==========================================================================
// 9) Online Wallpapers Exploration (带 URL 去重与防止重复)
// ==========================================================================
function renderOnlineGrid(items, append = false) {
  const newItems = Array.isArray(items) ? items : [];
  
  if (!append) {
    onlineWallpapers = [];
    seenOnlineUrls.clear();
    onlineGrid.innerHTML = '';
  }

  // 严格基于 URL 和 ID 进行去重过滤
  const uniqueItems = [];
  for (const item of newItems) {
    const key = item.raw_url || item.thumb_url || item.id;
    if (!seenOnlineUrls.has(key)) {
      seenOnlineUrls.add(key);
      uniqueItems.push(item);
    }
  }

  // 追加模式下，经过去重后没有任何新壁纸，说明图源已无更多壁纸，立即停止无限加载与翻页
  if (append && uniqueItems.length === 0) {
    hasMoreOnline = false;
    if (infiniteLoader) infiniteLoader.style.display = 'none';
    return 0;
  }

  if (uniqueItems.length === 0 && !append) {
    hasMoreOnline = false;
    if (infiniteLoader) infiniteLoader.style.display = 'none';
    onlineGrid.innerHTML = `
      <div class="flutter-empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h2 class="empty-title">未发现在线壁纸</h2>
      </div>
    `;
    return 0;
  }

  onlineWallpapers = onlineWallpapers.concat(uniqueItems);

  uniqueItems.forEach(item => {
    const card = document.createElement('div');
    card.className = 'm3-wallpaper-card';

    const imgWrapper = document.createElement('div');
    imgWrapper.className = 'm3-card-img-wrapper skeleton';

    const img = document.createElement('img');
    img.className = 'm3-card-img';
    img.alt = 'Wallpaper';
    img.src = item.thumb_url;

    img.onload = () => {
      imgWrapper.classList.remove('skeleton');
      img.classList.add('loaded');
    };
    if (img.complete) {
      imgWrapper.classList.remove('skeleton');
      img.classList.add('loaded');
    }

    img.onerror = async () => {
      try {
        const base64Data = await invoke('fetch_remote_image_base64', { url: item.thumb_url });
        if (base64Data) {
          img.src = base64Data;
        } else {
          // 遇到无法访问的坏图直接静默从界面和数据集中过滤剔除
          card.remove();
          onlineWallpapers = onlineWallpapers.filter(w => w.id !== item.id);
        }
      } catch (e) {
        card.remove();
        onlineWallpapers = onlineWallpapers.filter(w => w.id !== item.id);
      }
    };

    // Hover Quick Action Buttons (去除多余的全屏缩放按钮，点击图片即可查看)
    const actions = document.createElement('div');
    actions.className = 'm3-card-actions';

    const btnApply = document.createElement('button');
    btnApply.className = 'm3-action-icon-btn';
    btnApply.title = '一键设为桌面壁纸';
    btnApply.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
    btnApply.addEventListener('click', async (e) => {
      e.stopPropagation();
      await downloadAndSetOnlineAction(item);
    });

    const btnDownload = document.createElement('button');
    btnDownload.className = 'm3-action-icon-btn';
    btnDownload.title = '保存到本地';
    btnDownload.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
    btnDownload.addEventListener('click', async (e) => {
      e.stopPropagation();
      await downloadOnlyAction(item);
    });

    actions.appendChild(btnApply);
    actions.appendChild(btnDownload);

    imgWrapper.appendChild(img);
    card.appendChild(imgWrapper);
    card.appendChild(actions);

    card.addEventListener('click', () => {
      openWallpaperDetails(item, 'online', item.raw_url || item.thumb_url);
    });

    onlineGrid.appendChild(card);
  });
  return uniqueItems.length;
}

let onlineRequestId = 0;
let currentBingMarket = 'zh-CN';
let currentUnsplashTag = 'wallpaper';
let currentWallhavenCat = '111';
let currentWallhavenSort = 'views';
let currentWallhavenRatio = '16x9,16x10';

function generateRandomSeed() {
  return Math.random().toString(36).substring(2, 8);
}

const wallhavenSearchState = {
  keyword: '',
  category: '111',
  sort: 'views',
  timeRange: '1M',
  aspectRatio: '16x9,16x10',
  randomSeed: generateRandomSeed(),
};

function renderUnsplashKeyPrompt() {
  if (!onlineGrid) return;
  onlineGrid.innerHTML = `
    <div class="unsplash-prompt-card">
      <img src="assets/icons/unsplash.png" class="unsplash-prompt-icon" alt="Unsplash" />
      <h2 class="unsplash-prompt-title">需要配置 Unsplash Access Key</h2>
      <p class="unsplash-prompt-desc">
        Unsplash 官方 API 政策规定必须填入合法有效的 Access Key 才能加载与搜索摄影大图。<br />
        请前往【软件设置】填入您的 Access Key，即可畅享全球顶尖摄影壁纸！
      </p>
      <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; margin-top: 6px;">
        <button class="m3-btn m3-btn-primary" id="btn-goto-unsplash-key">
          <span>前往设置填写 Key</span>
        </button>
        <button class="m3-btn m3-btn-tonal" id="btn-open-unsplash-dev">
          <span>获取免费 Access Key ↗</span>
        </button>
      </div>
    </div>
  `;

  const btnGoto = document.getElementById('btn-goto-unsplash-key');
  if (btnGoto) {
    btnGoto.addEventListener('click', () => {
      navItems.forEach(n => {
        if (n.getAttribute('data-tab') === 'tab-settings') n.click();
      });
      setTimeout(() => {
        if (inputConfigUnsplashKey) {
          inputConfigUnsplashKey.focus();
          inputConfigUnsplashKey.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 200);
    });
  }

  const btnDev = document.getElementById('btn-open-unsplash-dev');
  if (btnDev) {
    btnDev.addEventListener('click', () => {
      openExternalLink('https://unsplash.com/developers');
    });
  }
}

async function loadOnlineWallpapers(append = false) {
  if (isOnlineLoading) return;

  // Unsplash 专属未配置 Key 友好拦截与引导
  if (currentSource === 'unsplash' && (!appConfig.unsplash_access_key || !appConfig.unsplash_access_key.trim())) {
    renderUnsplashKeyPrompt();
    return;
  }

  isOnlineLoading = true;
  const thisRequestId = ++onlineRequestId;

  // 严格根据各官网参数规范组织专属查询参数
  let query = '';
  if (currentSource === 'pexels') {
    const inputEl = document.getElementById('input-pexels-query');
    const inputVal = inputEl ? inputEl.value.trim() : '';
    query = inputVal || currentPexelsTag || 'curated';
  } else if (currentSource === 'bing') {
    query = currentBingMarket;
  } else if (currentSource === 'unsplash') {
    const inputEl = document.getElementById('input-unsplash-query');
    const inputVal = inputEl ? inputEl.value.trim() : '';
    query = inputVal || currentUnsplashTag || 'wallpaper';
  } else if (currentSource === 'wallhaven') {
    const inputEl = document.getElementById('input-wallhaven-query');
    const inputVal = inputEl ? inputEl.value.trim() : '';
    wallhavenSearchState.keyword = inputVal;
    query = `${wallhavenSearchState.keyword}|${wallhavenSearchState.category}|${wallhavenSearchState.sort}|${wallhavenSearchState.aspectRatio}|${wallhavenSearchState.timeRange}|${wallhavenSearchState.randomSeed}`;
  }

  try {
    if (!append) {
      renderSkeletonGrid(onlineGrid, 8);
      if (infiniteLoader) infiniteLoader.style.display = 'none';
    } else {
      if (infiniteLoader) infiniteLoader.style.display = 'flex';
    }

    const list = await invoke('fetch_online_wallpapers', {
      source: currentSource,
      query,
      page: onlinePage,
      limit: pageLimit,
    });

    if (thisRequestId !== onlineRequestId) {
      return;
    }

    const safeList = Array.isArray(list) ? list : [];
    if (safeList.length === 0) {
      hasMoreOnline = false;
    }
    
    if (currentSource === 'bing') {
      console.log(`[Bing] market=${currentBingMarket}, page=${onlinePage}, returned=${safeList.length}`);
    }

    const addedCount = renderOnlineGrid(safeList, append);
    if (append && addedCount === 0) {
      hasMoreOnline = false;
    }
  } catch (err) {
    if (thisRequestId !== onlineRequestId) return;
    console.error('Failed to load online wallpapers:', err);
    if (String(err).includes('UNSPLASH_KEY')) {
      renderUnsplashKeyPrompt();
    } else {
      showSnackBar(`壁纸加载失败: ${err}`, true);
      if (!append) renderOnlineGrid([]);
    }
  } finally {
    if (thisRequestId === onlineRequestId) {
      isOnlineLoading = false;
      isInfiniteLoading = false;
      if (infiniteLoader) infiniteLoader.style.display = 'none';

      // 大屏或高分屏自适应填满：若视口未被撑开导致无法产生滚动条，自动加载下一批填满视口
      if (hasMoreOnline) {
        setTimeout(checkAndFillViewport, 80);
      }
    }
  }
}

function checkAndFillViewport() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  if (!hasMoreOnline || isOnlineLoading || isInfiniteLoading) return;
  if (!mainScrollEl) return;

  const exploreTab = document.getElementById('tab-explore');
  if (!exploreTab || !exploreTab.classList.contains('active')) return;

  // 仅在真实渲染且内容不足以撑开视口滚动条时自动继续加载下一页填充
  if (mainScrollEl.clientHeight > 0 && mainScrollEl.scrollHeight <= mainScrollEl.clientHeight + 120) {
    isInfiniteLoading = true;
    onlinePage++;
    loadOnlineWallpapers(true);
  }
}

function setupInfiniteScroll() {
  if (!mainScrollEl) return;

  mainScrollEl.addEventListener('scroll', () => {
    if (!hasMoreOnline) return;

    const exploreTab = document.getElementById('tab-explore');
    if (!exploreTab || !exploreTab.classList.contains('active')) return;

    const scrollTop = mainScrollEl.scrollTop;
    const clientHeight = mainScrollEl.clientHeight;
    const scrollHeight = mainScrollEl.scrollHeight;

    if (scrollTop + clientHeight >= scrollHeight - 120) {
      if (!isInfiniteLoading && !isOnlineLoading) {
        isInfiniteLoading = true;
        onlinePage++;
        loadOnlineWallpapers(true);
      }
    }
  });

  window.addEventListener('resize', () => {
    if (appConfig.load_mode === 'infinite') {
      checkAndFillViewport();
    }
  });
}

// ==========================================================================
// 10) Event Listeners Setup
// ==========================================================================
function setupEvents() {
  setupWindowControls();
  setupNavigation();
  setupThemeSystem();
  setupFontSystem();
  setupLightboxInteractions();
  setupInfiniteScroll();
  setupRandomSourceChips();
  setupContextualSourceControls();

  if (btnRefreshGallery) btnRefreshGallery.addEventListener('click', loadWallpapers);
  if (btnBrowseDir) btnBrowseDir.addEventListener('click', pickCacheDir);

  const handleOpenFolder = async () => {
    try {
      await invoke('open_cache_folder');
    } catch (err) {
      showSnackBar(`打开文件夹失败: ${err}`, true);
    }
  };

  if (btnOpenCacheFolder) {
    btnOpenCacheFolder.addEventListener('click', handleOpenFolder);
  }

  const btnOpenDirSettings = document.getElementById('btn-open-dir-settings');
  if (btnOpenDirSettings) {
    btnOpenDirSettings.addEventListener('click', handleOpenFolder);
  }

  // 随机换一张
  if (btnQuickRandom) {
    btnQuickRandom.addEventListener('click', handleQuickRandom);
  }

  // 在默认浏览器中打开源地址
  if (btnOpenBrowser) {
    btnOpenBrowser.addEventListener('click', () => {
      if (currentDetailItem) {
        const url = currentDetailItem.raw_url || currentDetailItem.url || currentDetailItem.copyright_link || (currentDetailItem.file_path ? '' : '');
        if (url) {
          openExternalLink(url);
        } else {
          showSnackBar('本地文件无在线源地址');
        }
      }
    });
  }

  // 详情弹窗中点击预览图进入全屏缩放 Lightbox
  if (dialogPreviewBox) {
    dialogPreviewBox.addEventListener('click', () => {
      if (currentDetailItem) {
        const src = modalImg.src || (currentDetailItem.raw_url || currentDetailItem.url || currentDetailItem.thumb_url);
        openLightbox(src, currentDetailItem, currentDetailType);
      }
    });
  }

  if (modalBtnLightbox) {
    modalBtnLightbox.addEventListener('click', () => {
      if (currentDetailItem) {
        const src = modalImg.src || (currentDetailItem.raw_url || currentDetailItem.url || currentDetailItem.thumb_url);
        openLightbox(src, currentDetailItem, currentDetailType);
      }
    });
  }

function switchSourceContextualBar(source) {
  const panels = document.querySelectorAll('#explore-contextual-bar .contextual-panel');
  panels.forEach(p => p.classList.remove('active'));
  const target = document.getElementById(`panel-source-${source}`);
  if (target) target.classList.add('active');
}

function setupContextualSourceControls() {
  // 1. Pexels 搜索与热门分类标签
  const inputPexels = document.getElementById('input-pexels-query');
  const btnPexelsSearch = document.getElementById('btn-pexels-search');
  const btnPexelsClear = document.getElementById('btn-pexels-clear');
  const pexelsChips = document.querySelectorAll('#pexels-tag-chips .context-chip');

  if (inputPexels && btnPexelsClear) {
    inputPexels.addEventListener('input', () => {
      btnPexelsClear.classList.toggle('show', inputPexels.value.trim().length > 0);
    });
    btnPexelsClear.addEventListener('click', () => {
      inputPexels.value = '';
      btnPexelsClear.classList.remove('show');
      onlinePage = 1;
      loadOnlineWallpapers(false);
    });
    inputPexels.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        onlinePage = 1;
        loadOnlineWallpapers(false);
      }
    });
  }

  if (btnPexelsSearch) {
    btnPexelsSearch.addEventListener('click', () => {
      onlinePage = 1;
      loadOnlineWallpapers(false);
    });
  }

  pexelsChips.forEach(chip => {
    chip.addEventListener('click', () => {
      pexelsChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentPexelsTag = chip.getAttribute('data-tag') || 'curated';
      if (inputPexels) inputPexels.value = '';
      if (btnPexelsClear) btnPexelsClear.classList.remove('show');
      onlinePage = 1;
      loadOnlineWallpapers(false);
    });
  });

  // 3. Unsplash 搜索与标签
  const inputUnsplash = document.getElementById('input-unsplash-query');
  const btnUnsplashSearch = document.getElementById('btn-unsplash-search');
  const btnUnsplashClear = document.getElementById('btn-unsplash-clear');
  const unsplashChips = document.querySelectorAll('#unsplash-tag-chips .context-chip');

  if (inputUnsplash && btnUnsplashClear) {
    inputUnsplash.addEventListener('input', () => {
      btnUnsplashClear.classList.toggle('show', inputUnsplash.value.trim().length > 0);
    });
    btnUnsplashClear.addEventListener('click', () => {
      inputUnsplash.value = '';
      btnUnsplashClear.classList.remove('show');
      onlinePage = 1;
      loadOnlineWallpapers(false);
    });
    inputUnsplash.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        onlinePage = 1;
        loadOnlineWallpapers(false);
      }
    });
  }

  if (btnUnsplashSearch) {
    btnUnsplashSearch.addEventListener('click', () => {
      onlinePage = 1;
      loadOnlineWallpapers(false);
    });
  }

  unsplashChips.forEach(chip => {
    chip.addEventListener('click', () => {
      unsplashChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentUnsplashTag = chip.getAttribute('data-tag') || 'wallpaper';
      if (inputUnsplash) inputUnsplash.value = '';
      if (btnUnsplashClear) btnUnsplashClear.classList.remove('show');
      onlinePage = 1;
      loadOnlineWallpapers(false);
    });
  });

  // 4. Wallhaven 搜索、分类、排序、时间范围与画幅
  const inputWallhaven = document.getElementById('input-wallhaven-query');
  const btnWallhavenSearch = document.getElementById('btn-wallhaven-search');
  const btnWallhavenClear = document.getElementById('btn-wallhaven-clear');
  const wallhavenCatChips = document.querySelectorAll('#wallhaven-category-chips .context-chip');
  const wallhavenSortChips = document.querySelectorAll('#wallhaven-sorting-chips .context-chip');
  const wallhavenRatioChips = document.querySelectorAll('#wallhaven-ratio-chips .context-chip');
  const wallhavenTimeBtn = document.getElementById('wallhaven-timerange-btn');
  const wallhavenTimeDropdown = document.getElementById('wallhaven-timerange-dropdown');
  const wallhavenTimeLabel = document.getElementById('wallhaven-timerange-label');
  const wallhavenTimeMenuItems = document.querySelectorAll('#wallhaven-timerange-menu .timerange-menu-item');

  function updateWallhavenTimeDropdownVisibility() {
    if (!wallhavenTimeDropdown) return;
    const isTimeEnabled = wallhavenSearchState.sort === 'views' || wallhavenSearchState.sort === 'toplist';
    if (isTimeEnabled) {
      wallhavenTimeDropdown.classList.remove('hidden');
    } else {
      wallhavenTimeDropdown.classList.add('hidden');
      wallhavenTimeDropdown.classList.remove('open');
      if (wallhavenTimeBtn) wallhavenTimeBtn.setAttribute('aria-expanded', 'false');
    }
  }

  if (wallhavenTimeBtn && wallhavenTimeDropdown) {
    wallhavenTimeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = wallhavenTimeDropdown.classList.contains('open');
      if (isOpen) {
        wallhavenTimeDropdown.classList.remove('open');
        wallhavenTimeBtn.setAttribute('aria-expanded', 'false');
      } else {
        wallhavenTimeDropdown.classList.add('open');
        wallhavenTimeBtn.setAttribute('aria-expanded', 'true');
      }
    });

    document.addEventListener('click', (e) => {
      if (!wallhavenTimeDropdown.contains(e.target)) {
        wallhavenTimeDropdown.classList.remove('open');
        wallhavenTimeBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  const rangeLabels = {
    '1d': '时间：今天',
    '3d': '时间：近 3 天',
    '1w': '时间：近 1 周',
    '1M': '时间：近 1 月',
    '3M': '时间：近 3 月',
    '6M': '时间：近 6 月',
    '1y': '时间：近 1 年',
  };

  wallhavenTimeMenuItems.forEach(item => {
    item.addEventListener('click', () => {
      const range = item.getAttribute('data-range') || '1M';
      wallhavenSearchState.timeRange = range;
      wallhavenTimeMenuItems.forEach(i => {
        i.classList.remove('active');
        const check = i.querySelector('.menu-check');
        if (check) check.remove();
      });
      item.classList.add('active');
      if (!item.querySelector('.menu-check')) {
        const checkSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        checkSvg.setAttribute('class', 'menu-check');
        checkSvg.setAttribute('viewBox', '0 0 24 24');
        checkSvg.setAttribute('fill', 'none');
        checkSvg.setAttribute('stroke', 'currentColor');
        checkSvg.setAttribute('stroke-width', '3');
        checkSvg.innerHTML = '<polyline points="20 6 9 17 4 12"/>';
        item.appendChild(checkSvg);
      }
      if (wallhavenTimeLabel) {
        wallhavenTimeLabel.textContent = rangeLabels[range] || `时间：${item.textContent.trim()}`;
      }
      if (wallhavenTimeDropdown) {
        wallhavenTimeDropdown.classList.remove('open');
        if (wallhavenTimeBtn) wallhavenTimeBtn.setAttribute('aria-expanded', 'false');
      }
      onlinePage = 1;
      loadOnlineWallpapers(false);
    });
  });

  if (inputWallhaven && btnWallhavenClear) {
    inputWallhaven.addEventListener('input', () => {
      btnWallhavenClear.classList.toggle('show', inputWallhaven.value.trim().length > 0);
    });
    btnWallhavenClear.addEventListener('click', () => {
      inputWallhaven.value = '';
      btnWallhavenClear.classList.remove('show');
      if (wallhavenSearchState.sort === 'random') {
        wallhavenSearchState.randomSeed = generateRandomSeed();
      }
      onlinePage = 1;
      loadOnlineWallpapers(false);
    });
    inputWallhaven.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (wallhavenSearchState.sort === 'random') {
          wallhavenSearchState.randomSeed = generateRandomSeed();
        }
        onlinePage = 1;
        loadOnlineWallpapers(false);
      }
    });
  }

  if (btnWallhavenSearch) {
    btnWallhavenSearch.addEventListener('click', () => {
      if (wallhavenSearchState.sort === 'random') {
        wallhavenSearchState.randomSeed = generateRandomSeed();
      }
      onlinePage = 1;
      loadOnlineWallpapers(false);
    });
  }

  wallhavenCatChips.forEach(chip => {
    chip.addEventListener('click', () => {
      wallhavenCatChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const cat = chip.getAttribute('data-cat') || '111';
      wallhavenSearchState.category = cat;
      currentWallhavenCat = cat;
      if (wallhavenSearchState.sort === 'random') {
        wallhavenSearchState.randomSeed = generateRandomSeed();
      }
      onlinePage = 1;
      loadOnlineWallpapers(false);
    });
  });

  wallhavenSortChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const newSort = chip.getAttribute('data-sort') || 'views';
      if (newSort === 'random') {
        wallhavenSearchState.randomSeed = generateRandomSeed();
      }
      wallhavenSortChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      wallhavenSearchState.sort = newSort;
      currentWallhavenSort = newSort;
      updateWallhavenTimeDropdownVisibility();
      onlinePage = 1;
      loadOnlineWallpapers(false);
    });
  });

  wallhavenRatioChips.forEach(chip => {
    chip.addEventListener('click', () => {
      wallhavenRatioChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const ratio = chip.getAttribute('data-ratio') || '16x9,16x10';
      wallhavenSearchState.aspectRatio = ratio;
      currentWallhavenRatio = ratio;
      if (wallhavenSearchState.sort === 'random') {
        wallhavenSearchState.randomSeed = generateRandomSeed();
      }
      onlinePage = 1;
      loadOnlineWallpapers(false);
    });
  });

  updateWallhavenTimeDropdownVisibility();
}

  // Segmented Source Filter Buttons
  segmentedButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      segmentedButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSource = btn.getAttribute('data-source') || 'pexels';
      switchSourceContextualBar(currentSource);
      onlinePage = 1;
      hasMoreOnline = true;
      loadOnlineWallpapers(false);
    });
  });

  if (btnSearchOnline) {
    btnSearchOnline.addEventListener('click', () => {
      onlinePage = 1;
      hasMoreOnline = true;
      loadOnlineWallpapers(false);
    });
  }

  if (inputOnlineQuery) {
    inputOnlineQuery.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
          onlinePage = 1;
          hasMoreOnline = true;
          loadOnlineWallpapers(false);
        }, 300);
      }
    });
  }

  if (btnClearHistory) {
    btnClearHistory.addEventListener('click', () => {
      openConfirmDialog({
        title: typeof t === 'function' ? t('confirm_clear_history_title') : '确认清空浏览记录？',
        message: typeof t === 'function' ? t('confirm_clear_history_msg') : '确定要清空所有已保存的浏览历史吗？此操作不可撤销。',
        okText: typeof t === 'function' ? t('history_clear_btn') : '清空记录',
        okDanger: true,
        onConfirm: async () => {
          try {
            await invoke('clear_browse_history');
            showSnackBar(typeof t === 'function' ? t('toast_history_cleared') : '浏览记录已清空');
            loadHistory();
          } catch (err) {
            showSnackBar(String(err), true);
          }
        }
      });
    });
  }

  if (selectConfigRandomSource) selectConfigRandomSource.addEventListener('change', saveConfig);
  if (selectConfigCardratio) selectConfigCardratio.addEventListener('change', saveConfig);
  if (inputConfigQuery) inputConfigQuery.addEventListener('change', saveConfig);
  if (inputConfigUnsplashKey) inputConfigUnsplashKey.addEventListener('change', saveConfig);
  if (inputConfigPexelsKey) inputConfigPexelsKey.addEventListener('change', saveConfig);
  if (inputConfigInterval) inputConfigInterval.addEventListener('change', saveConfig);
  if (checkConfigAutoupdate) checkConfigAutoupdate.addEventListener('change', saveConfig);

  if (checkAutoLaunch) {
    checkAutoLaunch.addEventListener('change', async () => {
      try {
        await invoke('set_auto_launch_enabled', { enabled: checkAutoLaunch.checked });
        showSnackBar(`开机自启已${checkAutoLaunch.checked ? '开启' : '关闭'}`);
      } catch (err) {
        console.error('Failed to set auto launch:', err);
        showSnackBar('设置开机自启失败', true);
        checkAutoLaunch.checked = !checkAutoLaunch.checked;
      }
    });
  }

  // Modal Dialog Actions
  if (btnCloseModal) btnCloseModal.addEventListener('click', closeWallpaperDetails);
  if (detailModal) {
    detailModal.addEventListener('click', (e) => {
      if (e.target === detailModal) closeWallpaperDetails();
    });
  }

  if (modalBtnDownload) {
    modalBtnDownload.addEventListener('click', async () => {
      if (!currentDetailItem) return;
      await downloadOnlyAction(currentDetailItem);
      closeWallpaperDetails();
    });
  }

  if (modalBtnApply) {
    modalBtnApply.addEventListener('click', async () => {
      if (!currentDetailItem) return;
      if (currentDetailType === 'local') {
        await setWallpaperAction(currentDetailItem.file_path, currentDetailItem.title);
      } else {
        await downloadAndSetOnlineAction(currentDetailItem);
      }
      closeWallpaperDetails();
    });
  }

  if (modalBtnDelete) {
    modalBtnDelete.addEventListener('click', () => {
      if (!currentDetailItem || currentDetailType !== 'local') return;
      const targetItem = currentDetailItem;
      const confirmTitle = typeof t === 'function' ? t('confirm_delete_single_title') : '确认删除壁纸？';
      const confirmMsg = typeof t === 'function' ? t('confirm_delete_single_msg') : '确定要从本地永久删除这张壁纸吗？此操作不可恢复。';
      const deleteText = typeof t === 'function' ? t('confirm_dialog_delete') : '删除';

      openConfirmDialog({
        title: confirmTitle,
        message: confirmMsg,
        okText: deleteText,
        okDanger: true,
        onConfirm: async () => {
          try {
            await invoke('delete_wallpaper', { filePath: targetItem.file_path });
            showSnackBar(typeof t === 'function' ? t('toast_delete_success') : '已删除壁纸');
            closeWallpaperDetails();
            await loadWallpapers();
          } catch (err) {
            showSnackBar(`删除壁纸失败: ${err}`, true);
          }
        }
      });
    });
  }

  // Gallery Batch Management Listeners
  if (btnGalleryBatchToggle) {
    btnGalleryBatchToggle.addEventListener('click', () => toggleBatchMode());
  }
  if (btnBatchExit) {
    btnBatchExit.addEventListener('click', () => toggleBatchMode(false));
  }
  if (checkBatchSelectAll) {
    checkBatchSelectAll.addEventListener('change', () => selectAllBatch(checkBatchSelectAll.checked));
  }
  if (btnBatchDelete) {
    btnBatchDelete.addEventListener('click', executeBatchDelete);
  }

  // Generic Confirmation Dialog Listeners
  if (btnConfirmCancel) {
    btnConfirmCancel.addEventListener('click', closeConfirmDialog);
  }
  if (btnConfirmOk) {
    btnConfirmOk.addEventListener('click', () => {
      if (typeof pendingConfirmAction === 'function') {
        pendingConfirmAction();
      }
      closeConfirmDialog();
    });
  }
  if (confirmDialogBackdrop) {
    confirmDialogBackdrop.addEventListener('click', (e) => {
      if (e.target === confirmDialogBackdrop) closeConfirmDialog();
    });
  }

  // Language Switcher Listener
  if (selectConfigLanguage) {
    selectConfigLanguage.addEventListener('change', (e) => {
      const lang = e.target.value;
      if (typeof setLanguage === 'function') {
        setLanguage(lang);
      }
      appConfig.language = lang;
      saveConfig();
      showSnackBar(typeof t === 'function' ? t('toast_lang_changed') : '语言已切换');
      updateBatchUI();
    });
  }

  // About Page Links
  if (linkAboutRepo) {
    linkAboutRepo.addEventListener('click', (e) => {
      e.preventDefault();
      invoke('open_in_browser', { url: 'https://github.com/Mokssa/wallpaper_app' });
    });
  }
  if (linkAboutReleases) {
    linkAboutReleases.addEventListener('click', (e) => {
      e.preventDefault();
      invoke('open_in_browser', { url: 'https://github.com/Mokssa/wallpaper_app/releases' });
    });
  }
  if (linkAboutIssues) {
    linkAboutIssues.addEventListener('click', (e) => {
      e.preventDefault();
      invoke('open_in_browser', { url: 'https://github.com/Mokssa/wallpaper_app/issues' });
    });
  }

  // Update Modal Listeners
  if (btnCheckUpdate) {
    btnCheckUpdate.addEventListener('click', () => checkUpdateAction(true));
  }
  if (btnCloseUpdate) {
    btnCloseUpdate.addEventListener('click', closeUpdateModal);
  }
  if (btnUpdateCancel) {
    btnUpdateCancel.addEventListener('click', closeUpdateModal);
  }
  if (btnUpdateDownload) {
    btnUpdateDownload.addEventListener('click', () => {
      const targetUrl = currentUpdateInfo?.download_url || currentUpdateInfo?.release_url || 'https://github.com/Mokssa/wallpaper_app/releases';
      invoke('open_in_browser', { url: targetUrl }).catch(() => {
        window.open(targetUrl, '_blank');
      });
      closeUpdateModal();
    });
  }
  if (updateModal) {
    updateModal.addEventListener('click', (e) => {
      if (e.target === updateModal) closeUpdateModal();
    });
  }
}

// ==========================================================================
// Material Design 3 (M3) Zero-Dependency Ripple Engine
// Global event-delegation architecture with leak-free auto-cleanup.
// ==========================================================================
function initM3RippleEngine() {
  if (window.__M3_RIPPLE_INITIALIZED__) {
    return;
  }
  window.__M3_RIPPLE_INITIALIZED__ = true;

  const RIPPLE_SELECTOR = [
    '.md-btn', '.md-btn-filled', '.md-btn-tonal', '.md-btn-outlined', '.md-btn-text', '.md-btn-danger',
    '.m3-btn', '.m3-btn-primary', '.m3-btn-tonal', '.m3-btn-outlined', '.m3-btn-text', '.m3-btn-danger',
    '.segmented-btn',
    '.filter-chip', '.context-chip', '.pexels-chip', '.theme-palette-chip', '.font-preset-chip',
    '.btn-quick-random',
    '.m3-action-icon-btn', '.md-icon-btn', '.lightbox-tool-btn', '.modern-search-btn',
    '.titlebar-btn',
    '.md-ripple-surface'
  ].join(', ');

  function spawnRipple(target, clientX, clientY) {
    if (!target || target.disabled || target.getAttribute('aria-disabled') === 'true' || target.classList.contains('disabled')) {
      return;
    }

    const rect = target.getBoundingClientRect ? target.getBoundingClientRect() : { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
    const width = rect.width || target.offsetWidth || 100;
    const height = rect.height || target.offsetHeight || 40;

    let x, y;
    if (clientX === undefined || clientY === undefined || clientX < (rect.left || 0) || clientX > ((rect.right || (rect.left || 0) + width)) || clientY < (rect.top || 0) || clientY > ((rect.bottom || (rect.top || 0) + height))) {
      x = width / 2;
      y = height / 2;
    } else {
      x = clientX - (rect.left || 0);
      y = clientY - (rect.top || 0);
    }

    const dX = Math.max(x, width - x);
    const dY = Math.max(y, height - y);
    const radius = Math.hypot(dX, dY);
    const diameter = radius * 2;

    const compPos = window.getComputedStyle ? window.getComputedStyle(target).position : target.style.position;
    if (compPos === 'static') {
      target.style.position = 'relative';
    }

    const ripple = document.createElement('span');
    ripple.className = 'm3-ripple-wave md-ripple-wave';
    ripple.style.width = `${diameter}px`;
    ripple.style.height = `${diameter}px`;
    ripple.style.left = `${x - radius}px`;
    ripple.style.top = `${y - radius}px`;

    target.appendChild(ripple);

    let isFadingOut = false;
    const fadeOutRipple = () => {
      if (isFadingOut) return;
      isFadingOut = true;
      ripple.classList.add('m3-ripple-fade-out');
      ripple.classList.add('md-ripple-fade-out');

      const removeRipple = () => {
        if (ripple.parentNode) {
          ripple.parentNode.removeChild(ripple);
        }
      };

      ripple.addEventListener('transitionend', removeRipple, { once: true });
      setTimeout(removeRipple, 300);
    };

    const onPointerRelease = () => {
      fadeOutRipple();
      window.removeEventListener('pointerup', onPointerRelease);
      window.removeEventListener('mouseup', onPointerRelease);
      window.removeEventListener('pointercancel', onPointerRelease);
      target.removeEventListener('pointerleave', onPointerRelease);
    };

    window.addEventListener('pointerup', onPointerRelease, { once: true });
    window.addEventListener('mouseup', onPointerRelease, { once: true });
    window.addEventListener('pointercancel', onPointerRelease, { once: true });
    target.addEventListener('pointerleave', onPointerRelease, { once: true });

    setTimeout(() => {
      if (!isFadingOut) fadeOutRipple();
    }, 600);
  }

  // 1. Pointerdown & mousedown delegation with debounce guard for touch/pointer/mouse
  let lastSpawnTime = 0;
  let lastSpawnTarget = null;
  const handlePointerDown = (e) => {
    if (e.button !== 0 && e.button !== undefined) return;
    const target = e.target && e.target.closest ? e.target.closest(RIPPLE_SELECTOR) : null;
    if (target) {
      const now = Date.now();
      if (target === lastSpawnTarget && now - lastSpawnTime < 80) {
        return;
      }
      lastSpawnTime = now;
      lastSpawnTarget = target;
      spawnRipple(target, e.clientX, e.clientY);
    }
  };

  document.addEventListener('pointerdown', handlePointerDown, { passive: true });
  document.addEventListener('mousedown', handlePointerDown, { passive: true });

  // 2. Keyboard accessibility trigger (Enter / Space on focused interactive element)
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const activeEl = document.activeElement;
    if (activeEl && activeEl.matches && activeEl.matches(RIPPLE_SELECTOR)) {
      const tag = activeEl.tagName ? activeEl.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      spawnRipple(activeEl);
    }
  });
}

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
  if (typeof initI18n === 'function') {
    initI18n();
  }
  setupEvents();
  initM3RippleEngine();
  await loadConfig();
  await loadWallpapers();
  await loadOnlineWallpapers(false);
  await loadHistory();
});
