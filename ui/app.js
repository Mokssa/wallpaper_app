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
const pageLimit = 16;
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

// Explore DOM
const segmentedButtons = document.querySelectorAll('#segmented-source-group .segmented-btn');
const inputOnlineQuery = document.getElementById('input-online-query');
const btnSearchOnline = document.getElementById('btn-search-online');
const onlineGrid = document.getElementById('online-grid');

const paginationBar = document.getElementById('pagination-bar');
const infiniteLoader = document.getElementById('infinite-loader');
const btnPrevPage = document.getElementById('btn-prev-page');
const btnNextPage = document.getElementById('btn-next-page');
const pageInfo = document.getElementById('page-info');

// Settings DOM
const themePaletteChips = document.querySelectorAll('.theme-palette-chip');
const checkAmoledMode = document.getElementById('check-amoled-mode');
const selectConfigRandomSource = document.getElementById('select-config-random-source');
const selectConfigLoadmode = document.getElementById('select-config-loadmode');
const selectConfigCardratio = document.getElementById('select-config-cardratio');
const inputConfigQuery = document.getElementById('input-config-query');
const inputConfigUnsplashKey = document.getElementById('input-config-unsplash-key');
const inputConfigPexelsKey = document.getElementById('input-config-pexels-key');
const labelCacheDir = document.getElementById('label-cache-dir');
const btnBrowseDir = document.getElementById('btn-browse-dir');
const inputConfigInterval = document.getElementById('input-config-interval');
const checkConfigAutoupdate = document.getElementById('check-config-autoupdate');
const checkAutoLaunch = document.getElementById('check-auto-launch');

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

// ==========================================================================
// 1) Mihon Material You Dynamic Theme Engine
// ==========================================================================
function updateSourceIconsForTheme(themeName, isAmoled) {
  const pexelsIcons = document.querySelectorAll('img[src*="pexels"]');
  let pexelsSrc = 'assets/icons/pexels.png';

  // 针对与 Pexels 青绿原色相近的主题（青色 Teal、绿色 Green），自动选用高对比度白色/深色版图标
  if (themeName === 'teal' || themeName === 'green') {
    pexelsSrc = 'assets/icons/pexels_light.png';
  } else if (themeName === 'amber') {
    pexelsSrc = 'assets/icons/pexels_dark.png';
  } else {
    pexelsSrc = 'assets/icons/pexels.png';
  }

  pexelsIcons.forEach(img => {
    img.src = pexelsSrc;
  });
}

function applyTheme(themeName, isAmoled = false) {
  const validThemes = ['violet', 'blue', 'teal', 'pink', 'amber', 'green', 'crimson'];
  const theme = validThemes.includes(themeName) ? themeName : 'violet';

  validThemes.forEach(t => document.body.classList.remove(`theme-${t}`));
  document.body.classList.add(`theme-${theme}`);
  document.body.classList.toggle('theme-amoled', !!isAmoled);

  themePaletteChips.forEach(chip => {
    if (chip.getAttribute('data-theme') === theme) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });

  if (checkAmoledMode) {
    checkAmoledMode.checked = !!isAmoled;
  }

  updateSourceIconsForTheme(theme, isAmoled);

  appConfig.theme_color = theme;
  appConfig.amoled_mode = !!isAmoled;
  try {
    localStorage.setItem('wp_theme_color', theme);
    localStorage.setItem('wp_amoled_mode', isAmoled ? '1' : '0');
  } catch (e) {}
}

function setupThemeSystem() {
  const savedTheme = localStorage.getItem('wp_theme_color') || 'violet';
  const savedAmoled = localStorage.getItem('wp_amoled_mode') === '1';
  applyTheme(savedTheme, savedAmoled);

  themePaletteChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const selectedTheme = chip.getAttribute('data-theme') || 'violet';
      applyTheme(selectedTheme, checkAmoledMode ? checkAmoledMode.checked : false);
      saveConfig();
      showSnackBar(`已切换至 ${chip.querySelector('.palette-name')?.textContent || selectedTheme} 主题`);
    });
  });

  if (checkAmoledMode) {
    checkAmoledMode.addEventListener('change', () => {
      applyTheme(appConfig.theme_color, checkAmoledMode.checked);
      saveConfig();
      showSnackBar(`AMOLED 纯黑模式已${checkAmoledMode.checked ? '开启' : '关闭'}`);
    });
  }
}

// ==========================================================================
// 1.1) Typography & Font Customization Engine (圆润/幼圆/现代/文楷/小米几何)
// ==========================================================================
function applyFontFamily(fontName) {
  const validFonts = ['rounded', 'youyuan', 'fluent', 'wenkai', 'misans'];
  const font = validFonts.includes(fontName) ? fontName : 'rounded';

  validFonts.forEach(f => document.body.classList.remove(`font-${f}`));
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
    chip.addEventListener('click', () => {
      const selectedFont = chip.getAttribute('data-font') || 'rounded';
      applyFontFamily(selectedFont);
      saveConfig();
      const fontTitle = chip.querySelector('.font-preset-title')?.textContent || selectedFont;
      showSnackBar(`界面字体已切换至 ${fontTitle}`);
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
}

// ==========================================================================
// 4) Details Modal Dialog (渐进式超清原图与真实分辨率)
// ==========================================================================
function openWallpaperDetails(item, type = 'online', imgSrc = '') {
  currentDetailItem = item;
  currentDetailType = type;

  const rawUrl = item ? (item.raw_url || item.url || item.file_path || item.thumb_url) : imgSrc;
  const thumbUrl = item ? (item.thumb_url || imgSrc) : imgSrc;

  // 1. 先用缩略图瞬间占位，避免任何等待
  modalImg.src = thumbUrl || rawUrl;

  if (modalMetaResolution) {
    modalMetaResolution.textContent = '检测原图分辨率...';
  }

  // 2. 加载真实超高清原图并展示真实 4K/8K 分辨率
  if (rawUrl) {
    const hdImage = new Image();
    hdImage.src = rawUrl;
    hdImage.onload = () => {
      if (detailModal.classList.contains('active') && currentDetailItem === item) {
        modalImg.src = rawUrl;
        if (modalMetaResolution && hdImage.naturalWidth) {
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
            modalMetaResolution.textContent = `${modalImg.naturalWidth} × ${modalImg.naturalHeight}`;
          }
        }
      } catch (e) {}
    };
  }

  // 源地址链接 (真实原图下载直链)
  const sourceUrl = rawUrl || sourceUrl || '';
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
// 5) Fullscreen Lightbox & Interactive Photo Viewer (全屏放大超清原图)
// ==========================================================================
function openLightbox(imgSrc, item, type = 'online') {
  currentDetailItem = item;
  currentDetailType = type;

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

  // Esc 键退出全屏
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (fullscreenLightbox.classList.contains('active')) {
        closeLightbox();
      } else if (detailModal.classList.contains('active')) {
        closeWallpaperDetails();
      }
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
  if (selectConfigLoadmode) selectConfigLoadmode.value = appConfig.load_mode || 'pagination';
  if (selectConfigCardratio) selectConfigCardratio.value = appConfig.card_ratio || 'uniform';
  if (inputConfigUnsplashKey) inputConfigUnsplashKey.value = appConfig.unsplash_access_key || '';
  if (inputConfigPexelsKey) inputConfigPexelsKey.value = appConfig.pexels_api_key || '';
  if (labelCacheDir) labelCacheDir.textContent = appConfig.cache_dir || 'cache/wallpapers';
  if (inputConfigInterval) inputConfigInterval.value = appConfig.auto_update_interval_minutes || 60;
  if (checkConfigAutoupdate) checkConfigAutoupdate.checked = !!appConfig.auto_update_enabled;

  if (appConfig.font_family) {
    applyFontFamily(appConfig.font_family);
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

  const isInfinite = (appConfig.load_mode === 'infinite');
  if (paginationBar) paginationBar.style.display = isInfinite ? 'none' : 'flex';
  if (infiniteLoader) infiniteLoader.style.display = 'none'; // 仅在滚动触发拉取时按需显示
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
    appConfig.load_mode = selectConfigLoadmode ? selectConfigLoadmode.value : "pagination";
    appConfig.card_ratio = selectConfigCardratio ? selectConfigCardratio.value : "uniform";
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
// 7) Local Gallery Rendering & Actions (支持卡片双击全屏、详情全屏)
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
    return;
  }

  galleryEmptyState.style.display = 'none';
  galleryGrid.style.display = 'grid';

  for (const item of cachedWallpapers) {
    const card = document.createElement('div');
    card.className = 'm3-wallpaper-card';

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

    // Hover Action Buttons (去除多余的全屏缩放按钮，点击图片即可查看)
    const actions = document.createElement('div');
    actions.className = 'm3-card-actions';

    const btnApply = document.createElement('button');
    btnApply.className = 'm3-action-icon-btn';
    btnApply.title = '设为桌面壁纸';
    btnApply.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
    btnApply.addEventListener('click', async (e) => {
      e.stopPropagation();
      await setWallpaperAction(item.file_path, item.title);
    });

    const btnDelete = document.createElement('button');
    btnDelete.className = 'm3-action-icon-btn';
    btnDelete.title = '删除此壁纸';
    btnDelete.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
    btnDelete.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await invoke('delete_wallpaper', { filePath: item.file_path });
        showSnackBar(`已删除壁纸`);
        await loadWallpapers();
      } catch (err) {
        showSnackBar(`删除壁纸失败: ${err}`, true);
      }
    });

    actions.appendChild(btnApply);
    actions.appendChild(btnDelete);

    imgWrapper.appendChild(img);
    card.appendChild(imgWrapper);
    card.appendChild(actions);

    card.addEventListener('click', () => {
      openLightbox(imgSrc, item, 'local');
    });

    galleryGrid.appendChild(card);
  }
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
    showSnackBar(`🎉 已成功设为 Windows 桌面壁纸！`);
  } catch (err) {
    showSnackBar(`设置壁纸失败: ${err}`, true);
  }
}

async function downloadOnlyAction(item) {
  try {
    showSnackBar(`正在保存壁纸...`);
    await invoke('download_and_set_online_wallpaper', { item });
    showSnackBar(`✨ 壁纸已成功保存到本地图库！`);
    await loadWallpapers();
  } catch (err) {
    showSnackBar(`保存壁纸失败: ${err}`, true);
  }
}

async function downloadAndSetOnlineAction(item) {
  try {
    showSnackBar(`正在下载并应用壁纸...`);
    await invoke('download_and_set_online_wallpaper', { item });
    showSnackBar(`🎉 已成功下载并设为桌面壁纸！`);
    await loadWallpapers();
  } catch (err) {
    showSnackBar(`应用壁纸失败: ${err}`, true);
  }
}

// ==========================================================================
// 8) 智能随机换一张
// ==========================================================================
async function handleQuickRandom() {
  const selectedSource = appConfig.random_source || (selectConfigRandomSource ? selectConfigRandomSource.value : 'all');

  showSnackBar('🎲 正在随机挑选精美壁纸...');

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

  if (uniqueItems.length === 0 && !append) {
    onlineGrid.innerHTML = `
      <div class="flutter-empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h2 class="empty-title">未发现在线壁纸</h2>
      </div>
    `;
    return;
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
}

let currentBingMarket = 'zh-CN';
let currentUnsplashTag = 'wallpaper';
let currentWallhavenCat = '110';
let currentWallhavenSort = 'views';
let currentWallhavenRatio = '16x9,16x10';

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
          <span>🔑 前往设置填写 Key</span>
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
    if (pageInfo) pageInfo.textContent = `第 1 页`;
    if (btnPrevPage) btnPrevPage.disabled = true;
    if (btnNextPage) btnNextPage.disabled = true;
    return;
  }

  isOnlineLoading = true;

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
    query = `${inputVal}|${currentWallhavenCat}|${currentWallhavenSort}|${currentWallhavenRatio}`;
  }

  try {
    if (pageInfo) pageInfo.textContent = `第 ${onlinePage} 页`;
    if (btnPrevPage) btnPrevPage.disabled = (onlinePage <= 1);

    if (!append) {
      renderSkeletonGrid(onlineGrid, 8);
      if (infiniteLoader) infiniteLoader.style.display = 'none';
    } else {
      if (infiniteLoader && appConfig.load_mode === 'infinite') {
        infiniteLoader.style.display = 'flex';
      }
    }

    const list = await invoke('fetch_online_wallpapers', {
      source: currentSource,
      query,
      page: onlinePage,
      limit: pageLimit,
    });

    const safeList = Array.isArray(list) ? list : [];
    hasMoreOnline = safeList.length > 0;
    
    if (currentSource === 'bing') {
      console.log(`[Bing] market=${currentBingMarket}, page=${onlinePage}, returned=${safeList.length}`);
    }

    if (btnNextPage) {
      btnNextPage.disabled = !hasMoreOnline;
    }

    renderOnlineGrid(safeList, append);
  } catch (err) {
    console.error('Failed to load online wallpapers:', err);
    if (String(err).includes('UNSPLASH_KEY')) {
      renderUnsplashKeyPrompt();
    } else {
      showSnackBar(`壁纸加载失败: ${err}`, true);
      if (!append) renderOnlineGrid([]);
    }
  } finally {
    isOnlineLoading = false;
    isInfiniteLoading = false;
    if (infiniteLoader) infiniteLoader.style.display = 'none';
  }
}

function setupInfiniteScroll() {
  if (!mainScrollEl) return;

  mainScrollEl.addEventListener('scroll', () => {
    if (appConfig.load_mode !== 'infinite') return;
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

  // 2. Bing 地区市场切换
  const bingChips = document.querySelectorAll('#bing-market-chips .context-chip');
  bingChips.forEach(chip => {
    chip.addEventListener('click', () => {
      bingChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentBingMarket = chip.getAttribute('data-market') || 'zh-CN';
      onlinePage = 1;
      hasMoreOnline = true;
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

  // 4. Wallhaven 搜索、分类、排序与画幅
  const inputWallhaven = document.getElementById('input-wallhaven-query');
  const btnWallhavenSearch = document.getElementById('btn-wallhaven-search');
  const btnWallhavenClear = document.getElementById('btn-wallhaven-clear');
  const wallhavenCatChips = document.querySelectorAll('#wallhaven-category-chips .context-chip');
  const wallhavenSortChips = document.querySelectorAll('#wallhaven-sorting-chips .context-chip');
  const wallhavenRatioChips = document.querySelectorAll('#wallhaven-ratio-chips .context-chip');

  if (inputWallhaven && btnWallhavenClear) {
    inputWallhaven.addEventListener('input', () => {
      btnWallhavenClear.classList.toggle('show', inputWallhaven.value.trim().length > 0);
    });
    btnWallhavenClear.addEventListener('click', () => {
      inputWallhaven.value = '';
      btnWallhavenClear.classList.remove('show');
      onlinePage = 1;
      loadOnlineWallpapers(false);
    });
    inputWallhaven.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        onlinePage = 1;
        loadOnlineWallpapers(false);
      }
    });
  }

  if (btnWallhavenSearch) {
    btnWallhavenSearch.addEventListener('click', () => {
      onlinePage = 1;
      loadOnlineWallpapers(false);
    });
  }

  wallhavenCatChips.forEach(chip => {
    chip.addEventListener('click', () => {
      wallhavenCatChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentWallhavenCat = chip.getAttribute('data-cat') || '110';
      onlinePage = 1;
      loadOnlineWallpapers(false);
    });
  });

  wallhavenSortChips.forEach(chip => {
    chip.addEventListener('click', () => {
      wallhavenSortChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentWallhavenSort = chip.getAttribute('data-sort') || 'views';
      onlinePage = 1;
      loadOnlineWallpapers(false);
    });
  });

  wallhavenRatioChips.forEach(chip => {
    chip.addEventListener('click', () => {
      wallhavenRatioChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentWallhavenRatio = chip.getAttribute('data-ratio') || '16x9,16x10';
      onlinePage = 1;
      loadOnlineWallpapers(false);
    });
  });
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

  if (btnPrevPage) {
    btnPrevPage.addEventListener('click', () => {
      if (onlinePage > 1) {
        onlinePage--;
        loadOnlineWallpapers(false);
      }
    });
  }

  if (btnNextPage) {
    btnNextPage.addEventListener('click', () => {
      if (hasMoreOnline) {
        onlinePage++;
        loadOnlineWallpapers(false);
      }
    });
  }

  if (selectConfigRandomSource) selectConfigRandomSource.addEventListener('change', saveConfig);
  if (selectConfigLoadmode) selectConfigLoadmode.addEventListener('change', saveConfig);
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
    modalBtnDelete.addEventListener('click', async () => {
      if (!currentDetailItem || currentDetailType !== 'local') return;
      try {
        await invoke('delete_wallpaper', { filePath: currentDetailItem.file_path });
        showSnackBar(`已删除壁纸`);
        closeWallpaperDetails();
        await loadWallpapers();
      } catch (err) {
        showSnackBar(`删除壁纸失败: ${err}`, true);
      }
    });
  }
}

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
  setupEvents();
  await loadConfig();
  await loadWallpapers();
  await loadOnlineWallpapers(false);
});
