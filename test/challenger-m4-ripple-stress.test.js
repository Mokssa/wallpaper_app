/**
 * ==============================================================================
 * Challenger 1 Milestone 4: Ripple Engine Performance & Memory Leak Stress Suite
 * ==============================================================================
 * Empirically tests & validates:
 * 1. 1,000 rapid clicks across multiple buttons with zero DOM node leaks.
 * 2. Multi-button interleaved high-concurrency click stress.
 * 3. Fallback auto-cleanup timeout (600ms fade-out + 300ms remove) when pointerup is dropped.
 * 4. Keyboard accessibility: Enter & Space activation on focused elements.
 * 5. Keyboard focus guarding: No ripples on <input>, <textarea>, <select>, or unfocused elements.
 * 6. Non-interactive container exclusion: No spurious ripples on body, containers, text, headers.
 * 7. Disabled & aria-disabled element protection.
 * 8. Secondary button (right click, middle click) exclusion.
 * 9. Pointerdown + mousedown dual-event deduplication within 80ms window.
 * 10. CSS token compliance: position, z-index isolation, overflow hidden, M3 animation tokens.
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

describe('Challenger 1 Milestone 4 — Ripple Engine Stress & Verification Suite', () => {
  let cssContent = '';

  beforeEach(async () => {
    resetMockBackendState();
    setupMockTauri();
    loadIndexHTML();
    cssContent = fs.readFileSync(stylesCssPath, 'utf8');
    initializeAppRuntime();
    // Allow async DOM setup and initialization to complete
    await new Promise((resolve) => setTimeout(resolve, 80));
  });

  // ============================================================================
  // 1. 1,000 Rapid Clicks Stress Test & Zero DOM Leaks
  // ============================================================================
  describe('1. 1,000 Rapid Clicks & DOM Memory Leak Verification', () => {
    it('executes 1,000 rapid pointerdown clicks across diverse buttons and verifies 100% ripple cleanup', async () => {
      const buttons = [
        document.getElementById('btn-quick-random'),
        document.getElementById('btn-refresh-gallery'),
        document.getElementById('btn-open-cache-folder'),
        document.getElementById('btn-pexels-search'),
        document.getElementById('btn-browse-dir'),
        document.getElementById('btn-prev-page'),
        document.getElementById('btn-next-page'),
        ...document.querySelectorAll('.nav-rail-item'),
        ...document.querySelectorAll('.filter-chip'),
        ...document.querySelectorAll('.segmented-btn'),
        ...document.querySelectorAll('.theme-palette-chip'),
        ...document.querySelectorAll('.titlebar-btn:not(.close)')
      ].filter(Boolean);

      expect(buttons.length).toBeGreaterThanOrEqual(8);

      // Mock bounding rects for all test buttons
      buttons.forEach((btn, idx) => {
        btn.disabled = false;
        btn.getBoundingClientRect = () => ({
          left: 50 + (idx % 5) * 120,
          top: 100 + Math.floor(idx / 5) * 60,
          right: 150 + (idx % 5) * 120,
          bottom: 140 + Math.floor(idx / 5) * 60,
          width: 100,
          height: 40
        });
      });

      // Fire 1,000 clicks distributed across buttons
      for (let i = 0; i < 1000; i++) {
        const btn = buttons[i % buttons.length];
        const clientX = 60 + ((i * 7) % 80);
        const clientY = 110 + ((i * 3) % 20);

        // Pointerdown
        btn.dispatchEvent(new MouseEvent('pointerdown', {
          bubbles: true,
          clientX,
          clientY,
          button: 0
        }));

        // Occasional pointerup to simulate natural user releases
        if (i % 3 === 0) {
          window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
        }
      }

      // Final release
      window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));

      // Wait for 600ms fallback timeout + 300ms fadeout transition to settle
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Assert zero leftover ripple wave elements across entire DOM
      const lingeringRipples = document.querySelectorAll('.m3-ripple-wave, .md-ripple-wave');
      expect(lingeringRipples.length).toBe(0);

      // Also verify each button has no orphan ripple children
      buttons.forEach((btn) => {
        expect(btn.querySelectorAll('.m3-ripple-wave').length).toBe(0);
      });
    });

    it('spawns ripple with correct diameter and coordinate positioning relative to target boundary', () => {
      const btn = document.getElementById('btn-quick-random');
      expect(btn).not.toBeNull();

      btn.getBoundingClientRect = () => ({
        left: 200,
        top: 300,
        right: 400,
        bottom: 350,
        width: 200,
        height: 50
      });

      // Click at (250, 310) -> relative (50, 10)
      btn.dispatchEvent(new MouseEvent('pointerdown', {
        bubbles: true,
        clientX: 250,
        clientY: 310,
        button: 0
      }));

      const ripple = btn.querySelector('.m3-ripple-wave');
      expect(ripple).not.toBeNull();

      // dX = max(50, 150) = 150, dY = max(10, 40) = 40
      // radius = sqrt(150^2 + 40^2) = sqrt(22500 + 1600) = sqrt(24100) ≈ 155.24px
      // diameter ≈ 310.48px
      const expectedRadius = Math.hypot(150, 40);
      const expectedDiameter = expectedRadius * 2;

      expect(parseFloat(ripple.style.width)).toBeCloseTo(expectedDiameter, 0);
      expect(parseFloat(ripple.style.height)).toBeCloseTo(expectedDiameter, 0);
      expect(parseFloat(ripple.style.left)).toBeCloseTo(50 - expectedRadius, 0);
      expect(parseFloat(ripple.style.top)).toBeCloseTo(10 - expectedRadius, 0);

      // Trigger cleanup
      window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
      ripple.dispatchEvent(new Event('transitionend'));
      expect(btn.querySelector('.m3-ripple-wave')).toBeNull();
    });

    it('handles element detachment mid-ripple animation without unhandled runtime exceptions', async () => {
      const tempBtn = document.createElement('button');
      tempBtn.className = 'md-btn';
      tempBtn.textContent = 'Temp Button';
      document.body.appendChild(tempBtn);

      tempBtn.getBoundingClientRect = () => ({
        left: 0,
        top: 0,
        right: 100,
        bottom: 40,
        width: 100,
        height: 40
      });

      tempBtn.dispatchEvent(new MouseEvent('pointerdown', {
        bubbles: true,
        clientX: 20,
        clientY: 20,
        button: 0
      }));

      const ripple = tempBtn.querySelector('.m3-ripple-wave');
      expect(ripple).not.toBeNull();

      // Detach parent button from DOM while ripple is active
      document.body.removeChild(tempBtn);

      // Trigger pointer release & transitionend
      expect(() => {
        window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
        window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        ripple.dispatchEvent(new Event('transitionend'));
      }).not.toThrow();
    });
  });

  // ============================================================================
  // 2. Fallback Auto-Cleanup (Dropped pointerup / Pointercancel)
  // ============================================================================
  describe('2. Fallback Auto-Cleanup & Event Cancellation', () => {
    it('automatically removes ripple after 600ms fallback timeout if pointerup is never fired', async () => {
      const btn = document.getElementById('btn-refresh-gallery');
      expect(btn).not.toBeNull();

      btn.getBoundingClientRect = () => ({
        left: 0,
        top: 0,
        right: 100,
        bottom: 40,
        width: 100,
        height: 40
      });

      btn.dispatchEvent(new MouseEvent('pointerdown', {
        bubbles: true,
        clientX: 50,
        clientY: 20,
        button: 0
      }));

      const ripple = btn.querySelector('.m3-ripple-wave');
      expect(ripple).not.toBeNull();
      expect(ripple.classList.contains('m3-ripple-fade-out')).toBe(false);

      // Wait 650ms (triggering the 600ms setTimeout)
      await new Promise((resolve) => setTimeout(resolve, 650));
      expect(ripple.classList.contains('m3-ripple-fade-out')).toBe(true);

      // Wait additional 350ms (triggering the 300ms removal setTimeout)
      await new Promise((resolve) => setTimeout(resolve, 350));
      expect(btn.querySelector('.m3-ripple-wave')).toBeNull();
    });

    it('cleans up ripple immediately on pointercancel', () => {
      const btn = document.getElementById('btn-refresh-gallery');
      expect(btn).not.toBeNull();

      btn.getBoundingClientRect = () => ({ left: 0, top: 0, right: 100, bottom: 40, width: 100, height: 40 });

      btn.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10, button: 0 }));
      const ripple = btn.querySelector('.m3-ripple-wave');
      expect(ripple).not.toBeNull();

      window.dispatchEvent(new Event('pointercancel'));
      expect(ripple.classList.contains('m3-ripple-fade-out')).toBe(true);

      ripple.dispatchEvent(new Event('transitionend'));
      expect(btn.querySelector('.m3-ripple-wave')).toBeNull();
    });

    it('cleans up ripple on pointerleave from target button', () => {
      const btn = document.getElementById('btn-refresh-gallery');
      expect(btn).not.toBeNull();

      btn.getBoundingClientRect = () => ({ left: 0, top: 0, right: 100, bottom: 40, width: 100, height: 40 });

      btn.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10, button: 0 }));
      const ripple = btn.querySelector('.m3-ripple-wave');
      expect(ripple).not.toBeNull();

      btn.dispatchEvent(new Event('pointerleave'));
      expect(ripple.classList.contains('m3-ripple-fade-out')).toBe(true);

      ripple.dispatchEvent(new Event('transitionend'));
      expect(btn.querySelector('.m3-ripple-wave')).toBeNull();
    });
  });

  // ============================================================================
  // 3. Keyboard Enter & Space Activation
  // ============================================================================
  describe('3. Keyboard Enter & Space Accessibility Triggers', () => {
    it('spawns a centered ripple when Enter key is pressed on a focused interactive button', () => {
      const btn = document.getElementById('btn-refresh-gallery');
      expect(btn).not.toBeNull();

      btn.getBoundingClientRect = () => ({
        left: 100,
        top: 100,
        right: 300,
        bottom: 160,
        width: 200,
        height: 60
      });

      btn.focus();
      expect(document.activeElement).toBe(btn);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      const ripple = btn.querySelector('.m3-ripple-wave');
      expect(ripple).not.toBeNull();

      // Keyboard ripple must be centered: x = 100, y = 30
      // radius = hypot(100, 30) ≈ 104.40px, diameter ≈ 208.80px
      const expectedRadius = Math.hypot(100, 30);
      const expectedDiameter = expectedRadius * 2;

      expect(parseFloat(ripple.style.width)).toBeCloseTo(expectedDiameter, 0);
      expect(parseFloat(ripple.style.height)).toBeCloseTo(expectedDiameter, 0);
      expect(parseFloat(ripple.style.left)).toBeCloseTo(100 - expectedRadius, 0);
      expect(parseFloat(ripple.style.top)).toBeCloseTo(30 - expectedRadius, 0);
    });

    it('spawns a centered ripple when Space key (" ") is pressed on a focused interactive button', () => {
      const navItem = document.getElementById('btn-quick-random') || document.querySelector('.btn-quick-random');
      expect(navItem).not.toBeNull();

      navItem.getBoundingClientRect = () => ({
        left: 0,
        top: 100,
        right: 80,
        bottom: 180,
        width: 80,
        height: 80
      });

      navItem.focus();
      expect(document.activeElement).toBe(navItem);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));

      const ripple = navItem.querySelector('.m3-ripple-wave');
      expect(ripple).not.toBeNull();

      // Centered: x = 40, y = 40, radius = hypot(40, 40) ≈ 56.57px
      const expectedRadius = Math.hypot(40, 40);
      expect(parseFloat(ripple.style.left)).toBeCloseTo(40 - expectedRadius, 0);
      expect(parseFloat(ripple.style.top)).toBeCloseTo(40 - expectedRadius, 0);
    });

    it('does NOT spawn ripple on Enter or Space when an INPUT field is focused', () => {
      const input = document.getElementById('input-pexels-query');
      expect(input).not.toBeNull();

      input.focus();
      expect(document.activeElement).toBe(input);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));

      expect(input.querySelector('.m3-ripple-wave')).toBeNull();
      expect(document.querySelectorAll('.m3-ripple-wave').length).toBe(0);
    });

    it('does NOT spawn ripple on Enter or Space when a SELECT dropdown is focused', () => {
      const select = document.getElementById('select-config-cardratio');
      expect(select).not.toBeNull();

      select.focus();
      expect(document.activeElement).toBe(select);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));

      expect(select.querySelector('.m3-ripple-wave')).toBeNull();
      expect(document.querySelectorAll('.m3-ripple-wave').length).toBe(0);
    });

    it('does NOT spawn ripple when non-trigger keys (Arrow keys, Escape, Tab, characters) are pressed', () => {
      const btn = document.getElementById('btn-quick-random');
      btn.focus();

      ['ArrowUp', 'ArrowDown', 'Escape', 'Tab', 'a', 'b', '1', 'Shift'].forEach((key) => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      });

      expect(btn.querySelector('.m3-ripple-wave')).toBeNull();
    });
  });

  // ============================================================================
  // 4. Non-Interactive Containers & Exclusion Verification
  // ============================================================================
  describe('4. Target Filtering & Non-Interactive Containers Exclusion', () => {
    it('does NOT spawn ripples when clicking on document.body or background containers', () => {
      const containers = [
        document.body,
        document.getElementById('app-layout'),
        document.getElementById('main-content'),
        document.getElementById('tab-gallery'),
        document.getElementById('tab-explore'),
        document.getElementById('tab-settings'),
        document.querySelector('.settings-container'),
        document.querySelector('.nav-rail')
      ].filter(Boolean);

      containers.forEach((container) => {
        container.dispatchEvent(new MouseEvent('pointerdown', {
          bubbles: true,
          clientX: 200,
          clientY: 200,
          button: 0
        }));
      });

      expect(document.querySelectorAll('.m3-ripple-wave').length).toBe(0);
    });

    it('does NOT spawn ripples when clicking on headers, text spans, or labels', () => {
      const textElements = [
        ...document.querySelectorAll('h1, h2, h3, h4, .app-title, .settings-group-title, label, p, .gallery-count-badge')
      ];

      expect(textElements.length).toBeGreaterThan(0);

      textElements.forEach((el) => {
        el.dispatchEvent(new MouseEvent('pointerdown', {
          bubbles: true,
          clientX: 50,
          clientY: 50,
          button: 0
        }));
      });

      expect(document.querySelectorAll('.m3-ripple-wave').length).toBe(0);
    });

    it('does NOT spawn ripples on disabled or aria-disabled buttons', () => {
      const btn = document.getElementById('btn-batch-delete') || document.querySelector('button');
      btn.disabled = true;

      btn.dispatchEvent(new MouseEvent('pointerdown', {
        bubbles: true,
        clientX: 10,
        clientY: 10,
        button: 0
      }));

      expect(btn.querySelector('.m3-ripple-wave')).toBeNull();

      // Test aria-disabled
      btn.disabled = false;
      btn.setAttribute('aria-disabled', 'true');

      btn.dispatchEvent(new MouseEvent('pointerdown', {
        bubbles: true,
        clientX: 10,
        clientY: 10,
        button: 0
      }));

      expect(btn.querySelector('.m3-ripple-wave')).toBeNull();

      // Test .disabled class
      btn.removeAttribute('aria-disabled');
      btn.classList.add('disabled');

      btn.dispatchEvent(new MouseEvent('pointerdown', {
        bubbles: true,
        clientX: 10,
        clientY: 10,
        button: 0
      }));

      expect(btn.querySelector('.m3-ripple-wave')).toBeNull();
    });

    it('does NOT spawn ripples on right-click (button 2) or middle-click (button 1)', () => {
      const btn = document.getElementById('btn-quick-random');

      // Right-click (button = 2)
      btn.dispatchEvent(new MouseEvent('pointerdown', {
        bubbles: true,
        clientX: 20,
        clientY: 20,
        button: 2
      }));

      // Middle-click (button = 1)
      btn.dispatchEvent(new MouseEvent('pointerdown', {
        bubbles: true,
        clientX: 20,
        clientY: 20,
        button: 1
      }));

      expect(btn.querySelector('.m3-ripple-wave')).toBeNull();
    });
  });

  // ============================================================================
  // 5. Dual-Event Deduplication & High-Frequency Debounce Guard
  // ============================================================================
  describe('5. Dual-Event Deduplication & Rapid Debounce', () => {
    it('deduplicates simultaneous pointerdown + mousedown events on same target within 80ms', () => {
      const btn = document.getElementById('btn-quick-random');
      btn.getBoundingClientRect = () => ({ left: 0, top: 0, right: 100, bottom: 40, width: 100, height: 40 });

      // Simulate simultaneous touch/mouse synthetic event burst
      btn.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 20, clientY: 20, button: 0 }));
      btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 20, clientY: 20, button: 0 }));

      // Exactly 1 ripple should exist, not 2
      const ripples = btn.querySelectorAll('.m3-ripple-wave');
      expect(ripples.length).toBe(1);

      // Cleanup
      window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
      ripples[0].dispatchEvent(new Event('transitionend'));
      expect(btn.querySelectorAll('.m3-ripple-wave').length).toBe(0);
    });

    it('allows separate ripples on different targets without blocking', () => {
      const btn1 = document.getElementById('btn-quick-random');
      const btn2 = document.getElementById('btn-refresh-gallery');

      btn1.getBoundingClientRect = () => ({ left: 0, top: 0, right: 100, bottom: 40, width: 100, height: 40 });
      btn2.getBoundingClientRect = () => ({ left: 110, top: 0, right: 210, bottom: 40, width: 100, height: 40 });

      btn1.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 20, clientY: 20, button: 0 }));
      btn2.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 120, clientY: 20, button: 0 }));

      expect(btn1.querySelectorAll('.m3-ripple-wave').length).toBe(1);
      expect(btn2.querySelectorAll('.m3-ripple-wave').length).toBe(1);

      // Cleanup
      window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
      btn1.querySelector('.m3-ripple-wave')?.dispatchEvent(new Event('transitionend'));
      btn2.querySelector('.m3-ripple-wave')?.dispatchEvent(new Event('transitionend'));
      expect(document.querySelectorAll('.m3-ripple-wave').length).toBe(0);
    });
  });

  // ============================================================================
  // 6. CSS & Token Specification Compliance
  // ============================================================================
  describe('6. CSS Architecture & Motion Token Invariants', () => {
    it('sets position: relative and overflow: hidden on all M3 interactive selectors', () => {
      expect(cssContent).toMatch(/\.md-ripple-surface,\s*[\s\S]*?position:\s*relative;\s*overflow:\s*hidden;/);
    });

    it('sets z-index: 2 on child contents to keep icons/text above the ripple wave', () => {
      expect(cssContent).toMatch(/\.md-ripple-surface\s*>\s*\*,[\s\S]*?z-index:\s*2;/);
    });

    it('configures .md-ripple-wave with pointer-events: none, z-index: 1, and M3 expand keyframe', () => {
      expect(cssContent).toMatch(/\.md-ripple-wave,\s*\.m3-ripple-wave\s*\{[\s\S]*?pointer-events:\s*none;/);
      expect(cssContent).toMatch(/\.md-ripple-wave,\s*\.m3-ripple-wave\s*\{[\s\S]*?z-index:\s*1;/);
      expect(cssContent).toMatch(/animation:\s*m3-ripple-expand\s*380ms\s*var\(--md-sys-motion-easing-emphasized-decelerate/);
    });

    it('configures .m3-ripple-fade-out with standard easing and 250ms opacity transition', () => {
      expect(cssContent).toMatch(/\.m3-ripple-wave\.m3-ripple-fade-out[\s\S]*?opacity:\s*0\s*!important;/);
      expect(cssContent).toMatch(/transition:\s*opacity\s*250ms\s*var\(--md-sys-motion-easing-standard/);
    });
  });
});
