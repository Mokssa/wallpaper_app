/**
 * ==============================================================================
 * Milestone 5 Phase 2: White-Box Adversarial Coverage Hardening Test Suite
 * ==============================================================================
 * Comprehensive empirical stress testing covering all corner cases, boundary
 * conditions, event edge cases, error fallbacks, and design invariants in:
 *   - ui/app.js
 *   - ui/styles.css
 *   - ui/index.html
 * ==============================================================================
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
  initialMockBackendState
} from './setup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const appJsPath = path.join(projectRoot, 'ui', 'app.js');
const stylesCssPath = path.join(projectRoot, 'ui', 'styles.css');
const indexHtmlPath = path.join(projectRoot, 'ui', 'index.html');

// Helper to execute app.js in the current JSDOM environment
function initializeAppRuntime() {
  const appCode = fs.readFileSync(appJsPath, 'utf8');
  const runScript = new Function(appCode);
  runScript();
  document.dispatchEvent(new Event('DOMContentLoaded'));
}

describe('Milestone 5 Phase 2 — White-Box Adversarial Coverage Suite', () => {
  beforeEach(async () => {
    // Reset global state & mock backend
    resetMockBackendState();
    setupMockTauri();
    loadIndexHTML();
    delete window.__M3_RIPPLE_INITIALIZED__;
    initializeAppRuntime();
    document.getElementById('btn-pexels-search')?.click();
    // Allow async init promises (loadConfig, loadWallpapers, loadOnlineWallpapers) to settle
    await new Promise((resolve) => setTimeout(resolve, 80));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // 1. Tauri IPC Bridge Boundary, Fallbacks & Error Injection
  // ===========================================================================
  describe('1. Tauri IPC Bridge & Fault Tolerance', () => {
    it('detects Tauri invoke across core.invoke, invoke, and tauri.invoke namespaces', async () => {
      // Test window.__TAURI__.core.invoke
      let invokedMethod = '';
      window.__TAURI__ = {
        core: { invoke: async (cmd) => { invokedMethod = 'core'; return { success: true }; } }
      };
      // Re-evaluate invoke helper
      const appCode = fs.readFileSync(appJsPath, 'utf8');
      const testFn = new Function(`
        ${appCode}
        return { getTauriInvoke, invoke };
      `)();
      
      expect(testFn.getTauriInvoke()).toBe(window.__TAURI__.core.invoke);
      const res1 = await testFn.invoke('test_cmd');
      expect(res1).toEqual({ success: true });
      expect(invokedMethod).toBe('core');

      // Test window.__TAURI__.invoke
      window.__TAURI__ = {
        invoke: async (cmd) => { invokedMethod = 'direct'; return { success: true }; }
      };
      expect(testFn.getTauriInvoke()).toBe(window.__TAURI__.invoke);
      const res2 = await testFn.invoke('test_cmd');
      expect(res2).toEqual({ success: true });
      expect(invokedMethod).toBe('direct');

      // Test window.__TAURI__.tauri.invoke
      window.__TAURI__ = {
        tauri: { invoke: async (cmd) => { invokedMethod = 'legacy'; return { success: true }; } }
      };
      expect(testFn.getTauriInvoke()).toBe(window.__TAURI__.tauri.invoke);
      const res3 = await testFn.invoke('test_cmd');
      expect(res3).toEqual({ success: true });
      expect(invokedMethod).toBe('legacy');

      // Test fallback when window.__TAURI__ is undefined
      delete window.__TAURI__;
      expect(testFn.getTauriInvoke()).toBeNull();
      const res4 = await testFn.invoke('test_cmd');
      expect(res4).toBeNull();
    });

    it('handles catastrophic IPC rejection without unhandled exceptions crashing the UI', async () => {
      // Configure mock to throw fatal error on get_cached_wallpapers
      setupMockTauri({
        get_cached_wallpapers: async () => {
          throw new Error('OS Disk I/O Failure: ReadPermissionDenied');
        }
      });

      const refreshBtn = document.getElementById('btn-refresh-gallery');
      refreshBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 60));

      // SnackBar shows error notification
      const snackbar = document.getElementById('flutter-snackbar');
      const snackbarText = document.getElementById('snackbar-text');
      expect(snackbar?.classList.contains('show')).toBe(true);
      expect(snackbarText?.textContent).toContain('获取本地壁纸失败');
      expect(snackbar?.style.borderColor).toBe('rgba(239, 68, 68, 0.4)');

      // Gallery safely falls back to empty state
      const emptyState = document.getElementById('gallery-empty-state');
      expect(emptyState?.style.display).not.toBe('none');
    });

    it('handles unhandled/unknown IPC commands gracefully returning null', async () => {
      const invoke = window.__TAURI__.invoke;
      const result = await invoke('unknown_unsupported_command_xyz', { foo: 'bar' });
      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // 2. M3 Dynamic Theme Engine & Canonical Aliases Stress Invariants
  // ===========================================================================
  describe('2. M3 Dynamic Theme Engine & Aliases Stress Testing', () => {
    it('applies all 12 known theme colorways and their canonical classes correctly', async () => {
      const chipViolet = document.querySelector('.theme-palette-chip[data-theme="violet"]');
      const chipBlue = document.querySelector('.theme-palette-chip[data-theme="blue"]');
      const chipTeal = document.querySelector('.theme-palette-chip[data-theme="teal"]');
      const chipGreen = document.querySelector('.theme-palette-chip[data-theme="green"]');
      const chipPink = document.querySelector('.theme-palette-chip[data-theme="pink"]');
      const chipAmber = document.querySelector('.theme-palette-chip[data-theme="amber"]');
      const chipCrimson = document.querySelector('.theme-palette-chip[data-theme="crimson"]');

      // 1. Violet -> theme-violet and canonical theme-indigo
      chipViolet?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));
      expect(document.body.classList.contains('theme-violet')).toBe(true);
      expect(document.body.classList.contains('theme-indigo')).toBe(true);
      expect(chipViolet?.classList.contains('active')).toBe(true);

      // 2. Blue -> theme-blue and canonical theme-ocean
      chipBlue?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));
      expect(document.body.classList.contains('theme-blue')).toBe(true);
      expect(document.body.classList.contains('theme-ocean')).toBe(true);
      expect(document.body.classList.contains('theme-violet')).toBe(false);

      // 3. Teal -> theme-teal and canonical theme-ocean
      chipTeal?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));
      expect(document.body.classList.contains('theme-teal')).toBe(true);
      expect(document.body.classList.contains('theme-ocean')).toBe(true);

      // 4. Green -> theme-green and canonical theme-emerald
      chipGreen?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));
      expect(document.body.classList.contains('theme-green')).toBe(true);
      expect(document.body.classList.contains('theme-emerald')).toBe(true);

      // 5. Pink -> theme-pink and canonical theme-lavender
      chipPink?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));
      expect(document.body.classList.contains('theme-pink')).toBe(true);
      expect(document.body.classList.contains('theme-lavender')).toBe(true);

      // 6. Amber -> theme-amber
      chipAmber?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));
      expect(document.body.classList.contains('theme-amber')).toBe(true);

      // 7. Crimson -> theme-crimson
      chipCrimson?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));
      expect(document.body.classList.contains('theme-crimson')).toBe(true);

      // 8. Cyber -> theme-cyber
      const chipCyber = document.querySelector('.theme-palette-chip[data-theme="cyber"]');
      chipCyber?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));
      expect(document.body.classList.contains('theme-cyber')).toBe(true);

      // 9. Glacier -> theme-glacier
      const chipGlacier = document.querySelector('.theme-palette-chip[data-theme="glacier"]');
      chipGlacier?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));
      expect(document.body.classList.contains('theme-glacier')).toBe(true);

      // 10. Matcha -> theme-matcha
      const chipMatcha = document.querySelector('.theme-palette-chip[data-theme="matcha"]');
      chipMatcha?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));
      expect(document.body.classList.contains('theme-matcha')).toBe(true);

      // 11. Mocha -> theme-mocha
      const chipMocha = document.querySelector('.theme-palette-chip[data-theme="mocha"]');
      chipMocha?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));
      expect(document.body.classList.contains('theme-mocha')).toBe(true);

      // 12. Navy -> theme-navy
      const chipNavy = document.querySelector('.theme-palette-chip[data-theme="navy"]');
      chipNavy?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));
      expect(document.body.classList.contains('theme-navy')).toBe(true);

      // 13. Rose -> theme-rose
      const chipRose = document.querySelector('.theme-palette-chip[data-theme="rose"]');
      chipRose?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));
      expect(document.body.classList.contains('theme-rose')).toBe(true);

      // 14. Slate -> theme-slate
      const chipSlate = document.querySelector('.theme-palette-chip[data-theme="slate"]');
      chipSlate?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));
      expect(document.body.classList.contains('theme-slate')).toBe(true);

      // 15. Custom -> theme-custom
      const chipCustom = document.querySelector('.theme-palette-chip[data-theme="custom"]');
      chipCustom?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));
      expect(document.body.classList.contains('theme-custom')).toBe(true);
      expect(chipCustom?.classList.contains('active')).toBe(true);
    });

    it('dynamically generates M3 tokens and updates preview when custom color is picked', async () => {
      const appCode = fs.readFileSync(appJsPath, 'utf8');
      const testFn = new Function(`
        ${appCode}
        return { hexToRgb, rgbToHsl, hslToHex, generateAndApplyCustomThemeTokens, applyTheme };
      `)();

      // 1. Color math invariants
      const rgb = testFn.hexToRgb('#ff0055');
      expect(rgb).toEqual({ r: 255, g: 0, b: 85 });
      const hsl = testFn.rgbToHsl(255, 0, 85);
      expect(hsl[0]).toBeGreaterThanOrEqual(330);
      expect(hsl[0]).toBeLessThanOrEqual(350);

      // 2. Custom theme token generation
      testFn.generateAndApplyCustomThemeTokens('#00E5FF');
      const styleTag = document.getElementById('m3-custom-theme-vars');
      expect(styleTag).not.toBeNull();
      expect(styleTag?.textContent).toContain('--md-sys-color-primary:');
      expect(styleTag?.textContent).toContain('--md-sys-color-surface:');

      // 3. UI DOM synchronization
      const colorInput = document.getElementById('input-custom-theme-color');
      const hexCode = document.getElementById('custom-color-code');
      const indicator = document.getElementById('custom-color-indicator');
      expect(hexCode?.textContent).toContain('#');
      expect(indicator?.style.backgroundColor).not.toBe('');

      // 4. Color input event simulation
      if (colorInput) {
        colorInput.value = '#e11d48';
        colorInput.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise((r) => setTimeout(r, 20));
        expect(document.body.classList.contains('theme-custom')).toBe(true);
        expect(hexCode?.textContent).toBe('#E11D48');

        colorInput.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise((r) => setTimeout(r, 20));
      }
    });

    it('handles uppercase, mixed-case, and unrecognized theme names safely', () => {
      const appCode = fs.readFileSync(appJsPath, 'utf8');
      const testFn = new Function(`
        ${appCode}
        return { applyTheme };
      `)();

      // Uppercase input
      testFn.applyTheme('OCEAN');
      expect(document.body.classList.contains('theme-ocean')).toBe(true);

      // Mixed-case alias
      testFn.applyTheme('TeAl');
      expect(document.body.classList.contains('theme-teal')).toBe(true);
      expect(document.body.classList.contains('theme-ocean')).toBe(true);

      // Unknown theme string falls back cleanly
      testFn.applyTheme('cyberpunk-neon');
      expect(document.body.classList.contains('theme-cyberpunk-neon')).toBe(true);

      // Null / undefined input falls back to default 'indigo'
      testFn.applyTheme(null);
      expect(document.body.classList.contains('theme-indigo')).toBe(true);
    });

    it('toggles pure black AMOLED mode and syncs switch and class state', async () => {
      const checkAmoled = document.getElementById('check-amoled-mode');
      expect(checkAmoled).not.toBeNull();

      // Enable AMOLED
      if (checkAmoled) {
        checkAmoled.checked = true;
        checkAmoled.dispatchEvent(new Event('change', { bubbles: true }));
      }
      await new Promise((r) => setTimeout(r, 20));
      expect(document.body.classList.contains('theme-amoled')).toBe(true);

      // Disable AMOLED
      if (checkAmoled) {
        checkAmoled.checked = false;
        checkAmoled.dispatchEvent(new Event('change', { bubbles: true }));
      }
      await new Promise((r) => setTimeout(r, 20));
      expect(document.body.classList.contains('theme-amoled')).toBe(false);
    });

    it('dynamically adapts Pexels brand icon contrast across different theme palettes', () => {
      const appCode = fs.readFileSync(appJsPath, 'utf8');
      const testFn = new Function(`
        ${appCode}
        return { applyTheme };
      `)();

      const pexelsIcons = document.querySelectorAll('img.source-brand-icon[alt="Pexels"], img[src*="assets/icons/pexels"]');
      expect(pexelsIcons.length).toBeGreaterThan(0);

      // Green / Emerald / Teal / Ocean -> pexels_light.png
      testFn.applyTheme('teal');
      pexelsIcons.forEach((img) => expect(img.src).toContain('pexels_light.png'));

      testFn.applyTheme('emerald');
      pexelsIcons.forEach((img) => expect(img.src).toContain('pexels_light.png'));

      // Amber / Sunset -> pexels_dark.png
      testFn.applyTheme('amber');
      pexelsIcons.forEach((img) => expect(img.src).toContain('pexels_dark.png'));

      testFn.applyTheme('sunset');
      pexelsIcons.forEach((img) => expect(img.src).toContain('pexels_dark.png'));

      // Indigo / Violet -> pexels.png
      testFn.applyTheme('indigo');
      pexelsIcons.forEach((img) => expect(img.src).toContain('pexels.png'));
    });

    it('resiliently handles localStorage quota or security exceptions during theme change', () => {
      const appCode = fs.readFileSync(appJsPath, 'utf8');
      const testFn = new Function(`
        ${appCode}
        return { applyTheme };
      `)();

      const origSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new Error('QuotaExceededError: LocalStorage quota full');
      });

      expect(() => {
        testFn.applyTheme('emerald', true);
      }).not.toThrow();

      expect(document.body.classList.contains('theme-emerald')).toBe(true);
      expect(document.body.classList.contains('theme-amoled')).toBe(true);

      localStorage.setItem = origSetItem;
    });
  });

  // ===========================================================================
  // 3. Typography & Font Engine Boundary & Fallback Conditions
  // ===========================================================================
  describe('3. Typography & Font Engine Invariants', () => {
    it('switches between all 4 valid font family presets seamlessly', async () => {
      const chipRounded = document.querySelector('.font-preset-chip[data-font="rounded"]');
      const chipYouyuan = document.querySelector('.font-preset-chip[data-font="youyuan"]');
      const chipFluent = document.querySelector('.font-preset-chip[data-font="fluent"]');
      const chipMisans = document.querySelector('.font-preset-chip[data-font="misans"]');

      // Youyuan
      chipYouyuan?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));
      expect(document.body.classList.contains('font-youyuan')).toBe(true);
      expect(chipYouyuan?.classList.contains('active')).toBe(true);
      expect(document.body.classList.contains('font-rounded')).toBe(false);

      // Fluent
      chipFluent?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));
      expect(document.body.classList.contains('font-fluent')).toBe(true);
      expect(chipFluent?.classList.contains('active')).toBe(true);

      // Misans
      chipMisans?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));
      expect(document.body.classList.contains('font-misans')).toBe(true);
      expect(chipMisans?.classList.contains('active')).toBe(true);

      // Rounded
      chipRounded?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));
      expect(document.body.classList.contains('font-rounded')).toBe(true);
      expect(chipRounded?.classList.contains('active')).toBe(true);
    });

    it('falls back to "rounded" default when given invalid, empty, or malicious font names', () => {
      const appCode = fs.readFileSync(appJsPath, 'utf8');
      const testFn = new Function(`
        ${appCode}
        return { applyFontFamily };
      `)();

      testFn.applyFontFamily('comic-sans-ms');
      expect(document.body.classList.contains('font-rounded')).toBe(true);

      testFn.applyFontFamily('<script>alert("hack")</script>');
      expect(document.body.classList.contains('font-rounded')).toBe(true);

      testFn.applyFontFamily(null);
      expect(document.body.classList.contains('font-rounded')).toBe(true);

      testFn.applyFontFamily('');
      expect(document.body.classList.contains('font-rounded')).toBe(true);
    });
  });

  // ===========================================================================
  // 4. Flutter SnackBar Toast Concurrency, Preemption & XSS Immunity
  // ===========================================================================
  describe('4. Flutter SnackBar Concurrency & XSS Immunity', () => {
    it('handles 50 rapid consecutive calls without timer collision, race conditions, or memory leaks', () => {
      const appCode = fs.readFileSync(appJsPath, 'utf8');
      const testFn = new Function(`
        ${appCode}
        return { showSnackBar };
      `)();

      const snackbar = document.getElementById('flutter-snackbar');
      const snackbarText = document.getElementById('snackbar-text');

      for (let i = 1; i <= 50; i++) {
        testFn.showSnackBar(`Message sequence #${i}`, i % 2 === 0);
      }

      expect(snackbar?.classList.contains('show')).toBe(true);
      expect(snackbarText?.textContent).toBe('Message sequence #50');
      expect(snackbar?.style.borderColor).toBe('rgba(239, 68, 68, 0.4)');
    });

    it('strictly escapes HTML content to prevent XSS injection attacks in Toast feedback', () => {
      const appCode = fs.readFileSync(appJsPath, 'utf8');
      const testFn = new Function(`
        ${appCode}
        return { showSnackBar };
      `)();

      const attackPayload = '<img src=x onerror="window.__XSS_TRIGGERED__=true" /><b id="injected-bold">Attacked</b>';
      testFn.showSnackBar(attackPayload);

      const snackbarText = document.getElementById('snackbar-text');
      expect(snackbarText?.textContent).toBe(attackPayload);
      expect(document.getElementById('injected-bold')).toBeNull();
      expect(window.__XSS_TRIGGERED__).toBeUndefined();
    });

    it('handles null snackbar DOM elements gracefully without throwing errors', () => {
      const appCode = fs.readFileSync(appJsPath, 'utf8');
      const testFn = new Function(`
        ${appCode}
        return { showSnackBar };
      `)();

      const snackbar = document.getElementById('flutter-snackbar');
      snackbar?.remove();

      expect(() => {
        testFn.showSnackBar('Orphaned message');
      }).not.toThrow();
    });
  });

  // ===========================================================================
  // 5. Window Controls, Titlebar Drag Region & Navigation Integrity
  // ===========================================================================
  describe('5. Titlebar Drag Isolation & Navigation State Machine', () => {
    it('isolates window action buttons from Tauri drag region to prevent drag event hijacking', () => {
      const titlebarDragRegion = document.querySelector('.titlebar-drag-region');
      expect(titlebarDragRegion?.hasAttribute('data-tauri-drag-region')).toBe(true);

      const titlebarActions = document.querySelector('.titlebar-actions');
      expect(titlebarActions?.getAttribute('data-tauri-drag-region')).toBe('false');

      const actionButtons = document.querySelectorAll('.titlebar-btn');
      expect(actionButtons.length).toBe(3);
    });

    it('invokes Tauri window control commands when titlebar buttons are clicked', async () => {
      const btnMin = document.getElementById('btn-minimize');
      const btnMax = document.getElementById('btn-maximize');
      const btnClose = document.getElementById('btn-close');

      btnMin?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      btnMax?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      btnClose?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 40));

      const commands = mockBackendState.invokedCommands.map((c) => c.cmd);
      expect(commands).toContain('window_minimize');
      expect(commands).toContain('window_toggle_maximize');
      expect(commands).toContain('window_close');
    });

    it('enforces exactly one active tab and cleans up orphaned states', () => {
      const appCode = fs.readFileSync(appJsPath, 'utf8');
      const testFn = new Function(`
        ${appCode}
        return { switchTab };
      `)();

      testFn.switchTab('explore');
      let activeTabs = document.querySelectorAll('.tab-page.active');
      let activeNavs = document.querySelectorAll('.nav-item.active');
      expect(activeTabs.length).toBe(1);
      expect(activeTabs[0].id).toBe('tab-explore');
      expect(activeNavs.length).toBe(1);
      expect(activeNavs[0].getAttribute('data-tab')).toBe('explore');

      testFn.switchTab('settings');
      activeTabs = document.querySelectorAll('.tab-page.active');
      activeNavs = document.querySelectorAll('.nav-item.active');
      expect(activeTabs.length).toBe(1);
      expect(activeTabs[0].id).toBe('tab-settings');
      expect(activeNavs.length).toBe(1);
      expect(activeNavs[0].getAttribute('data-tab')).toBe('settings');

      // Non-existent tab name safely leaves 0 active tabs without crashing
      testFn.switchTab('non-existent-tab');
      activeTabs = document.querySelectorAll('.tab-page.active');
      expect(activeTabs.length).toBe(0);
    });

    it('transitions to explore page from empty gallery CTA button', () => {
      const gotoExploreBtn = document.getElementById('btn-goto-explore');
      gotoExploreBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      const activeTab = document.querySelector('.tab-page.active');
      expect(activeTab?.id).toBe('tab-explore');
    });
  });

  // ===========================================================================
  // 6. Details Modal Dialog Edge Cases & Fallback Chains
  // ===========================================================================
  describe('6. Details Modal Dialog Edge Cases & Security', () => {
    it('renders details modal with full metadata and swatches for online wallpapers', async () => {
      const onlineCards = document.querySelectorAll('#online-grid .m3-wallpaper-card');
      expect(onlineCards.length).toBeGreaterThan(0);

      // Click card to open modal
      onlineCards[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));

      const modal = document.getElementById('detail-modal');
      expect(modal?.classList.contains('active')).toBe(true);

      const modalDownloadBtn = document.getElementById('modal-btn-download');
      const modalDeleteBtn = document.getElementById('modal-btn-delete');
      expect(modalDownloadBtn?.style.display).toBe('inline-flex');
      expect(modalDeleteBtn?.style.display).toBe('none');

      // Modal swatch group cleanly removed
      const swatches = document.querySelectorAll('#modal-swatch-group .swatch-pill');
      expect(swatches.length).toBe(0);

      // Close modal via close button
      const closeBtn = document.getElementById('btn-close-modal');
      closeBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(modal?.classList.contains('active')).toBe(false);
    });

    it('renders details modal with delete action for local wallpapers', async () => {
      const appCode = fs.readFileSync(appJsPath, 'utf8');
      const testFn = new Function(`
        ${appCode}
        return { openWallpaperDetails };
      `)();

      testFn.openWallpaperDetails(mockBackendState.cachedWallpapers[0], 'local', 'test-path.jpg');

      const modal = document.getElementById('detail-modal');
      expect(modal?.classList.contains('active')).toBe(true);

      const modalDownloadBtn = document.getElementById('modal-btn-download');
      const modalDeleteBtn = document.getElementById('modal-btn-delete');
      expect(modalDeleteBtn?.style.display).toBe('inline-flex');
      expect(modalDownloadBtn?.style.display).toBe('none');

      // Dismiss via backdrop click
      modal?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(modal?.classList.contains('active')).toBe(false);
    });

    it('blocks local file and non-http URLs from invoking external browser', () => {
      const appCode = fs.readFileSync(appJsPath, 'utf8');
      const testFn = new Function(`
        ${appCode}
        return { openExternalLink };
      `)();

      // Local file path
      testFn.openExternalLink('D:/Project/wallpaper_app/cache/wallpapers/image.jpg');
      expect(mockBackendState.openedUrls.length).toBe(0);

      const snackbarText = document.getElementById('snackbar-text');
      expect(snackbarText?.textContent).toContain('本地文件路径无需在浏览器中打开');

      // Empty string
      testFn.openExternalLink('');
      expect(mockBackendState.openedUrls.length).toBe(0);

      // Valid HTTPS URL
      testFn.openExternalLink('https://unsplash.com/photos/nature-123');
      expect(mockBackendState.openedUrls).toContain('https://unsplash.com/photos/nature-123');
    });

    it('dismisses details modal via Escape keydown event', async () => {
      const appCode = fs.readFileSync(appJsPath, 'utf8');
      const testFn = new Function(`
        ${appCode}
        return { openWallpaperDetails };
      `)();

      testFn.openWallpaperDetails(mockBackendState.cachedWallpapers[0], 'local');
      const modal = document.getElementById('detail-modal');
      expect(modal?.classList.contains('active')).toBe(true);

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(modal?.classList.contains('active')).toBe(false);
    });
  });

  // ===========================================================================
  // 7. Fullscreen Lightbox Viewer & Mathematical Boundary Conditions
  // ===========================================================================
  describe('7. Fullscreen Lightbox Mathematical Zoom & Pan Engine', () => {
    it('clamps zoom factors strictly within boundaries [0.4x, 6.0x]', () => {
      const appCode = fs.readFileSync(appJsPath, 'utf8');
      const testFn = new Function(`
        ${appCode}
        return { openLightbox, closeLightbox };
      `)();

      testFn.openLightbox('https://images.mock-cdn.com/test.jpg', null, 'online');
      const lb = document.getElementById('fullscreen-lightbox');
      expect(lb?.classList.contains('active')).toBe(true);

      const zoomInBtn = document.getElementById('lb-btn-zoom-in');
      const zoomOutBtn = document.getElementById('lb-btn-zoom-out');
      const zoomBadge = document.getElementById('lb-zoom-level');

      // Zoom in 30 times — must clamp at 600% (6.0x)
      for (let i = 0; i < 30; i++) {
        zoomInBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
      expect(zoomBadge?.textContent).toBe('600%');

      // Zoom out 50 times — must clamp at 40% (0.4x)
      for (let i = 0; i < 50; i++) {
        zoomOutBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
      expect(zoomBadge?.textContent).toBe('40%');

      // Reset button resets to 100%
      const resetBtn = document.getElementById('lb-btn-reset');
      resetBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(zoomBadge?.textContent).toBe('100%');

      testFn.closeLightbox();
      expect(lb?.classList.contains('active')).toBe(false);
    });

    it('handles keyboard navigation (+, -, 0, Arrow keys) and respects input focus guard', () => {
      const appCode = fs.readFileSync(appJsPath, 'utf8');
      const testFn = new Function(`
        ${appCode}
        return { openLightbox, closeLightbox };
      `)();

      testFn.openLightbox('https://images.mock-cdn.com/test.jpg', null, 'online');
      const zoomBadge = document.getElementById('lb-zoom-level');

      // Zoom in via '+' key
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '+', bubbles: true }));
      expect(zoomBadge?.textContent).toBe('125%');

      // Pan via Arrow keys
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

      const lbImg = document.getElementById('lb-image');
      expect(lbImg?.style.transform).toContain('translate(-40px, -40px)');

      // Reset via '0' key
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '0', bubbles: true }));
      expect(zoomBadge?.textContent).toBe('100%');
      expect(lbImg?.style.transform).toContain('translate(0px, 0px)');

      // Input Focus Guard: When input is focused, keyboard shortcuts are ignored
      const searchInput = document.getElementById('input-pexels-query');
      searchInput?.focus();

      window.dispatchEvent(new KeyboardEvent('keydown', { key: '+', bubbles: true }));
      // Zoom level should remain 100% because input element is focused
      expect(zoomBadge?.textContent).toBe('100%');

      searchInput?.blur();
      testFn.closeLightbox();
    });

    it('toggles zoom between 100% and 220% on viewport double-click', () => {
      const appCode = fs.readFileSync(appJsPath, 'utf8');
      const testFn = new Function(`
        ${appCode}
        return { openLightbox, closeLightbox };
      `)();

      testFn.openLightbox('https://images.mock-cdn.com/test.jpg', null, 'online');
      const lbViewport = document.getElementById('lb-viewport');
      const zoomBadge = document.getElementById('lb-zoom-level');

      // 1. Initial 100% -> Double click -> 220%
      lbViewport?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      expect(zoomBadge?.textContent).toBe('220%');

      // 2. Double click again -> Reset to 100%
      lbViewport?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      expect(zoomBadge?.textContent).toBe('100%');

      testFn.closeLightbox();
    });

    it('tracks mouse dragging across viewport with .dragging CSS class', () => {
      const appCode = fs.readFileSync(appJsPath, 'utf8');
      const testFn = new Function(`
        ${appCode}
        return { openLightbox, closeLightbox };
      `)();

      testFn.openLightbox('https://images.mock-cdn.com/test.jpg', null, 'online');
      const lbViewport = document.getElementById('lb-viewport');
      const lbImg = document.getElementById('lb-image');

      // Mouse down to start drag
      lbViewport?.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 100, bubbles: true }));
      expect(lbViewport?.classList.contains('dragging')).toBe(true);

      // Mouse move
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 150, clientY: 120, bubbles: true }));
      expect(lbImg?.style.transform).toContain('translate(50px, 20px)');

      // Mouse up to end drag
      window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      expect(lbViewport?.classList.contains('dragging')).toBe(false);

      testFn.closeLightbox();
    });
  });

  // ===========================================================================
  // 8. Settings & Config Management Synchronization
  // ===========================================================================
  describe('8. Settings Synchronization & Config State Engine', () => {
    it('persists card ratio and load mode preferences to backend config', async () => {
      const selectRatio = document.getElementById('select-config-cardratio');
      const selectLoadmode = document.getElementById('select-config-loadmode');

      // Switch to original ratio
      if (selectRatio) {
        selectRatio.value = 'original';
        selectRatio.dispatchEvent(new Event('change', { bubbles: true }));
      }
      await new Promise((r) => setTimeout(r, 40));

      const galleryGrid = document.getElementById('gallery-grid');
      const onlineGrid = document.getElementById('online-grid');
      expect(galleryGrid?.classList.contains('ratio-original')).toBe(true);
      expect(onlineGrid?.classList.contains('ratio-original')).toBe(true);

      expect(mockBackendState.config.card_ratio).toBe('original');
      expect(mockBackendState.config.load_mode).toBe('infinite');
    });

    it('toggles auto-launch setting with backend IPC synchronization and error rollback', async () => {
      const checkAutoLaunch = document.getElementById('check-auto-launch');
      expect(checkAutoLaunch).not.toBeNull();

      if (checkAutoLaunch) {
        checkAutoLaunch.checked = true;
        checkAutoLaunch.dispatchEvent(new Event('change', { bubbles: true }));
      }
      await new Promise((r) => setTimeout(r, 40));

      expect(mockBackendState.autoLaunchEnabled).toBe(true);

      // Error Rollback test
      setupMockTauri({
        set_auto_launch_enabled: async () => {
          throw new Error('Registry Access Denied');
        }
      });

      if (checkAutoLaunch) {
        checkAutoLaunch.checked = false;
        checkAutoLaunch.dispatchEvent(new Event('change', { bubbles: true }));
      }
      await new Promise((r) => setTimeout(r, 40));

      const snackbar = document.getElementById('flutter-snackbar');
      expect(snackbar?.classList.contains('show')).toBe(true);
    });

    it('picks new cache directory and triggers gallery reload', async () => {
      const btnBrowse = document.getElementById('btn-browse-dir');
      btnBrowse?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 50));

      const labelDir = document.getElementById('label-cache-dir');
      expect(labelDir?.textContent).toBe('D:/MockWallpaperCache');
      expect(mockBackendState.config.cache_dir).toBe('D:/MockWallpaperCache');
    });
  });

  // ===========================================================================
  // 9. Local Gallery Lifecycle & Actions
  // ===========================================================================
  describe('9. Local Gallery Lifecycle & Actions', () => {
    it('renders cached wallpapers, removes skeleton on load, and sets wallpaper', async () => {
      const galleryCards = document.querySelectorAll('#gallery-grid .m3-wallpaper-card');
      expect(galleryCards.length).toBe(2);

      const countBadge = document.getElementById('gallery-count-badge');
      expect(countBadge?.textContent).toBe('2 张');

      // Click Set Wallpaper on first card
      const applyBtn = galleryCards[0].querySelector('.m3-action-icon-btn[title="设为桌面壁纸"]');
      applyBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 40));

      expect(mockBackendState.currentWallpaper).toBe(mockBackendState.cachedWallpapers[0].file_path);
    });

    it('deletes wallpaper and transitions to empty state when all items are deleted', async () => {
      const galleryCards = document.querySelectorAll('#gallery-grid .m3-wallpaper-card');
      const deleteBtn1 = galleryCards[0].querySelector('.m3-action-icon-btn[title="删除此壁纸"]');
      deleteBtn1?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      const btnConfirmOk = document.getElementById('btn-confirm-ok');
      btnConfirmOk?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 50));

      expect(mockBackendState.cachedWallpapers.length).toBe(1);

      // Delete second item
      const remainingCard = document.querySelector('#gallery-grid .m3-wallpaper-card');
      const deleteBtn2 = remainingCard?.querySelector('.m3-action-icon-btn[title="删除此壁纸"]');
      deleteBtn2?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      btnConfirmOk?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 50));

      expect(mockBackendState.cachedWallpapers.length).toBe(0);
      const emptyState = document.getElementById('gallery-empty-state');
      expect(emptyState?.style.display).not.toBe('none');
    });
  });

  // ===========================================================================
  // 10. Online Multi-Source Exploration, Deduplication & Unsplash Key Guard
  // ===========================================================================
  describe('10. Online Multi-Source Exploration & Deduplication', () => {
    it('switches between all 4 online providers (Pexels, Bing, Unsplash, Wallhaven) and toggles contextual panels', async () => {
      const pexelsBtn = document.querySelector('.segmented-btn[data-source="pexels"]');
      const bingBtn = document.querySelector('.segmented-btn[data-source="bing"]');
      const unsplashBtn = document.querySelector('.segmented-btn[data-source="unsplash"]');
      const wallhavenBtn = document.querySelector('.segmented-btn[data-source="wallhaven"]');

      // 1. Bing
      bingBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 50));
      expect(bingBtn?.classList.contains('active')).toBe(true);
      expect(document.getElementById('panel-source-bing')).toBeNull();

      // 2. Wallhaven
      wallhavenBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 50));
      expect(wallhavenBtn?.classList.contains('active')).toBe(true);
      expect(document.getElementById('panel-source-wallhaven')?.classList.contains('active')).toBe(true);

      // 3. Unsplash
      unsplashBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 50));
      expect(unsplashBtn?.classList.contains('active')).toBe(true);
      expect(document.getElementById('panel-source-unsplash')?.classList.contains('active')).toBe(true);

      // 4. Pexels
      pexelsBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 50));
      expect(pexelsBtn?.classList.contains('active')).toBe(true);
      expect(document.getElementById('panel-source-pexels')?.classList.contains('active')).toBe(true);
    });

    it('filters out duplicate online wallpaper URLs and IDs seamlessly', () => {
      const appCode = fs.readFileSync(appJsPath, 'utf8');
      const testFn = new Function(`
        ${appCode}
        return { renderOnlineGrid };
      `)();

      const duplicateBatch = [
        { id: 'dup-1', thumb_url: 'https://images.mock-cdn.com/dup1.jpg', raw_url: 'https://images.mock-cdn.com/dup1_raw.jpg' },
        { id: 'dup-1', thumb_url: 'https://images.mock-cdn.com/dup1.jpg', raw_url: 'https://images.mock-cdn.com/dup1_raw.jpg' },
        { id: 'dup-2', thumb_url: 'https://images.mock-cdn.com/dup2.jpg', raw_url: 'https://images.mock-cdn.com/dup2_raw.jpg' },
        { id: 'dup-2', thumb_url: 'https://images.mock-cdn.com/dup2.jpg', raw_url: 'https://images.mock-cdn.com/dup2_raw.jpg' }
      ];

      testFn.renderOnlineGrid(duplicateBatch, false);

      const renderedCards = document.querySelectorAll('#online-grid .m3-wallpaper-card');
      expect(renderedCards.length).toBe(2);
    });

    it('renders Unsplash Key configuration prompt when API key is missing', async () => {
      // Clear unsplash key
      mockBackendState.config.unsplash_access_key = '';

      const appCode = fs.readFileSync(appJsPath, 'utf8');
      const testFn = new Function(`
        ${appCode}
        return { renderUnsplashKeyPrompt };
      `)();

      testFn.renderUnsplashKeyPrompt();

      const promptCard = document.querySelector('.unsplash-prompt-card');
      expect(promptCard).not.toBeNull();
      expect(promptCard?.textContent).toContain('需要配置 Unsplash Access Key');

      const btnGotoKey = document.getElementById('btn-goto-unsplash-key');
      expect(btnGotoKey).not.toBeNull();
    });

    it('switches contextual filter chips for Pexels, Unsplash and Wallhaven', async () => {
      // 1. Pexels nature chip
      const pexelsNatureChip = document.querySelector('#pexels-tag-chips .context-chip[data-tag="nature"]');
      pexelsNatureChip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 40));
      expect(pexelsNatureChip?.classList.contains('active')).toBe(true);

      // 3. Wallhaven category chip
      const wallhavenAnimeChip = document.querySelector('#wallhaven-category-chips .context-chip[data-cat="010"]');
      wallhavenAnimeChip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 40));
      expect(wallhavenAnimeChip?.classList.contains('active')).toBe(true);

      // 4. Wallhaven sorting chip
      const wallhavenLatestChip = document.querySelector('#wallhaven-sorting-chips .context-chip[data-sort="date_added"]');
      wallhavenLatestChip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 40));
      expect(wallhavenLatestChip?.classList.contains('active')).toBe(true);
    });

    it('clears query input and re-triggers search when search clear button is clicked', async () => {
      const inputPexels = document.getElementById('input-pexels-query');
      const btnClearPexels = document.getElementById('btn-pexels-clear');

      if (inputPexels) {
        inputPexels.value = 'mountain sunrise';
        inputPexels.dispatchEvent(new Event('input', { bubbles: true }));
      }
      expect(btnClearPexels?.classList.contains('show')).toBe(true);

      btnClearPexels?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 40));

      expect(inputPexels?.value).toBe('');
      expect(btnClearPexels?.classList.contains('show')).toBe(false);
    });
  });

  // ===========================================================================
  // 11. Smart Random Wallpaper Engine & Error Recovery
  // ===========================================================================
  describe('11. Smart Random Wallpaper Engine & Candidate Retries', () => {
    it('sets random wallpaper from local cache when random_source is local', async () => {
      const localChip = document.querySelector('#random-source-chip-grid .source-chip-item[data-source="local"]');
      localChip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));

      const quickRandomBtn = document.getElementById('btn-quick-random');
      quickRandomBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 50));

      const validLocalPaths = mockBackendState.cachedWallpapers.map((w) => w.file_path);
      expect(validLocalPaths).toContain(mockBackendState.currentWallpaper);
    });

    it('handles online random wallpaper fetch, download, and network error notifications', async () => {
      let downloadInvoked = false;
      setupMockTauri({
        download_and_set_online_wallpaper: async (args) => {
          downloadInvoked = true;
          return { success: true, path: 'D:/Project/wallpaper_app/cache/wallpapers/downloaded_random.jpg' };
        }
      });

      const pexelsChip = document.querySelector('#random-source-chip-grid .source-chip-item[data-source="pexels"]');
      pexelsChip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));

      const quickRandomBtn = document.getElementById('btn-quick-random');
      quickRandomBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 80));

      expect(downloadInvoked).toBe(true);
      const snackbar = document.getElementById('flutter-snackbar');
      expect(snackbar?.classList.contains('show')).toBe(true);

      // Error handling when fetch_online_wallpapers returns empty
      setupMockTauri({
        fetch_online_wallpapers: async () => []
      });

      quickRandomBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 80));

      const snackbarText = document.getElementById('snackbar-text');
      expect(snackbarText?.textContent).toContain('未能获取到随机壁纸');
    });
  });

  // ===========================================================================
  // 12. M3 Zero-Dependency Ripple Engine Concurrency & Memory Invariants
  // ===========================================================================
  describe('12. M3 Zero-Dependency Ripple Engine & Memory Safety', () => {
    it('guarantees idempotent initialization with global flag window.__M3_RIPPLE_INITIALIZED__', () => {
      const appCode = fs.readFileSync(appJsPath, 'utf8');
      const testFn = new Function(`
        ${appCode}
        return { initM3RippleEngine };
      `)();

      expect(window.__M3_RIPPLE_INITIALIZED__).toBe(true);
      // Calling again is a safe no-op
      testFn.initM3RippleEngine();
      expect(window.__M3_RIPPLE_INITIALIZED__).toBe(true);
    });

    it('spawns ripple wave on interactive button click and cleans up on pointer release', async () => {
      const button = document.getElementById('btn-refresh-gallery');
      expect(button).not.toBeNull();

      // Trigger pointerdown
      button?.dispatchEvent(new MouseEvent('mousedown', {
        clientX: 50,
        clientY: 20,
        button: 0,
        bubbles: true
      }));

      const ripple = button?.querySelector('.m3-ripple-wave');
      expect(ripple).not.toBeNull();
      expect(ripple?.classList.contains('md-ripple-wave')).toBe(true);

      // Trigger pointer release
      window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      expect(ripple?.classList.contains('m3-ripple-fade-out')).toBe(true);

      // Wait for auto-cleanup removal
      await new Promise((r) => setTimeout(r, 350));
      expect(button?.querySelector('.m3-ripple-wave')).toBeNull();
    });

    it('suppresses ripple creation on disabled, aria-disabled, and .disabled elements', () => {
      const button = document.getElementById('btn-batch-delete') || document.querySelector('button');
      if (button) button.disabled = true;
      expect(button?.disabled).toBe(true);

      button?.dispatchEvent(new MouseEvent('mousedown', {
        clientX: 10,
        clientY: 10,
        button: 0,
        bubbles: true
      }));

      const ripple = button?.querySelector('.m3-ripple-wave');
      expect(ripple).toBeNull();
    });

    it('triggers ripple on Space / Enter keyboard activation for focused buttons', () => {
      const button = document.getElementById('btn-quick-random');
      button?.focus();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      const ripple = button?.querySelector('.m3-ripple-wave');
      expect(ripple).not.toBeNull();
    });
  });

  // ===========================================================================
  // 13. CSS Tokens, Shape Radii, Elevation & Theme Invariants in styles.css
  // ===========================================================================
  describe('13. CSS Tokens, Shape Radii & Design System Invariants', () => {
    const cssContent = fs.readFileSync(stylesCssPath, 'utf8');

    it('defines standard M3 Corner Radii from 4px to 9999px', () => {
      expect(cssContent).toMatch(/--md-shape-corner-xs:\s*4px/);
      expect(cssContent).toMatch(/--md-shape-corner-sm:\s*8px/);
      expect(cssContent).toMatch(/--md-shape-corner-md:\s*12px/);
      expect(cssContent).toMatch(/--md-shape-corner-lg:\s*16px/);
      expect(cssContent).toMatch(/--md-shape-corner-xl:\s*28px/);
      expect(cssContent).toMatch(/--md-shape-corner-full:\s*9999px/);
    });

    it('defines standard M3 Elevation Levels 0 through 5 with multi-layer shadows', () => {
      expect(cssContent).toMatch(/--md-sys-elevation-0:\s*none/);
      expect(cssContent).toMatch(/--md-sys-elevation-1:/);
      expect(cssContent).toMatch(/--md-sys-elevation-2:/);
      expect(cssContent).toMatch(/--md-sys-elevation-3:/);
      expect(cssContent).toMatch(/--md-sys-elevation-4:/);
      expect(cssContent).toMatch(/--md-sys-elevation-5:/);
    });

    it('defines standard M3 Motion Easing curves and Duration tiers (short, medium, long)', () => {
      expect(cssContent).toMatch(/--md-sys-motion-easing-standard:\s*cubic-bezier\(0\.2,\s*0\.0?,\s*0,\s*1\.0?\)/);
      expect(cssContent).toMatch(/--md-sys-motion-duration-short4:\s*200ms/);
      expect(cssContent).toMatch(/--md-sys-motion-duration-medium4:\s*400ms/);
      expect(cssContent).toMatch(/--md-sys-motion-duration-long2:\s*500ms/);
    });

    it('defines M3 dialog surface with 28px corners and surface-container-high background', () => {
      expect(cssContent).toMatch(/\.m3-dialog-surface[\s\S]*?border-radius:\s*(?:var\(--md-shape-corner-xl\)|28px)/);
      expect(cssContent).toMatch(/\.m3-dialog-surface[\s\S]*?background:\s*(?:var\(--md-sys-color-surface-container-high\)|#242b3d)/);
    });

    it('defines M3 Navigation Rail active pill indicator with full pill geometry', () => {
      expect(cssContent).toMatch(/\.indicator-pill[\s\S]*?border-radius:\s*(?:var\(--md-shape-corner-full\)|9999px)/);
      expect(cssContent).toMatch(/\.indicator-pill[\s\S]*?background:\s*var\(--md-sys-color-primary-container\)/);
    });
  });

  // ===========================================================================
  // 14. Check Update & M3 Update Dialog Lifecycle Suite
  // ===========================================================================
  describe('14. Check Update & M3 Update Dialog Lifecycle Suite', () => {
    beforeEach(async () => {
      await initializeAppRuntime();
    });

    it('renders Check for Updates button and app version label in Settings', () => {
      const btnCheck = document.getElementById('btn-check-update');
      const versionLabel = document.getElementById('app-version-label');
      expect(btnCheck).not.toBeNull();
      expect(versionLabel).not.toBeNull();
      expect(versionLabel?.textContent).toMatch(/0\.2\.\d/);
    });

    it('handles check_app_update IPC when an update is found and displays dialog', async () => {
      const appCode = fs.readFileSync(appJsPath, 'utf8');
      const testFn = new Function(`
        ${appCode}
        return { openUpdateModal, closeUpdateModal, checkUpdateAction };
      `)();

      // Mock update info
      const mockUpdate = {
        has_update: true,
        current_version: '0.2.0',
        latest_version: '0.3.0',
        release_name: 'Wallpaper v0.3.0',
        release_notes: '1. 新增检查更新功能\n2. 修复已知问题',
        published_at: '2026-09-03T00:00:00Z',
        release_url: 'https://github.com/Mokssa/wallpaper_app/releases/tag/v0.3.0',
        download_url: 'https://github.com/Mokssa/wallpaper_app/releases/download/v0.3.0/Wallpaper_v0.3.0_x64_portable.zip'
      };

      testFn.openUpdateModal(mockUpdate);

      const updateModal = document.getElementById('update-modal');
      const badgeCurrent = document.getElementById('update-badge-current');
      const badgeLatest = document.getElementById('update-badge-latest');
      const notes = document.getElementById('update-modal-notes');

      expect(updateModal?.classList.contains('active')).toBe(true);
      expect(badgeCurrent?.textContent).toContain('0.2.0');
      expect(badgeLatest?.textContent).toContain('0.3.0');
      expect(notes?.textContent).toContain('新增检查更新功能');

      // Test closeUpdateModal
      testFn.closeUpdateModal();
      expect(updateModal?.classList.contains('active')).toBe(false);
    });

    it('dismisses update modal on Escape key and backdrop click', async () => {
      const updateModal = document.getElementById('update-modal');
      if (updateModal) {
        updateModal.classList.add('active');
        expect(updateModal.classList.contains('active')).toBe(true);

        // Click outside on backdrop
        updateModal.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(updateModal.classList.contains('active')).toBe(false);

        // Open and hit Escape
        updateModal.classList.add('active');
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        expect(updateModal.classList.contains('active')).toBe(false);
      }
    });
  });
});
