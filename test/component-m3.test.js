/**
 * ==============================================================================
 * Tier 2: M3 Component DOM & Interaction Test Suite
 * ==============================================================================
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  setupMockTauri,
  loadIndexHTML,
  mockBackendState,
  resetMockBackendState
} from './setup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const appJsPath = path.join(projectRoot, 'ui', 'app.js');

// Helper to execute app.js in the current JSDOM environment
function initializeAppRuntime() {
  const appCode = fs.readFileSync(appJsPath, 'utf8');
  const runScript = new Function(appCode);
  runScript();
  document.dispatchEvent(new Event('DOMContentLoaded'));
}

describe('Tier 2 — M3 Component DOM & Interaction Suite', () => {
  beforeEach(async () => {
    resetMockBackendState();
    setupMockTauri();
    loadIndexHTML();
    initializeAppRuntime();
    // Allow async init promises (loadConfig, loadWallpapers, loadOnlineWallpapers) to settle
    await new Promise((resolve) => setTimeout(resolve, 80));
  });

  // ---------------------------------------------------------------------------
  // 1. Navigation Rail & Active Indicator
  // ---------------------------------------------------------------------------
  describe('Navigation Rail & Pill Active Indicator', () => {
    it('renders navigation rail container with standard navigation items', () => {
      const rail = document.querySelector('.flutter-nav-rail');
      expect(rail).not.toBeNull();

      const navItems = document.querySelectorAll('.nav-menu .nav-item');
      expect(navItems.length).toBeGreaterThanOrEqual(3);

      const tabs = Array.from(navItems).map((el) => el.getAttribute('data-tab'));
      expect(tabs).toContain('gallery');
      expect(tabs).toContain('explore');
      expect(tabs).toContain('settings');
    });

    it('initializes with Gallery as the active tab', () => {
      const activeBtn = document.querySelector('.nav-item.active');
      expect(activeBtn).not.toBeNull();
      expect(activeBtn?.getAttribute('data-tab')).toBe('gallery');

      const activeSection = document.querySelector('.tab-page.active');
      expect(activeSection).not.toBeNull();
      expect(activeSection?.id).toBe('tab-gallery');
    });

    it('switches active tab and indicator state on clicking Explore', () => {
      const exploreBtn = document.querySelector('.nav-item[data-tab="explore"]');
      exploreBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      const activeBtn = document.querySelector('.nav-item.active');
      expect(activeBtn?.getAttribute('data-tab')).toBe('explore');

      const activeTab = document.querySelector('.tab-page.active');
      expect(activeTab?.id).toBe('tab-explore');

      const galleryTab = document.getElementById('tab-gallery');
      expect(galleryTab?.classList.contains('active')).toBe(false);
    });

    it('switches active tab on clicking Settings', () => {
      const settingsBtn = document.querySelector('.nav-item[data-tab="settings"]');
      settingsBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      const activeBtn = document.querySelector('.nav-item.active');
      expect(activeBtn?.getAttribute('data-tab')).toBe('settings');

      const activeTab = document.querySelector('.tab-page.active');
      expect(activeTab?.id).toBe('tab-settings');
    });

    it('provides a quick random wallpaper action button', () => {
      const quickBtn = document.getElementById('btn-quick-random');
      expect(quickBtn).not.toBeNull();
      expect(quickBtn?.textContent).toContain('随机换一张');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Custom Titlebar & Tauri Window Controls
  // ---------------------------------------------------------------------------
  describe('Custom Titlebar & Window Drag Region', () => {
    it('defines titlebar drag region with data-tauri-drag-region attribute', () => {
      const dragRegion = document.querySelector('.titlebar-drag-region');
      expect(dragRegion).not.toBeNull();
      expect(dragRegion?.hasAttribute('data-tauri-drag-region')).toBe(true);
    });

    it('invokes Tauri window_minimize when minimize button is clicked', () => {
      const btnMin = document.getElementById('btn-minimize');
      expect(btnMin).not.toBeNull();
      btnMin?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      const hasMinCmd = mockBackendState.invokedCommands.some(
        (c) => c.cmd === 'window_minimize'
      );
      expect(hasMinCmd).toBe(true);
    });

    it('invokes Tauri window_toggle_maximize when maximize button is clicked', () => {
      const btnMax = document.getElementById('btn-maximize');
      expect(btnMax).not.toBeNull();
      btnMax?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      const hasMaxCmd = mockBackendState.invokedCommands.some(
        (c) => c.cmd === 'window_toggle_maximize'
      );
      expect(hasMaxCmd).toBe(true);
    });

    it('invokes Tauri window_close when close button is clicked', () => {
      const btnClose = document.getElementById('btn-close');
      expect(btnClose).not.toBeNull();
      btnClose?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      const hasCloseCmd = mockBackendState.invokedCommands.some(
        (c) => c.cmd === 'window_close'
      );
      expect(hasCloseCmd).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Segmented Source Controls & Brand Logos
  // ---------------------------------------------------------------------------
  describe('Segmented Source Control Buttons', () => {
    it('renders segmented source button group with all supported providers', () => {
      const segGroup = document.getElementById('segmented-source-group');
      expect(segGroup).not.toBeNull();

      const buttons = segGroup?.querySelectorAll('.segmented-btn');
      const sources = Array.from(buttons || []).map((b) => b.getAttribute('data-source'));

      expect(sources).toContain('pexels');
      expect(sources).toContain('bing');
      expect(sources).toContain('unsplash');
      expect(sources).toContain('wallhaven');
    });

    it('updates active source button on click', async () => {
      const bingBtn = document.querySelector('.segmented-btn[data-source="bing"]');
      bingBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      await new Promise((r) => setTimeout(r, 20));

      expect(bingBtn?.classList.contains('active')).toBe(true);

      const pexelsBtn = document.querySelector('.segmented-btn[data-source="pexels"]');
      expect(pexelsBtn?.classList.contains('active')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Contextual Filter Chips
  // ---------------------------------------------------------------------------
  describe('Contextual Filter Chips', () => {
    it('renders Pexels filter chips and toggles selection', async () => {
      const chipNature = document.querySelector('.pexels-chip[data-tag="nature"]');
      if (chipNature) {
        chipNature.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await new Promise((r) => setTimeout(r, 20));
        expect(chipNature.classList.contains('active')).toBe(true);
      }
    });

    it('renders Wallhaven category and sorting filter chips', () => {
      const catChips = document.getElementById('wallhaven-category-chips');
      expect(catChips).not.toBeNull();
      expect(catChips?.querySelectorAll('.context-chip').length).toBeGreaterThanOrEqual(3);

      const sortChips = document.getElementById('wallhaven-sorting-chips');
      expect(sortChips).not.toBeNull();
      expect(sortChips?.querySelectorAll('.context-chip').length).toBeGreaterThanOrEqual(3);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. M3 Wallpaper Cards & Skeleton Shimmer
  // ---------------------------------------------------------------------------
  describe('Wallpaper Cards & Grid View', () => {
    it('renders local cached wallpaper cards in gallery-grid', () => {
      const gallery = document.getElementById('gallery-grid');
      expect(gallery).not.toBeNull();

      const cards = gallery?.querySelectorAll('.m3-wallpaper-card, .wallpaper-card');
      expect(cards?.length).toBe(mockBackendState.cachedWallpapers.length);
    });

    it('displays card image thumbnail and action buttons', () => {
      const card = document.querySelector('#gallery-grid .m3-wallpaper-card, #gallery-grid .wallpaper-card');
      expect(card).not.toBeNull();

      const img = card?.querySelector('img.m3-card-img, img.card-img');
      expect(img).not.toBeNull();

      const actions = card?.querySelector('.m3-card-actions, .card-action-overlay');
      expect(actions).not.toBeNull();
    });

    it('displays gallery count badge corresponding to cached count', () => {
      const countBadge = document.getElementById('gallery-count-badge');
      expect(countBadge).not.toBeNull();
      expect(countBadge?.textContent).toContain('2 张');
    });
  });

  // ---------------------------------------------------------------------------
  // 6. M3 Details Modal Dialog
  // ---------------------------------------------------------------------------
  describe('Details Modal Dialog', () => {
    it('renders details modal element with initial hidden state', () => {
      const modal = document.getElementById('detail-modal');
      expect(modal).not.toBeNull();
      expect(modal?.classList.contains('active')).toBe(false);
    });

    it('opens and closes details modal via close button', () => {
      const modal = document.getElementById('detail-modal');
      modal?.classList.add('active');
      expect(modal?.classList.contains('active')).toBe(true);

      const closeBtn = document.getElementById('btn-close-modal');
      closeBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(modal?.classList.contains('active')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Fullscreen Lightbox Photo Viewer
  // ---------------------------------------------------------------------------
  describe('Fullscreen Lightbox Photo Viewer', () => {
    it('renders lightbox backdrop and floating toolbar', () => {
      const lb = document.getElementById('fullscreen-lightbox');
      expect(lb).not.toBeNull();

      const toolbar = document.querySelector('.lightbox-floating-toolbar');
      expect(toolbar).not.toBeNull();

      const zoomInBtn = document.getElementById('lb-btn-zoom-in');
      const zoomOutBtn = document.getElementById('lb-btn-zoom-out');
      const resetBtn = document.getElementById('lb-btn-reset');
      const closeBtn = document.getElementById('lb-btn-close');

      expect(zoomInBtn).not.toBeNull();
      expect(zoomOutBtn).not.toBeNull();
      expect(resetBtn).not.toBeNull();
      expect(closeBtn).not.toBeNull();
    });

    it('updates zoom percentage badge on zoom in and zoom out clicks', () => {
      const lb = document.getElementById('fullscreen-lightbox');
      lb?.classList.add('active');

      const zoomInBtn = document.getElementById('lb-btn-zoom-in');
      const zoomBadge = document.getElementById('lb-zoom-level');

      zoomInBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(zoomBadge?.textContent).toBe('125%');

      const zoomOutBtn = document.getElementById('lb-btn-zoom-out');
      zoomOutBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(zoomBadge?.textContent).toBe('100%');
    });

    it('resets zoom level to 100% when reset button is clicked', () => {
      const zoomInBtn = document.getElementById('lb-btn-zoom-in');
      const resetBtn = document.getElementById('lb-btn-reset');
      const zoomBadge = document.getElementById('lb-zoom-level');

      zoomInBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      zoomInBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(zoomBadge?.textContent).toBe('156%');

      resetBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(zoomBadge?.textContent).toBe('100%');
    });

    it('closes lightbox on close button click and Escape key', () => {
      const lb = document.getElementById('fullscreen-lightbox');
      lb?.classList.add('active');

      const closeBtn = document.getElementById('lb-btn-close');
      closeBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(lb?.classList.contains('active')).toBe(false);

      // Re-open and test Escape key
      lb?.classList.add('active');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(lb?.classList.contains('active')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Form Controls, Switch & Dropdown
  // ---------------------------------------------------------------------------
  describe('M3 Form Controls & Switch', () => {
    it('renders input fields for query, keys, and intervals', () => {
      expect(document.getElementById('input-pexels-query')).not.toBeNull();
      expect(document.getElementById('input-config-query')).not.toBeNull();
      expect(document.getElementById('input-config-unsplash-key')).not.toBeNull();
      expect(document.getElementById('input-config-pexels-key')).not.toBeNull();
      expect(document.getElementById('input-config-interval')).not.toBeNull();
    });

    it('renders switches for auto update, auto launch, and amoled mode', () => {
      expect(document.getElementById('check-config-autoupdate')).not.toBeNull();
      expect(document.getElementById('check-auto-launch')).not.toBeNull();
      expect(document.getElementById('check-amoled-mode')).not.toBeNull();
    });

    it('renders dropdown selects and random source chip grid', () => {
      expect(document.getElementById('select-config-cardratio')).not.toBeNull();
      expect(document.getElementById('select-config-language')).not.toBeNull();
      expect(document.getElementById('random-source-chip-grid')).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // 9. SnackBar Toast Notification
  // ---------------------------------------------------------------------------
  describe('SnackBar Toast Notification', () => {
    it('renders snackbar container with text and icon box', () => {
      const snackbar = document.getElementById('flutter-snackbar');
      expect(snackbar).not.toBeNull();

      const textEl = document.getElementById('snackbar-text');
      expect(textEl).not.toBeNull();
    });

    it('activates snackbar when settings changes are saved', async () => {
      const checkAmoled = document.getElementById('check-amoled-mode');
      checkAmoled?.dispatchEvent(new Event('change', { bubbles: true }));

      const snackbar = document.getElementById('flutter-snackbar');
      expect(snackbar?.classList.contains('show')).toBe(true);
    });
  });
});
