// Read-only smoke check against this application's WebView2 debugging endpoint.
const endpoint = process.argv[2] || 'http://[::1]:9222';
const targets = await (await fetch(`${endpoint}/json/list`)).json();
const target = targets.find(page => page.type === 'page' && page.title === 'Wallpaper');
if (!target) throw new Error('Wallpaper WebView not found; start the debug app first.');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});
let nextId = 0;
const pending = new Map();
const errors = [];
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const callback = pending.get(message.id);
    if (callback) { pending.delete(message.id); callback(message); }
  }
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
  if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') errors.push(message.params.entry.text);
});
async function send(method, params = {}) {
  const id = ++nextId;
  const response = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`${method} timed out`)); }, 15000);
    pending.set(id, result => { clearTimeout(timeout); result.error ? reject(new Error(result.error.message)) : resolve(result.result); });
  });
  socket.send(JSON.stringify({ id, method, params }));
  return response;
}
try {
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.reload');
  const result = await send('Runtime.evaluate', {
    awaitPromise: true, returnByValue: true,
    expression: `(async () => {
      const deadline = Date.now() + 8000;
      while (!window.__TAURI__?.core || typeof appConfig === 'undefined' || !appConfig.cache_dir) {
        if (Date.now() > deadline) throw new Error('Application initialization timed out');
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      const invoke = window.__TAURI__.core.invoke;
      const [config, gallery, history] = await Promise.all([
        invoke('get_config'), invoke('get_cached_wallpapers'), invoke('get_browse_history')
      ]);
      const unlisten = await window.__TAURI__.event.listen('rotation_completed', () => {});
      unlisten();
      let assetLoaded = null;
      if (gallery.length) {
        const path = await invoke('get_local_image_path', { filePath: gallery[0].file_path, thumbnail: true });
        assetLoaded = await new Promise(resolve => {
          const img = new Image(); const timeout = setTimeout(() => resolve(false), 8000);
          img.onload = () => { clearTimeout(timeout); resolve(img.naturalWidth > 0); };
          img.onerror = () => { clearTimeout(timeout); resolve(false); };
          img.src = window.__TAURI__.core.convertFileSrc(path);
        });
      }
      switchTab('settings');
      await loadWallpapers();
      switchTab('gallery');
      const imageDeadline = Date.now() + 8000;
      while ([...document.querySelectorAll('#gallery-grid img')]
        .some(img => !img.src || !img.complete) && Date.now() < imageDeadline) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      const galleryImages = [...document.querySelectorAll('#gallery-grid img')];
      return {
        configContract: ['random_source', 'theme_color', 'custom_theme_color', 'amoled_mode'].every(key => key in config),
        galleryCount: gallery.length, historyCount: history.length, assetLoaded,
        galleryImages: {
          rendered: galleryImages.length,
          loaded: galleryImages.filter(img => img.naturalWidth > 0).length,
          broken: galleryImages.filter(img => img.src && img.complete && img.naturalWidth === 0).length
        },
        modulesLoaded: !!window.WallpaperImages && !!window.WallpaperVirtualGrid,
        eventPermission: true
      };
    })()`
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  const report = result.result.value;
  console.log(JSON.stringify({ ...report, runtimeErrors: errors }, null, 2));
  if (!report.configContract || !report.modulesLoaded || report.assetLoaded === false ||
      report.galleryImages.broken || report.galleryImages.loaded !== report.galleryImages.rendered || errors.length) {
    throw new Error('WebView smoke check failed');
  }
} finally {
  socket.close();
}
