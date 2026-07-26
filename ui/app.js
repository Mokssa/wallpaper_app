// ==========================================================================
// WallpaperApp Client Script (Pure Image Cards & WinUI 3 Details Modal)
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

// State
let appConfig = {
  query: "nature,wallpaper",
  cache_dir: "cache/wallpapers",
  auto_update_interval_minutes: 60,
  auto_update_enabled: false,
  unsplash_access_key: "",
};

let cachedWallpapers = [];
let onlineWallpapers = [];
let onlinePage = 1;
const pageLimit = 12;
let currentDetailItem = null;
let currentDetailType = 'online'; // 'local' | 'online'

// DOM Elements
const btnMinimize = document.getElementById('btn-minimize');
const btnMaximize = document.getElementById('btn-maximize');
const btnClose = document.getElementById('btn-close');

const navItems = document.querySelectorAll('.nav-item');
const tabPages = document.querySelectorAll('.tab-page');
const statusMsgEl = document.getElementById('status-msg');

// Local Gallery DOM
const galleryGrid = document.getElementById('gallery-grid');
const galleryEmptyState = document.getElementById('gallery-empty-state');
const galleryCountText = document.getElementById('gallery-count-text');
const btnRefreshGallery = document.getElementById('btn-refresh-gallery');

// Online Explore DOM
const selectSource = document.getElementById('select-source');
const groupSearch = document.getElementById('group-search');
const inputOnlineQuery = document.getElementById('input-online-query');
const btnSearchOnline = document.getElementById('btn-search-online');
const onlineGrid = document.getElementById('online-grid');

const btnPrevPage = document.getElementById('btn-prev-page');
const btnNextPage = document.getElementById('btn-next-page');
const pageInfo = document.getElementById('page-info');

// Settings DOM
const inputConfigQuery = document.getElementById('input-config-query');
const inputConfigUnsplashKey = document.getElementById('input-config-unsplash-key');
const labelCacheDir = document.getElementById('label-cache-dir');
const btnBrowseDir = document.getElementById('btn-browse-dir');
const inputConfigInterval = document.getElementById('input-config-interval');
const checkConfigAutoupdate = document.getElementById('check-config-autoupdate');
const currentWpText = document.getElementById('current-wp-text');

// Modal Elements
const detailModal = document.getElementById('detail-modal');
const btnCloseModal = document.getElementById('btn-close-modal');
const modalTitle = document.getElementById('modal-wallpaper-title');
const modalImg = document.getElementById('modal-wallpaper-img');
const modalMetaTitle = document.getElementById('modal-meta-title');
const modalMetaAuthor = document.getElementById('modal-meta-author');
const modalMetaSource = document.getElementById('modal-meta-source');
const modalMetaDateRow = document.getElementById('modal-meta-date-row');
const modalMetaDate = document.getElementById('modal-meta-date');
const modalBtnDelete = document.getElementById('modal-btn-delete');
const modalBtnDownload = document.getElementById('modal-btn-download');
const modalBtnCancel = document.getElementById('modal-btn-cancel');
const modalBtnApply = document.getElementById('modal-btn-apply');

// Helper to set status
function setStatus(msg) {
  if (statusMsgEl) {
    statusMsgEl.textContent = msg;
  }
}

// Window Controls Setup
function setupWindowControls() {
  if (btnMinimize) btnMinimize.addEventListener('click', () => invoke('window_minimize'));
  if (btnMaximize) btnMaximize.addEventListener('click', () => invoke('window_toggle_maximize'));
  if (btnClose) btnClose.addEventListener('click', () => invoke('window_close'));
}

// Navigation Tabs Switch
function setupNavigation() {
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabName = item.getAttribute('data-tab');
      
      navItems.forEach(i => i.classList.remove('active'));
      tabPages.forEach(p => p.classList.remove('active'));
      
      item.classList.add('active');
      const targetPage = document.getElementById(`tab-${tabName}`);
      if (targetPage) {
        targetPage.classList.add('active');
      }
    });
  });
}

// Open Details Modal Dialog
function openWallpaperDetails(item, type = 'online', imgSrc = '') {
  currentDetailItem = item;
  currentDetailType = type;

  modalTitle.textContent = type === 'local' ? '本地壁纸详情' : '在线壁纸详情';
  modalImg.src = imgSrc || item.thumb_url || item.url || '';
  modalMetaTitle.textContent = item.title || '壁纸作品';
  modalMetaAuthor.textContent = item.author || '未知作者';
  modalMetaSource.textContent = item.source || (type === 'local' ? '本地图库' : '在线源');

  if (type === 'local') {
    modalMetaDateRow.style.display = 'flex';
    modalMetaDate.textContent = item.download_date || '-';
    modalBtnDelete.style.display = 'inline-flex';
    if (modalBtnDownload) modalBtnDownload.style.display = 'none';
  } else {
    modalMetaDateRow.style.display = 'none';
    modalBtnDelete.style.display = 'none';
    if (modalBtnDownload) modalBtnDownload.style.display = 'inline-flex';
  }

  detailModal.classList.add('active');
}

// Close Details Modal Dialog
function closeWallpaperDetails() {
  detailModal.classList.remove('active');
  currentDetailItem = null;
}

// Load Config
async function loadConfig() {
  try {
    const res = await invoke('get_config');
    if (res) {
      appConfig = res;
      updateConfigUI();
    }
  } catch (err) {
    console.error('Failed to load config:', err);
  }
}

// Update Config UI
function updateConfigUI() {
  if (inputConfigQuery) inputConfigQuery.value = appConfig.query || '';
  if (inputOnlineQuery) inputOnlineQuery.value = appConfig.query || '';
  if (inputConfigUnsplashKey) inputConfigUnsplashKey.value = appConfig.unsplash_access_key || '';
  if (labelCacheDir) labelCacheDir.textContent = appConfig.cache_dir || 'cache/wallpapers';
  if (inputConfigInterval) inputConfigInterval.value = appConfig.auto_update_interval_minutes || 60;
  if (checkConfigAutoupdate) checkConfigAutoupdate.checked = !!appConfig.auto_update_enabled;
}

// Save Config
async function saveConfig() {
  try {
    appConfig.query = inputConfigQuery ? inputConfigQuery.value.trim() : appConfig.query;
    appConfig.unsplash_access_key = inputConfigUnsplashKey ? inputConfigUnsplashKey.value.trim() : (appConfig.unsplash_access_key || "");
    appConfig.auto_update_interval_minutes = inputConfigInterval ? parseInt(inputConfigInterval.value) || 60 : 60;
    appConfig.auto_update_enabled = checkConfigAutoupdate ? checkConfigAutoupdate.checked : false;
    
    await invoke('save_config', { config: appConfig });
    setStatus('设置已保存');
  } catch (err) {
    setStatus(`保存设置失败: ${err}`);
  }
}

// Pick Cache Directory
async function pickCacheDir() {
  try {
    const selected = await invoke('select_cache_dir');
    if (selected) {
      appConfig.cache_dir = selected;
      if (labelCacheDir) labelCacheDir.textContent = selected;
      await invoke('save_config', { config: appConfig });
      setStatus(`保存路径已更新为: ${selected}`);
      await loadWallpapers();
    }
  } catch (err) {
    setStatus(`选择路径失败: ${err}`);
  }
}

// Render Local Gallery
async function renderGallery(items) {
  cachedWallpapers = Array.isArray(items) ? items : [];
  galleryGrid.innerHTML = '';
  
  if (galleryCountText) {
    galleryCountText.textContent = `共已缓存 ${cachedWallpapers.length} 张高分辨率壁纸，随时设为桌面`;
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
    card.className = 'pure-thumb-card skeleton';

    let imgSrc = '';
    try {
      imgSrc = await invoke('read_file_data_url', { filePath: item.file_path });
    } catch (e) {
      console.warn('Failed to read image data url:', e);
    }
    if (!imgSrc) imgSrc = item.file_path;

    const img = document.createElement('img');
    img.className = 'pure-card-img';
    img.alt = item.title || 'Wallpaper';
    img.src = imgSrc;

    img.onload = () => {
      card.classList.remove('skeleton');
      img.classList.add('loaded');
    };

    card.appendChild(img);

    card.addEventListener('click', () => {
      openWallpaperDetails(item, 'local', imgSrc);
    });

    galleryGrid.appendChild(card);
  }
}

// Setting Wallpaper Helper
async function setWallpaperAction(filePath, title) {
  try {
    setStatus(`正在设置桌面壁纸: ${title}...`);
    await invoke('set_desktop_wallpaper', { pathStr: filePath });
    setStatus(`成功设置桌面壁纸: ${title}`);
    loadCurrentWallpaper();
  } catch (err) {
    setStatus(`设置壁纸失败: ${err}`);
  }
}

// Download Wallpaper to Local
async function downloadOnlyAction(item) {
  try {
    setStatus(`正在下载保存壁纸到本地: ${item.title}...`);
    await invoke('download_and_set_online_wallpaper', { item });
    setStatus(`已成功保存壁纸到本地: ${item.title}`);
    await loadWallpapers();
  } catch (err) {
    setStatus(`保存壁纸失败: ${err}`);
  }
}

// Load Local Wallpapers
async function loadWallpapers() {
  try {
    const items = await invoke('get_cached_wallpapers');
    await renderGallery(items);
  } catch (err) {
    setStatus(`获取本地壁纸失败: ${err}`);
    renderGallery([]);
  }
}

// Load Current Wallpaper Banner
async function loadCurrentWallpaper() {
  try {
    const wp = await invoke('get_current_wallpaper');
    if (currentWpText) {
      currentWpText.textContent = wp ? `当前 Windows 桌面壁纸: ${wp}` : '当前 Windows 桌面壁纸: 未知';
    }
  } catch (err) {
    console.error('Failed to get current wallpaper:', err);
  }
}

// Render Online Wallpapers Grid (Chromium 原生并发多线程加载，零延迟瞬间展现)
function renderOnlineGrid(items) {
  onlineWallpapers = Array.isArray(items) ? items : [];
  onlineGrid.innerHTML = '';

  if (onlineWallpapers.length === 0) {
    onlineGrid.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;"><div class="empty-icon">🌐</div><h2 class="empty-title">未发现在线壁纸</h2><p class="empty-desc">请尝试更换图源、调整搜索关键词或检查网络连接！</p></div>';
    return;
  }

  onlineWallpapers.forEach(item => {
    const card = document.createElement('div');
    card.className = 'pure-thumb-card skeleton';

    const img = document.createElement('img');
    img.className = 'pure-card-img';
    img.alt = item.title || 'Wallpaper';
    img.src = item.thumb_url;

    img.onload = () => {
      card.classList.remove('skeleton');
      img.classList.add('loaded');
    };

    // 仅当某张单图直接加载受阻时按需懒加载代理
    img.onerror = async () => {
      try {
        const base64Data = await invoke('fetch_remote_image_base64', { url: item.thumb_url });
        if (base64Data) {
          img.src = base64Data;
        }
      } catch (e) {}
    };

    card.appendChild(img);

    card.addEventListener('click', () => {
      openWallpaperDetails(item, 'online', item.thumb_url);
    });

    onlineGrid.appendChild(card);
  });
}

// Download & Set Online Action Helper
async function downloadAndSetOnlineAction(item) {
  try {
    setStatus(`正在下载并应用壁纸: ${item.title}...`);
    await invoke('download_and_set_online_wallpaper', { item });
    setStatus(`成功应用壁纸: ${item.title}`);
    await loadWallpapers();
    await loadCurrentWallpaper();
  } catch (err) {
    setStatus(`应用壁纸失败: ${err}`);
  }
}

// Load Online Wallpapers List
async function loadOnlineWallpapers() {
  const source = selectSource ? selectSource.value : 'picsum';
  const query = inputOnlineQuery ? inputOnlineQuery.value.trim() : '';

  try {
    setStatus(`正在获取 ${source} 壁纸列表（第 ${onlinePage} 页）...`);
    
    if (pageInfo) pageInfo.textContent = `第 ${onlinePage} 页`;
    if (btnPrevPage) btnPrevPage.disabled = (onlinePage <= 1);

    onlineGrid.innerHTML = '<div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--text-secondary);">⏳ 正在拉取在线壁纸...</div>';

    const list = await invoke('fetch_online_wallpapers', {
      source,
      query,
      page: onlinePage,
      limit: pageLimit,
    });

    const safeList = Array.isArray(list) ? list : [];
    renderOnlineGrid(safeList);
    setStatus(`已成功加载 ${source} 壁纸第 ${onlinePage} 页 (共 ${safeList.length} 张)`);
  } catch (err) {
    console.error('Failed to load online wallpapers:', err);
    setStatus(`在线壁纸加载失败: ${err}`);
    renderOnlineGrid([]);
  }
}

// Escaping
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, match => {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[match];
  });
}

// Attach Event Listeners
function setupEvents() {
  setupWindowControls();
  if (btnRefreshGallery) btnRefreshGallery.addEventListener('click', loadWallpapers);
  if (btnBrowseDir) btnBrowseDir.addEventListener('click', pickCacheDir);

  if (selectSource) {
    selectSource.addEventListener('change', () => {
      const showSearch = (selectSource.value === 'wallhaven' || selectSource.value === 'unsplash' || selectSource.value === 'picsum');
      if (groupSearch) groupSearch.style.display = showSearch ? 'flex' : 'none';
      onlinePage = 1;
      loadOnlineWallpapers();
    });
  }

  if (btnSearchOnline) {
    btnSearchOnline.addEventListener('click', () => {
      onlinePage = 1;
      loadOnlineWallpapers();
    });
  }

  if (btnPrevPage) {
    btnPrevPage.addEventListener('click', () => {
      if (onlinePage > 1) {
        onlinePage--;
        loadOnlineWallpapers();
      }
    });
  }

  if (btnNextPage) {
    btnNextPage.addEventListener('click', () => {
      onlinePage++;
      loadOnlineWallpapers();
    });
  }

  if (inputConfigQuery) inputConfigQuery.addEventListener('change', saveConfig);
  if (inputConfigUnsplashKey) inputConfigUnsplashKey.addEventListener('change', saveConfig);
  if (inputConfigInterval) inputConfigInterval.addEventListener('change', saveConfig);
  if (checkConfigAutoupdate) checkConfigAutoupdate.addEventListener('change', saveConfig);

  // Modal Dialog Actions
  if (btnCloseModal) btnCloseModal.addEventListener('click', closeWallpaperDetails);
  if (modalBtnCancel) modalBtnCancel.addEventListener('click', closeWallpaperDetails);
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
        setStatus(`已删除壁纸: ${currentDetailItem.title}`);
        closeWallpaperDetails();
        loadWallpapers();
      } catch (err) {
        setStatus(`删除壁纸失败: ${err}`);
      }
    });
  }
}

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();
  setupEvents();
  await loadConfig();
  await loadWallpapers();
  await loadOnlineWallpapers();
  await loadCurrentWallpaper();
});
