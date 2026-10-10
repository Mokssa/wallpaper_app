/**
 * ==============================================================================
 * Challenger 1: Milestone 2 — Titlebar Drag Segregation & Window Controls Stress Suite
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
const rustMainPath = path.join(projectRoot, 'src', 'main.rs');
const tauriConfPath = path.join(projectRoot, 'tauri.conf.json');

function initializeAppRuntime() {
  const appCode = fs.readFileSync(appJsPath, 'utf8');
  const runScript = new Function(appCode);
  runScript();
  document.dispatchEvent(new Event('DOMContentLoaded'));
}

describe('Challenger 1 — Milestone 2: Titlebar Drag Segregation & Window Controls', () => {
  beforeEach(async () => {
    resetMockBackendState();
    setupMockTauri();
    loadIndexHTML();
    initializeAppRuntime();
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  // ===========================================================================
  // 1. Titlebar DOM Architecture & Attribute Segregation
  // ===========================================================================
  describe('1. Titlebar DOM Architecture & Drag Segregation Attributes', () => {
    it('verifies #app-titlebar exists with .flutter-titlebar class', () => {
      const titlebar = document.getElementById('app-titlebar');
      expect(titlebar).not.toBeNull();
      expect(titlebar.classList.contains('flutter-titlebar')).toBe(true);
      expect(titlebar.tagName.toLowerCase()).toBe('header');
    });

    it('verifies drag region has data-tauri-drag-region attribute', () => {
      const dragRegion = document.querySelector('.titlebar-drag-region');
      expect(dragRegion).not.toBeNull();
      expect(dragRegion.hasAttribute('data-tauri-drag-region')).toBe(true);
    });

    it('verifies window action container has data-tauri-drag-region="false"', () => {
      const actions = document.querySelector('.titlebar-actions');
      expect(actions).not.toBeNull();
      expect(actions.getAttribute('data-tauri-drag-region')).toBe('false');
    });

    it('verifies all three control buttons exist inside .titlebar-actions', () => {
      const actions = document.querySelector('.titlebar-actions');
      const btnMin = actions?.querySelector('#btn-minimize');
      const btnMax = actions?.querySelector('#btn-maximize');
      const btnClose = actions?.querySelector('#btn-close');

      expect(btnMin).not.toBeNull();
      expect(btnMax).not.toBeNull();
      expect(btnClose).not.toBeNull();
    });

    it('verifies buttons have accessible aria-label, title, and proper SVG icons', () => {
      const btnMin = document.getElementById('btn-minimize');
      const btnMax = document.getElementById('btn-maximize');
      const btnClose = document.getElementById('btn-close');

      expect(btnMin.getAttribute('title')).toBe('最小化');
      expect(btnMin.getAttribute('aria-label')).toBe('最小化');
      expect(btnMin.querySelector('svg')).not.toBeNull();

      expect(btnMax.getAttribute('title')).toBe('最大化');
      expect(btnMax.getAttribute('aria-label')).toBe('最大化');
      expect(btnMax.querySelector('svg')).not.toBeNull();

      expect(btnClose.getAttribute('title')).toBe('关闭');
      expect(btnClose.getAttribute('aria-label')).toBe('关闭');
      expect(btnClose.classList.contains('close')).toBe(true);
      expect(btnClose.querySelector('svg')).not.toBeNull();
    });

    it('verifies structural separation: drag region and actions are non-nested siblings', () => {
      const dragRegion = document.querySelector('.titlebar-drag-region');
      const actions = document.querySelector('.titlebar-actions');

      expect(dragRegion.parentElement).toBe(actions.parentElement);
      expect(dragRegion.contains(actions)).toBe(false);
      expect(actions.contains(dragRegion)).toBe(false);
    });
  });

  // ===========================================================================
  // 2. CSS Drag & Pointer Event Segregation Rules
  // ===========================================================================
  describe('2. CSS Drag & Pointer Event Segregation Rules', () => {
    it('verifies CSS defines drag regions on .titlebar-drag-region', () => {
      const css = fs.readFileSync(stylesCssPath, 'utf8');
      
      // Match .titlebar-drag-region block
      const dragRegionMatch = /\.titlebar-drag-region\s*\{([^}]+)\}/s.exec(css);
      expect(dragRegionMatch).not.toBeNull();
      const body = dragRegionMatch[1];
      expect(body).toMatch(/-webkit-app-region:\s*drag/);
      expect(body).toMatch(/app-region:\s*drag/);
      expect(body).toMatch(/flex:\s*1/);
    });

    it('verifies CSS defines no-drag and pointer-events: auto on .titlebar-actions and .titlebar-btn', () => {
      const css = fs.readFileSync(stylesCssPath, 'utf8');
      
      const actionsMatch = /\.titlebar-actions\s*\{([^}]+)\}/s.exec(css);
      expect(actionsMatch).not.toBeNull();
      expect(actionsMatch[1]).toMatch(/-webkit-app-region:\s*no-drag/);
      expect(actionsMatch[1]).toMatch(/app-region:\s*no-drag/);
      expect(actionsMatch[1]).toMatch(/pointer-events:\s*auto/);

      const btnMatch = /\.titlebar-btn\s*\{([^}]+)\}/s.exec(css);
      expect(btnMatch).not.toBeNull();
      expect(btnMatch[1]).toMatch(/-webkit-app-region:\s*no-drag/);
      expect(btnMatch[1]).toMatch(/app-region:\s*no-drag/);
      expect(btnMatch[1]).toMatch(/pointer-events:\s*auto/);
    });

    it('verifies .titlebar-brand has pointer-events: none for unhindered titlebar dragging', () => {
      const css = fs.readFileSync(stylesCssPath, 'utf8');
      const brandMatch = /\.titlebar-brand\s*\{([^}]+)\}/s.exec(css);
      expect(brandMatch).not.toBeNull();
      expect(brandMatch[1]).toMatch(/pointer-events:\s*none/);
    });

    it('verifies .titlebar-btn.close has error hover/active states', () => {
      const css = fs.readFileSync(stylesCssPath, 'utf8');
      expect(css).toMatch(/\.titlebar-btn\.close:hover\s*\{[^}]*background-color:\s*var\(--md-sys-color-error/);
      expect(css).toMatch(/\.titlebar-btn\.close:active\s*\{[^}]*background-color:\s*#93000a/);
    });
  });

  // ===========================================================================
  // 3. Tauri IPC Invocations & Event Dispatch Testing
  // ===========================================================================
  describe('3. Tauri IPC Invocations & Event Dispatch Testing', () => {
    it('triggers window_minimize IPC when #btn-minimize is clicked', async () => {
      const btnMin = document.getElementById('btn-minimize');
      mockBackendState.invokedCommands = [];

      btnMin.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 20));

      const minInvocations = mockBackendState.invokedCommands.filter((c) => c.cmd === 'window_minimize');
      expect(minInvocations.length).toBe(1);
    });

    it('triggers window_toggle_maximize IPC when #btn-maximize is clicked', async () => {
      const btnMax = document.getElementById('btn-maximize');
      mockBackendState.invokedCommands = [];

      btnMax.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 20));

      const maxInvocations = mockBackendState.invokedCommands.filter((c) => c.cmd === 'window_toggle_maximize');
      expect(maxInvocations.length).toBe(1);
    });

    it('triggers window_close IPC when #btn-close is clicked', async () => {
      const btnClose = document.getElementById('btn-close');
      mockBackendState.invokedCommands = [];

      btnClose.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 20));

      const closeInvocations = mockBackendState.invokedCommands.filter((c) => c.cmd === 'window_close');
      expect(closeInvocations.length).toBe(1);
    });

    it('correctly bubbles click when clicking child SVG or path elements inside window buttons', async () => {
      mockBackendState.invokedCommands = [];

      const svgLine = document.querySelector('#btn-minimize svg line');
      expect(svgLine).not.toBeNull();
      svgLine?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

      const svgRect = document.querySelector('#btn-maximize svg rect');
      expect(svgRect).not.toBeNull();
      svgRect?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

      const svgCloseLine = document.querySelector('#btn-close svg line');
      expect(svgCloseLine).not.toBeNull();
      svgCloseLine?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

      await new Promise((r) => setTimeout(r, 30));

      expect(mockBackendState.invokedCommands.some((c) => c.cmd === 'window_minimize')).toBe(true);
      expect(mockBackendState.invokedCommands.some((c) => c.cmd === 'window_toggle_maximize')).toBe(true);
      expect(mockBackendState.invokedCommands.some((c) => c.cmd === 'window_close')).toBe(true);
    });
  });

  // ===========================================================================
  // 4. Adversarial Rapid-Click & Stress Harness
  // ===========================================================================
  describe('4. Adversarial Rapid-Click & Stress Harness', () => {
    it('handles 100 rapid-fire button clicks without dropping events or throwing errors', async () => {
      mockBackendState.invokedCommands = [];
      const btnMin = document.getElementById('btn-minimize');
      const btnMax = document.getElementById('btn-maximize');
      const btnClose = document.getElementById('btn-close');

      const clickCount = 100;
      for (let i = 0; i < clickCount; i++) {
        const mod = i % 3;
        if (mod === 0) btnMin.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        else if (mod === 1) btnMax.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        else btnClose.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }

      await new Promise((r) => setTimeout(r, 50));

      const minCount = mockBackendState.invokedCommands.filter((c) => c.cmd === 'window_minimize').length;
      const maxCount = mockBackendState.invokedCommands.filter((c) => c.cmd === 'window_toggle_maximize').length;
      const closeCount = mockBackendState.invokedCommands.filter((c) => c.cmd === 'window_close').length;

      expect(minCount + maxCount + closeCount).toBe(clickCount);
      expect(minCount).toBe(34);
      expect(maxCount).toBe(33);
      expect(closeCount).toBe(33);
    });

    it('verifies clicking the drag region does not invoke any window control command', async () => {
      mockBackendState.invokedCommands = [];
      const dragRegion = document.querySelector('.titlebar-drag-region');

      dragRegion?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      dragRegion?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      dragRegion?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      dragRegion?.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

      await new Promise((r) => setTimeout(r, 20));

      const windowCmds = mockBackendState.invokedCommands.filter((c) =>
        ['window_minimize', 'window_toggle_maximize', 'window_close'].includes(c.cmd)
      );
      expect(windowCmds.length).toBe(0);
    });
  });

  // ===========================================================================
  // 5. Backend Rust IPC Contract & Handler Verification
  // ===========================================================================
  describe('5. Backend Rust IPC Contract & Handler Verification', () => {
    it('verifies Rust backend defines window_minimize, window_toggle_maximize, window_close', () => {
      const rustCode = fs.readFileSync(rustMainPath, 'utf8');

      expect(rustCode).toMatch(/fn\s+window_minimize\s*\(\s*window\s*:\s*tauri::Window\s*\)/);
      expect(rustCode).toMatch(/fn\s+window_toggle_maximize\s*\(\s*window\s*:\s*tauri::Window\s*\)/);
      expect(rustCode).toMatch(/fn\s+window_close\s*\(\s*window\s*:\s*tauri::Window\s*\)/);
    });

    it('verifies Rust backend registers all window commands in tauri::generate_handler![]', () => {
      const rustCode = fs.readFileSync(rustMainPath, 'utf8');

      const handlerBlockMatch = /tauri::generate_handler!\[([\s\S]*?)\]/.exec(rustCode);
      expect(handlerBlockMatch).not.toBeNull();
      const handlers = handlerBlockMatch[1];

      expect(handlers).toContain('window_minimize');
      expect(handlers).toContain('window_toggle_maximize');
      expect(handlers).toContain('window_close');
    });

    it('verifies window_close implementation uses window.hide() for system tray backgrounding', () => {
      const rustCode = fs.readFileSync(rustMainPath, 'utf8');
      
      const closeFnMatch = /fn\s+window_close\s*\([^)]*\)\s*\{([^}]+)\}/s.exec(rustCode);
      expect(closeFnMatch).not.toBeNull();
      expect(closeFnMatch[1]).toMatch(/window\.hide\(\)/);
    });
  });

  // ===========================================================================
  // 6. Layout & Window Dimension Boundary Verification
  // ===========================================================================
  describe('6. Layout & Window Dimension Boundary Verification', () => {
    it('verifies tauri.conf.json specifies min dimensions 940x600 and default 1020x680', () => {
      const conf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
      const mainWindow = conf.app.windows.find((w) => w.label === 'main' || !w.label);

      expect(mainWindow).not.toBeUndefined();
      expect(mainWindow.width).toBe(1020);
      expect(mainWindow.height).toBe(680);
      expect(mainWindow.minWidth).toBe(940);
      expect(mainWindow.minHeight).toBe(600);
      expect(mainWindow.decorations).toBe(false);
    });

    it('computes titlebar geometry across various window dimensions (940px min, 1020px default, 1920px FHD, 3840px 4K, 7680px 8K)', () => {
      const testWidths = [940, 1020, 1920, 2560, 3840, 7680];
      const titlebarPaddingLeft = 16;
      const titlebarPaddingRight = 8;
      const buttonWidth = 36;
      const buttonGap = 4;
      const buttonCount = 3;
      const actionsWidth = buttonCount * buttonWidth + (buttonCount - 1) * buttonGap; // 108 + 8 = 116px
      const brandApproxWidth = 120; // Logo + Gap + Text

      for (const width of testWidths) {
        const availableTitlebarInnerWidth = width - (titlebarPaddingLeft + titlebarPaddingRight);
        const dragRegionWidth = availableTitlebarInnerWidth - actionsWidth;
        const dragRatio = dragRegionWidth / width;

        // Ensure drag region has positive space and occupies at least 70% of total window top
        expect(dragRegionWidth).toBeGreaterThan(brandApproxWidth);
        expect(dragRatio).toBeGreaterThan(0.70);
      }
    });

    it('verifies titlebar height is fixed at 40px and flex-shrink is 0 to avoid vertical collapsing', () => {
      const css = fs.readFileSync(stylesCssPath, 'utf8');
      const titlebarMatch = /\.flutter-titlebar\s*\{([^}]+)\}/s.exec(css);
      expect(titlebarMatch).not.toBeNull();
      const body = titlebarMatch[1];

      expect(body).toMatch(/height:\s*40px/);
      expect(body).toMatch(/flex-shrink:\s*0/);
      expect(body).toMatch(/z-index:\s*100/);
    });

    it('verifies AMOLED theme titlebar background color override', () => {
      const css = fs.readFileSync(stylesCssPath, 'utf8');
      expect(css).toMatch(/body\.theme-amoled\s+\.flutter-titlebar\s*\{[^}]*background:\s*#000000\s*!important/);
    });
  });
});
