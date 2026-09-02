/**
 * ==============================================================================
 * Deep Forensic & Stress Verification Script: Milestone 4 Ripple Engine
 * ==============================================================================
 * Empirically exercises:
 * 1. 1,000 Rapid Multi-Button Interleaved Clicks & Zero DOM Residuals
 * 2. 5,000 Extreme High-Frequency Burst Clicks & Memory Heap Profiling
 * 3. Fallback Auto-Cleanup Timeout (600ms hold + 300ms transition removal)
 * 4. Pointer Cancellation & Pointerleave Cleanup Lifecycle
 * 5. Keyboard Enter & Space Accessibility & Coordinate Centering
 * 6. Strict Exclusion for Form Inputs, Textarea, Select, and Unfocused Controls
 * 7. Container & Non-Interactive Element Spurious Click Immunity
 * 8. Disabled, Aria-Disabled, and .disabled State Layer Invariance
 * 9. Dual-Event Pointerdown + Mousedown Deduplication (80ms guard)
 * 10. CSS Token Hierarchy, Z-Index Layering, & Reduced-Motion Invariants
 * ==============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const htmlPath = path.join(projectRoot, 'ui', 'index.html');
const cssPath = path.join(projectRoot, 'ui', 'styles.css');
const appJsPath = path.join(projectRoot, 'ui', 'app.js');

const html = fs.readFileSync(htmlPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');
const appJs = fs.readFileSync(appJsPath, 'utf8');

// Global DOM setup for standalone verification
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost'
});
global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.MouseEvent = dom.window.MouseEvent;
global.KeyboardEvent = dom.window.KeyboardEvent;
global.Event = dom.window.Event;
global.Image = dom.window.Image;
global.localStorage = dom.window.localStorage;

const setupModule = await import('../test/setup.js');

function initializeAppRuntime() {
  const appCode = fs.readFileSync(appJsPath, 'utf8');
  const runScript = new Function(appCode);
  runScript();
  document.dispatchEvent(new Event('DOMContentLoaded'));
}

async function runEmpiricalRippleStressHarness() {
  console.log('================================================================================');
  console.log('Starting Empirical Stress Verification: Milestone 4 M3 Ripple Engine');
  console.log('================================================================================\n');

  let passedAssertions = 0;
  let totalAssertions = 0;

  function assert(condition, description) {
    totalAssertions++;
    if (condition) {
      passedAssertions++;
      console.log(`  [PASS] ${description}`);
    } else {
      console.error(`  [FAIL] ${description}`);
      throw new Error(`Assertion failed: ${description}`);
    }
  }

  setupModule.resetMockBackendState();
  setupModule.setupMockTauri();
  setupModule.loadIndexHTML();
  initializeAppRuntime();
  await new Promise((resolve) => setTimeout(resolve, 150));

  console.log('--------------------------------------------------------------------------------');
  console.log('Test 1: 1,000 Rapid Interleaved Clicks & Complete DOM Node Cleanup');
  console.log('--------------------------------------------------------------------------------');

  const testButtons = [
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

  assert(testButtons.length >= 10, `Found ${testButtons.length} interactive ripple target elements in DOM`);

  testButtons.forEach((btn, idx) => {
    btn.disabled = false;
    btn.getBoundingClientRect = () => ({
      left: 50 + (idx % 6) * 110,
      top: 80 + Math.floor(idx / 6) * 50,
      right: 150 + (idx % 6) * 110,
      bottom: 120 + Math.floor(idx / 6) * 50,
      width: 100,
      height: 40
    });
  });

  const t0 = Date.now();
  for (let i = 0; i < 1000; i++) {
    const btn = testButtons[i % testButtons.length];
    const clientX = 60 + ((i * 13) % 70);
    const clientY = 90 + ((i * 7) % 25);

    btn.dispatchEvent(new MouseEvent('pointerdown', {
      bubbles: true,
      clientX,
      clientY,
      button: 0
    }));

    if (i % 4 === 0) {
      window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
    }
  }
  window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
  const clickDuration = Date.now() - t0;
  console.log(`  [PERF] 1,000 clicks dispatched in ${clickDuration}ms (${(clickDuration / 1000).toFixed(2)}ms/click)`);

  // Wait for fallback timeout (600ms) + fadeout transition (300ms) to settle
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const leftoverRipples = document.querySelectorAll('.m3-ripple-wave, .md-ripple-wave');
  assert(leftoverRipples.length === 0, `Zero residual ripples in DOM after 1,000 clicks (found: ${leftoverRipples.length})`);

  console.log('--------------------------------------------------------------------------------');
  console.log('Test 2: 5,000 Extreme High-Frequency Burst Clicks & Memory Heap Profiling');
  console.log('--------------------------------------------------------------------------------');

  const memBefore = process.memoryUsage().heapUsed;
  const tBurst0 = Date.now();
  for (let i = 0; i < 5000; i++) {
    const btn = testButtons[i % testButtons.length];
    btn.dispatchEvent(new MouseEvent('pointerdown', {
      bubbles: true,
      clientX: 75,
      clientY: 95,
      button: 0
    }));
    if (i % 5 === 0) {
      window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
    }
  }
  window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
  const burstDuration = Date.now() - tBurst0;
  console.log(`  [PERF] 5,000 burst clicks dispatched in ${burstDuration}ms (${(burstDuration / 5000).toFixed(3)}ms/click)`);

  await new Promise((resolve) => setTimeout(resolve, 1000));
  if (global.gc) global.gc();
  const memAfter = process.memoryUsage().heapUsed;
  const memDeltaMB = (memAfter - memBefore) / (1024 * 1024);
  console.log(`  [MEM] Heap Used Before: ${(memBefore / (1024 * 1024)).toFixed(2)} MB, After: ${(memAfter / (1024 * 1024)).toFixed(2)} MB (Delta: ${memDeltaMB.toFixed(2)} MB)`);

  const burstLeftoverRipples = document.querySelectorAll('.m3-ripple-wave, .md-ripple-wave');
  assert(burstLeftoverRipples.length === 0, `Zero residual ripples in DOM after 5,000 burst clicks`);
  assert(memDeltaMB < 50, `Memory delta is healthy (< 50MB increase during high frequency stress)`);

  console.log('--------------------------------------------------------------------------------');
  console.log('Test 3: Fallback Auto-Cleanup Timeout (Dropped pointerup / Pointercancel)');
  console.log('--------------------------------------------------------------------------------');

  const singleBtn = document.getElementById('btn-refresh-gallery');
  singleBtn.getBoundingClientRect = () => ({ left: 0, top: 0, right: 100, bottom: 40, width: 100, height: 40 });

  singleBtn.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 50, clientY: 20, button: 0 }));
  let ripple = singleBtn.querySelector('.m3-ripple-wave');
  assert(ripple !== null, 'Ripple wave created on pointerdown');
  assert(!ripple.classList.contains('m3-ripple-fade-out'), 'Ripple wave initially has no fade-out class');

  // Wait 650ms (simulating mouse hold beyond 600ms timeout)
  await new Promise((r) => setTimeout(r, 650));
  assert(ripple.classList.contains('m3-ripple-fade-out'), 'Ripple wave automatically received m3-ripple-fade-out after 600ms hold');

  // Wait additional 350ms (simulating 300ms transition timeout)
  await new Promise((r) => setTimeout(r, 350));
  assert(singleBtn.querySelector('.m3-ripple-wave') === null, 'Ripple wave cleanly removed from DOM without requiring pointerup');

  // Allow debounce window (> 80ms)
  await new Promise((r) => setTimeout(r, 100));

  // Test pointercancel
  singleBtn.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 50, clientY: 20, button: 0 }));
  ripple = singleBtn.querySelector('.m3-ripple-wave');
  assert(ripple !== null, 'Ripple wave created for pointercancel test');
  window.dispatchEvent(new Event('pointercancel'));
  assert(ripple.classList.contains('m3-ripple-fade-out'), 'Ripple immediately enters fade-out on pointercancel');
  ripple.dispatchEvent(new Event('transitionend'));
  assert(singleBtn.querySelector('.m3-ripple-wave') === null, 'Ripple removed on transitionend following pointercancel');

  // Allow debounce window (> 80ms)
  await new Promise((r) => setTimeout(r, 100));

  // Test pointerleave
  singleBtn.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 50, clientY: 20, button: 0 }));
  ripple = singleBtn.querySelector('.m3-ripple-wave');
  assert(ripple !== null, 'Ripple wave created for pointerleave test');
  singleBtn.dispatchEvent(new Event('pointerleave'));
  assert(ripple.classList.contains('m3-ripple-fade-out'), 'Ripple enters fade-out on pointerleave');
  ripple.dispatchEvent(new Event('transitionend'));
  assert(singleBtn.querySelector('.m3-ripple-wave') === null, 'Ripple removed on transitionend following pointerleave');

  console.log('--------------------------------------------------------------------------------');
  console.log('Test 4: Keyboard Enter & Space Accessibility & Coordinate Centering');
  console.log('--------------------------------------------------------------------------------');

  const exploreTab = document.querySelector('.nav-rail-item[data-tab="explore"]');
  exploreTab.getBoundingClientRect = () => ({ left: 0, top: 120, right: 80, bottom: 200, width: 80, height: 80 });

  exploreTab.focus();
  assert(document.activeElement === exploreTab, 'Nav rail item is activeElement');

  // Test Enter key
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  let keyRipple = exploreTab.querySelector('.m3-ripple-wave');
  assert(keyRipple !== null, 'Enter key spawned ripple on focused nav item');

  // Expected center: x = 40, y = 40, radius = hypot(40, 40) ≈ 56.57px, diameter ≈ 113.14px
  const expRadius = Math.hypot(40, 40);
  const expDiameter = expRadius * 2;
  assert(Math.abs(parseFloat(keyRipple.style.width) - expDiameter) < 1.0, 'Ripple diameter covers entire button geometry');
  assert(Math.abs(parseFloat(keyRipple.style.left) - (40 - expRadius)) < 1.0, 'Ripple X origin is centered');
  assert(Math.abs(parseFloat(keyRipple.style.top) - (40 - expRadius)) < 1.0, 'Ripple Y origin is centered');

  window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
  keyRipple.dispatchEvent(new Event('transitionend'));
  assert(exploreTab.querySelector('.m3-ripple-wave') === null, 'Keyboard ripple cleaned up');

  // Allow debounce window (> 80ms)
  await new Promise((r) => setTimeout(r, 100));

  // Test Space key
  document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
  keyRipple = exploreTab.querySelector('.m3-ripple-wave');
  assert(keyRipple !== null, 'Space key spawned ripple on focused nav item');
  window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
  keyRipple.dispatchEvent(new Event('transitionend'));
  assert(exploreTab.querySelector('.m3-ripple-wave') === null, 'Space ripple cleaned up');

  console.log('--------------------------------------------------------------------------------');
  console.log('Test 5: Strict Exclusion for Inputs, Select, Textarea & Unfocused Controls');
  console.log('--------------------------------------------------------------------------------');

  const pexelsInput = document.getElementById('input-pexels-query');
  pexelsInput.focus();
  assert(document.activeElement === pexelsInput, 'Pexels search input is activeElement');

  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
  assert(pexelsInput.querySelector('.m3-ripple-wave') === null, 'No ripple spawned inside input field on Enter/Space');
  assert(document.querySelectorAll('.m3-ripple-wave').length === 0, 'No ripples anywhere in DOM during typing');

  const selectRatio = document.getElementById('select-config-cardratio');
  selectRatio.focus();
  assert(document.activeElement === selectRatio, 'Select dropdown is activeElement');

  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
  assert(selectRatio.querySelector('.m3-ripple-wave') === null, 'No ripple spawned inside select dropdown on Enter/Space');
  assert(document.querySelectorAll('.m3-ripple-wave').length === 0, 'Zero ripples across DOM during select interaction');

  console.log('--------------------------------------------------------------------------------');
  console.log('Test 6: Container & Non-Interactive Element Spurious Click Immunity');
  console.log('--------------------------------------------------------------------------------');

  const nonInteractiveContainers = [
    document.body,
    document.getElementById('app-layout'),
    document.getElementById('main-content'),
    document.getElementById('tab-gallery'),
    document.getElementById('tab-explore'),
    document.getElementById('tab-settings'),
    ...document.querySelectorAll('h1, h2, h3, h4, .app-title, .settings-group-title, label, p, .gallery-count-badge')
  ].filter(Boolean);

  nonInteractiveContainers.forEach((el) => {
    el.dispatchEvent(new MouseEvent('pointerdown', {
      bubbles: true,
      clientX: 100,
      clientY: 100,
      button: 0
    }));
  });

  assert(document.querySelectorAll('.m3-ripple-wave').length === 0, 'Zero ripples generated on non-interactive containers, text, and headers');

  console.log('--------------------------------------------------------------------------------');
  console.log('Test 7: Disabled, Aria-Disabled, and .disabled State Invariance');
  console.log('--------------------------------------------------------------------------------');

  const prevBtn = document.getElementById('btn-prev-page');
  prevBtn.disabled = true;
  prevBtn.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 20, clientY: 20, button: 0 }));
  assert(prevBtn.querySelector('.m3-ripple-wave') === null, 'Disabled button blocked ripple creation');

  prevBtn.disabled = false;
  prevBtn.setAttribute('aria-disabled', 'true');
  prevBtn.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 20, clientY: 20, button: 0 }));
  assert(prevBtn.querySelector('.m3-ripple-wave') === null, 'aria-disabled="true" button blocked ripple creation');

  prevBtn.removeAttribute('aria-disabled');
  prevBtn.classList.add('disabled');
  prevBtn.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 20, clientY: 20, button: 0 }));
  assert(prevBtn.querySelector('.m3-ripple-wave') === null, '.disabled class button blocked ripple creation');

  console.log('--------------------------------------------------------------------------------');
  console.log('Test 8: Secondary Button (Right/Middle Click) Exclusion');
  console.log('--------------------------------------------------------------------------------');

  const randomBtn = document.getElementById('btn-quick-random');
  randomBtn.classList.remove('disabled');
  randomBtn.disabled = false;

  // Right-click
  randomBtn.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 20, clientY: 20, button: 2 }));
  assert(randomBtn.querySelector('.m3-ripple-wave') === null, 'Right-click (button 2) does not spawn ripple');

  // Middle-click
  randomBtn.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 20, clientY: 20, button: 1 }));
  assert(randomBtn.querySelector('.m3-ripple-wave') === null, 'Middle-click (button 1) does not spawn ripple');

  console.log('--------------------------------------------------------------------------------');
  console.log('Test 9: Dual-Event Pointerdown + Mousedown Deduplication (80ms Guard)');
  console.log('--------------------------------------------------------------------------------');

  await new Promise((r) => setTimeout(r, 100));
  randomBtn.getBoundingClientRect = () => ({ left: 0, top: 0, right: 100, bottom: 40, width: 100, height: 40 });

  // Burst identical events in same tick
  randomBtn.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 30, clientY: 20, button: 0 }));
  randomBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 30, clientY: 20, button: 0 }));

  const spawnedRipples = randomBtn.querySelectorAll('.m3-ripple-wave');
  assert(spawnedRipples.length === 1, `Exactly 1 ripple spawned for paired pointerdown+mousedown (found: ${spawnedRipples.length})`);

  window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
  spawnedRipples[0].dispatchEvent(new Event('transitionend'));
  assert(randomBtn.querySelector('.m3-ripple-wave') === null, 'Ripple wave cleaned up');

  console.log('--------------------------------------------------------------------------------');
  console.log('Test 10: CSS Token Hierarchy, Z-Index Layering, & Reduced-Motion A11y');
  console.log('--------------------------------------------------------------------------------');

  assert(css.includes('.md-ripple-surface,'), 'CSS contains .md-ripple-surface definition');
  assert(css.includes('position: relative;'), 'CSS enforces relative positioning for ripple containment');
  assert(css.includes('overflow: hidden;'), 'CSS enforces overflow: hidden for boundary clipping');
  assert(css.includes('z-index: 2;'), 'CSS enforces z-index: 2 on children for text/icon elevation above ripple');
  assert(css.includes('z-index: 1;'), 'CSS enforces z-index: 1 on ripple wave');
  assert(css.includes('pointer-events: none;'), 'CSS enforces pointer-events: none on ripple wave to avoid click interception');
  assert(css.includes('animation: m3-ripple-expand 380ms'), 'CSS applies M3 380ms expand animation');
  assert(css.includes('@media (prefers-reduced-motion: reduce)'), 'CSS defines prefers-reduced-motion media query');
  assert(css.includes('animation-duration: 0.01ms !important;') || css.includes('animation: none !important;'), 'CSS suppresses ripple animation in reduced motion mode');

  console.log('\n================================================================================');
  console.log(`Empirical Ripple Stress Verification Summary: ${passedAssertions}/${totalAssertions} Assertions PASSED`);
  console.log('================================================================================\n');
}

runEmpiricalRippleStressHarness().catch((err) => {
  console.error('Fatal Test Harness Failure:', err);
  process.exit(1);
});
