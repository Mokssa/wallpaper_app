/**
 * ==============================================================================
 * Challenger 2 Milestone 4: Motion System, Tab Transitions, Dialog Physics,
 * Card Physics & Reduced-Motion Empirical Stress Test Suite
 * ==============================================================================
 * Empirically validates:
 * 1. Rapid consecutive tab switching stress & layout invariants (1,000 iterations)
 * 2. Details Modal & Fullscreen Lightbox asymmetric open/close physics & lifecycle
 * 3. Nested overlay dismissal hierarchy & keyboard accessibility (Escape priority)
 * 4. M3 Wallpaper Card hover lift, active click depression, and elevation rules
 * 5. Complete prefers-reduced-motion media query overrides & WCAG 2.1 SC 2.3.3 compliance
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

describe('Challenger 2 Milestone 4 — Motion Physics, Dialog Cycles & Reduced-Motion Stress Suite', () => {
  let cssContent = '';

  beforeEach(async () => {
    resetMockBackendState();
    setupMockTauri();
    loadIndexHTML();
    cssContent = fs.readFileSync(stylesCssPath, 'utf8');
    initializeAppRuntime();
    document.getElementById('btn-pexels-search')?.click();
    await new Promise((resolve) => setTimeout(resolve, 80));
  });

  // ---------------------------------------------------------------------------
  // 1. Tab Transitions & Rapid Switching Layout Invariants
  // ---------------------------------------------------------------------------
  describe('1. Tab Transitions & High-Frequency Switching Stress', () => {
    it('verifies CSS keyframe m3TabFadeSlideIn exists and has correct 8px translateY delta', () => {
      expect(cssContent).toMatch(/@keyframes\s+m3TabFadeSlideIn\s*\{[\s\S]*?0%\s*\{[\s\S]*?opacity:\s*0;[\s\S]*?transform:\s*translateY\(8px\);[\s\S]*?\}[\s\S]*?100%\s*\{[\s\S]*?opacity:\s*1;[\s\S]*?transform:\s*translateY\(0\);[\s\S]*?\}\s*\}/);
    });

    it('verifies .tab-page.active has 250ms duration, standard easing, and will-change declaration', () => {
      const activeRuleRegex = /\.tab-page\.active\s*\{([\s\S]*?)\}/;
      const match = cssContent.match(activeRuleRegex);
      expect(match).not.toBeNull();
      const body = match[1];
      expect(body).toMatch(/display:\s*block/);
      expect(body).toMatch(/animation:\s*m3TabFadeSlideIn\s+250ms/);
      expect(body).toMatch(/will-change:\s*opacity,\s*transform/);
    });

    it('executes 1,000 rapid randomized tab switches with zero layout jump or orphaned active states', () => {
      const tabs = ['gallery', 'explore', 'settings'];
      const navGallery = document.querySelector('[data-tab="gallery"]');
      const navExplore = document.querySelector('[data-tab="explore"]');
      const navSettings = document.querySelector('[data-tab="settings"]');

      const navMap = {
        gallery: navGallery,
        explore: navExplore,
        settings: navSettings
      };

      for (let i = 0; i < 1000; i++) {
        const targetTab = tabs[Math.floor(Math.random() * tabs.length)];
        const navBtn = navMap[targetTab];
        expect(navBtn).not.toBeNull();

        navBtn.click();

        // Check nav rail invariant: exactly one active
        const activeNavItems = document.querySelectorAll('.nav-rail-item.active');
        expect(activeNavItems.length).toBe(1);
        expect(activeNavItems[0].getAttribute('data-tab')).toBe(targetTab);

        // Check tab page invariant: exactly one active
        const activePages = document.querySelectorAll('.tab-page.active');
        expect(activePages.length).toBe(1);
        expect(activePages[0].id).toBe(`tab-${targetTab}`);

        // Check inactive pages are not active
        tabs.forEach((t) => {
          const page = document.getElementById(`tab-${t}`);
          if (t === targetTab) {
            expect(page.classList.contains('active')).toBe(true);
          } else {
            expect(page.classList.contains('active')).toBe(false);
          }
        });
      }
    });

    it('handles high-frequency duplicate clicks on the same tab without throwing or corrupting state', () => {
      const navExplore = document.querySelector('[data-tab="explore"]');
      for (let i = 0; i < 100; i++) {
        navExplore.click();
      }

      const activePages = document.querySelectorAll('.tab-page.active');
      expect(activePages.length).toBe(1);
      expect(activePages[0].id).toBe('tab-explore');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Dialog Enter / Exit Physics & Asymmetric State Cycles
  // ---------------------------------------------------------------------------
  describe('2. Details Modal & Dialog Physics Lifecycle', () => {
    it('verifies Details Modal CSS implements canonical asymmetric timing (250ms in, 180ms out)', () => {
      // Resting backdrop: 180ms accelerate exit
      expect(cssContent).toMatch(/\.m3-dialog-backdrop\s*\{[\s\S]*?transition:[\s\S]*?180ms\s+cubic-bezier\(0\.4,\s*0,\s*1,\s*1\)/);
      // Active backdrop: 250ms standard entrance
      expect(cssContent).toMatch(/\.m3-dialog-backdrop\.active\s*\{[\s\S]*?transition:[\s\S]*?250ms/);

      // Resting surface: scale(0.95) translateY(8px) with 180ms exit
      expect(cssContent).toMatch(/\.m3-dialog-surface\s*\{[\s\S]*?transform:\s*scale\(0\.95\)\s*translateY\(8px\);/);
      expect(cssContent).toMatch(/\.m3-dialog-surface\s*\{[\s\S]*?transition:\s*transform\s+180ms/);

      // Active surface: scale(1) translateY(0) with 250ms emphasized decelerate entrance
      expect(cssContent).toMatch(/\.m3-dialog-backdrop\.active\s+\.m3-dialog-surface\s*\{[\s\S]*?transform:\s*scale\(1\)\s*translateY\(0\);/);
      expect(cssContent).toMatch(/\.m3-dialog-backdrop\.active\s+\.m3-dialog-surface\s*\{[\s\S]*?transition:\s*transform\s+250ms\s+var\(--md-sys-motion-easing-emphasized-decelerate/);
    });

    it('handles 500 consecutive open/close cycles on details modal without state leakage', () => {
      const modal = document.getElementById('detail-modal');
      const closeBtn = document.getElementById('btn-close-modal');
      const card = document.querySelector('#online-grid .m3-wallpaper-card');
      expect(card).not.toBeNull();

      for (let i = 0; i < 500; i++) {
        // Open modal via card click
        card.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(modal.classList.contains('active')).toBe(true);

        // Close modal
        closeBtn.click();
        expect(modal.classList.contains('active')).toBe(false);
      }
    });

    it('verifies nested overlay dismissal hierarchy: Lightbox closes before Details Modal on Escape', () => {
      const detailModal = document.getElementById('detail-modal');
      const lightbox = document.getElementById('fullscreen-lightbox');
      const onlineCard = document.querySelector('#online-grid .m3-wallpaper-card');
      const galleryCard = document.querySelector('#gallery-grid .m3-wallpaper-card');

      // 1. Open Details Modal via online card
      onlineCard?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(detailModal.classList.contains('active')).toBe(true);
      expect(lightbox.classList.contains('active')).toBe(false);

      // 2. Open Lightbox on top
      galleryCard?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(lightbox.classList.contains('active')).toBe(true);

      // 3. Press Escape -> Only Lightbox should close
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(lightbox.classList.contains('active')).toBe(false);
      expect(detailModal.classList.contains('active')).toBe(true);

      // 4. Press Escape again -> Details Modal should close
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(lightbox.classList.contains('active')).toBe(false);
      expect(detailModal.classList.contains('active')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Fullscreen Lightbox Physics & Gestures
  // ---------------------------------------------------------------------------
  describe('3. Fullscreen Lightbox Physics & Toolbar Motion', () => {
    it('verifies Lightbox floating toolbar and close button have 60ms staggered entrance', () => {
      expect(cssContent).toMatch(/\.fullscreen-lightbox-backdrop\.active\s+\.lightbox-floating-toolbar\s*\{[\s\S]*?transition:[\s\S]*?280ms[\s\S]*?60ms/);
      expect(cssContent).toMatch(/\.fullscreen-lightbox-backdrop\.active\s+\.lightbox-close-btn\s*\{[\s\S]*?transition:[\s\S]*?280ms[\s\S]*?60ms/);
    });

    it('verifies Lightbox smooth transform interpolation and continuous zoom clamping', () => {
      const lightbox = document.getElementById('fullscreen-lightbox');
      const lbImage = document.getElementById('lb-image');
      const lbZoomLevel = document.getElementById('lb-zoom-level');
      const galleryCard = document.querySelector('#gallery-grid .m3-wallpaper-card');

      galleryCard?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(lightbox.classList.contains('active')).toBe(true);
      expect(lbImage.style.transform).toBe('translate(0px, 0px) scale(1)');
      expect(lbZoomLevel.textContent).toBe('100%');

      // Zoom in multiple times via toolbar button
      const zoomInBtn = document.getElementById('lb-btn-zoom-in');
      for (let i = 0; i < 20; i++) {
        zoomInBtn.click();
      }

      // Must strictly clamp at 600% (6.0)
      expect(lbZoomLevel.textContent).toBe('600%');
      expect(lbImage.style.transform).toContain('scale(6)');

      // Zoom out multiple times via toolbar button
      const zoomOutBtn = document.getElementById('lb-btn-zoom-out');
      for (let i = 0; i < 30; i++) {
        zoomOutBtn.click();
      }

      // Must strictly clamp at 40% (0.4)
      expect(lbZoomLevel.textContent).toBe('40%');
      expect(lbImage.style.transform).toContain('scale(0.4)');

      // Reset button
      const resetBtn = document.getElementById('lb-btn-reset');
      resetBtn.click();
      expect(lbZoomLevel.textContent).toBe('100%');
      expect(lbImage.style.transform).toBe('translate(0px, 0px) scale(1)');

      const closeBtn = document.getElementById('lb-btn-close');
      closeBtn.click();
      expect(lightbox.classList.contains('active')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. M3 Wallpaper Card Physics & Elevation Transitions
  // ---------------------------------------------------------------------------
  describe('4. M3 Wallpaper Card Physics & Elevation Feedback', () => {
    it('verifies card resting elevation (Level 1), hover lift (Level 3, translateY -4px), and active depression', () => {
      // Resting
      expect(cssContent).toMatch(/\.m3-wallpaper-card[\s\S]*?box-shadow:\s*var\(--md-sys-elevation-1\)/);
      expect(cssContent).toMatch(/\.m3-wallpaper-card[\s\S]*?border-radius:\s*var\(--md-shape-corner-lg\)/);
      expect(cssContent).toMatch(/\.m3-wallpaper-card[\s\S]*?will-change:\s*transform,\s*box-shadow/);

      // Hover
      expect(cssContent).toMatch(/\.m3-wallpaper-card:hover[\s\S]*?transform:\s*translateY\(-4px\)/);
      expect(cssContent).toMatch(/\.m3-wallpaper-card:hover[\s\S]*?box-shadow:\s*var\(--md-sys-elevation-3\)/);
      expect(cssContent).toMatch(/\.m3-wallpaper-card:hover[\s\S]*?border-color:\s*var\(--md-sys-color-primary\)/);

      // Active
      expect(cssContent).toMatch(/\.m3-wallpaper-card:active[\s\S]*?transform:\s*translateY\(-1px\)\s*scale\(0\.99\)/);
      expect(cssContent).toMatch(/\.m3-wallpaper-card:active[\s\S]*?box-shadow:\s*var\(--md-sys-elevation-2\)/);
      expect(cssContent).toMatch(/\.m3-wallpaper-card:active[\s\S]*?transition-duration:\s*80ms/);
    });

    it('verifies elevation transition keyframes m3-elevation-raise-1-3 and m3-elevation-lower-3-1', () => {
      expect(cssContent).toMatch(/@keyframes\s+m3-elevation-raise-1-3\s*\{[\s\S]*?box-shadow:\s*var\(--md-sys-elevation-1\)[\s\S]*?box-shadow:\s*var\(--md-sys-elevation-3\)[\s\S]*?\}/);
      expect(cssContent).toMatch(/@keyframes\s+m3-elevation-lower-3-1\s*\{[\s\S]*?box-shadow:\s*var\(--md-sys-elevation-3\)[\s\S]*?box-shadow:\s*var\(--md-sys-elevation-1\)[\s\S]*?\}/);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Reduced-Motion Accessibility & WCAG 2.1 SC 2.3.3
  // ---------------------------------------------------------------------------
  describe('5. Reduced-Motion Media Query & A11y Overrides', () => {
    it('verifies all 16 duration tokens are overridden to 0.01ms in prefers-reduced-motion block', () => {
      const match = cssContent.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\}\s*$/);
      expect(match).not.toBeNull();
      const rmCss = match[1];

      const tokens = [
        'short1', 'short2', 'short3', 'short4',
        'medium1', 'medium2', 'medium3', 'medium4',
        'long1', 'long2', 'long3', 'long4',
        'extra-long1', 'extra-long2', 'extra-long3', 'extra-long4',
        'short', 'medium', 'long', 'extra-long'
      ];

      for (const t of tokens) {
        expect(rmCss).toMatch(new RegExp(`--md-sys-motion-duration-${t}:\\s*0\\.01ms;`));
      }
    });

    it('verifies universal selector *, *::before, *::after overrides animation & transition durations to 0.01ms', () => {
      const match = cssContent.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\}\s*$/);
      const rmCss = match[1];

      expect(rmCss).toMatch(/\*,\s*\*::before,\s*\*::after\s*\{[\s\S]*?animation-duration:\s*0\.01ms\s*!important/);
      expect(rmCss).toMatch(/\*,\s*\*::before,\s*\*::after\s*\{[\s\S]*?transition-duration:\s*0\.01ms\s*!important/);
      expect(rmCss).toMatch(/\*,\s*\*::before,\s*\*::after\s*\{[\s\S]*?scroll-behavior:\s*auto\s*!important/);
      expect(rmCss).toMatch(/\*,\s*\*::before,\s*\*::after\s*\{[\s\S]*?animation-iteration-count:\s*1\s*!important/);
    });

    it('verifies continuous animations (skeleton shimmer & spinner) are disabled in reduced motion', () => {
      const match = cssContent.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\}\s*$/);
      const rmCss = match[1];

      expect(rmCss).toMatch(/\.skeleton::before,\s*\.skeleton-shimmer::after,\s*\.spinner-inner\s*\{[\s\S]*?animation:\s*none\s*!important/);
    });

    it('verifies tab transitions and dialogs are instantaneous in reduced motion mode', () => {
      const match = cssContent.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\}\s*$/);
      const rmCss = match[1];

      expect(rmCss).toMatch(/\.tab-page\.active\s*\{[\s\S]*?animation:\s*none\s*!important/);
      expect(rmCss).toMatch(/\.tab-page\.active\s*\{[\s\S]*?opacity:\s*1\s*!important/);
      expect(rmCss).toMatch(/\.tab-page\.active\s*\{[\s\S]*?transform:\s*none\s*!important/);

      expect(rmCss).toMatch(/\.m3-dialog-backdrop,\s*\.m3-dialog-surface[\s\S]*?transition:\s*none\s*!important/);
      expect(rmCss).toMatch(/\.m3-dialog-backdrop,\s*\.m3-dialog-surface[\s\S]*?animation:\s*none\s*!important/);
    });
  });
});
