/**
 * ==============================================================================
 * Test Setup & Mock Tauri IPC Harness for wallpaper_app
 * ==============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Default In-Memory Mock Backend State
export const initialMockBackendState = {
  config: {
    schema_version: 1, batch_count: 6, wallpaper_style: 'fill', pexels_api_key: '', font_family: 'rounded', language: 'zh-CN', custom_theme_color: null,
    query: '',
    cache_dir: 'cache/wallpapers',
    auto_update_interval_minutes: 60,
    auto_update_enabled: false,
    unsplash_access_key: 'mock-unsplash-key-12345',
    load_mode: 'pagination',
    card_ratio: 'uniform',
    theme_color: 'violet',
    amoled_mode: false,
    random_source: 'all'
  },
  cachedWallpapers: [
    {
      id: 'local-1',
      file_path: 'D:/Project/wallpaper_app/cache/wallpapers/nature_mountains_4k.jpg',
      filename: 'nature_mountains_4k.jpg',
      title: 'nature_mountains_4k',
      resolution: '3840x2160',
      size: 4194304,
      file_size_formatted: '4.0 MB',
      created_at: '2026-08-20T10:00:00Z',
      source: 'local'
    },
    {
      id: 'local-2',
      file_path: 'D:/Project/wallpaper_app/cache/wallpapers/cyberpunk_city_8k.jpg',
      filename: 'cyberpunk_city_8k.jpg',
      title: 'cyberpunk_city_8k',
      resolution: '7680x4320',
      size: 8388608,
      file_size_formatted: '8.0 MB',
      created_at: '2026-08-22T14:30:00Z',
      source: 'local'
    }
  ],
  currentWallpaper: 'D:/Project/wallpaper_app/cache/wallpapers/nature_mountains_4k.jpg',
  autoLaunchEnabled: false,
  openedUrls: [],
  browseHistory: [],
  invokedCommands: []
};

export let mockBackendState = JSON.parse(JSON.stringify(initialMockBackendState));

export function resetMockBackendState() {
  mockBackendState = JSON.parse(JSON.stringify(initialMockBackendState));
}

// Generate deterministic mock online wallpapers
export function generateMockOnlineWallpapers(source, query = '', page = 1, limit = 16) {
  const items = [];
  const startIdx = (page - 1) * limit + 1;
  const total = 48; // 3 pages of mock wallpapers

  for (let i = 0; i < limit; i++) {
    const num = startIdx + i;
    if (num > total) break;
    items.push({
      id: `${source}-${num}`,
      title: `${source.toUpperCase()} Wallpaper ${num} - ${query || 'Curated'}`,
      thumb_url: `https://images.mock-cdn.com/${source}/thumb_${num}.jpg`,
      raw_url: `https://images.mock-cdn.com/${source}/raw_${num}.jpg`,
      full_url: `https://images.mock-cdn.com/${source}/full_${num}.jpg`,
      author: `Creator ${num}`,
      author_url: `https://${source}.com/@creator${num}`,
      resolution: '3840x2160',
      source: source,
      link: `https://${source}.com/photos/${num}`
    });
  }
  return items;
}

// Setup Tauri IPC Mock on window.__TAURI__
export function setupMockTauri(customOverrides = {}) {
  const defaultHandlers = {
    get_config: async () => {
      return { ...mockBackendState.config };
    },
    save_config: async (args) => {
      if (args && args.config) {
        mockBackendState.config = Object.fromEntries(Object.keys(initialMockBackendState.config).map(key => [key, args.config[key] ?? initialMockBackendState.config[key]]));
      }
      return { success: true, config: mockBackendState.config };
    },
    select_cache_dir: async () => {
      return 'D:/MockWallpaperCache';
    },
    open_cache_folder: async () => {
      return { success: true };
    },
    get_local_image_path: async (args) => `data:image/jpeg;base64,mockBase64DataFor_${args.filePath}`,
    delete_wallpapers_batch: async (args) => {
      const deleted = args.filePaths.filter(p => mockBackendState.cachedWallpapers.some(w => w.file_path === p));
      const failed = args.filePaths.filter(p => !deleted.includes(p)).map(file_path => ({ file_path, error: 'Missing image' }));
      mockBackendState.cachedWallpapers = mockBackendState.cachedWallpapers.filter(w => !deleted.includes(w.file_path));
      return { deleted, failed };
    },
    download_online_wallpaper: async (args) => {
      if (typeof args?.item?.author !== 'string') throw new Error('Missing author');
      const file_path = `D:/MockWallpaperCache/downloaded_${Date.now()}.jpg`;
      const item = { ...args.item, file_path, url: args.item.raw_url, download_date: new Date().toISOString() };
      mockBackendState.cachedWallpapers.unshift(item);
      return item;
    },
    read_file_data_url: async (args) => {
      return `data:image/jpeg;base64,mockBase64DataFor_${args?.filePath || args?.path || 'file'}`;
    },
    fetch_remote_image_base64: async (args) => {
      return `data:image/jpeg;base64,mockRemoteImage_${args?.url || 'remote'}`;
    },
    get_cached_wallpapers: async () => {
      return [...mockBackendState.cachedWallpapers];
    },
    fetch_online_wallpapers: async (args) => {
      const source = args?.source || 'pexels';
      const query = args?.query || '';
      const page = args?.page || 1;
      const limit = args?.limit || 16;
      return generateMockOnlineWallpapers(source, query, page, limit);
    },
    download_and_set_online_wallpaper: async (args) => {
      const item = args?.item || args;
      if (typeof item.author !== 'string') throw new Error('Missing author');
      const newPath = `D:/Project/wallpaper_app/cache/wallpapers/downloaded_${Date.now()}.jpg`;
      mockBackendState.currentWallpaper = newPath;
      mockBackendState.cachedWallpapers.unshift({
        id: `downloaded-${Date.now()}`,
        file_path: newPath,
        filename: `downloaded_${Date.now()}.jpg`,
        title: item?.title || 'Downloaded Wallpaper',
        resolution: item?.resolution || '3840x2160',
        size: 5242880,
        file_size_formatted: '5.0 MB',
        created_at: new Date().toISOString(),
        source: item?.source || 'online'
      });
      return { success: true, path: newPath };
    },
    set_desktop_wallpaper: async (args) => {
      mockBackendState.currentWallpaper = args?.pathStr || args?.filePath || args?.path || '';
      return { success: true, path: mockBackendState.currentWallpaper };
    },
    delete_wallpaper: async (args) => {
      const targetPath = args?.filePath || args?.path;
      mockBackendState.cachedWallpapers = mockBackendState.cachedWallpapers.filter(
        (w) => w.file_path !== targetPath && w.path !== targetPath
      );
      return { success: true };
    },
    get_current_wallpaper: async () => {
      return mockBackendState.currentWallpaper;
    },
    window_minimize: async () => ({ success: true, action: 'minimize' }),
    window_toggle_maximize: async () => ({ success: true, action: 'toggle_maximize' }),
    window_close: async () => ({ success: true, action: 'close' }),
    show_main_window: async () => ({ success: true, action: 'show' }),
    get_auto_launch_enabled: async () => mockBackendState.autoLaunchEnabled,
    set_auto_launch_enabled: async (args) => {
      mockBackendState.autoLaunchEnabled = !!args?.enabled;
      return { success: true, enabled: mockBackendState.autoLaunchEnabled };
    },
    open_in_browser: async (args) => {
      mockBackendState.openedUrls.push(args?.url);
      return { success: true, url: args?.url };
    },
    get_browse_history: async () => mockBackendState.browseHistory || [],
    record_browse_history: async (args) => {
      if (!mockBackendState.browseHistory) mockBackendState.browseHistory = [];
      const item = args?.item;
      if (item) {
        mockBackendState.browseHistory = mockBackendState.browseHistory.filter(
          (h) => h.id !== item.id && h.raw_url !== item.raw_url
        );
        mockBackendState.browseHistory.unshift(item);
      }
      return { success: true };
    },
    clear_browse_history: async () => {
      mockBackendState.browseHistory = [];
      return { success: true };
    },
    delete_browse_history_item: async (args) => {
      const targetId = args?.id;
      if (mockBackendState.browseHistory && targetId) {
        mockBackendState.browseHistory = mockBackendState.browseHistory.filter(
          (h) => h.id !== targetId && h.raw_url !== targetId
        );
      }
      return { success: true };
    }
  };

  const handlers = { ...defaultHandlers, ...customOverrides };

  const invoke = async (cmd, args) => {
    mockBackendState.invokedCommands.push({ cmd, args, time: Date.now() });
    if (typeof handlers[cmd] === 'function') {
      return await handlers[cmd](args);
    }
    console.warn(`[Mock Tauri] Unhandled command: ${cmd}`, args);
    return null;
  };

  window.__TAURI__ = {
    invoke,
    core: { invoke, convertFileSrc: path => `http://asset.localhost/${encodeURIComponent(path)}` },
    tauri: { invoke }
  };

  return window.__TAURI__;
}

// Helper to load index.html markup into document.body
export function loadIndexHTML() {
  window.Function(fs.readFileSync(path.join(projectRoot, 'ui', 'virtual-grid.js'), 'utf8'))();
  window.Function(fs.readFileSync(path.join(projectRoot, 'ui', 'images.js'), 'utf8'))();
  window.Function(fs.readFileSync(path.join(projectRoot, 'ui', 'i18n.js'), 'utf8'))();
  const htmlPath = path.join(projectRoot, 'ui', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  
  // Extract body inner HTML
  const bodyMatch = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html);
  if (bodyMatch) {
    document.body.innerHTML = bodyMatch[1];
  } else {
    document.body.innerHTML = html;
  }
}

// Polyfill browser globals for JSDOM
export function setupBrowserEnvironment() {
  if (typeof window.scrollTo !== 'function') {
    window.scrollTo = () => {};
  }
  if (!window.matchMedia) {
    window.matchMedia = () => ({
      matches: false,
      addListener: () => {},
      removeListener: () => {}
    });
  }
}

// Execute setup before each test file
setupBrowserEnvironment();
setupMockTauri();
