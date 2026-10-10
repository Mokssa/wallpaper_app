import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { loadIndexHTML, resetMockBackendState, setupMockTauri, mockBackendState } from './setup.js';

const source = fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../ui/app.js'), 'utf8').split('// Initialization')[0];
function runtime() {
  return new Function(source + `
    return { loadOnlineWallpapers, renderGallery, downloadOnlyAction, handleQuickRandom, renderOnlineGrid,
      recordBrowseHistory, saveConfig, pickCacheDir, loadWallpapers, executeBatchDelete,
      confirm: () => pendingConfirmAction(),
      configure: config => Object.assign(appConfig, config),
      source: value => { currentSource = value; onlinePage = 1; },
      page: value => { onlinePage = value; },
      select: paths => { isBatchMode = true; paths.forEach(p => selectedWallpapers.add(p)); },
      state: () => ({ onlineWallpapers, onlinePage, isOnlineLoading, cachedWallpapers, directory: appConfig.cache_dir, selected: [...selectedWallpapers] }) };
  `)();
}
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { resolve, promise }; }
const item = source => ({ id: source, title: source, author: 'Artist', source,
  thumb_url: `https://example.com/${source}-thumb.jpg`, raw_url: `https://example.com/${source}.jpg` });

describe('User-visible optimization regressions', () => {
  beforeEach(() => { resetMockBackendState(); loadIndexHTML(); setupMockTauri(); });

  it('save to gallery does not change the desktop wallpaper', async () => {
    const original = mockBackendState.currentWallpaper;
    await runtime().downloadOnlyAction(item('pexels'));
    expect(mockBackendState.currentWallpaper).toBe(original);
    expect(mockBackendState.invokedCommands.some(c => c.cmd === 'download_online_wallpaper')).toBe(true);
    expect(mockBackendState.invokedCommands.some(c => c.cmd === 'download_and_set_online_wallpaper')).toBe(false);
  });

  it('does not report a new directory as saved when configuration persistence fails', async () => {
    setupMockTauri({ select_cache_dir: async () => 'D:/new', save_config: async () => { throw new Error('disk full'); } });
    const api = runtime(); api.configure({ cache_dir: 'D:/old' });
    await api.pickCacheDir();
    expect(api.state().directory).toBe('D:/old');
    expect(document.getElementById('snackbar-text').textContent).toContain('disk full');
  });

  it('a failed stale gallery refresh does not erase a newer successful refresh', async () => {
    let rejectOld; let calls = 0;
    const old = new Promise((_, reject) => { rejectOld = reject; });
    const items = [{ file_path: 'D:/Wallpapers/new.jpg', title: 'new' }];
    setupMockTauri({ get_cached_wallpapers: () => ++calls === 1 ? old : Promise.resolve(items) });
    const api = runtime(); const first = api.loadWallpapers();
    await api.loadWallpapers(); rejectOld(new Error('stale error')); await first;
    expect(api.state().cachedWallpapers).toEqual(items);
  });

  it('latest source wins while an old provider is still pending', async () => {
    const old = deferred();
    setupMockTauri({ fetch_online_wallpapers: args => args.source === 'pexels' ? old.promise : Promise.resolve([item(args.source)]) });
    const api = runtime();
    const first = api.loadOnlineWallpapers();
    api.source('bing'); await api.loadOnlineWallpapers();
    old.resolve([item('pexels')]); await first;
    expect(api.state().onlineWallpapers.map(w => w.id)).toEqual(['bing']);
    expect(api.state().isOnlineLoading).toBe(false);
  });

  it('coalesces identical in-flight searches', async () => {
    const pending = deferred(); let calls = 0;
    setupMockTauri({ fetch_online_wallpapers: () => { calls++; return pending.promise; } });
    const api = runtime(); const first = api.loadOnlineWallpapers();
    await api.loadOnlineWallpapers();
    expect(calls).toBe(1); pending.resolve([]); await first;
  });

  it('failed pagination does not skip the failed page', async () => {
    setupMockTauri({ fetch_online_wallpapers: async () => { throw new Error('offline'); } });
    const api = runtime(); api.page(2); await api.loadOnlineWallpapers(true);
    expect(api.state().onlinePage).toBe(1);
    expect(api.state().isOnlineLoading).toBe(false);
  });

  it('tries three candidates when the first two downloads fail', async () => {
    let attempts = 0;
    setupMockTauri({ fetch_online_wallpapers: async () => [item('a'), item('b'), item('c')],
      download_and_set_online_wallpaper: async () => { if (++attempts < 3) throw new Error('unavailable'); return {}; } });
    const api = runtime(); api.configure({ random_source: 'bing' });
    await api.handleQuickRandom(); expect(attempts).toBe(3);
  });

  it('renders a large gallery without reading full-resolution image data', async () => {
    const api = runtime();
    await api.renderGallery(Array.from({ length: 100 }, (_, i) => ({ file_path: `D:/Wallpapers/${i}.jpg`, title: `${i}` })));
    expect(document.querySelectorAll('#gallery-grid img')).toHaveLength(100);
    expect(mockBackendState.invokedCommands.filter(c => c.cmd === 'read_file_data_url')).toHaveLength(0);
    expect([...document.querySelectorAll('#gallery-grid img')].every(img => img.loading === 'lazy')).toBe(true);
  });

  it('a broken fallback image is not fetched repeatedly', async () => {
    const api = runtime(); api.renderOnlineGrid([item('broken')]);
    const img = document.querySelector('#online-grid img');
    await img.onerror(); await img.onerror();
    expect(mockBackendState.invokedCommands.filter(c => c.cmd === 'fetch_remote_image_base64')).toHaveLength(1);
  });

  it('records the metadata needed to download a history item', async () => {
    await runtime().recordBrowseHistory(item('history'));
    expect(mockBackendState.browseHistory[0].author).toBe('Artist');
    expect(mockBackendState.browseHistory[0]).toHaveProperty('copyright_link');
  });

  it('partial batch deletion keeps failed items selected for retry', async () => {
    const path = mockBackendState.cachedWallpapers[0].file_path;
    setupMockTauri({ delete_wallpapers_batch: async () => ({ deleted: [], failed: [{ file_path: path, error: 'locked' }] }) });
    const api = runtime(); api.select([path]); api.executeBatchDelete(); await api.confirm();
    expect(api.state().selected).toEqual([path]);
    expect(document.getElementById('snackbar-text').textContent).toContain('失败');
  });
});
