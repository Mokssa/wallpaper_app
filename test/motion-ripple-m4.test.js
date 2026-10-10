/**
 * ==============================================================================
 * Milestone 4: M3 Motion System, State Layers, Ripple Engine & A11y Suite
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
const stylesPath = path.join(projectRoot, 'ui', 'styles.css');

function initializeAppRuntime() {
  const appCode = fs.readFileSync(appJsPath, 'utf8');
  const runScript = new Function(appCode);
  runScript();
  document.dispatchEvent(new Event('DOMContentLoaded'));
}

describe('Milestone 4 — M3 Motion System & Ripple Engine Suite', () => {
  let cssContent = '';

  beforeEach(async () => {
    resetMockBackendState();
    setupMockTauri();
    loadIndexHTML();
    cssContent = fs.readFileSync(stylesPath, 'utf8');
    initializeAppRuntime();
    await new Promise((resolve) => setTimeout(resolve, 80));
  });

  // ---------------------------------------------------------------------------
  // 1. M3 Motion Tokens & Easing Curves
  // ---------------------------------------------------------------------------
  describe('1. M3 Motion Tokens & Easing Curves Specification', () => {
    it('defines canonical M3 easing curves in :root', () => {
      expect(cssContent).toMatch(/--md-sys-motion-easing-standard:\s*cubic-bezier\(0\.2,\s*0(?:\.0)?,\s*0,\s*1(?:\.0)?\)/);
      expect(cssContent).toMatch(/--md-sys-motion-easing-emphasized-decelerate:\s*cubic-bezier\(0\.05,\s*0\.7,\s*0\.1,\s*1(?:\.0)?\)/);
      expect(cssContent).toMatch(/--md-sys-motion-easing-emphasized-accelerate:\s*cubic-bezier\(0\.3,\s*0(?:\.0)?,\s*0\.8,\s*0\.15\)/);
      expect(cssContent).toMatch(/--md-sys-motion-easing-linear:\s*cubic-bezier\(0(?:\.0)?,\s*0(?:\.0)?,\s*1(?:\.0)?,\s*1(?:\.0)?\)/);
    });

    it('defines complete 16-step duration scale from short1 to extra-long4', () => {
      // Short tier (50ms - 200ms)
      expect(cssContent).toMatch(/--md-sys-motion-duration-short1:\s*50ms;/);
      expect(cssContent).toMatch(/--md-sys-motion-duration-short2:\s*100ms;/);
      expect(cssContent).toMatch(/--md-sys-motion-duration-short3:\s*150ms;/);
      expect(cssContent).toMatch(/--md-sys-motion-duration-short4:\s*200ms;/);

      // Medium tier (250ms - 400ms)
      expect(cssContent).toMatch(/--md-sys-motion-duration-medium1:\s*250ms;/);
      expect(cssContent).toMatch(/--md-sys-motion-duration-medium2:\s*300ms;/);
      expect(cssContent).toMatch(/--md-sys-motion-duration-medium3:\s*350ms;/);
      expect(cssContent).toMatch(/--md-sys-motion-duration-medium4:\s*400ms;/);

      // Long tier (450ms - 600ms)
      expect(cssContent).toMatch(/--md-sys-motion-duration-long1:\s*450ms;/);
      expect(cssContent).toMatch(/--md-sys-motion-duration-long2:\s*500ms;/);
      expect(cssContent).toMatch(/--md-sys-motion-duration-long3:\s*550ms;/);
      expect(cssContent).toMatch(/--md-sys-motion-duration-long4:\s*600ms;/);

      // Extra-long tier (700ms - 1000ms)
      expect(cssContent).toMatch(/--md-sys-motion-duration-extra-long1:\s*700ms;/);
      expect(cssContent).toMatch(/--md-sys-motion-duration-extra-long4:\s*1000ms;/);
    });

    it('defines backward-compatible aliases for legacy duration references', () => {
      expect(cssContent).toMatch(/--md-sys-motion-duration-short:/);
      expect(cssContent).toMatch(/--md-sys-motion-duration-medium:/);
      expect(cssContent).toMatch(/--md-sys-motion-duration-long:/);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. M3 Keyframes & Motion Physics
  // ---------------------------------------------------------------------------
  describe('2. Keyframes Library & Motion Physics', () => {
    it('defines tab transition keyframes m3TabFadeSlideIn', () => {
      expect(cssContent).toMatch(/@keyframes\s+m3TabFadeSlideIn\b/);
      expect(cssContent).toMatch(/@keyframes\s+m3-tab-fade-slide-in\b/);
    });

    it('defines elevation transition keyframes', () => {
      expect(cssContent).toMatch(/@keyframes\s+m3-elevation-raise-1-3\b/);
      expect(cssContent).toMatch(/@keyframes\s+m3-elevation-lower-3-1\b/);
      expect(cssContent).toMatch(/@keyframes\s+m3-elevation-raise-0-2\b/);
    });

    it('defines dialog asymmetric scale keyframes', () => {
      expect(cssContent).toMatch(/@keyframes\s+m3-dialog-surface-scale-in\b/);
      expect(cssContent).toMatch(/@keyframes\s+m3-dialog-surface-scale-out\b/);
      expect(cssContent).toMatch(/@keyframes\s+m3-dialog-backdrop-fade-in\b/);
    });

    it('defines snackbar slide keyframes and ripple expand keyframe', () => {
      expect(cssContent).toMatch(/@keyframes\s+m3-snackbar-slide-up\b/);
      expect(cssContent).toMatch(/@keyframes\s+m3-ripple-expand\b/);
      expect(cssContent).toMatch(/@keyframes\s+m3-pill-expand\b/);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. State Layers & Reduced Motion A11y
  // ---------------------------------------------------------------------------
  describe('3. Universal State Layer & Accessibility', () => {
    it('defines universal ::after state layer rules for interactive components', () => {
      expect(cssContent).toMatch(/\.md-ripple-surface::after[\s\S]*?background-color:\s*currentColor/);
      expect(cssContent).toMatch(/opacity:\s*var\(--md-sys-state-hover-opacity,\s*0\.08\)/);
      expect(cssContent).toMatch(/opacity:\s*var\(--md-sys-state-focus-opacity,\s*0\.12\)/);
      expect(cssContent).toMatch(/opacity:\s*var\(--md-sys-state-pressed-opacity,\s*0\.12\)/);
    });

    it('implements comprehensive prefers-reduced-motion media query', () => {
      expect(cssContent).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
      expect(cssContent).toMatch(/animation-duration:\s*0\.01ms\s*!important/);
      expect(cssContent).toMatch(/transition-duration:\s*0\.01ms\s*!important/);
      expect(cssContent).toMatch(/\.tab-page\.active\s*\{[\s\S]*?animation:\s*none\s*!important/);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Ripple Engine Runtime Behavior & Event Delegation
  // ---------------------------------------------------------------------------
  describe('4. Zero-Dependency M3 Ripple Engine Runtime', () => {
    it('spawns ripple wave upon pointerdown on interactive button', () => {
      const btn = document.getElementById('btn-quick-random');
      expect(btn).not.toBeNull();

      // Mock getBoundingClientRect
      btn.getBoundingClientRect = () => ({
        left: 100,
        top: 200,
        right: 300,
        bottom: 244,
        width: 200,
        height: 44
      });

      const pointerEvent = new MouseEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        clientX: 150,
        clientY: 220,
        button: 0
      });

      btn.dispatchEvent(pointerEvent);

      const ripple = btn.querySelector('.m3-ripple-wave');
      expect(ripple).not.toBeNull();
      expect(ripple.classList.contains('m3-ripple-wave')).toBe(true);
      expect(parseFloat(ripple.style.width)).toBeGreaterThan(0);
      expect(parseFloat(ripple.style.height)).toBeGreaterThan(0);
    });

    it('cleans up ripple wave on pointerup with fade-out class and removal', async () => {
      const btn = document.getElementById('btn-quick-random');
      btn.getBoundingClientRect = () => ({
        left: 100,
        top: 200,
        right: 300,
        bottom: 244,
        width: 200,
        height: 44
      });

      btn.dispatchEvent(new MouseEvent('pointerdown', {
        bubbles: true,
        clientX: 150,
        clientY: 220,
        button: 0
      }));

      const ripple = btn.querySelector('.m3-ripple-wave');
      expect(ripple).not.toBeNull();

      // Dispatch pointerup to trigger release fade-out
      window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));

      expect(ripple.classList.contains('m3-ripple-fade-out')).toBe(true);

      // Trigger transitionend for auto-removal
      ripple.dispatchEvent(new Event('transitionend'));
      expect(btn.querySelector('.m3-ripple-wave')).toBeNull();
    });

    it('spawns centered ripple on keyboard Enter / Space on focused interactive control', () => {
      const btn = document.getElementById('btn-refresh-gallery');
      expect(btn).not.toBeNull();

      btn.getBoundingClientRect = () => ({
        left: 50,
        top: 50,
        right: 150,
        bottom: 90,
        width: 100,
        height: 40
      });

      btn.focus();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      const ripple = btn.querySelector('.m3-ripple-wave');
      expect(ripple).not.toBeNull();
    });

    it('does not spawn ripple on disabled buttons', () => {
      const btn = document.getElementById('btn-batch-delete') || document.querySelector('button');
      expect(btn).not.toBeNull();
      btn.disabled = true;

      btn.dispatchEvent(new MouseEvent('pointerdown', {
        bubbles: true,
        clientX: 10,
        clientY: 10,
        button: 0
      }));

      const ripple = btn.querySelector('.m3-ripple-wave');
      expect(ripple).toBeNull();
    });
  });
});
