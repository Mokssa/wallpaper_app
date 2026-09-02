/**
 * ==============================================================================
 * Forensic Integrity & Adversarial Stress Verifier: Milestone 4 (Motion & Ripple)
 * ==============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const appJsPath = path.join(projectRoot, 'ui', 'app.js');
const stylesPath = path.join(projectRoot, 'ui', 'styles.css');
const indexPath = path.join(projectRoot, 'ui', 'index.html');

console.log('================================================================================');
console.log('Forensic Integrity Audit & Adversarial Stress Suite: Milestone 4');
console.log('================================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`  ✗ [FAIL] ${message}`);
    failCount++;
  }
}

// ------------------------------------------------------------------------------
// Phase 1: Source Code & Anti-Pattern Analysis
// ------------------------------------------------------------------------------
console.log('--- Phase 1: Source Code & Anti-Pattern Inspection ---');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');
const stylesContent = fs.readFileSync(stylesPath, 'utf8');
const indexHtmlContent = fs.readFileSync(indexPath, 'utf8');

// 1. Check for test-specific branching or hardcoded mock returns
assert(!appJsContent.includes('process.env.NODE_ENV'), 'No process.env.NODE_ENV test branching');
assert(!appJsContent.includes('window.__VITEST__'), 'No window.__VITEST__ branching in app.js');
assert(!appJsContent.includes('window.__MOCK__'), 'No window.__MOCK__ branching in app.js');

// 2. Check for dummy/facade implementations
const emptyFunctionRegex = /function\s+\w+\s*\([^)]*\)\s*\{\s*(?:\/\/[^\n]*|\/\*[\s\S]*?\*\/)*\s*\}/g;
const emptyMatches = appJsContent.match(emptyFunctionRegex) || [];
assert(emptyMatches.length === 0, `No empty facade functions found in app.js (found: ${emptyMatches.length})`);

// 3. Check for M3 Motion Tokens in styles.css
assert(stylesContent.includes('--md-sys-motion-easing-standard: cubic-bezier(0.2, 0.0, 0, 1.0);'), 'styles.css defines canonical standard easing');
assert(stylesContent.includes('--md-sys-motion-easing-emphasized-decelerate: cubic-bezier(0.05, 0.7, 0.1, 1.0);'), 'styles.css defines canonical emphasized decelerate easing');
assert(stylesContent.includes('--md-sys-motion-easing-emphasized-accelerate: cubic-bezier(0.3, 0.0, 0.8, 0.15);'), 'styles.css defines canonical emphasized accelerate easing');
assert(stylesContent.includes('--md-sys-state-hover-opacity: 0.08;'), 'styles.css defines 8% hover state opacity token');
assert(stylesContent.includes('--md-sys-state-focus-opacity: 0.12;'), 'styles.css defines 12% focus state opacity token');
assert(stylesContent.includes('--md-sys-state-pressed-opacity: 0.12;'), 'styles.css defines 12% pressed state opacity token');

// 4. Check for Universal State Layer & Ripple Wave styles
assert(stylesContent.includes('.md-ripple-surface::after'), 'styles.css defines universal state layer ::after rule');
assert(stylesContent.includes('background-color: currentColor;'), 'State layer and ripple use currentColor');
assert(stylesContent.includes('@keyframes m3-ripple-expand'), 'styles.css defines @keyframes m3-ripple-expand');
assert(stylesContent.includes('@keyframes m3TabFadeSlideIn'), 'styles.css defines @keyframes m3TabFadeSlideIn');

// 5. Check for Accessibility: prefers-reduced-motion media query
assert(stylesContent.includes('@media (prefers-reduced-motion: reduce)'), 'styles.css includes prefers-reduced-motion media query');
assert(stylesContent.includes('animation-duration: 0.01ms !important;'), 'Reduced motion suppresses animation duration to 0.01ms');

// ------------------------------------------------------------------------------
// Phase 2: Runtime JSDOM Behavioral & Mathematical Verification
// ------------------------------------------------------------------------------
console.log('\n--- Phase 2: Runtime Behavioral & Geometric Math Verification ---');

const dom = new JSDOM(indexHtmlContent, {
  url: 'http://localhost/',
  runScripts: 'outside-only'
});

const { window } = dom;
const { document, MouseEvent, KeyboardEvent, Event } = window;

// Mock matchMedia & computedStyle
window.getComputedStyle = (el) => ({
  position: el.style.position || 'relative',
  getPropertyValue: (prop) => el.style[prop] || ''
});

// Mock Tauri backend
window.__TAURI__ = {
  core: {
    invoke: async (cmd, args) => {
      if (cmd === 'get_app_config') {
        return {
          theme_color: 'indigo',
          amoled_mode: false,
          font_family: 'rounded',
          random_source: 'all',
          query: '',
          load_mode: 'pagination',
          card_ratio: 'uniform',
          cache_dir: 'cache/wallpapers',
          auto_update_interval_minutes: 60,
          auto_update_enabled: false
        };
      }
      if (cmd === 'scan_local_wallpapers') return [];
      if (cmd === 'fetch_online_wallpapers') return { items: [], total: 0 };
      return null;
    }
  }
};

// Execute app.js in DOM environment
const scriptFunction = new Function('window', 'document', 'localStorage', appJsContent);
scriptFunction(window, document, window.localStorage);

// Trigger DOMContentLoaded
document.dispatchEvent(new Event('DOMContentLoaded'));

// Test 2.1: Geometric Math of Furthest Corner
console.log('  Testing Geometric Furthest Corner Formula on various aspect ratios:');
const testButton = document.getElementById('btn-quick-random');
assert(testButton !== null, '#btn-quick-random element exists');

const geometryTestCases = [
  { width: 100, height: 40, clickX: 0, clickY: 0, expectedRadius: Math.hypot(100, 40) },
  { width: 100, height: 40, clickX: 50, clickY: 20, expectedRadius: Math.hypot(50, 20) },
  { width: 100, height: 40, clickX: 100, clickY: 40, expectedRadius: Math.hypot(100, 40) },
  { width: 300, height: 60, clickX: 30, clickY: 10, expectedRadius: Math.hypot(270, 50) },
  { width: 40, height: 200, clickX: 20, clickY: 190, expectedRadius: Math.hypot(20, 190) }
];

for (const tc of geometryTestCases) {
  // Wait 90ms to allow debounce guard on the same element
  await new Promise((resolve) => setTimeout(resolve, 90));

  testButton.getBoundingClientRect = () => ({
    left: 100,
    top: 100,
    right: 100 + tc.width,
    bottom: 100 + tc.height,
    width: tc.width,
    height: tc.height
  });

  const pointerEvent = new MouseEvent('pointerdown', {
    bubbles: true,
    clientX: 100 + tc.clickX,
    clientY: 100 + tc.clickY,
    button: 0
  });

  testButton.dispatchEvent(pointerEvent);

  const ripple = testButton.querySelector('.m3-ripple-wave');
  assert(ripple !== null, `Ripple spawned for click at (${tc.clickX}, ${tc.clickY}) on ${tc.width}x${tc.height} button`);

  if (ripple) {
    const spawnedDiameter = parseFloat(ripple.style.width);
    const expectedDiameter = tc.expectedRadius * 2;
    const diff = Math.abs(spawnedDiameter - expectedDiameter);
    assert(diff < 0.001, `Calculated diameter ${spawnedDiameter.toFixed(2)}px exactly matches geometric expectation ${expectedDiameter.toFixed(2)}px (diff: ${diff})`);

    // Clean up
    ripple.remove();
  }
}

// ------------------------------------------------------------------------------
// Phase 3: Adversarial Concurrency & Lifecycle Stress Testing
// ------------------------------------------------------------------------------
console.log('\n--- Phase 3: Adversarial Concurrency & Memory Leak Stress Testing ---');

// Stress Test 3.1: 500 Rapid Multi-Target Clicks & Auto-Cleanup
console.log('  Executing 500 rapid randomized clicks across diverse UI components...');
const interactiveSelectors = [
  '#btn-quick-random',
  '#btn-refresh-gallery',
  '#btn-select-folder',
  '#nav-gallery',
  '#nav-explore',
  '#nav-settings'
];

let totalSpawned = 0;
for (let i = 0; i < 500; i++) {
  const sel = interactiveSelectors[i % interactiveSelectors.length];
  const el = document.querySelector(sel);
  if (!el) continue;

  el.getBoundingClientRect = () => ({
    left: 50,
    top: 50,
    right: 250,
    bottom: 90,
    width: 200,
    height: 40
  });

  // Random coordinates
  const clientX = 50 + Math.random() * 200;
  const clientY = 50 + Math.random() * 40;

  // Use unique time to bypass 80ms throttle between different clicks
  el.dispatchEvent(new MouseEvent('pointerdown', {
    bubbles: true,
    clientX,
    clientY,
    button: 0
  }));

  const wave = el.querySelector('.m3-ripple-wave');
  if (wave) {
    totalSpawned++;
    // Simulate pointer release and transitionend
    window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
    wave.dispatchEvent(new Event('transitionend'));
  }
}

assert(totalSpawned > 0, `Successfully spawned and managed ${totalSpawned} ripples during concurrency burst`);

// Check that no orphaned ripples remain in the DOM
const remainingRipples = document.querySelectorAll('.m3-ripple-wave');
assert(remainingRipples.length === 0, `Zero DOM leaks: remaining ripples in DOM = ${remainingRipples.length}`);

// Stress Test 3.2: Disabled Button Insulation
console.log('  Testing disabled / aria-disabled element protection:');
const prevBtn = document.getElementById('btn-prev-page');
if (prevBtn) {
  prevBtn.disabled = true;
  prevBtn.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10, button: 0 }));
  assert(prevBtn.querySelector('.m3-ripple-wave') === null, 'Disabled button suppresses ripple');

  prevBtn.disabled = false;
  prevBtn.setAttribute('aria-disabled', 'true');
  prevBtn.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10, button: 0 }));
  assert(prevBtn.querySelector('.m3-ripple-wave') === null, 'aria-disabled="true" suppresses ripple');

  prevBtn.removeAttribute('aria-disabled');
  prevBtn.classList.add('disabled');
  prevBtn.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10, button: 0 }));
  assert(prevBtn.querySelector('.m3-ripple-wave') === null, '.disabled class suppresses ripple');
  prevBtn.classList.remove('disabled');
}

// Stress Test 3.3: Keyboard Focus Accessibility
console.log('  Testing keyboard accessibility triggers (Enter / Space):');
const refreshBtn = document.getElementById('btn-refresh-gallery');
if (refreshBtn) {
  refreshBtn.getBoundingClientRect = () => ({ left: 0, top: 0, right: 100, bottom: 40, width: 100, height: 40 });
  refreshBtn.focus();

  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  const kbdRipple = refreshBtn.querySelector('.m3-ripple-wave');
  assert(kbdRipple !== null, 'Keyboard Enter spawns centered ripple on focused button');
  if (kbdRipple) {
    const rLeft = parseFloat(kbdRipple.style.left);
    const rTop = parseFloat(kbdRipple.style.top);
    // Center of 100x40 is x=50, y=20, radius=Math.hypot(50, 20)=53.85, left=50-53.85=-3.85
    assert(Math.abs(rLeft - (50 - Math.hypot(50, 20))) < 0.01, 'Keyboard ripple is mathematically centered');
    kbdRipple.remove();
  }

  // Verify input fields do NOT trigger ripples on Space/Enter
  const inputQuery = document.getElementById('input-pexels-query');
  if (inputQuery) {
    inputQuery.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    assert(inputQuery.querySelector('.m3-ripple-wave') === null, 'Typing space in text input does NOT spawn ripple');
  }
}

// ------------------------------------------------------------------------------
// Summary
// ------------------------------------------------------------------------------
console.log('\n================================================================================');
console.log(`Forensic Verification Summary:`);
console.log(`  Passed Checks: ${passCount}`);
console.log(`  Failed Checks: ${failCount}`);
console.log('================================================================================');

if (failCount > 0) {
  console.error('\n🔴 VERDICT: INTEGRITY VIOLATION DETECTED');
  process.exit(1);
} else {
  console.log('\n🟢 VERDICT: CLEAN — Work product is authentic, robust, and compliant.');
  process.exit(0);
}
