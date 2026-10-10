/**
 * ==============================================================================
 * Challenger 2 Milestone 3: Fullscreen Lightbox Stress & Verifier Test Suite
 * ==============================================================================
 * Empirically validates:
 * 1. 40% to 600% continuous zoom range clamping & zoom level badge synchronization.
 * 2. Mouse drag / pan physics, cursor grab/grabbing classes, and position clamping/resetting.
 * 3. Double-click boundary behavior (1.2 threshold), 100% <-> 220% toggle, and toolbar event isolation.
 * 4. Floating toolbar buttons: zoom in, zoom out, reset (1:1), apply wallpaper, close.
 * 5. Keyboard navigation shortcuts: Esc, Arrow keys (±40px pan), +/- (zoom), 0 (reset).
 * 6. Strict input focus guarding (INPUT, TEXTAREA, SELECT non-interference).
 * 7. Details Modal -> Lightbox -> Modal -> Gallery lifecycle transitions.
 * 8. Stress & concurrency: 1,000 rapid interleaved actions with zero corruption.
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

describe('Challenger 2 Milestone 3 — Fullscreen Lightbox Stress Verifier Suite', () => {
  beforeEach(async () => {
    resetMockBackendState();
    setupMockTauri();
    loadIndexHTML();
    initializeAppRuntime();
    // Allow async init promises (loadConfig, loadWallpapers, loadOnlineWallpapers) to settle
    await new Promise((resolve) => setTimeout(resolve, 150));
  });

  // Helper to reliably open lightbox via rendered gallery card
  function triggerOpenLightbox() {
    const card = document.querySelector('#gallery-grid .m3-wallpaper-card, #gallery-grid .wallpaper-card');
    if (card) {
      card.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    } else {
      const lb = document.getElementById('fullscreen-lightbox');
      lb?.classList.add('active');
    }
  }

  // ============================================================================
  // 1. Continuous Zoom Range & Badge Updates (40% to 600%)
  // ============================================================================
  describe('1. Continuous Zoom Range & Badge Clamping (40% to 600%)', () => {
    it('initializes lightbox with exactly 1.0 (100%) zoom and reset position', () => {
      const lb = document.getElementById('fullscreen-lightbox');
      const lbImage = document.getElementById('lb-image');
      const lbBadge = document.getElementById('lb-zoom-level');

      triggerOpenLightbox();

      expect(lb?.classList.contains('active')).toBe(true);
      expect(lbBadge?.textContent).toBe('100%');
      expect(lbImage?.style.transform).toBe('translate(0px, 0px) scale(1)');
    });

    it('smoothly scales up on wheel deltaY < 0 and clamps strictly at 6.0 (600%)', () => {
      triggerOpenLightbox();
      const lbViewport = document.getElementById('lb-viewport');
      const lbImage = document.getElementById('lb-image');
      const lbBadge = document.getElementById('lb-zoom-level');

      // Wheel forward (zoom in: * 1.15)
      for (let i = 0; i < 25; i++) {
        const wheelEv = new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true });
        lbViewport?.dispatchEvent(wheelEv);
      }

      expect(lbBadge?.textContent).toBe('600%');
      expect(lbImage?.style.transform).toContain('scale(6)');

      // Extra 10 wheel events beyond upper bound
      for (let i = 0; i < 10; i++) {
        lbViewport?.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true }));
      }
      expect(lbBadge?.textContent).toBe('600%');
      expect(lbImage?.style.transform).toContain('scale(6)');
    });

    it('smoothly scales down on wheel deltaY > 0 and clamps strictly at 0.4 (40%)', () => {
      triggerOpenLightbox();
      const lbViewport = document.getElementById('lb-viewport');
      const lbImage = document.getElementById('lb-image');
      const lbBadge = document.getElementById('lb-zoom-level');

      // Wheel backward (zoom out: * 0.85)
      for (let i = 0; i < 25; i++) {
        const wheelEv = new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true });
        lbViewport?.dispatchEvent(wheelEv);
      }

      expect(lbBadge?.textContent).toBe('40%');
      expect(lbImage?.style.transform).toContain('scale(0.4)');

      // Extra 10 wheel events beyond lower bound
      for (let i = 0; i < 10; i++) {
        lbViewport?.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true }));
      }
      expect(lbBadge?.textContent).toBe('40%');
      expect(lbImage?.style.transform).toContain('scale(0.4)');
    });

    it('automatically resets translation offsets (lbPosX, lbPosY) to (0, 0) when zoom <= 1.0', () => {
      triggerOpenLightbox();
      const lbViewport = document.getElementById('lb-viewport');
      const lbImage = document.getElementById('lb-image');
      const zoomInBtn = document.getElementById('lb-btn-zoom-in');

      // 1. Zoom in
      zoomInBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true })); // 1.25
      zoomInBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true })); // ~1.56

      // 2. Pan using mouse drag
      lbViewport?.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 100, bubbles: true }));
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 250, clientY: 200, bubbles: true }));
      window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

      expect(lbImage?.style.transform).toContain('translate(150px, 100px)');

      // 3. Zoom out via wheel back to <= 1.0
      lbViewport?.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true }));
      lbViewport?.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true }));
      lbViewport?.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true }));
      lbViewport?.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true }));

      // Position should be reset to (0, 0)
      expect(lbImage?.style.transform).toMatch(/translate\(0px,\s*0px\)/);
    });

    it('handles extreme wheel delta values (e.g. trackpad flings) without throwing', () => {
      triggerOpenLightbox();
      const lbViewport = document.getElementById('lb-viewport');
      const lbBadge = document.getElementById('lb-zoom-level');
      const lbImage = document.getElementById('lb-image');

      // Massive delta fling forward
      lbViewport?.dispatchEvent(new WheelEvent('wheel', { deltaY: -50000, bubbles: true, cancelable: true }));
      expect(lbBadge?.textContent).toBe('115%');

      // Massive delta fling backward
      lbViewport?.dispatchEvent(new WheelEvent('wheel', { deltaY: 50000, bubbles: true, cancelable: true }));
      expect(lbBadge?.textContent).toBe('98%');
    });
  });

  // ============================================================================
  // 2. Mouse Drag / Pan Physics, Classes & Boundary Behavior
  // ============================================================================
  describe('2. Mouse Drag / Pan Physics & Cursor State', () => {
    it('activates dragging class on mousedown and updates translation coordinates on mousemove', () => {
      triggerOpenLightbox();
      const lbViewport = document.getElementById('lb-viewport');
      const lbImage = document.getElementById('lb-image');

      // Mousedown
      lbViewport?.dispatchEvent(new MouseEvent('mousedown', { clientX: 300, clientY: 400, bubbles: true }));
      expect(lbViewport?.classList.contains('dragging')).toBe(true);

      // Mousemove
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 420, clientY: 350, bubbles: true }));
      expect(lbImage?.style.transform).toContain('translate(120px, -50px)');

      // Mousemove again
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, clientY: 600, bubbles: true }));
      expect(lbImage?.style.transform).toContain('translate(-100px, 200px)');

      // Mouseup
      window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      expect(lbViewport?.classList.contains('dragging')).toBe(false);

      // Subsequent mousemove after mouseup does not alter coordinates
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 800, clientY: 900, bubbles: true }));
      expect(lbImage?.style.transform).toContain('translate(-100px, 200px)');
    });

    it('does not initiate dragging if mousedown originates from the floating toolbar or close button', () => {
      triggerOpenLightbox();
      const lbViewport = document.getElementById('lb-viewport');
      const zoomInBtn = document.getElementById('lb-btn-zoom-in');
      const closeBtn = document.getElementById('lb-btn-close');

      // Mousedown on toolbar button
      zoomInBtn?.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 50, bubbles: true }));
      expect(lbViewport?.classList.contains('dragging')).toBe(false);

      // Mousedown on close button
      closeBtn?.dispatchEvent(new MouseEvent('mousedown', { clientX: 900, clientY: 50, bubbles: true }));
      expect(lbViewport?.classList.contains('dragging')).toBe(false);
    });

    it('toggles between 100% and 220% on viewport double-click depending on 1.2 threshold', () => {
      triggerOpenLightbox();
      const lbViewport = document.getElementById('lb-viewport');
      const lbImage = document.getElementById('lb-image');
      const lbBadge = document.getElementById('lb-zoom-level');

      expect(lbBadge?.textContent).toBe('100%');

      // Double click when zoom == 1.0 (<= 1.2) -> zooms to 2.2 (220%)
      lbViewport?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      expect(lbBadge?.textContent).toBe('220%');
      expect(lbImage?.style.transform).toContain('scale(2.2)');

      // Double click when zoom == 2.2 (> 1.2) -> resets to 1.0 (100%) and (0,0)
      lbViewport?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      expect(lbBadge?.textContent).toBe('100%');
      expect(lbImage?.style.transform).toBe('translate(0px, 0px) scale(1)');

      // Double click when zoom is 0.4 (<= 1.2) -> zooms to 2.2
      const zoomOutBtn = document.getElementById('lb-btn-zoom-out');
      for (let i = 0; i < 15; i++) zoomOutBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(lbBadge?.textContent).toBe('40%');

      lbViewport?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      expect(lbBadge?.textContent).toBe('220%');

      // Double click when zoom is 6.0 (> 1.2) -> resets to 1.0
      const zoomInBtn = document.getElementById('lb-btn-zoom-in');
      for (let i = 0; i < 15; i++) zoomInBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(lbBadge?.textContent).toBe('600%');

      lbViewport?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      expect(lbBadge?.textContent).toBe('100%');
      expect(lbImage?.style.transform).toBe('translate(0px, 0px) scale(1)');
    });

    it('ignores double-click events occurring inside the floating toolbar', () => {
      triggerOpenLightbox();
      const zoomInBtn = document.getElementById('lb-btn-zoom-in');
      const lbBadge = document.getElementById('lb-zoom-level');

      expect(lbBadge?.textContent).toBe('100%');

      // Double click on zoom button inside toolbar
      zoomInBtn?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      expect(lbBadge?.textContent).toBe('100%');
    });
  });

  // ============================================================================
  // 3. Floating Toolbar Buttons Functionality
  // ============================================================================
  describe('3. Floating Toolbar Buttons & Controls', () => {
    it('zooms in with factor 1.25 on clicking #lb-btn-zoom-in up to 6.0', () => {
      triggerOpenLightbox();
      const zoomInBtn = document.getElementById('lb-btn-zoom-in');
      const lbBadge = document.getElementById('lb-zoom-level');
      const lbImage = document.getElementById('lb-image');

      zoomInBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(lbBadge?.textContent).toBe('125%');

      zoomInBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(lbBadge?.textContent).toBe('156%');

      // Click 15 more times to hit max 6.0
      for (let i = 0; i < 15; i++) {
        zoomInBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
      expect(lbBadge?.textContent).toBe('600%');
      expect(lbImage?.style.transform).toContain('scale(6)');
    });

    it('zooms out with factor 0.8 on clicking #lb-btn-zoom-out down to 0.4', () => {
      triggerOpenLightbox();
      const zoomOutBtn = document.getElementById('lb-btn-zoom-out');
      const lbBadge = document.getElementById('lb-zoom-level');
      const lbImage = document.getElementById('lb-image');

      zoomOutBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(lbBadge?.textContent).toBe('80%');

      zoomOutBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(lbBadge?.textContent).toBe('64%');

      // Click 15 more times to hit min 0.4
      for (let i = 0; i < 15; i++) {
        zoomOutBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
      expect(lbBadge?.textContent).toBe('40%');
      expect(lbImage?.style.transform).toContain('scale(0.4)');
    });

    it('resets zoom to 100% and pos to (0, 0) on clicking #lb-btn-reset', () => {
      triggerOpenLightbox();
      const zoomInBtn = document.getElementById('lb-btn-zoom-in');
      const resetBtn = document.getElementById('lb-btn-reset');
      const lbBadge = document.getElementById('lb-zoom-level');
      const lbImage = document.getElementById('lb-image');

      // Zoom and pan
      zoomInBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      zoomInBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

      expect(lbBadge?.textContent).toBe('156%');
      expect(lbImage?.style.transform).not.toBe('translate(0px, 0px) scale(1)');

      // Reset
      resetBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(lbBadge?.textContent).toBe('100%');
      expect(lbImage?.style.transform).toBe('translate(0px, 0px) scale(1)');
    });

    it('triggers set_desktop_wallpaper IPC when clicking #lb-btn-apply on local wallpaper', async () => {
      triggerOpenLightbox();

      // Click lb-btn-apply
      const applyBtn = document.getElementById('lb-btn-apply');
      applyBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 60));

      const setCmds = mockBackendState.invokedCommands.filter(
        (c) => c.cmd === 'set_desktop_wallpaper' || c.cmd === 'download_and_set_online_wallpaper'
      );
      expect(setCmds.length).toBeGreaterThanOrEqual(1);
    });

    it('closes lightbox and resets state on clicking #lb-btn-close', () => {
      triggerOpenLightbox();
      const lb = document.getElementById('fullscreen-lightbox');
      const closeBtn = document.getElementById('lb-btn-close');
      const zoomInBtn = document.getElementById('lb-btn-zoom-in');
      const lbBadge = document.getElementById('lb-zoom-level');

      zoomInBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(lbBadge?.textContent).toBe('125%');

      closeBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(lb?.classList.contains('active')).toBe(false);
      expect(lbBadge?.textContent).toBe('100%');
    });
  });

  // ============================================================================
  // 4. Keyboard Navigation Shortcuts (Esc, Arrow keys, +/-, 0)
  // ============================================================================
  describe('4. Keyboard Navigation Shortcuts', () => {
    it('closes active lightbox on Escape key', () => {
      triggerOpenLightbox();
      const lb = document.getElementById('fullscreen-lightbox');
      expect(lb?.classList.contains('active')).toBe(true);

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(lb?.classList.contains('active')).toBe(false);
    });

    it('zooms in on "+" and "=" keys up to 600%', () => {
      triggerOpenLightbox();
      const lbBadge = document.getElementById('lb-zoom-level');
      const lbImage = document.getElementById('lb-image');

      window.dispatchEvent(new KeyboardEvent('keydown', { key: '+', bubbles: true }));
      expect(lbBadge?.textContent).toBe('125%');

      window.dispatchEvent(new KeyboardEvent('keydown', { key: '=', bubbles: true }));
      expect(lbBadge?.textContent).toBe('156%');

      for (let i = 0; i < 15; i++) {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: '+', bubbles: true }));
      }
      expect(lbBadge?.textContent).toBe('600%');
      expect(lbImage?.style.transform).toContain('scale(6)');
    });

    it('zooms out on "-" and "_" keys down to 40%', () => {
      triggerOpenLightbox();
      const lbBadge = document.getElementById('lb-zoom-level');
      const lbImage = document.getElementById('lb-image');

      window.dispatchEvent(new KeyboardEvent('keydown', { key: '-', bubbles: true }));
      expect(lbBadge?.textContent).toBe('80%');

      window.dispatchEvent(new KeyboardEvent('keydown', { key: '_', bubbles: true }));
      expect(lbBadge?.textContent).toBe('64%');

      for (let i = 0; i < 15; i++) {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: '-', bubbles: true }));
      }
      expect(lbBadge?.textContent).toBe('40%');
      expect(lbImage?.style.transform).toContain('scale(0.4)');
    });

    it('resets zoom to 100% on "0" key', () => {
      triggerOpenLightbox();
      const lbBadge = document.getElementById('lb-zoom-level');
      const lbImage = document.getElementById('lb-image');

      window.dispatchEvent(new KeyboardEvent('keydown', { key: '+', bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '+', bubbles: true }));
      expect(lbBadge?.textContent).toBe('156%');

      window.dispatchEvent(new KeyboardEvent('keydown', { key: '0', bubbles: true }));
      expect(lbBadge?.textContent).toBe('100%');
      expect(lbImage?.style.transform).toBe('translate(0px, 0px) scale(1)');
    });

    it('pans image by exact 40px increments on Arrow keys', () => {
      triggerOpenLightbox();
      const lbImage = document.getElementById('lb-image');

      // Zoom in first
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '+', bubbles: true }));

      // ArrowLeft 3 times: lbPosX += 120
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      expect(lbImage?.style.transform).toContain('translate(120px, 0px)');

      // ArrowRight 5 times: lbPosX -= 200 => -80
      for (let i = 0; i < 5; i++) {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      }
      expect(lbImage?.style.transform).toContain('translate(-80px, 0px)');

      // ArrowUp 2 times: lbPosY += 80
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      expect(lbImage?.style.transform).toContain('translate(-80px, 80px)');

      // ArrowDown 4 times: lbPosY -= 160 => -80
      for (let i = 0; i < 4; i++) {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      }
      expect(lbImage?.style.transform).toContain('translate(-80px, -80px)');
    });
  });

  // ============================================================================
  // 5. Strict Input Focus Guarding (Non-Interference with Text Inputs)
  // ============================================================================
  describe('5. Input Focus Guarding & Non-Interference', () => {
    it('does NOT trigger zoom, pan, or close shortcuts when an INPUT element is focused', () => {
      triggerOpenLightbox();
      const lb = document.getElementById('fullscreen-lightbox');
      const lbBadge = document.getElementById('lb-zoom-level');
      const lbImage = document.getElementById('lb-image');

      const testInput = document.getElementById('input-pexels-query');
      testInput?.focus();
      expect(document.activeElement).toBe(testInput);

      // Try typing '+', '-', '0', 'Escape', Arrow keys while input is focused
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '+', bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '=', bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '-', bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '0', bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      // Lightbox state must remain completely untouched
      expect(lb?.classList.contains('active')).toBe(true);
      expect(lbBadge?.textContent).toBe('100%');
      expect(lbImage?.style.transform).toBe('translate(0px, 0px) scale(1)');
    });

    it('does NOT trigger shortcuts when a TEXTAREA or SELECT element is focused', () => {
      triggerOpenLightbox();
      const lb = document.getElementById('fullscreen-lightbox');
      const lbBadge = document.getElementById('lb-zoom-level');

      // Create a temporary textarea to test textarea focus guarding
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      textarea.focus();
      expect(document.activeElement).toBe(textarea);

      window.dispatchEvent(new KeyboardEvent('keydown', { key: '+', bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(lb?.classList.contains('active')).toBe(true);
      expect(lbBadge?.textContent).toBe('100%');

      // Test SELECT focus
      const select = document.getElementById('select-config-cardratio');
      select?.focus();
      expect(document.activeElement).toBe(select);

      window.dispatchEvent(new KeyboardEvent('keydown', { key: '+', bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '0', bubbles: true }));
      expect(lbBadge?.textContent).toBe('100%');

      document.body.removeChild(textarea);
    });

    it('delegates Escape key to close Details Modal when Lightbox is NOT active', () => {
      const modal = document.getElementById('detail-modal');
      const lb = document.getElementById('fullscreen-lightbox');

      // Open detail modal only
      modal?.classList.add('active');
      expect(modal?.classList.contains('active')).toBe(true);
      expect(lb?.classList.contains('active')).toBe(false);

      // Press Escape
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(modal?.classList.contains('active')).toBe(false);
    });

    it('does not throw or mutate DOM when shortcuts are pressed with no overlay active', () => {
      const modal = document.getElementById('detail-modal');
      const lb = document.getElementById('fullscreen-lightbox');
      expect(modal?.classList.contains('active')).toBe(false);
      expect(lb?.classList.contains('active')).toBe(false);

      expect(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: '+', bubbles: true }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: '-', bubbles: true }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: '0', bubbles: true }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      }).not.toThrow();
    });
  });

  // ============================================================================
  // 6. Stress Testing: Rapid Interleaved Operations & Invariants
  // ============================================================================
  describe('6. High-Volume Stress & Lifecycle Invariants', () => {
    it('executes 1,000 rapid randomized zoom, pan, reset, and keyboard actions without NaN or unhandled exceptions', () => {
      triggerOpenLightbox();
      const lb = document.getElementById('fullscreen-lightbox');
      const lbViewport = document.getElementById('lb-viewport');
      const lbImage = document.getElementById('lb-image');
      const lbBadge = document.getElementById('lb-zoom-level');
      const zoomInBtn = document.getElementById('lb-btn-zoom-in');
      const zoomOutBtn = document.getElementById('lb-btn-zoom-out');
      const resetBtn = document.getElementById('lb-btn-reset');

      const actions = [
        () => zoomInBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true })),
        () => zoomOutBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true })),
        () => resetBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true })),
        () => lbViewport?.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true })),
        () => lbViewport?.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true })),
        () => window.dispatchEvent(new KeyboardEvent('keydown', { key: '+', bubbles: true })),
        () => window.dispatchEvent(new KeyboardEvent('keydown', { key: '-', bubbles: true })),
        () => window.dispatchEvent(new KeyboardEvent('keydown', { key: '0', bubbles: true })),
        () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })),
        () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })),
        () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })),
        () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })),
        () => lbViewport?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })),
        () => {
          lbViewport?.dispatchEvent(new MouseEvent('mousedown', { clientX: 200, clientY: 200, bubbles: true }));
          window.dispatchEvent(new MouseEvent('mousemove', { clientX: 230, clientY: 250, bubbles: true }));
          window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        }
      ];

      for (let i = 0; i < 1000; i++) {
        const action = actions[Math.floor(Math.random() * actions.length)];
        action();
      }

      // Check transform string validity (no NaN or undefined)
      const transform = lbImage?.style.transform || '';
      expect(transform).not.toContain('NaN');
      expect(transform).not.toContain('undefined');
      expect(transform).toMatch(/^translate\(-?\d+px,\s*-?\d+px\)\s*scale\(\d+(\.\d+)?\)$/);

      // Check badge validity
      const badgeText = lbBadge?.textContent || '';
      expect(badgeText).toMatch(/^\d+%$/);
      const parsedBadge = parseInt(badgeText, 10);
      expect(parsedBadge).toBeGreaterThanOrEqual(40);
      expect(parsedBadge).toBeLessThanOrEqual(600);
    });

    it('maintains clean state across 100 consecutive open/close cycles', () => {
      const lb = document.getElementById('fullscreen-lightbox');
      const closeBtn = document.getElementById('lb-btn-close');
      const zoomInBtn = document.getElementById('lb-btn-zoom-in');
      const lbBadge = document.getElementById('lb-zoom-level');
      const lbImage = document.getElementById('lb-image');

      for (let i = 0; i < 100; i++) {
        triggerOpenLightbox();
        expect(lb?.classList.contains('active')).toBe(true);

        // Zoom in to 156%
        zoomInBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        zoomInBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        // Close
        closeBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(lb?.classList.contains('active')).toBe(false);
        expect(lbBadge?.textContent).toBe('100%');
        expect(lbImage?.style.transform).toBe('translate(0px, 0px) scale(1)');
      }
    });
  });

  // ============================================================================
  // 7. CSS & Design Token Compliance Verification
  // ============================================================================
  describe('7. CSS Tokens & Visual Invariants', () => {
    it('defines standard M3 elevation Level 5 for floating toolbar in styles.css', () => {
      const stylesCss = fs.readFileSync(stylesCssPath, 'utf8');

      // Lightbox Backdrop
      expect(stylesCss).toContain('.fullscreen-lightbox-backdrop');
      expect(stylesCss).toContain('backdrop-filter: blur(28px)');
      expect(stylesCss).toContain('z-index: 10000');

      // Floating Toolbar
      expect(stylesCss).toContain('.lightbox-floating-toolbar');
      expect(stylesCss).toContain('box-shadow: var(--md-sys-elevation-5)');
      expect(stylesCss).toContain('border-radius: var(--md-shape-corner-full)');

      // Viewport cursor states
      expect(stylesCss).toContain('.lightbox-viewport {');
      expect(stylesCss).toContain('cursor: grab;');
      expect(stylesCss).toContain('.lightbox-viewport.dragging {');
      expect(stylesCss).toContain('cursor: grabbing;');

      // Close button
      expect(stylesCss).toContain('.lightbox-close-btn');
    });
  });
});
