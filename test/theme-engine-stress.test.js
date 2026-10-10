import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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
describe('Challenger 2 — Theme Engine & Runtime Stress Verifier', () => {
  beforeEach(async () => {
    localStorage.clear();
    document.body.className = '';
    resetMockBackendState();
    setupMockTauri();
    loadIndexHTML();
    initializeAppRuntime();
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('1. Rapid Consecutive Theme & Font Switches', () => {
    it('handles 100 rapid random theme switches without race conditions or leftover classes', async () => {
      const themes = ['violet', 'blue', 'teal', 'pink', 'amber', 'green', 'crimson'];
      for (let i = 0; i < 100; i++) {
        const theme = themes[i % themes.length];
        const chip = document.querySelector('.theme-palette-chip[data-theme="' + theme + '"]');
        expect(chip).not.toBeNull();
        chip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        const classList = Array.from(document.body.classList);
        const themeClasses = classList.filter(c => c.startsWith('theme-') && c !== 'theme-amoled');

        expect(themeClasses.length).toBeLessThanOrEqual(2);
        expect(document.body.classList.contains('theme-' + theme)).toBe(true);
        expect(chip?.classList.contains('active')).toBe(true);
      }
    });
   it('handles 40 rapid alternating font switches across all 4 font presets', async () => {
      const fonts = ['rounded', 'youyuan', 'fluent', 'misans'];
      for (let i = 0; i < 40; i++) {
        const font = fonts[i % fonts.length];
        const fontChip = document.querySelector('.font-preset-chip[data-font="' + font + '"]');
        expect(fontChip).not.toBeNull();
        fontChip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        const classList = Array.from(document.body.classList);
        const fontClasses = classList.filter(c => c.startsWith('font-'));

        expect(fontClasses.length).toBe(1);
        expect(fontClasses[0]).toBe('font-' + font);
        expect(fontChip?.classList.contains('active')).toBe(true);
        expect(localStorage.getItem('wp_font_family')).toBe(font);
      }
    });

    it('handles rapid interleaved theme and font switches concurrently', async () => {
      const themes = ['violet', 'blue', 'teal', 'pink', 'amber', 'green', 'crimson'];
      const fonts = ['rounded', 'youyuan', 'fluent', 'misans'];
      for (let i = 0; i < 35; i++) {
        const theme = themes[i % themes.length];
        const font = fonts[i % fonts.length];

        const themeChip = document.querySelector('.theme-palette-chip[data-theme="' + theme + '"]');
        const fontChip = document.querySelector('.font-preset-chip[data-font="' + font + '"]');

        themeChip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        fontChip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(document.body.classList.contains('theme-' + theme)).toBe(true);
        expect(document.body.classList.contains('font-' + font)).toBe(true);
        expect(localStorage.getItem('wp_theme_color')).toBe(theme);
        expect(localStorage.getItem('wp_font_family')).toBe(font);
      }
    });
   it('remains idempotent when the same theme or font is applied repeatedly', async () => {
      const amberChip = document.querySelector('.theme-palette-chip[data-theme="amber"]');
      const misansChip = document.querySelector('.font-preset-chip[data-font="misans"]');
      for (let i = 0; i < 10; i++) {
        amberChip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        misansChip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }

      const themeClasses = Array.from(document.body.classList).filter(c => c.startsWith('theme-') && c !== 'theme-amoled');
      const fontClasses = Array.from(document.body.classList).filter(c => c.startsWith('font-'));

      expect(themeClasses).toEqual(['theme-amber']);
      expect(fontClasses).toEqual(['font-misans']);
      expect(amberChip?.classList.contains('active')).toBe(true);
      expect(misansChip?.classList.contains('active')).toBe(true);
    });
  });

  describe('2. Corrupted and Edge-Case localStorage Resilience', () => {
    it('gracefully falls back to defaults when localStorage is empty', async () => {
      expect(document.body.classList.contains('font-rounded')).toBe(true);
      expect(document.body.classList.contains('theme-violet') || document.body.classList.contains('theme-indigo')).toBe(true);
      expect(document.body.classList.contains('theme-amoled')).toBe(false);
    });

    it('gracefully handles corrupted / unknown theme strings in localStorage', async () => {
      const invalidThemes = ['invalid_theme_xyz', 'null', 'undefined', '__proto__', 'unknown_theme', '   ', '12345'];
      for (const invalid of invalidThemes) {
        localStorage.setItem('wp_theme_color', invalid);
        const blueChip = document.querySelector('.theme-palette-chip[data-theme="blue"]');
        expect(() => {
          blueChip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }).not.toThrow();
        expect(document.body).not.toBeNull();
      }
    });

    it('gracefully handles corrupted / unknown font strings in localStorage', async () => {
      const invalidFonts = ['comic_sans', 'arial', 'null', 'undefined', '{}', '[]', '123'];
      for (const invalid of invalidFonts) {
        localStorage.setItem('wp_font_family', invalid);
        const fluentChip = document.querySelector('.font-preset-chip[data-font="fluent"]');
        expect(() => {
          fluentChip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }).not.toThrow();
        expect(document.body).not.toBeNull();
      }
    });

    it('handles localStorage throwing SecurityError / QuotaExceededError without crashing', async () => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = () => {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      };
      const blueChip = document.querySelector('.theme-palette-chip[data-theme="blue"]');
      expect(() => {
        blueChip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }).not.toThrow();

      const fluentChip = document.querySelector('.font-preset-chip[data-font="fluent"]');
      expect(() => {
        fluentChip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }).not.toThrow();

      localStorage.setItem = originalSetItem;
    });
  });
  describe('3. Simultaneous Dark Mode + AMOLED Toggle Interactions', () => {
    it('maintains theme-amoled class across multiple theme transitions when AMOLED is enabled', async () => {
      const checkAmoled = document.getElementById('check-amoled-mode');
      expect(checkAmoled).not.toBeNull();

      checkAmoled.checked = true;
      checkAmoled.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));

      expect(document.body.classList.contains('theme-amoled')).toBe(true);
      expect(localStorage.getItem('wp_amoled_mode')).toBe('1');

      const themesToTest = ['blue', 'teal', 'pink', 'amber', 'green', 'crimson', 'violet'];
      for (const t of themesToTest) {
        const chip = document.querySelector('.theme-palette-chip[data-theme="' + t + '"]');
        chip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await new Promise((r) => setTimeout(r, 10));

        expect(document.body.classList.contains('theme-' + t)).toBe(true);
        expect(document.body.classList.contains('theme-amoled')).toBe(true);
        expect(checkAmoled.checked).toBe(true);
      }
    });

    it('cleanly removes theme-amoled when AMOLED switch is toggled off', async () => {
      const checkAmoled = document.getElementById('check-amoled-mode');
      checkAmoled.checked = true;
      checkAmoled.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));
      expect(document.body.classList.contains('theme-amoled')).toBe(true);

      checkAmoled.checked = false;
      checkAmoled.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));
      expect(document.body.classList.contains('theme-amoled')).toBe(false);
      expect(localStorage.getItem('wp_amoled_mode')).toBe('0');
    });
   it('coordinates contrast-adaptive source brand icons during theme and AMOLED transitions', async () => {
      const testImg = document.createElement('img');
      testImg.src = 'assets/icons/pexels.png';
      document.body.appendChild(testImg);

      const tealChip = document.querySelector('.theme-palette-chip[data-theme="teal"]');
      tealChip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));
      expect(testImg.src).toContain('pexels_light.png');

      const amberChip = document.querySelector('.theme-palette-chip[data-theme="amber"]');
      amberChip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));
      expect(testImg.src).toContain('pexels_dark.png');

      const violetChip = document.querySelector('.theme-palette-chip[data-theme="violet"]');
      violetChip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));
      expect(testImg.src).toContain('pexels.png');

      testImg.remove();
    });

    it('verifies SnackBar toast notification fires when theme or amoled toggles', async () => {
      const snackbar = document.getElementById('flutter-snackbar');
      const snackbarText = document.getElementById('snackbar-text');
      expect(snackbar).not.toBeNull();

      const emeraldChip = document.querySelector('.theme-palette-chip[data-theme="green"]');
      emeraldChip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));

      expect(snackbar?.classList.contains('show')).toBe(true);
      expect(snackbarText?.textContent).not.toBe('');

      const checkAmoled = document.getElementById('check-amoled-mode');
      checkAmoled.checked = true;
      checkAmoled.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));

      expect(snackbar?.classList.contains('show')).toBe(true);
      expect(snackbarText?.textContent).toContain('AMOLED');
    });
  });
  describe('4. IPC Message Payload Xccuracy During save_config', () => {
    it('verifies exact payload schema sent to Tauri save_config IPC', async () => {
      mockBackendState.invokedCommands = [];

      const amberChip = document.querySelector('.theme-palette-chip[data-theme="amber"]');
      amberChip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 30));

      const saveCmds = mockBackendState.invokedCommands.filter(c => c.cmd === 'save_config');
      expect(saveCmds.length).toBeGreaterThan(0);

      const latestPayload = saveCmds[saveCmds.length - 1].args;
      expect(latestPayload).toHaveProperty('config');
      const cfg = latestPayload.config;

      expect(typeof cfg.query).toBe('string');
      expect(typeof cfg.cache_dir).toBe('string');
      expect(typeof cfg.auto_update_interval_minutes).toBe('number');
      expect(typeof cfg.auto_update_enabled).toBe('boolean');
      expect(typeof cfg.unsplash_access_key).toBe('string');
      expect(typeof cfg.pexels_api_key).toBe('string');
      expect(typeof cfg.load_mode).toBe('string');
      expect(["pagination", "infinite"]).toContain(cfg.load_mode);
      expect(typeof cfg.card_ratio).toBe('string');
      expect(["uniform", "original"]).toContain(cfg.card_ratio);
      expect(typeof cfg.font_family).toBe('string');
      expect(["rounded", "youyuan", "fluent", "misans"]).toContain(cfg.font_family);
      expect(cfg.theme_color).toBe('amber');
    });
    it('verifies roundtrip synchronization from backend get_config to UI theme and font', async () => {
      mockBackendState.config.theme_color = 'crimson';
      mockBackendState.config.amoled_mode = true;
      mockBackendState.config.font_family = 'misans';

      loadIndexHTML();
      initializeAppRuntime();
      await new Promise((r) => setTimeout(r, 50));

      expect(document.body.classList.contains('theme-crimson')).toBe(true);
      expect(document.body.classList.contains('theme-amoled')).toBe(true);
      expect(document.body.classList.contains('font-misans')).toBe(true);

      const amoledCheckbox = document.getElementById('check-amoled-mode');
      expect(amoledCheckbox.checked).toBe(true);

      const crimsonChip = document.querySelector('.theme-palette-chip[data-theme="crimson"]');
      expect(crimsonChip?.classList.contains('active')).toBe(true);

      const misansChip = document.querySelector('.font-preset-chip[data-font="misans"]');
      expect(misansChip?.classList.contains('active')).toBe(true);
    });
  });

  describe('5. Canonical & Alias Multi-Selection Immunity & Input Resilience', () => {
    it('guarantees exactly one active theme chip across all 12 canonical and legacy theme names', async () => {
      const allTestThemes = [
        'indigo', 'ocean', 'emerald', 'sunset', 'crimson', 'lavender', 'amber',
        'violet', 'blue', 'teal', 'pink', 'green'
      ];

      for (const t of allTestThemes) {
        mockBackendState.config.theme_color = t;
        localStorage.setItem('wp_theme_color', t);
        loadIndexHTML();
        initializeAppRuntime();
        await new Promise((r) => setTimeout(r, 40));

        const activeChips = document.querySelectorAll('.theme-palette-chip.active');
        expect(activeChips.length).toBe(1);
        expect(document.body.classList.contains(`theme-${t}`)).toBe(true);
      }
    });

    it('safely handles whitespace-padded and corrupted theme inputs without throwing DOMException', async () => {
      const edgeCases = ['   ', '  blue  ', ' \t indigo \n ', 'unknown_xyz', '', null, undefined, '12345'];

      for (const ec of edgeCases) {
        if (ec !== undefined && ec !== null) {
          localStorage.setItem('wp_theme_color', ec);
        } else {
          localStorage.removeItem('wp_theme_color');
        }

        expect(() => {
          loadIndexHTML();
          initializeAppRuntime();
        }).not.toThrow();

        const activeChips = document.querySelectorAll('.theme-palette-chip.active');
        expect(activeChips.length).toBeLessThanOrEqual(1);
      }
    });
  });
});

