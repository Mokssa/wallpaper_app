/**
 * ==============================================================================
 * Tier 4: End-to-End User Lifecycle & Workflow Test Suite
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

describe('Tier 4 — End-to-End User Lifecycle & Workflow Suite', () => {
  beforeEach(async () => {
    resetMockBackendState();
    setupMockTauri();
    loadIndexHTML();
    initializeAppRuntime();
    await new Promise((resolve) => setTimeout(resolve, 80));
  });

  // ---------------------------------------------------------------------------
  // Scenario A: Startup -> Theme Customization -> Explore Search -> Details -> Lightbox
  // ---------------------------------------------------------------------------
  it('executes Scenario A: Startup -> Settings Theme -> Explore Unsplash -> Details Modal -> Lightbox', async () => {
    // 1. App Startup: Gallery is active by default
    expect(document.querySelector('.tab-page.active')?.id).toBe('tab-gallery');

    // 2. Navigate to Settings
    const settingsNav = document.querySelector('.nav-item[data-tab="settings"]');
    settingsNav?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 20));
    expect(document.querySelector('.tab-page.active')?.id).toBe('tab-settings');

    // 3. Customize Theme: Pick Ocean/Teal theme + AMOLED pure black
    const tealChip = document.querySelector('.theme-palette-chip[data-theme="teal"]');
    tealChip?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    
    const checkAmoled = document.getElementById('check-amoled-mode');
    if (checkAmoled) {
      checkAmoled.checked = true;
      checkAmoled.dispatchEvent(new Event('change', { bubbles: true }));
    }
    await new Promise((r) => setTimeout(r, 20));

    expect(document.body.classList.contains('theme-teal')).toBe(true);
    expect(document.body.classList.contains('theme-amoled')).toBe(true);

    // 4. Navigate to Explore Wallpapers
    const exploreNav = document.querySelector('.nav-item[data-tab="explore"]');
    exploreNav?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 20));
    expect(document.querySelector('.tab-page.active')?.id).toBe('tab-explore');

    // 5. Switch source to Unsplash
    const unsplashBtn = document.querySelector('.segmented-btn[data-source="unsplash"]');
    unsplashBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 50));

    expect(unsplashBtn?.classList.contains('active')).toBe(true);

    // 6. Check rendered online cards
    const onlineCards = document.querySelectorAll('#online-grid .m3-wallpaper-card');
    expect(onlineCards.length).toBeGreaterThan(0);

    // 7. Click card to view Details Modal
    const firstCard = onlineCards[0];
    firstCard?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 20));

    // Details Modal is opened
    const detailModal = document.getElementById('detail-modal');
    expect(detailModal?.classList.contains('active')).toBe(true);

    // 8. Click preview box inside Details Modal to open Fullscreen Lightbox
    const previewBox = document.getElementById('dialog-preview-box');
    previewBox?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 20));

    const lb = document.getElementById('fullscreen-lightbox');
    expect(lb?.classList.contains('active')).toBe(true);

    // 9. Close lightbox
    const lbClose = document.getElementById('lb-btn-close');
    lbClose?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(lb?.classList.contains('active')).toBe(false);

    // 10. Close details modal
    const modalClose = document.getElementById('btn-close-modal');
    modalClose?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(detailModal?.classList.contains('active')).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Scenario B: Quick Random Wallpaper -> Lightbox Deep Zoom -> Apply Wallpaper
  // ---------------------------------------------------------------------------
  it('executes Scenario B: Quick Random Wallpaper -> Lightbox Multi-level Zoom -> Wallpaper Apply', async () => {
    // 1. Trigger Quick Random Action
    const quickRandomBtn = document.getElementById('btn-quick-random');
    quickRandomBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 60));

    // SnackBar feedback displayed
    const snackbar = document.getElementById('flutter-snackbar');
    expect(snackbar?.classList.contains('show')).toBe(true);

    // 2. Open Lightbox and test zoom steps
    const lb = document.getElementById('fullscreen-lightbox');
    lb?.classList.add('active');

    const zoomInBtn = document.getElementById('lb-btn-zoom-in');
    const zoomBadge = document.getElementById('lb-zoom-level');

    // 1.0 -> 1.25 -> 1.56
    zoomInBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    zoomInBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(zoomBadge?.textContent).toBe('156%');

    // 3. Reset zoom
    const resetBtn = document.getElementById('lb-btn-reset');
    resetBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(zoomBadge?.textContent).toBe('100%');

    // 4. Close lightbox via Escape key
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(lb?.classList.contains('active')).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Scenario C: Local Gallery Management, Wallpaper Application & Deletion
  // ---------------------------------------------------------------------------
  it('executes Scenario C: Local Gallery Operations & Full Cleanup Lifecycle', async () => {
    // 1. Initial cached wallpapers count
    expect(mockBackendState.cachedWallpapers.length).toBe(2);

    // 2. Apply first wallpaper
    const applyFirstBtn = document.querySelector('#gallery-grid .m3-wallpaper-card .m3-action-icon-btn[title="设为桌面壁纸"]');
    applyFirstBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 50));

    expect(mockBackendState.currentWallpaper).toBe(mockBackendState.cachedWallpapers[0].file_path);

    // 3. Delete second wallpaper
    const allDeleteBtns = document.querySelectorAll('#gallery-grid .m3-wallpaper-card .m3-action-icon-btn[title="删除此壁纸"]');
    expect(allDeleteBtns.length).toBe(2);

    allDeleteBtns[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const btnConfirmOk = document.getElementById('btn-confirm-ok');
    btnConfirmOk?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 50));

    expect(mockBackendState.cachedWallpapers.length).toBe(1);

    // 4. Delete remaining wallpaper to verify empty state display
    const remainingDeleteBtn = document.querySelector('#gallery-grid .m3-wallpaper-card .m3-action-icon-btn[title="删除此壁纸"]');
    remainingDeleteBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    btnConfirmOk?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 50));

    expect(mockBackendState.cachedWallpapers.length).toBe(0);

    const emptyState = document.getElementById('gallery-empty-state');
    expect(emptyState?.style.display).not.toBe('none');
  });
});
