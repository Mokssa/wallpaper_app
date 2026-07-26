// ==========================================================================
// WallpaperApp Client Script (Tauri v2 IPC & Online Pagination)
// ==========================================================================

const invoke = window.__TAURI__ ? window.__TAURI__.core.invoke : async (cmd, args) => {
  console.log(`[Mock Invoke] ${cmd}`, args);
  return [];
};

// State
let appConfig = {
  query: "nature,wallpaper",
  cache_dir: "cache/wallpapers",
  auto_update_interval_minutes: 60,
  auto_update_enabled: false,
};

let cachedWallpapers = [];
let onlineWallpapers = [];
let onlinePage = 1;
const pageLimit = 12;

// DOM Elements
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
const labelCacheDir = document.getElementById('label-cache-dir');
const inputConfigInterval = document.getElementById('input-config-interval');
const checkConfigAutoupdate = document.getElementById('check-config-autoupdate');
const currentWpText = document.getElementById('current-wp-text');

// Helper
function setStatus(msg) {
  if (statusMsgEl) {
    statusMsgEl.textContent = msg;
  }
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
        if (tabName === 'explore' && onlineWallpapers.length === 0) {
          loadOnlineWallpapers();
        }
      }
    });
  });
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
  if (labelCacheDir) labelCacheDir.textContent = appConfig.cache_dir || 'cache/wallpapers';
  if (inputConfigInterval) inputConfigInterval.value = appConfig.auto_update_interval_minutes || 60;
  if (checkConfigAutoupdate) checkConfigAutoupdate.checked = !!appConfig.auto_update_enabled;
}

// Save Config
async function saveConfig() {
  try {
    appConfig.query = inputConfigQuery ? inputConfigQuery.value.trim() : appConfig.query;
    appConfig.auto_update_interval_minutes = inputConfigInterval ? parseInt(inputConfigInterval.value) || 60 : 60;
    appConfig.auto_update_enabled = checkConfigAutoupdate ? checkConfigAutoupdate.checked : false;
    
    await invoke('save_config', { config: appConfig });
    setStatus('设置已保存');
  } catch (err) {
    setStatus(`保存设置失败: ${err}`);
  }
}

// Render Local Gallery
function renderGallery(items) {
  cachedWallpapers = items || [];
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

  cachedWallpapers.forEach(item => {
    const card = document.createElement('div');
    card.className = 'gallery-card';

    const fileUri = window.__TAURI__ ? window.__TAURI__.core.convertFileSrc(item.file_path) : item.file_path;

    card.innerHTML = `
      <div class="card-thumb-wrap">
        <img class="card-thumb" src="${fileUri}" alt="${escapeHtml(item.title)}" loading="lazy" />
      </div>
      <div class="card-content">
        <div class="card-item-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</div>
        <div class="card-item-date">🕒 ${escapeHtml(item.download_date)}</div>
        <div class="card-actions">
          <button class="winui-btn winui-btn-primary btn-set-wp">🖥 设为壁纸</button>
          <button class="winui-btn winui-btn-danger btn-delete-wp">🗑 删除</button>
        </div>
      </div>
    `;

    const btnSet = card.querySelector('.btn-set-wp');
    const btnDelete = card.querySelector('.btn-delete-wp');

    btnSet.addEventListener('click', async () => {
      try {
        setStatus(`正在设置桌面壁纸: ${item.title}...`);
        await invoke('set_desktop_wallpaper', { pathStr: item.file_path });
        setStatus(`成功设置桌面壁纸: ${item.title}`);
        loadCurrentWallpaper();
      } catch (err) {
        setStatus(`设置壁纸失败: ${err}`);
      }
    });

    btnDelete.addEventListener('click', async () => {
      try {
        await invoke('delete_wallpaper', { filePath: item.file_path });
        setStatus(`已删除壁纸: ${item.title}`);
        loadWallpapers();
      } catch (err) {
        setStatus(`删除失败: ${err}`);
      }
    });

    galleryGrid.appendChild(card);
  });
}

// Load Local Wallpapers
async function loadWallpapers() {
  try {
    const items = await invoke('get_cached_wallpapers');
    renderGallery(items);
  } catch (err) {
    setStatus(`获取本地壁纸失败: ${err}`);
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

// Render Online Wallpapers (Grid & Pagination)
function renderOnlineGrid(items) {
  onlineWallpapers = items || [];
  onlineGrid.innerHTML = '';

  if (onlineWallpapers.length === 0) {
    onlineGrid.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;"><div class="empty-icon">🌐</div><h2 class="empty-title">未发现在线壁纸</h2><p class="empty-desc">请尝试更换分类或检查网络连接！</p></div>';
    return;
  }

  onlineWallpapers.forEach(item => {
    const card = document.createElement('div');
    card.className = 'gallery-card';

    card.innerHTML = `
      <div class="card-thumb-wrap">
        <img class="card-thumb" src="${item.thumb_url}" alt="${escapeHtml(item.title)}" loading="lazy" />
      </div>
      <div class="card-content">
        <div class="card-item-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</div>
        <div class="card-item-date">👤 ${escapeHtml(item.author)} • ${escapeHtml(item.source)}</div>
        <div class="card-actions">
          <button class="winui-btn winui-btn-primary btn-apply-online">🖥 设为壁纸</button>
        </div>
      </div>
    `;

    const btnApply = card.querySelector('.btn-apply-online');
    btnApply.addEventListener('click', async () => {
      try {
        btnApply.disabled = true;
        btnApply.textContent = '⏳ 下载并应用中...';
        setStatus(`正在下载并应用壁纸: ${item.title}...`);
        
        await invoke('download_and_set_online_wallpaper', { item });
        
        setStatus(`成功应用壁纸: ${item.title}`);
        await loadWallpapers();
        await loadCurrentWallpaper();
      } catch (err) {
        setStatus(`下载应用壁纸失败: ${err}`);
      } finally {
        btnApply.disabled = false;
        btnApply.textContent = '🖥 设为壁纸';
      }
    });

    onlineGrid.appendChild(card);
  });
}

// Load Online Wallpapers List with Pagination
async function loadOnlineWallpapers() {
  try {
    const source = selectSource ? selectSource.value : 'picsum';
    const query = inputOnlineQuery ? inputOnlineQuery.value.trim() : '';

    setStatus(`正在获取 ${source} 壁纸列表（第 ${onlinePage} 页）...`);
    
    // Update pagination UI
    if (pageInfo) pageInfo.textContent = `第 ${onlinePage} 页`;
    if (btnPrevPage) btnPrevPage.disabled = (onlinePage <= 1);

    const list = await invoke('fetch_online_wallpapers', {
      source,
      query,
      page: onlinePage,
      limit: pageLimit,
    });

    renderOnlineGrid(list);
    setStatus(`已加载 ${source} 壁纸第 ${onlinePage} 页 (共 ${list.length} 张)`);
  } catch (err) {
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
  if (btnRefreshGallery) btnRefreshGallery.addEventListener('click', loadWallpapers);

  if (selectSource) {
    selectSource.addEventListener('change', () => {
      const isWallhaven = (selectSource.value === 'wallhaven');
      if (groupSearch) groupSearch.style.display = isWallhaven ? 'flex' : 'none';
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
  if (inputConfigInterval) inputConfigInterval.addEventListener('change', saveConfig);
  if (checkConfigAutoupdate) checkConfigAutoupdate.addEventListener('change', saveConfig);
}

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();
  setupEvents();
  await loadConfig();
  await loadWallpapers();
  await loadCurrentWallpaper();
});
