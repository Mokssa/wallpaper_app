// ==========================================================================
// WallpaperApp Client Script (Tauri v2 IPC)
// ==========================================================================

const invoke = window.__TAURI__ ? window.__TAURI__.core.invoke : async (cmd, args) => {
  console.log(`[Mock Invoke] ${cmd}`, args);
  return null;
};

// State
let appConfig = {
  query: "nature,wallpaper,architecture",
  cache_dir: "cache/wallpapers",
  auto_update_interval_minutes: 60,
  auto_update_enabled: false,
};

let cachedWallpapers = [];

// DOM Elements
const navItems = document.querySelectorAll('.nav-item');
const tabPages = document.querySelectorAll('.tab-page');
const statusMsgEl = document.getElementById('status-msg');

const galleryGrid = document.getElementById('gallery-grid');
const galleryEmptyState = document.getElementById('gallery-empty-state');
const galleryCountText = document.getElementById('gallery-count-text');
const btnRefreshGallery = document.getElementById('btn-refresh-gallery');

const btnFetchBing = document.getElementById('btn-fetch-bing');
const btnFetchUnsplash = document.getElementById('btn-fetch-unsplash');
const inputExploreQuery = document.getElementById('input-explore-query');

const inputConfigQuery = document.getElementById('input-config-query');
const labelCacheDir = document.getElementById('label-cache-dir');
const inputConfigInterval = document.getElementById('input-config-interval');
const checkConfigAutoupdate = document.getElementById('check-config-autoupdate');
const currentWpText = document.getElementById('current-wp-text');

// Helper to set status
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
  if (inputExploreQuery) inputExploreQuery.value = appConfig.query || '';
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

// Render Gallery
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

    // File URI convert for Webview2
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

    // Event listeners
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

// Load Wallpapers
async function loadWallpapers() {
  try {
    setStatus('正在获取缓存壁纸列表...');
    const items = await invoke('get_cached_wallpapers');
    renderGallery(items);
    setStatus('壁纸列表已更新');
  } catch (err) {
    setStatus(`获取壁纸失败: ${err}`);
  }
}

// Load Current Wallpaper
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

// Fetch Bing Wallpaper
async function fetchBing() {
  try {
    btnFetchBing.disabled = true;
    setStatus('正在从 Bing 获取每日壁纸...');
    const item = await invoke('fetch_bing_wallpaper');
    setStatus(`成功下载 Bing 壁纸: ${item.title}`);
    await loadWallpapers();
  } catch (err) {
    setStatus(`获取 Bing 壁纸失败: ${err}`);
  } finally {
    btnFetchBing.disabled = false;
  }
}

// Fetch Unsplash Wallpaper
async function fetchUnsplash() {
  try {
    btnFetchUnsplash.disabled = true;
    const query = inputExploreQuery ? inputExploreQuery.value.trim() : appConfig.query;
    setStatus(`正在从 Unsplash 匹配【${query}】壁纸...`);
    const item = await invoke('fetch_unsplash_wallpaper', { query });
    setStatus(`成功下载 Unsplash 壁纸: ${item.title}`);
    await loadWallpapers();
  } catch (err) {
    setStatus(`获取 Unsplash 壁纸失败: ${err}`);
  } finally {
    btnFetchUnsplash.disabled = false;
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
  if (btnFetchBing) btnFetchBing.addEventListener('click', fetchBing);
  if (btnFetchUnsplash) btnFetchUnsplash.addEventListener('click', fetchUnsplash);

  if (inputConfigQuery) inputConfigQuery.addEventListener('change', saveConfig);
  if (inputConfigInterval) inputConfigInterval.addEventListener('change', saveConfig);
  if (checkConfigAutoupdate) checkConfigAutoupdate.addEventListener('change', saveConfig);

  if (inputExploreQuery) {
    inputExploreQuery.addEventListener('change', () => {
      if (inputConfigQuery) inputConfigQuery.value = inputExploreQuery.value;
      saveConfig();
    });
  }
}

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();
  setupEvents();
  await loadConfig();
  await loadWallpapers();
  await loadCurrentWallpaper();
});
