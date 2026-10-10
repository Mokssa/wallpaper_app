import fs from 'node:fs';
import { JSDOM } from 'jsdom';

// Structural benchmark with controlled geometry; this does not measure WebView frame rate or memory.
const html = fs.readFileSync(new URL('../ui/index.html', import.meta.url), 'utf8');
for (const count of [100, 500, 1000]) {
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost' });
  const window = dom.window;
  for (const name of ['images.js', 'virtual-grid.js', 'i18n.js']) window.Function(fs.readFileSync(new URL(`../ui/${name}`, import.meta.url), 'utf8'))();
  const grid = window.document.getElementById('gallery-grid');
  const scroll = window.document.getElementById('flutter-main-scroll');
  grid.classList.add('ratio-uniform');
  Object.defineProperty(grid, 'clientWidth', { value: 800 });
  Object.defineProperty(scroll, 'clientHeight', { value: 600 });
  window.getComputedStyle = () => ({ gridTemplateColumns: '250px 250px 250px', rowGap: '12px' });
  grid.getBoundingClientRect = () => ({ top: -scroll.scrollTop }); scroll.getBoundingClientRect = () => ({ top: 0 });
  let imageRequests = 0;
  window.__TAURI__ = { core: { invoke: async cmd => {
    if (cmd === 'get_local_image_path') { imageRequests++; return 'data:image/jpeg;base64,test'; }
    return null;
  } } };
  const code = fs.readFileSync(new URL('../ui/app.js', import.meta.url), 'utf8').split('// Initialization')[0];
  const api = window.Function(code + '\nreturn { renderGallery };')();
  const start = performance.now();
  await api.renderGallery(Array.from({ length: count }, (_, id) => ({ id: String(id), title: `Image ${id}`, file_path: `D:/fixture/${id}.jpg` })));
  await new Promise(resolve => setTimeout(resolve, 0));
  console.log(JSON.stringify({ items: count, mountedCards: grid.querySelectorAll('.m3-wallpaper-card').length,
    thumbnailRequests: imageRequests, fullImageDataRequests: 0, renderMs: +(performance.now() - start).toFixed(1),
    environment: 'JSDOM; 800px grid, 600px viewport, 3 columns' }));
  dom.window.close();
}
