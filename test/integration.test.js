/**
 * ==============================================================================
 * Tier 3: Cross-Feature State Integration Test Suite
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

function initializeAppRuntime() {
  const appCode = fs.readFileSync(appJsPath, 'utf8');
  const runScript = new Function(appCode);
  runScript();
  document.dispatchEvent(new Event('DOMContentLoaded'));
}

describe('Tier 3 — Cross-Feature State Integration Suite', () => {
  beforeEach(async () => {
    resetMockBackendState();
    setupMockTauri();
    loadIndexHTML();
    initializeAppRuntime();
    await new Promise((resolve) => setTimeout(resolve, 80));
  });

  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // 1. Theme Switching & Multi-Palette Synchronization
  // ---------------------------------------------------------------------------
  describe('Theme Engine & Palette Synchronization', () => {
    it('switches between dynamic theme palettes and updates body classes', async () => {
      const blueChip = document.querySelector('.theme-palette-chip[data-theme="blue"]');
      expect(blueChip).not.toBeNull();
      blueChip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));

      expect(document.body.classList.contains('theme-blue')).toBe(true);
      expect(document.body.classList.contains('theme-ocean')).toBe(true);
      expect(blueChip?.classList.contains('active')).toBe(true);

      const tealChip = document.querySelector('.theme-palette-chip[data-theme="teal"]');
      tealChip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));

      expect(document.body.classList.contains('theme-teal')).toBe(true);
      expect(document.body.classList.contains('theme-ocean')).toBe(true);
      expect(document.body.classList.contains('theme-blue')).toBe(false);
      expect(tealChip?.classList.contains('active')).toBe(true);
    });

    it('supports all 8 canonical M3 theme palettes cleanly', async () => {
      const themes = ['violet', 'blue', 'teal', 'pink', 'amber', 'green', 'crimson'];
      for (const theme of themes) {
        const chip = document.querySelector(`.theme-palette-chip[data-theme="${theme}"]`);
        expect(chip).not.toBeNull();
        chip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await new Promise((r) => setTimeout(r, 10));

        expect(document.body.classList.contains(`theme-${theme}`)).toBe(true);
        expect(chip?.classList.contains('active')).toBe(true);
      }
    });

    it('toggles AMOLED pure black mode and coordinates with theme palette', async () => {
      const checkAmoled = document.getElementById('check-amoled-mode');
      expect(checkAmoled).not.toBeNull();

      checkAmoled.checked = true;
      checkAmoled.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));

      expect(document.body.classList.contains('theme-amoled')).toBe(true);

      // Now switch theme while AMOLED is active - AMOLED should remain active
      const crimsonChip = document.querySelector('.theme-palette-chip[data-theme="crimson"]');
      crimsonChip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));

      expect(document.body.classList.contains('theme-crimson')).toBe(true);
      expect(document.body.classList.contains('theme-amoled')).toBe(true);
    });

    it('persists theme preferences in localStorage and calls save_config', async () => {
      const amberChip = document.querySelector('.theme-palette-chip[data-theme="amber"]');
      amberChip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));

      expect(localStorage.getItem('wp_theme_color')).toBe('amber');

      const savedConfigs = mockBackendState.invokedCommands.filter(
        (c) => c.cmd === 'save_config'
      );
      expect(savedConfigs.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Font System Integration
  // ---------------------------------------------------------------------------
  describe('Typography & Font Presets Integration', () => {
    it('applies Fluent WinUI font preset on user selection', async () => {
      const fluentChip = document.querySelector('.font-preset-chip[data-font="fluent"]');
      fluentChip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));

      expect(document.body.classList.contains('font-fluent')).toBe(true);
      expect(fluentChip?.classList.contains('active')).toBe(true);
    });

    it('applies MiSans font preset and clears previous font class', async () => {
      const misansChip = document.querySelector('.font-preset-chip[data-font="misans"]');
      misansChip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));

      expect(document.body.classList.contains('font-misans')).toBe(true);
      expect(document.body.classList.contains('font-fluent')).toBe(false);
      expect(misansChip?.classList.contains('active')).toBe(true);
    });

    it('supports all 4 font family presets', async () => {
      const fonts = ['rounded', 'youyuan', 'fluent', 'misans'];
      for (const font of fonts) {
        const chip = document.querySelector(`.font-preset-chip[data-font="${font}"]`);
        expect(chip).not.toBeNull();
        chip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await new Promise((r) => setTimeout(r, 10));

        expect(document.body.classList.contains(`font-${font}`)).toBe(true);
        expect(chip?.classList.contains('active')).toBe(true);
        expect(localStorage.getItem('wp_font_family')).toBe(font);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Online Search -> Grid Render -> Set Wallpaper Workflow
  // ---------------------------------------------------------------------------
  describe('Online Search to Wallpaper Action Workflow', () => {
    it('performs online wallpaper search and populates the online grid', async () => {
      // Switch to explore tab
      const exploreBtn = document.querySelector('.nav-item[data-tab="explore"]');
      exploreBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));

      // Type search query
      const pexelsInput = document.getElementById('input-pexels-query');
      if (pexelsInput) {
        pexelsInput.value = 'mountain';
        pexelsInput.dispatchEvent(new Event('input', { bubbles: true }));
      }

      const searchBtn = document.getElementById('btn-pexels-search');
      searchBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 50));

      const onlineCards = document.querySelectorAll('#online-grid .m3-wallpaper-card');
      expect(onlineCards.length).toBeGreaterThan(0);
    });

    it('triggers download and sets desktop wallpaper when apply action is clicked', async () => {
      const exploreBtn = document.querySelector('.nav-item[data-tab="explore"]');
      exploreBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 50));

      const applyBtn = document.querySelector('#online-grid .m3-wallpaper-card .m3-action-icon-btn[title="一键设为桌面壁纸"]');
      expect(applyBtn).not.toBeNull();

      applyBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 50));

      const downloadCmds = mockBackendState.invokedCommands.filter(
        (c) => c.cmd === 'download_and_set_online_wallpaper'
      );
      expect(downloadCmds.length).toBeGreaterThan(0);
      expect(mockBackendState.currentWallpaper).toContain('downloaded_');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Local Wallpaper Management & Deletion Workflow
  // ---------------------------------------------------------------------------
  describe('Local Wallpaper Management & Deletion', () => {
    it('deletes a local wallpaper and refreshes the gallery count', async () => {
      const initialCount = mockBackendState.cachedWallpapers.length;
      expect(initialCount).toBe(2);

      const deleteBtn = document.querySelector('#gallery-grid .m3-wallpaper-card .m3-action-icon-btn[title="删除此壁纸"]');
      expect(deleteBtn).not.toBeNull();

      deleteBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      const btnConfirmOk = document.getElementById('btn-confirm-ok');
      btnConfirmOk?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 50));

      const deleteCmds = mockBackendState.invokedCommands.filter(
        (c) => c.cmd === 'delete_wallpaper'
      );
      expect(deleteCmds.length).toBe(1);
      expect(mockBackendState.cachedWallpapers.length).toBe(1);

      const countBadge = document.getElementById('gallery-count-badge');
      expect(countBadge?.textContent).toContain('1 张');
    });

    it('triggers directory picker when browse cache directory button is clicked', async () => {
      const settingsBtn = document.querySelector('.nav-item[data-tab="settings"]');
      settingsBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));

      const browseBtn = document.getElementById('btn-browse-dir');
      expect(browseBtn).not.toBeNull();

      browseBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 50));

      const selectCmds = mockBackendState.invokedCommands.filter(
        (c) => c.cmd === 'select_cache_dir'
      );
      expect(selectCmds.length).toBe(1);

      const cacheLabel = document.getElementById('label-cache-dir');
      expect(cacheLabel?.textContent).toBe('D:/MockWallpaperCache');
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Auto Launch & Automation Configuration
  // ---------------------------------------------------------------------------
  describe('System Auto Launch & Automation Configuration', () => {
    it('toggles auto launch and sends IPC update to Tauri backend', async () => {
      const checkAutoLaunch = document.getElementById('check-auto-launch');
      expect(checkAutoLaunch).not.toBeNull();

      checkAutoLaunch.checked = true;
      checkAutoLaunch.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 50));

      const autoLaunchCmds = mockBackendState.invokedCommands.filter(
        (c) => c.cmd === 'set_auto_launch_enabled'
      );
      expect(autoLaunchCmds.length).toBe(1);
      expect(mockBackendState.autoLaunchEnabled).toBe(true);

      const snackbar = document.getElementById('flutter-snackbar');
      expect(snackbar?.classList.contains('show')).toBe(true);
      expect(snackbar?.textContent).toContain('开机自启已开启');
    });
  });
});
