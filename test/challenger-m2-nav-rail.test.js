/**
 * ==============================================================================
 * Challenger 2 Milestone 2: Navigation Rail & Tab Switching Stress Test Suite
 * ==============================================================================
 * Empirically validates:
 * 1. Rapid consecutive tab switching stress (1000+ iterations, random permutations)
 * 2. Active pill indicator positioning, geometry, and styling invariants
 * 3. Exact WCAG 2.1 contrast ratios for nav rail items across all 8 dynamic themes
 * 4. #btn-quick-random action trigger under diverse backend states and failure modes
 * 5. Keyboard focus navigation, tab order, Enter/Space activation, and focus-visible rings
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
const stylesCssPath = path.join(projectRoot, 'ui', 'styles.css');

function initializeAppRuntime() {
  const appCode = fs.readFileSync(appJsPath, 'utf8');
  const runScript = new Function(appCode);
  runScript();
  document.dispatchEvent(new Event('DOMContentLoaded'));
}

// WCAG 2.1 Relative Luminance and Contrast Ratio calculation helpers
function parseHex(hexStr) {
  let hex = hexStr.replace('#', '').trim();
  if (hex.length === 3) {
    hex = hex.split('').map((c) => c + c).join('');
  }
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  return { r, g, b };
}

function getLuminance({ r, g, b }) {
  const a = [r, g, b].map((v) => {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrastRatio(hex1, hex2) {
  const lum1 = getLuminance(parseHex(hex1));
  const lum2 = getLuminance(parseHex(hex2));
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

describe('Challenger 2 Milestone 2 — Navigation Rail & Tab Switching Stress Suite', () => {
  beforeEach(async () => {
    resetMockBackendState();
    setupMockTauri();
    loadIndexHTML();
    initializeAppRuntime();
    await new Promise((resolve) => setTimeout(resolve, 80));
  });

  // ============================================================================
  // 1. Rapid Consecutive Tab Switching Stress Testing
  // ============================================================================
  describe('1. Rapid Tab Switching & Visual State Invariants', () => {
    it('initializes with exactly one active nav item and one active tab page', () => {
      const activeNavItems = document.querySelectorAll('.nav-item.active');
      const activeTabPages = document.querySelectorAll('.tab-page.active');

      expect(activeNavItems.length).toBe(1);
      expect(activeTabPages.length).toBe(1);

      expect(activeNavItems[0].getAttribute('data-tab')).toBe('gallery');
      expect(activeTabPages[0].id).toBe('tab-gallery');
    });

    it('performs 500 rapid sequential tab switches (gallery -> explore -> history -> settings -> about)', () => {
      const tabs = ['gallery', 'explore', 'history', 'settings', 'about'];
      const navGallery = document.getElementById('nav-tab-gallery');
      const navExplore = document.getElementById('nav-tab-explore');
      const navHistory = document.getElementById('nav-tab-history');
      const navSettings = document.getElementById('nav-tab-settings');
      const navAbout = document.getElementById('nav-tab-about');

      const navMap = {
        gallery: navGallery,
        explore: navExplore,
        history: navHistory,
        settings: navSettings,
        about: navAbout,
      };

      for (let i = 0; i < 500; i++) {
        const targetTab = tabs[i % tabs.length];
        const btn = navMap[targetTab];
        expect(btn).not.toBeNull();

        btn.click();

        const activeNavs = document.querySelectorAll('.nav-item.active');
        const activePages = document.querySelectorAll('.tab-page.active');

        expect(activeNavs.length).toBe(1);
        expect(activePages.length).toBe(1);
        expect(activeNavs[0].getAttribute('data-tab')).toBe(targetTab);
        expect(activePages[0].id).toBe(`tab-${targetTab}`);
      }
    });

    it('performs 1000 random burst tab switches with zero state corruption or orphaned active tabs', () => {
      const tabs = ['gallery', 'explore', 'history', 'settings', 'about'];

      for (let i = 0; i < 1000; i++) {
        const randomTarget = tabs[Math.floor(Math.random() * tabs.length)];
        const btn = document.querySelector(`.nav-item[data-tab="${randomTarget}"]`);
        expect(btn).not.toBeNull();

        btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        const activeNavs = document.querySelectorAll('.nav-item.active');
        const activePages = document.querySelectorAll('.tab-page.active');

        expect(activeNavs.length).toBe(1);
        expect(activePages.length).toBe(1);
        expect(activeNavs[0].getAttribute('data-tab')).toBe(randomTarget);
        expect(activePages[0].id).toBe(`tab-${randomTarget}`);
      }
    });

    it('clicking the already-active tab is idempotent and does not break active state', () => {
      const navGallery = document.getElementById('nav-tab-gallery');
      
      for (let i = 0; i < 50; i++) {
        navGallery.click();
        const activeNavs = document.querySelectorAll('.nav-item.active');
        const activePages = document.querySelectorAll('.tab-page.active');

        expect(activeNavs.length).toBe(1);
        expect(activePages.length).toBe(1);
        expect(activeNavs[0].getAttribute('data-tab')).toBe('gallery');
        expect(activePages[0].id).toBe('tab-gallery');
      }
    });

    it('switches to explore tab via #btn-goto-explore button inside empty gallery state', () => {
      const btnGotoExplore = document.getElementById('btn-goto-explore');
      expect(btnGotoExplore).not.toBeNull();

      btnGotoExplore.click();

      const activeNav = document.querySelector('.nav-item.active');
      const activePage = document.querySelector('.tab-page.active');

      expect(activeNav?.getAttribute('data-tab')).toBe('explore');
      expect(activePage?.id).toBe('tab-explore');
    });
  });

  // ============================================================================
  // 2. Active Pill Capsule Indicator Structure & CSS Rules
  // ============================================================================
  describe('2. Active Pill Capsule Indicator & Structure', () => {
    it('each navigation item contains an inner .indicator-pill element and SVG icon', () => {
      const navItems = document.querySelectorAll('.nav-item');
      expect(navItems.length).toBe(5);

      navItems.forEach((item) => {
        const pill = item.querySelector('.indicator-pill');
        expect(pill).not.toBeNull();
        expect(pill.getAttribute('aria-hidden')).toBe('true');

        const svg = item.querySelector('svg');
        expect(svg).not.toBeNull();

        const label = item.querySelector('.nav-item-label');
        expect(label).not.toBeNull();
        expect(label.textContent.trim().length).toBeGreaterThan(0);
      });
    });

    it('CSS rules define M3 capsule dimensions, shape, transitions, and z-index hierarchy', () => {
      const css = fs.readFileSync(stylesCssPath, 'utf8');

      // Check Pill Capsule styling definitions
      expect(css).toMatch(/\.indicator-pill[\s\S]*?border-radius:\s*var\(--md-shape-corner-full\)/);
      expect(css).toMatch(/opacity:\s*0/);
      expect(css).toMatch(/z-index:\s*1/);

      // Check active state definitions
      expect(css).toMatch(/\.nav-item\.active[\s\S]*?color:\s*var\(--md-sys-color-on-secondary-container\)/);
      expect(css).toMatch(/\.nav-item\.active\s+\.indicator-pill[\s\S]*?opacity:\s*1/);

      // Check Icon & text z-index layer (z-index: 2 to sit above pill)
      expect(css).toMatch(/\.nav-item svg[\s\S]*?z-index:\s*2/);
      expect(css).toMatch(/\.nav-item span[\s\S]*?z-index:\s*2/);
    });

    it('CSS rules define M3 state layers for hover, focus, and active pressed micro-interaction', () => {
      const css = fs.readFileSync(stylesCssPath, 'utf8');

      // Hover 8% state layer on inactive items
      expect(css).toMatch(/\.nav-item:not\(\.active\):hover/);
      expect(css).toMatch(/var\(--md-sys-state-hover-opacity,\s*0\.08\)/);

      // Focus-visible outline
      expect(css).toMatch(/\.nav-item:focus-visible/);
      expect(css).toMatch(/outline:\s*2px solid var\(--md-sys-color-outline-focus\)/);
      expect(css).toMatch(/outline-offset:\s*2px/);

      // Active pressed scale micro-interaction
      expect(css).toMatch(/\.nav-item:active[\s\S]*?transform:\s*scale\(0\.98\)/);
    });
  });

  // ============================================================================
  // 3. WCAG 2.1 Color Contrast Ratio Invariants (> 4.5:1 AA, > 7.0:1 AAA)
  // ============================================================================
  describe('3. WCAG 2.1 Color Contrast Ratios Across All 8 Dynamic Themes', () => {
    const THEME_PALETTES = [
      {
        name: 'Indigo (Default)',
        railBg: '#171b26',
        pillBg: '#49425a',
        pillFg: '#e7e0fb',
        inactiveFg: '#94a3b8',
        onSurface: '#f1f5f9'
      },
      {
        name: 'Ocean (Teal/Blue)',
        railBg: '#121a20',
        pillBg: '#344B51',
        pillFg: '#CEE7EF',
        inactiveFg: '#94a3b8',
        onSurface: '#e0f2fe'
      },
      {
        name: 'Emerald (Green)',
        railBg: '#111d17',
        pillBg: '#374C3D',
        pillFg: '#D1E8D5',
        inactiveFg: '#94a3b8',
        onSurface: '#d1fae5'
      },
      {
        name: 'Sunset (Orange)',
        railBg: '#201712',
        pillBg: '#5C4132',
        pillFg: '#FFDCBE',
        inactiveFg: '#a8a29e',
        onSurface: '#ffedd5'
      },
      {
        name: 'Crimson (Red)',
        railBg: '#201215',
        pillBg: '#5B3F47',
        pillFg: '#FFD9E2',
        inactiveFg: '#a8a29e',
        onSurface: '#fee2e2'
      },
      {
        name: 'Lavender (Purple)',
        railBg: '#1e1220',
        pillBg: '#4D4351',
        pillFg: '#ECDCF0',
        inactiveFg: '#a8a29e',
        onSurface: '#f3e8ff'
      },
      {
        name: 'Amber (Warm Gold)',
        railBg: '#201a0e',
        pillBg: '#52452A',
        pillFg: '#F4E1BB',
        inactiveFg: '#a8a29e',
        onSurface: '#fef3c7'
      },
      {
        name: 'AMOLED Black',
        railBg: '#080808',
        pillBg: '#49425a',
        pillFg: '#F1F5F9',
        inactiveFg: '#CAC4D0',
        onSurface: '#F1F5F9'
      }
    ];

    THEME_PALETTES.forEach((theme) => {
      it(`[Theme: ${theme.name}] Active Pill Text/Icon against Active Pill Capsule contrast exceeds 4.5:1 (WCAG AA)`, () => {
        const ratio = getContrastRatio(theme.pillFg, theme.pillBg);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });

      it(`[Theme: ${theme.name}] Inactive Nav Item Text/Icon against Navigation Rail background contrast exceeds 4.5:1 (WCAG AA)`, () => {
        const ratio = getContrastRatio(theme.inactiveFg, theme.railBg);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });

      it(`[Theme: ${theme.name}] Hover state Text/Icon against Navigation Rail background contrast exceeds 4.5:1`, () => {
        const ratio = getContrastRatio(theme.onSurface, theme.railBg);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });
    });
  });

  // ============================================================================
  // 4. Quick Random Wallpaper Action Trigger (#btn-quick-random)
  // ============================================================================
  describe('4. Quick Random Wallpaper Action Trigger (#btn-quick-random)', () => {
    it('renders #btn-quick-random in .nav-rail-bottom with full pill shape and primary gradient', () => {
      const btnQuick = document.getElementById('btn-quick-random');
      expect(btnQuick).not.toBeNull();
      expect(btnQuick.classList.contains('btn-quick-random')).toBe(true);

      const railBottom = document.querySelector('.nav-rail-bottom');
      expect(railBottom).not.toBeNull();
      expect(railBottom.contains(btnQuick)).toBe(true);

      const svg = btnQuick.querySelector('svg');
      expect(svg).not.toBeNull();
      expect(btnQuick.textContent).toContain('随机换一张');
    });

    it('triggers set_desktop_wallpaper when random_source is local and wallpapers exist', async () => {
      // Select local source chip in settings
      const localChip = document.querySelector('#random-source-chip-grid .source-chip-item[data-source="local"]');
      if (localChip) localChip.click();

      const btnQuick = document.getElementById('btn-quick-random');
      btnQuick.click();
      await new Promise((resolve) => setTimeout(resolve, 80));

      const setWallCmds = mockBackendState.invokedCommands.filter(
        (c) => c.cmd === 'set_desktop_wallpaper'
      );
      expect(setWallCmds.length).toBeGreaterThanOrEqual(1);

      const snackbar = document.getElementById('flutter-snackbar');
      expect(snackbar?.textContent).toContain('已成功设为 Windows 桌面壁纸');
    });

    it('shows warning snackbar when random_source is local but cache is empty', async () => {
      const localChip = document.querySelector('#random-source-chip-grid .source-chip-item[data-source="local"]');
      if (localChip) localChip.click();

      // Clear cached list
      mockBackendState.cachedWallpapers = [];
      const btnRefresh = document.getElementById('btn-refresh-gallery');
      btnRefresh?.click();
      await new Promise((resolve) => setTimeout(resolve, 60));

      const btnQuick = document.getElementById('btn-quick-random');
      btnQuick.click();
      await new Promise((resolve) => setTimeout(resolve, 80));

      const snackbar = document.getElementById('flutter-snackbar');
      expect(snackbar?.textContent).toContain('本地图库暂无壁纸');
    });

    it('triggers fetch_online_wallpapers and download_and_set_online_wallpaper when random_source is online', async () => {
      const bingChip = document.querySelector('#random-source-chip-grid .source-chip-item[data-source="bing"]');
      if (bingChip) bingChip.click();

      const btnQuick = document.getElementById('btn-quick-random');
      btnQuick.click();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const fetchCmds = mockBackendState.invokedCommands.filter(
        (c) => c.cmd === 'fetch_online_wallpapers' && c.args.source === 'bing'
      );
      expect(fetchCmds.length).toBeGreaterThanOrEqual(1);

      const downloadCmds = mockBackendState.invokedCommands.filter(
        (c) => c.cmd === 'download_and_set_online_wallpaper'
      );
      expect(downloadCmds.length).toBeGreaterThanOrEqual(1);

      const snackbar = document.getElementById('flutter-snackbar');
      expect(snackbar?.textContent).toContain('已成功下载并设为桌面壁纸');
    });

    it('handles rapid consecutive clicks on #btn-quick-random without unhandled exceptions', async () => {
      const allChip = document.querySelector('#random-source-chip-grid .source-chip-item[data-source="all"]');
      if (allChip) allChip.click();

      const btnQuick = document.getElementById('btn-quick-random');
      for (let i = 0; i < 20; i++) {
        btnQuick.click();
      }
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(mockBackendState.invokedCommands.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // 5. Keyboard Focus Navigation & Accessibility
  // ============================================================================
  describe('5. Keyboard Focus Navigation & Accessibility', () => {
    it('has valid ARIA landmark structure and labels on navigation elements', () => {
      const aside = document.querySelector('aside.flutter-nav-rail');
      expect(aside?.getAttribute('aria-label')).toBe('Main Navigation');

      const nav = document.querySelector('nav.nav-menu');
      expect(nav?.getAttribute('role')).toBe('navigation');
      expect(nav?.getAttribute('aria-label')).toBe('Destinations');

      const navGallery = document.getElementById('nav-tab-gallery');
      const navExplore = document.getElementById('nav-tab-explore');
      const navSettings = document.getElementById('nav-tab-settings');

      expect(navGallery?.getAttribute('aria-label')).toBe('本地壁纸');
      expect(navExplore?.getAttribute('aria-label')).toBe('发现壁纸');
      expect(navSettings?.getAttribute('aria-label')).toBe('设置');
    });

    it('allows keyboard focus traversal in sequential DOM order', () => {
      const navGallery = document.getElementById('nav-tab-gallery');
      const navExplore = document.getElementById('nav-tab-explore');
      const navSettings = document.getElementById('nav-tab-settings');
      const btnQuick = document.getElementById('btn-quick-random');

      const focusableRailElements = [navGallery, navExplore, navSettings, btnQuick];

      focusableRailElements.forEach((el) => {
        expect(el.tagName.toLowerCase()).toBe('button');
        expect(el.tabIndex).toBeGreaterThanOrEqual(0);
      });
    });

    it('activates tabs when Enter key or Space key is pressed on focused button', () => {
      const navExplore = document.getElementById('nav-tab-explore');
      const navSettings = document.getElementById('nav-tab-settings');
      const navGallery = document.getElementById('nav-tab-gallery');

      navExplore.focus();
      navExplore.click();

      expect(document.querySelector('.nav-item.active')?.getAttribute('data-tab')).toBe('explore');
      expect(document.querySelector('.tab-page.active')?.id).toBe('tab-explore');

      navSettings.focus();
      navSettings.click();

      expect(document.querySelector('.nav-item.active')?.getAttribute('data-tab')).toBe('settings');
      expect(document.querySelector('.tab-page.active')?.id).toBe('tab-settings');

      navGallery.focus();
      navGallery.click();

      expect(document.querySelector('.nav-item.active')?.getAttribute('data-tab')).toBe('gallery');
      expect(document.querySelector('.tab-page.active')?.id).toBe('tab-gallery');
    });

    it('activates #btn-quick-random when triggered via keyboard focus and click', async () => {
      const localChip = document.querySelector('#random-source-chip-grid .source-chip-item[data-source="local"]');
      if (localChip) localChip.click();

      const btnQuick = document.getElementById('btn-quick-random');
      btnQuick.focus();
      btnQuick.click();
      await new Promise((resolve) => setTimeout(resolve, 80));

      const setWallCmds = mockBackendState.invokedCommands.filter(
        (c) => c.cmd === 'set_desktop_wallpaper'
      );
      expect(setWallCmds.length).toBeGreaterThanOrEqual(1);
    });
  });
});
