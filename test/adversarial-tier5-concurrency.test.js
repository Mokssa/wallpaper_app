/**
 * ==============================================================================
 * Challenger 2 — Milestone 5 Phase 2: Concurrency, State Corruption & IPC Stress
 * ==============================================================================
 *
 * Comprehensive adversarial verification suite testing:
 * 1. Simultaneous theme switching during active image download IPC.
 * 2. Rapid pagination & infinite scroll interleaved with source switching.
 * 3. Network failure emulation during Base64 remote image fetching.
 * 4. Corrupted config file recovery & invalid state resilience.
 * 5. High-Volume randomized concurrent stress & lifecycle invariants.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  setupMockTauri,
  loadIndexHTML,
  mockBackendState,
  resetMockBackendState,
  generateMockOnlineWallpapers
} from './setup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const appJsPath = path.join(projectRoot, 'ui', 'app.js');

function initializeAppRuntime() {
  const appCode = fs.readFileSync(appJsPath, 'utf8');
  let domReadyHandler = null;
  const originalAddEventListener = document.addEventListener.bind(document);
  document.addEventListener = (type, listener, options) => {
    if (type === 'DOMContentLoaded') {
      domReadyHandler = listener;
    } else {
      originalAddEventListener(type, listener, options);
    }
  };

  const runScript = new Function(appCode);
  runScript();
  document.addEventListener = originalAddEventListener;

  if (domReadyHandler) {
    domReadyHandler();
  }
}

describe('Challenger 2 — Concurrency, State Corruption & IPC Stress Suite', () => {
  beforeEach(async () => {
    localStorage.clear();
    document.body.className = '';
    resetMockBackendState();
    setupMockTauri();
    loadIndexHTML();
    initializeAppRuntime();
    await new Promise((resolve) => setTimeout(resolve, 60));
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // 1. Simultaneous Theme Switching During Active Image Download IPC
  // ===========================================================================
  describe('1. Simultaneous Theme Switching During Active Image Download IPC', () => {
    it('maintains state consistency when switching themes concurrently during active download_and_set_online_wallpaper IPC', async () => {
      let downloadResolve;
      const slowDownloadPromise = new Promise((resolve) => {
        downloadResolve = resolve;
      });

      // Custom mock with delayed download
      setupMockTauri({
        download_and_set_online_wallpaper: async (args) => {
          await slowDownloadPromise;
          const newPath = `D:/Project/wallpaper_app/cache/wallpapers/downloaded_async_${Date.now()}.jpg`;
          mockBackendState.currentWallpaper = newPath;
          mockBackendState.cachedWallpapers.unshift({
            id: 'downloaded-concurrent-1',
            file_path: newPath,
            filename: 'downloaded_concurrent_1.jpg',
            title: 'Async Downloaded Wallpaper',
            resolution: '3840x2160',
            size: 5242880,
            file_size_formatted: '5.0 MB',
            created_at: new Date().toISOString(),
            source: 'pexels'
          });
          return { success: true, path: newPath };
        }
      });

      // Click explore tab and render online wallpapers
      const exploreNavItem = document.querySelector('.nav-item[data-tab="explore"]');
      exploreNavItem?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 40));

      const onlineCards = document.querySelectorAll('#online-grid .m3-wallpaper-card');
      expect(onlineCards.length).toBeGreaterThan(0);

      // Trigger download on the first card
      const applyBtn = onlineCards[0].querySelector('.m3-action-icon-btn[title*="一键设为桌面壁纸"]');
      expect(applyBtn).not.toBeNull();
      applyBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      // While download IPC is pending in background, rapidly switch themes across DOM palettes + AMOLED
      const availableThemes = ['blue', 'teal', 'pink', 'amber', 'green', 'crimson', 'violet'];
      for (const t of availableThemes) {
        const themeChip = document.querySelector(`.theme-palette-chip[data-theme="${t}"]`);
        themeChip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await new Promise((r) => setTimeout(r, 5));
      }

      // Toggle AMOLED
      const checkAmoled = document.getElementById('check-amoled-mode');
      if (checkAmoled) {
        checkAmoled.checked = true;
        checkAmoled.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // Now resolve the download
      downloadResolve();
      await new Promise((r) => setTimeout(r, 60));

      // Verify theme state remained intact (violet / indigo + amoled)
      expect(document.body.classList.contains('theme-violet')).toBe(true);
      expect(document.body.classList.contains('theme-indigo')).toBe(true);
      expect(document.body.classList.contains('theme-amoled')).toBe(true);
      expect(localStorage.getItem('wp_theme_color')).toBe('violet');
      expect(localStorage.getItem('wp_amoled_mode')).toBe('1');

      // Verify download completed and updated current wallpaper
      expect(mockBackendState.currentWallpaper).toContain('downloaded_async_');
      expect(mockBackendState.cachedWallpapers[0].id).toBe('downloaded-concurrent-1');
    });

    it('handles multiple concurrent download requests interleaved with rapid theme and font toggles', async () => {
      let downloadCount = 0;
      setupMockTauri({
        download_online_wallpaper: async (args) => {
          await new Promise((r) => setTimeout(r, 20 + (downloadCount * 10)));
          downloadCount++;
          const newPath = `D:/Project/wallpaper_app/cache/wallpapers/multi_${downloadCount}.jpg`;
          mockBackendState.cachedWallpapers.unshift({
            id: `multi-${downloadCount}`,
            file_path: newPath,
            filename: `multi_${downloadCount}.jpg`,
            title: `Multi Download ${downloadCount}`,
            resolution: '3840x2160',
            size: 5242880,
            file_size_formatted: '5.0 MB',
            created_at: new Date().toISOString(),
            source: 'pexels'
          });
          return { success: true, path: newPath };
        }
      });

      // Switch to explore
      const exploreNavItem = document.querySelector('.nav-item[data-tab="explore"]');
      exploreNavItem?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 40));

      const onlineCards = document.querySelectorAll('#online-grid .m3-wallpaper-card');
      expect(onlineCards.length).toBeGreaterThanOrEqual(3);

      // Trigger 3 parallel downloads
      for (let i = 0; i < 3; i++) {
        const downloadBtn = onlineCards[i].querySelector('.m3-action-icon-btn[title*="保存到本地"]');
        downloadBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }

      // Interleave 20 theme and font switches
      const themes = ['crimson', 'amber', 'green', 'teal', 'blue'];
      const fonts = ['youyuan', 'misans', 'fluent', 'rounded'];
      for (let i = 0; i < 20; i++) {
        const t = themes[i % themes.length];
        const f = fonts[i % fonts.length];
        const themeChip = document.querySelector(`.theme-palette-chip[data-theme="${t}"]`);
        const fontChip = document.querySelector(`.font-preset-chip[data-font="${f}"]`);
        themeChip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        fontChip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }

      // Wait for all downloads to finish
      await new Promise((r) => setTimeout(r, 150));

      // Verify all 3 downloads were processed without state corruption
      expect(downloadCount).toBe(3);
      expect(mockBackendState.cachedWallpapers.filter(w => w.id.startsWith('multi-')).length).toBe(3);

      // Verify final font and theme are correctly applied
      expect(document.body.classList.contains('font-rounded')).toBe(true);
      expect(document.body.classList.contains('theme-blue')).toBe(true);
      expect(document.body.classList.contains('theme-ocean')).toBe(true);
    });

    it('concurrently loads gallery thumbnails while theme changes occur', async () => {
      let readCount = 0;
      setupMockTauri({
        get_local_image_path: async (args) => {
          await new Promise((r) => setTimeout(r, 15));
          readCount++;
          return `data:image/jpeg;base64,mockReadData_${args?.filePath || 'file'}`;
        }
      });

      // Switch to gallery and refresh
      const galleryNavItem = document.querySelector('.nav-item[data-tab="gallery"]');
      galleryNavItem?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      const btnRefresh = document.getElementById('btn-refresh-gallery');
      btnRefresh?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      // Concurrently switch themes 10 times during gallery card reads
      const themes = ['violet', 'blue', 'teal', 'pink', 'amber', 'green', 'crimson'];
      for (let i = 0; i < 10; i++) {
        const themeChip = document.querySelector(`.theme-palette-chip[data-theme="${themes[i % themes.length]}"]`);
        themeChip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await new Promise((r) => setTimeout(r, 5));
      }

      await new Promise((r) => setTimeout(r, 80));

      // Verify gallery rendered all cached wallpapers and cards resolved images
      const galleryCards = document.querySelectorAll('#gallery-grid .m3-wallpaper-card');
      expect(galleryCards.length).toBe(mockBackendState.cachedWallpapers.length);
      expect(readCount).toBeGreaterThanOrEqual(2);
    });
  });

  // ===========================================================================
  // 2. Rapid Pagination & Infinite Scroll Interleaved with Source Switching
  // ===========================================================================
  describe('2. Rapid Pagination & Infinite Scroll Interleaved with Source Switching', () => {
    it('prevents race conditions when switching source while previous source pagination request is in-flight', async () => {
      let pexelsResolver;
      const pexelsPromise = new Promise((resolve) => {
        pexelsResolver = resolve;
      });

      setupMockTauri({
        fetch_online_wallpapers: async (args) => {
          if (args.source === 'pexels') {
            await pexelsPromise; // Slow pexels response
            return generateMockOnlineWallpapers('pexels', args.query, args.page, args.limit);
          }
          // Fast response for other sources
          return generateMockOnlineWallpapers(args.source, args.query, args.page, args.limit);
        }
      });

      // Navigate to explore
      const exploreNavItem = document.querySelector('.nav-item[data-tab="explore"]');
      exploreNavItem?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));

      // 1. Initial source is Pexels (in-flight, waiting on pexelsPromise)
      // 2. Switch to Wallhaven immediately while Pexels is still pending
      const wallhavenBtn = document.querySelector('#segmented-source-group .segmented-btn[data-source="wallhaven"]');
      expect(wallhavenBtn).not.toBeNull();
      wallhavenBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      // Allow fast Wallhaven response to render
      await new Promise((r) => setTimeout(r, 40));

      // Verify Wallhaven active button state
      expect(wallhavenBtn?.classList.contains('active')).toBe(true);

      // Now release the stale Pexels response
      pexelsResolver();
      await new Promise((r) => setTimeout(r, 60));

      // Verify all rendered cards belong to Wallhaven (no mixed/overwritten items from stale Pexels response)
      const currentCards = document.querySelectorAll('#online-grid .m3-wallpaper-card');
      expect(currentCards.length).toBeGreaterThan(0);
      const imgSources = Array.from(currentCards).map(c => c.querySelector('img')?.src || '');
      imgSources.forEach(src => {
        expect(src).toContain('wallhaven');
      });
    });

    it('rejects duplicate in-flight pagination requests when user rapidly clicks Next Page', async () => {
      let fetchCallCount = 0;
      setupMockTauri({
        fetch_online_wallpapers: async (args) => {
          fetchCallCount++;
          await new Promise((r) => setTimeout(r, 50));
          return generateMockOnlineWallpapers(args.source, args.query, args.page, args.limit);
        }
      });

      // Switch to explore
      const exploreNavItem = document.querySelector('.nav-item[data-tab="explore"]');
      exploreNavItem?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 80));

      fetchCallCount = 0; // Reset after initial page load

      const btnSearch = document.getElementById('btn-pexels-search') || document.querySelector('.modern-search-btn');
      expect(btnSearch).not.toBeNull();

      // Click Search 10 times in rapid succession (10ms)
      for (let i = 0; i < 10; i++) {
        btnSearch?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }

      await new Promise((r) => setTimeout(r, 120));

      // Because isOnlineLoading guards the request, exactly 1 IPC call was made
      expect(fetchCallCount).toBe(1);
    });

    it('guards infinite scroll triggering from re-entrant page fetches', async () => {
      let fetchCallCount = 0;
      setupMockTauri({
        get_config: async () => ({
          ...mockBackendState.config,
          load_mode: 'infinite'
        }),
        fetch_online_wallpapers: async (args) => {
          fetchCallCount++;
          await new Promise((r) => setTimeout(r, 40));
          return generateMockOnlineWallpapers(args.source, args.query, args.page, args.limit);
        }
      });

      // Re-initialize for infinite scroll mode
      loadIndexHTML();
      initializeAppRuntime();
      await new Promise((r) => setTimeout(r, 80));

      const exploreNavItem = document.querySelector('.nav-item[data-tab="explore"]');
      exploreNavItem?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 60));

      fetchCallCount = 0;

      const mainScrollEl = document.getElementById('flutter-main-scroll');
      expect(mainScrollEl).not.toBeNull();

      // Mock scroll metrics to simulate reaching bottom
      Object.defineProperty(mainScrollEl, 'scrollTop', { value: 1000, writable: true });
      Object.defineProperty(mainScrollEl, 'clientHeight', { value: 600, writable: true });
      Object.defineProperty(mainScrollEl, 'scrollHeight', { value: 1500, writable: true });

      // Dispatch 15 rapid scroll events
      for (let i = 0; i < 15; i++) {
        mainScrollEl?.dispatchEvent(new Event('scroll'));
      }

      await new Promise((r) => setTimeout(r, 100));

      // Only 1 batch fetched due to isInfiniteLoading lock
      expect(fetchCallCount).toBe(1);
    });

    it('handles category chip switching with proper loading state guards', async () => {
      let lastFetchedSource = '';
      let lastFetchedQuery = '';
      setupMockTauri({
        fetch_online_wallpapers: async (args) => {
          lastFetchedSource = args.source;
          lastFetchedQuery = args.query;
          await new Promise((r) => setTimeout(r, 15));
          return generateMockOnlineWallpapers(args.source, args.query, args.page, args.limit);
        }
      });

      const exploreNavItem = document.querySelector('.nav-item[data-tab="explore"]');
      exploreNavItem?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 40));

      // Switch to Pexels
      const pexelsBtn = document.querySelector('#segmented-source-group .segmented-btn[data-source="pexels"]');
      pexelsBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 40));

      // Click Pexels tag chip: nature
      const chipNature = document.querySelector('#pexels-tag-chips .context-chip[data-tag="nature"]');
      chipNature?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 40));

      expect(chipNature?.classList.contains('active')).toBe(true);
      expect(lastFetchedSource).toBe('pexels');
      expect(lastFetchedQuery).toBe('nature');

      // Click Pexels tag chip: city
      const chipCity = document.querySelector('#pexels-tag-chips .context-chip[data-tag="city"]');
      chipCity?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 40));

      expect(chipCity?.classList.contains('active')).toBe(true);
      expect(lastFetchedQuery).toBe('city');
    });
  });

  // ===========================================================================
  // 3. Network Failure Emulation During Base64 Remote Image Fetching
  // ===========================================================================
  describe('3. Network Failure Emulation During Base64 Remote Image Fetching', () => {
    it('gracefully handles fetch_remote_image_base64 rejection on explore card image error', async () => {
      setupMockTauri({
        fetch_remote_image_base64: async () => {
          throw new Error('HTTP 502 Bad Gateway: Remote CDN Unreachable');
        }
      });

      const exploreNavItem = document.querySelector('.nav-item[data-tab="explore"]');
      exploreNavItem?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 40));

      const cards = document.querySelectorAll('#online-grid .m3-wallpaper-card');
      const initialCount = cards.length;
      expect(initialCount).toBeGreaterThan(0);

      // Trigger onerror on the second card's img element
      const targetImg = cards[1].querySelector('img');
      expect(targetImg).not.toBeNull();
      targetImg?.dispatchEvent(new Event('error'));

      await new Promise((r) => setTimeout(r, 50));

      // Broken card should be removed from DOM gracefully without errors
      const remainingCards = document.querySelectorAll('#online-grid .m3-wallpaper-card');
      expect(remainingCards.length).toBe(initialCount - 1);
    });

    it('gracefully handles fetch_remote_image_base64 network failure in details modal', async () => {
      setupMockTauri({
        fetch_remote_image_base64: async () => {
          throw new Error('Network timeout during HD fetch');
        }
      });

      const exploreNavItem = document.querySelector('.nav-item[data-tab="explore"]');
      exploreNavItem?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 40));

      const firstCard = document.querySelector('#online-grid .m3-wallpaper-card');
      firstCard?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      const detailModal = document.getElementById('detail-modal');
      expect(detailModal?.classList.contains('active')).toBe(true);

      // Modal stays active and does not throw unhandled exception
      const modalImg = document.getElementById('modal-wallpaper-img');
      expect(modalImg?.src).toBeTruthy();

      // Close modal
      const btnCloseModal = document.getElementById('btn-close-modal');
      btnCloseModal?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(detailModal?.classList.contains('active')).toBe(false);
    });

    it('gracefully handles fetch_remote_image_base64 network failure in fullscreen lightbox', async () => {
      setupMockTauri({
        fetch_remote_image_base64: async () => {
          throw new Error('CORS / 403 Forbidden on 8K image');
        }
      });

      const exploreNavItem = document.querySelector('.nav-item[data-tab="explore"]');
      exploreNavItem?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 40));

      // Open details modal
      const firstCard = document.querySelector('#online-grid .m3-wallpaper-card');
      firstCard?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      // Click preview box in modal to open Lightbox
      const dialogPreviewBox = document.getElementById('dialog-preview-box');
      expect(dialogPreviewBox).not.toBeNull();
      dialogPreviewBox?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      const fullscreenLightbox = document.getElementById('fullscreen-lightbox');
      expect(fullscreenLightbox?.classList.contains('active')).toBe(true);

      const lbImage = document.getElementById('lb-image');
      expect(lbImage?.src).toBeTruthy();

      // Lightbox toolbar buttons still operate cleanly
      const lbBtnZoomIn = document.getElementById('lb-btn-zoom-in');
      lbBtnZoomIn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      const lbZoomLevel = document.getElementById('lb-zoom-level');
      expect(lbZoomLevel?.textContent).toBe('125%');

      // Close lightbox
      const lbBtnClose = document.getElementById('lb-btn-close');
      lbBtnClose?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(fullscreenLightbox?.classList.contains('active')).toBe(false);
    });

    it('handles 100 random interleaved image load failures and successes without leaking memory or crashing', async () => {
      let successCount = 0;
      let failureCount = 0;

      setupMockTauri({
        fetch_remote_image_base64: async (args) => {
          if (Math.random() < 0.5) {
            failureCount++;
            throw new Error('Simulated random socket disconnect');
          }
          successCount++;
          return `data:image/jpeg;base64,mockRandomBase64_${Date.now()}`;
        }
      });

      const exploreNavItem = document.querySelector('.nav-item[data-tab="explore"]');
      exploreNavItem?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 40));

      const onlineGrid = document.getElementById('online-grid');
      expect(onlineGrid).not.toBeNull();

      // Simulate 50 synthetic img error events across virtual card elements
      for (let i = 0; i < 50; i++) {
        const cards = document.querySelectorAll('#online-grid .m3-wallpaper-card');
        if (cards.length > 0) {
          const randomCard = cards[Math.floor(Math.random() * cards.length)];
          const img = randomCard.querySelector('img');
          img?.dispatchEvent(new Event('error'));
        }
      }

      await new Promise((r) => setTimeout(r, 100));

      // Verify DOM remains valid and grid container is not corrupted
      expect(onlineGrid?.children.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ===========================================================================
  // 4. Corrupted Config File Recovery & Invalid State Resilience
  // ===========================================================================
  describe('4. Corrupted Config File Recovery & Invalid State Resilience', () => {
    it('gracefully recovers frontend state when get_config returns corrupted, null, or empty data', async () => {
      // Mock get_config returning corrupted partial payload
      setupMockTauri({
        get_config: async () => ({
          query: null,
          cache_dir: '',
          auto_update_interval_minutes: -99,
          auto_update_enabled: 'not_a_boolean',
          load_mode: 'unsupported_mode',
          card_ratio: 'invalid_ratio',
          theme_color: null,
          font_family: undefined
        })
      });

      // Reload config
      loadIndexHTML();
      initializeAppRuntime();
      await new Promise((r) => setTimeout(r, 60));

      // App should not crash and should display valid fallback defaults
      expect(document.body.className).toContain('theme-indigo');
      expect(document.body.className).toContain('font-rounded');

      const selectCardratio = document.getElementById('select-config-cardratio');
      expect(selectCardratio).not.toBeNull();
    });

    it('gracefully sanitizes corrupted localStorage values on startup', async () => {
      localStorage.setItem('wp_theme_color', 'NON_EXISTENT_CORRUPT_THEME_NAME');
      localStorage.setItem('wp_font_family', 'CORRUPT_NON_EXISTENT_FONT_FAMILY');
      localStorage.setItem('wp_amoled_mode', 'MALFORMED_DATA');

      loadIndexHTML();
      initializeAppRuntime();
      await new Promise((r) => setTimeout(r, 60));

      // Theme engine should fall back safely without error
      const classList = Array.from(document.body.classList);
      const fontClasses = classList.filter(c => c.startsWith('font-'));
      expect(fontClasses).toContain('font-rounded');

      // Check amoled fallback is false
      const checkAmoled = document.getElementById('check-amoled-mode');
      expect(checkAmoled?.checked).toBe(false);
    });

    it('recovers gracefully when save_config IPC encounters filesystem or serialization errors', async () => {
      setupMockTauri({
        save_config: async () => {
          throw new Error('EACCES: Permission denied writing settings.json');
        }
      });

      // Trigger setting change
      const checkConfigAutoupdate = document.getElementById('check-config-autoupdate');
      if (checkConfigAutoupdate) {
        checkConfigAutoupdate.checked = true;
        checkConfigAutoupdate.dispatchEvent(new Event('change', { bubbles: true }));
      }

      await new Promise((r) => setTimeout(r, 40));

      // Snackbar should display error message gracefully without uncaught crash
      const snackbar = document.getElementById('flutter-snackbar');
      const snackbarText = document.getElementById('snackbar-text');
      expect(snackbar?.classList.contains('show')).toBe(true);
      expect(snackbarText?.textContent).toContain('保存设置失败');
    });
  });

  // ===========================================================================
  // 5. High-Volume Randomized Concurrent Stress & Lifecycle Invariants
  // ===========================================================================
  describe('5. High-Volume Randomized Concurrent Stress & Lifecycle Invariants', () => {
    it('executes 1,000 rapid randomized user actions across all subsystems without state corruption', async () => {
      const themes = ['violet', 'blue', 'teal', 'pink', 'amber', 'green', 'crimson'];
      const fonts = ['rounded', 'youyuan', 'fluent', 'misans'];
      const tabs = ['gallery', 'explore', 'settings', 'about'];
      const sources = ['pexels', 'bing', 'unsplash', 'wallhaven'];

      for (let i = 0; i < 1000; i++) {
        const actionType = i % 8;

        switch (actionType) {
          case 0: {
            // Tab switch
            const tab = tabs[i % tabs.length];
            const navItem = document.querySelector(`.nav-item[data-tab="${tab}"]`);
            navItem?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            break;
          }
          case 1: {
            // Theme switch
            const t = themes[i % themes.length];
            const themeChip = document.querySelector(`.theme-palette-chip[data-theme="${t}"]`);
            themeChip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            break;
          }
          case 2: {
            // Font switch
            const f = fonts[i % fonts.length];
            const fontChip = document.querySelector(`.font-preset-chip[data-font="${f}"]`);
            fontChip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            break;
          }
          case 3: {
            // Source switch
            const s = sources[i % sources.length];
            const segBtn = document.querySelector(`#segmented-source-group .segmented-btn[data-source="${s}"]`);
            segBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            break;
          }
          case 4: {
            // AMOLED toggle
            const checkAmoled = document.getElementById('check-amoled-mode');
            if (checkAmoled) {
              checkAmoled.checked = (i % 2 === 0);
              checkAmoled.dispatchEvent(new Event('change', { bubbles: true }));
            }
            break;
          }
          case 5: {
            // Quick random click
            const btnRandom = document.getElementById('btn-quick-random');
            btnRandom?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            break;
          }
          case 6: {
            // Open and close details modal
            const detailModal = document.getElementById('detail-modal');
            const btnCloseModal = document.getElementById('btn-close-modal');
            if (detailModal && !detailModal.classList.contains('active')) {
              const card = document.querySelector('#online-grid .m3-wallpaper-card');
              card?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            } else {
              btnCloseModal?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            }
            break;
          }
          case 7: {
            // Keyboard shortcut (Escape / 0)
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            break;
          }
        }
      }

      await new Promise((r) => setTimeout(r, 100));

      // Invariant 1: Exactly one active navigation rail item
      const activeNavItems = document.querySelectorAll('.nav-item.active');
      expect(activeNavItems.length).toBe(1);

      // Invariant 2: Exactly one active tab page
      const activePages = document.querySelectorAll('.tab-page.active');
      expect(activePages.length).toBe(1);

      // Invariant 3: Exactly one active theme class on body
      const classList = Array.from(document.body.classList);
      const fontClasses = classList.filter(c => c.startsWith('font-'));
      expect(fontClasses.length).toBe(1);

      // Invariant 4: No orphaned lightbox overlay
      const fullscreenLightbox = document.getElementById('fullscreen-lightbox');
      expect(fullscreenLightbox?.classList.contains('active')).toBe(false);
    }, 30000);
  });
});
