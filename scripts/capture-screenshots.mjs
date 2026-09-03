import http from 'http';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 8999;
const ROOT = path.resolve('d:/Project/wallpaper_app');

const SAMPLES_DIR = path.join(ROOT, 'docs/sample_wallpapers');
if (!fs.existsSync(SAMPLES_DIR)) fs.mkdirSync(SAMPLES_DIR, { recursive: true });

const SAMPLE_URLS = [
  { file: 'wp1.jpg', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=640&q=80', title: 'Yosemite Valley Lake' },
  { file: 'wp2.jpg', url: 'https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?auto=format&fit=crop&w=640&q=80', title: 'Cyberpunk Neon Highway' },
  { file: 'wp3.jpg', url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=640&q=80', title: 'Misty Alpine Morning' },
  { file: 'wp4.jpg', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=640&q=80', title: 'Aurora Borealis Space' },
  { file: 'wp5.jpg', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=640&q=80', title: 'Tropical Azure Coast' },
  { file: 'wp6.jpg', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=640&q=80', title: 'Emerald Forest Light' },
  { file: 'wp7.jpg', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=640&q=80', title: 'Alpine Peak Horizon' },
  { file: 'wp8.jpg', url: 'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=640&q=80', title: 'Metropolis Skyline Night' }
];

async function ensureSampleWallpapers() {
  const realBase64 = [];
  for (const item of SAMPLE_URLS) {
    const filePath = path.join(SAMPLES_DIR, item.file);
    if (!fs.existsSync(filePath)) {
      console.log(`Downloading sample wallpaper ${item.file}...`);
      const res = await fetch(item.url);
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(filePath, buffer);
    }
    const dataUri = `data:image/jpeg;base64,${fs.readFileSync(filePath).toString('base64')}`;
    realBase64.push({ ...item, dataUri });
  }
  return realBase64;
}

async function main() {
  console.log('Ensuring high resolution sample wallpapers...');
  const wallpapers = await ensureSampleWallpapers();
  console.log(`Loaded ${wallpapers.length} real wallpapers.`);

  const indexHtml = fs.readFileSync(path.join(ROOT, 'ui/index.html'), 'utf8');

  // Build Mock Injected Script
  const mockScript = `
  <script>
  window.__REAL_WALLPAPERS__ = ${JSON.stringify(wallpapers.map(w => ({ title: w.title, thumb_url: w.dataUri })))};
  window.__TAURI__ = {
    core: {
      invoke: async (cmd, args) => {
        if (cmd === 'get_config') {
          return {
            cache_dir: 'C:/Users/User/Pictures/Wallpapers',
            wallpaper_style: 'fill',
            auto_update_enabled: false,
            auto_update_interval_minutes: 60,
            random_source: 'all',
            theme_color: 'indigo',
            amoled_mode: false,
            font_family: 'misans',
            language: 'zh-CN',
            load_mode: 'infinite',
            card_ratio: 'uniform',
            unsplash_access_key: '', // Strictly empty for privacy
            pexels_api_key: ''       // Strictly empty for privacy
          };
        }
        if (cmd === 'get_cached_wallpapers') {
          return window.__REAL_WALLPAPERS__.slice(0, 6).map((w, i) => ({
            id: 'loc-' + (i + 1),
            title: w.title,
            file_path: 'sample_' + (i + 1) + '.jpg',
            resolution: '3840x2160',
            raw_url: ''
          }));
        }
        if (cmd === 'get_browse_history') {
          const sources = ['bing', 'pexels', 'unsplash', 'wallhaven', 'bing', 'pexels'];
          const nowSec = Math.floor(Date.now() / 1000);
          return window.__REAL_WALLPAPERS__.slice(0, 6).map((w, i) => ({
            id: 'hist-' + (i + 1),
            title: w.title,
            thumb_url: w.thumb_url,
            raw_url: 'https://example.com/hist/' + (i + 1),
            source: sources[i % sources.length],
            viewed_at: nowSec - [30, 300, 1800, 7200, 86400, 172800][i]
          }));
        }
        if (cmd === 'read_file_data_url') {
          const pathStr = args && (args.filePath || args.path) ? (args.filePath || args.path) : '';
          const num = parseInt(pathStr.replace(/[^0-9]/g, ''), 10);
          if (!isNaN(num) && window.__REAL_WALLPAPERS__[num - 1]) {
            return window.__REAL_WALLPAPERS__[num - 1].thumb_url;
          }
          return window.__REAL_WALLPAPERS__[0].thumb_url;
        }
        if (cmd === 'fetch_online_wallpapers') {
          return window.__REAL_WALLPAPERS__.map((w, i) => ({
            id: 'online-' + (i + 1),
            title: w.title,
            thumb_url: w.thumb_url,
            resolution: '3840x2160',
            raw_url: 'https://example.com/' + (i + 1)
          }));
        }
        if (cmd === 'get_auto_launch_enabled') return false;
        if (cmd === 'check_app_update') return { current_version: '0.1.0', latest_version: '0.1.0', has_update: false };
        return null;
      }
    }
  };
  </script>
  `;

  const modifiedHtml = indexHtml.replace('<script src="i18n.js"></script>', `${mockScript}\n  <script src="i18n.js"></script>`);

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const tab = url.searchParams.get('tab') || 'gallery';
      const batch = url.searchParams.get('batch') === '1';

      let html = modifiedHtml;
      if (tab !== 'gallery') {
        html = html
          .replace('class="nav-item nav-rail-item active" id="nav-tab-gallery"', 'class="nav-item nav-rail-item" id="nav-tab-gallery"')
          .replace('id="tab-gallery" class="tab-page active"', 'id="tab-gallery" class="tab-page"')
          .replace(`class="nav-item nav-rail-item" id="nav-tab-${tab}"`, `class="nav-item nav-rail-item active" id="nav-tab-${tab}"`)
          .replace(`id="tab-${tab}" class="tab-page"`, `id="tab-${tab}" class="tab-page active"`);
      }

      const tabSwitchScript = `
        <script>
          window.addEventListener('DOMContentLoaded', () => {
            ${tab === 'explore' ? `
              setTimeout(() => {
                const bingBtn = document.querySelector('.segmented-btn[data-source="bing"]');
                if (bingBtn) bingBtn.click();
              }, 150);
            ` : ''}
            ${batch ? `
              setTimeout(() => {
                const batchBtn = document.getElementById('btn-gallery-batch-toggle');
                if (batchBtn) batchBtn.click();
                const selectAll = document.getElementById('check-batch-select-all');
                if (selectAll) { selectAll.checked = true; selectAll.dispatchEvent(new Event('change')); }
              }, 200);
            ` : ''}
          });
        </script>
      `;
      const finalHtml = html.replace('</body>', `${tabSwitchScript}\n</body>`);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(finalHtml);
    } else {
      const filePath = path.join(ROOT, 'ui', url.pathname);
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath);
        const mimeMap = {
          '.js': 'application/javascript',
          '.css': 'text/css',
          '.json': 'application/json',
          '.svg': 'image/svg+xml',
          '.png': 'image/png',
          '.woff2': 'font/woff2'
        };
        res.writeHead(200, { 'Content-Type': mimeMap[ext] || 'text/plain' });
        res.end(fs.readFileSync(filePath));
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    }
  });

  server.listen(PORT, async () => {
    console.log(`Preview server running on port ${PORT}`);
    const outDir = path.join(ROOT, 'docs/screenshots');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const captures = [
      { name: 'explore.png', tab: 'explore' },
      { name: 'gallery_batch.png', tab: 'gallery', batch: true },
      { name: 'history.png', tab: 'history' },
      { name: 'settings.png', tab: 'settings' },
      { name: 'about.png', tab: 'about' }
    ];

    for (const c of captures) {
      const targetFile = path.join(outDir, c.name);
      console.log(`Capturing ${c.name}...`);
      const targetUrl = `http://localhost:${PORT}/?tab=${c.tab}${c.batch ? '&batch=1' : ''}`;

      try {
        await execFileAsync(EDGE_PATH, [
          '--headless',
          '--disable-gpu',
          '--window-size=1280,820',
          '--virtual-time-budget=3500',
          `--screenshot=${targetFile}`,
          targetUrl
        ]);
        console.log(`Saved screenshot: ${targetFile}`);
      } catch (e) {
        console.error(`Failed to capture ${c.name}:`, e.message);
      }
    }

    server.close(() => {
      console.log('Done capturing all real-image screenshots!');
      process.exit(0);
    });
  });
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
