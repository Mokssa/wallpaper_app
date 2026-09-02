/**
 * ==============================================================================
 * Challenger 2 Milestone 4: Motion System, Tab Transitions, Dialog Physics
 * and Reduced-Motion Stress Verification Script
 * ==============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const stylesCssPath = path.join(projectRoot, 'ui', 'styles.css');
const appJsPath = path.join(projectRoot, 'ui', 'app.js');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function assert(condition, message, details = '') {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✓ [PASS] ${message}`);
  } else {
    failedChecks++;
    console.error(`  ✗ [FAIL] ${message}`);
    if (details) console.error(`    Details: ${details}`);
  }
}

console.log('==============================================================================');
console.log('Challenger 2 Milestone 4 — Motion Physics & Reduced-Motion Empirical Audit');
console.log('==============================================================================\n');

const css = fs.readFileSync(stylesCssPath, 'utf8');
const appJs = fs.readFileSync(appJsPath, 'utf8');

// -----------------------------------------------------------------------------
// 1. M3 Motion Curves & Tokens
// -----------------------------------------------------------------------------
console.log('--- 1. Canonical M3 Motion Easing Curves & Duration Scale ---');

assert(
  css.includes('--md-sys-motion-easing-standard: cubic-bezier(0.2, 0.0, 0, 1.0);'),
  'Defines canonical M3 Standard Easing curve cubic-bezier(0.2, 0.0, 0, 1.0)'
);

assert(
  css.includes('--md-sys-motion-easing-emphasized-decelerate: cubic-bezier(0.05, 0.7, 0.1, 1.0);'),
  'Defines canonical M3 Emphasized Decelerate curve cubic-bezier(0.05, 0.7, 0.1, 1.0)'
);

assert(
  css.includes('--md-sys-motion-easing-emphasized-accelerate: cubic-bezier(0.3, 0.0, 0.8, 0.15);'),
  'Defines canonical M3 Emphasized Accelerate curve cubic-bezier(0.3, 0.0, 0.8, 0.15)'
);

assert(
  css.includes('--md-sys-motion-easing-linear: cubic-bezier(0.0, 0.0, 1.0, 1.0);'),
  'Defines canonical M3 Linear curve'
);

const durations = [
  'short1: 50ms', 'short2: 100ms', 'short3: 150ms', 'short4: 200ms',
  'medium1: 250ms', 'medium2: 300ms', 'medium3: 350ms', 'medium4: 400ms',
  'long1: 450ms', 'long2: 500ms', 'long3: 550ms', 'long4: 600ms',
  'extra-long1: 700ms', 'extra-long2: 800ms', 'extra-long3: 900ms', 'extra-long4: 1000ms'
];

for (const d of durations) {
  const [token, val] = d.split(': ');
  assert(
    css.includes(`--md-sys-motion-duration-${token}: ${val};`),
    `Defines 16-step duration token --md-sys-motion-duration-${token} (${val})`
  );
}

assert(
  css.includes('--md-sys-motion-duration-short:') &&
  css.includes('--md-sys-motion-duration-medium:') &&
  css.includes('--md-sys-motion-duration-long:') &&
  css.includes('--md-sys-motion-duration-extra-long:'),
  'Defines backward-compatible fallback aliases for all duration tiers'
);

// -----------------------------------------------------------------------------
// 2. Tab Transitions & Layout Invariants
// -----------------------------------------------------------------------------
console.log('\n--- 2. Tab Transitions & Layout Invariants ---');

assert(
  /@keyframes\s+m3TabFadeSlideIn\s*\{[\s\S]*?opacity:\s*0;[\s\S]*?transform:\s*translateY\(8px\);[\s\S]*?opacity:\s*1;[\s\S]*?transform:\s*translateY\(0\);[\s\S]*?\}/.test(css),
  'm3TabFadeSlideIn keyframe defines smooth 8px slide-up and opacity fade-in'
);

assert(
  /@keyframes\s+m3-tab-fade-slide-in\s*\{[\s\S]*?opacity:\s*0;[\s\S]*?transform:\s*translateY\(8px\);[\s\S]*?opacity:\s*1;[\s\S]*?transform:\s*translateY\(0\);[\s\S]*?\}/.test(css),
  'm3-tab-fade-slide-in keyframe defines kebab-case alias for standard compliance'
);

assert(
  /\.tab-page\s*\{\s*display:\s*none;\s*\}/.test(css),
  '.tab-page elements are hidden by default with display: none'
);

assert(
  /\.tab-page\.active\s*\{[\s\S]*?display:\s*block;[\s\S]*?animation:\s*m3TabFadeSlideIn\s+250ms\s+var\(--md-sys-motion-easing-standard/i.test(css),
  '.tab-page.active animates with m3TabFadeSlideIn 250ms and standard easing'
);

assert(
  /\.tab-page\.active\s*\{[\s\S]*?will-change:\s*opacity,\s*transform;/i.test(css),
  '.tab-page.active declares will-change: opacity, transform for hardware composite layers'
);

// -----------------------------------------------------------------------------
// 3. Dialog Physics: Details Modal & Lightbox
// -----------------------------------------------------------------------------
console.log('\n--- 3. Dialog Physics: Details Modal & Fullscreen Lightbox ---');

assert(
  /\.m3-dialog-backdrop\s*\{[\s\S]*?position:\s*fixed;[\s\S]*?backdrop-filter:\s*blur\(20px\);[\s\S]*?opacity:\s*0;[\s\S]*?pointer-events:\s*none;/i.test(css),
  '.m3-dialog-backdrop resting state is hidden, non-interactive, with 20px blur'
);

assert(
  /\.m3-dialog-backdrop\s*\{[\s\S]*?transition:[\s\S]*?opacity\s+180ms\s+cubic-bezier\(0\.4,\s*0,\s*1,\s*1\)[\s\S]*?backdrop-filter\s+180ms\s+cubic-bezier\(0\.4,\s*0,\s*1,\s*1\)/i.test(css),
  '.m3-dialog-backdrop exit transition uses swift 180ms accelerate curve'
);

assert(
  /\.m3-dialog-backdrop\.active\s*\{[\s\S]*?opacity:\s*1;[\s\S]*?pointer-events:\s*auto;[\s\S]*?transition:[\s\S]*?opacity\s+250ms\s+var\(--md-sys-motion-easing-standard/i.test(css),
  '.m3-dialog-backdrop.active entrance transition uses deliberate 250ms standard curve'
);

assert(
  /\.m3-dialog-surface\s*\{[\s\S]*?border-radius:\s*var\(--md-shape-corner-xl\);[\s\S]*?transform:\s*scale\(0\.95\)\s*translateY\(8px\);[\s\S]*?opacity:\s*0;[\s\S]*?transition:\s*transform\s+180ms/i.test(css),
  '.m3-dialog-surface resting state has 28px XL corners, scale(0.95) translateY(8px), 180ms exit'
);

assert(
  /\.m3-dialog-backdrop\.active\s+\.m3-dialog-surface\s*\{[\s\S]*?transform:\s*scale\(1\)\s*translateY\(0\);[\s\S]*?opacity:\s*1;[\s\S]*?transition:\s*transform\s+250ms\s+var\(--md-sys-motion-easing-emphasized-decelerate/i.test(css),
  '.m3-dialog-surface active entrance scales smoothly to 1.0 with 250ms emphasized decelerate'
);

assert(
  /@keyframes\s+m3-dialog-surface-scale-in\s*\{[\s\S]*?transform:\s*scale\(0\.92\)\s*translateY\(16px\);[\s\S]*?transform:\s*scale\(1\.0\)\s*translateY\(0\);[\s\S]*?\}/.test(css),
  'm3-dialog-surface-scale-in keyframe defines canonical 0.92 -> 1.0 scale transition'
);

assert(
  /@keyframes\s+m3-dialog-surface-scale-out\s*\{[\s\S]*?transform:\s*scale\(1\.0\)\s*translateY\(0\);[\s\S]*?transform:\s*scale\(0\.95\)\s*translateY\(8px\);[\s\S]*?\}/.test(css),
  'm3-dialog-surface-scale-out keyframe defines canonical 1.0 -> 0.95 scale exit transition'
);

// Lightbox Physics
assert(
  /\.fullscreen-lightbox-backdrop\s*\{[\s\S]*?backdrop-filter:\s*blur\(28px\);[\s\S]*?z-index:\s*10000;/i.test(css),
  'Fullscreen Lightbox has 28px backdrop blur and highest z-index (10000)'
);

assert(
  /\.lightbox-floating-toolbar\s*\{[\s\S]*?transform:\s*translateX\(-50%\)\s*translateY\(-24px\)\s*scale\(0\.92\);[\s\S]*?opacity:\s*0;/i.test(css),
  'Lightbox floating toolbar rests in offscreen lifted state (translateY -24px, scale 0.92, opacity 0)'
);

assert(
  /\.fullscreen-lightbox-backdrop\.active\s+\.lightbox-floating-toolbar\s*\{[\s\S]*?transform:\s*translateX\(-50%\)\s*translateY\(0\)\s*scale\(1\);[\s\S]*?opacity:\s*1;[\s\S]*?transition:\s*transform\s+280ms\s+var\(--md-sys-motion-easing-emphasized-decelerate[\s\S]*?60ms/i.test(css),
  'Lightbox floating toolbar enters with staggered 60ms delay and 280ms emphasized decelerate'
);

assert(
  /\.lightbox-close-btn\s*\{[\s\S]*?transform:\s*translateY\(-24px\)\s*scale\(0\.92\);[\s\S]*?opacity:\s*0;/i.test(css),
  'Lightbox close button rests in offscreen lifted state (translateY -24px, scale 0.92, opacity 0)'
);

assert(
  /\.fullscreen-lightbox-backdrop\.active\s+\.lightbox-close-btn\s*\{[\s\S]*?transform:\s*translateY\(0\)\s*scale\(1\);[\s\S]*?opacity:\s*1;[\s\S]*?transition:\s*transform\s+280ms[\s\S]*?60ms/i.test(css),
  'Lightbox close button enters with staggered 60ms delay and 280ms emphasized decelerate'
);

// -----------------------------------------------------------------------------
// 4. Card Physics & Elevation Transitions
// -----------------------------------------------------------------------------
console.log('\n--- 4. M3 Wallpaper Card Physics & Elevation Transitions ---');

assert(
  /\.m3-wallpaper-card[\s\S]*?\{\s*[\s\S]*?border-radius:\s*var\(--md-shape-corner-lg\);[\s\S]*?box-shadow:\s*var\(--md-sys-elevation-1\);[\s\S]*?transition:\s*transform\s+var\(--md-sys-motion-duration-medium1,\s*250ms\)/i.test(css),
  'Wallpaper cards resting state has 16px LG corners, Level 1 elevation, and 250ms standard transition'
);

assert(
  /\.m3-wallpaper-card:hover[\s\S]*?\{\s*[\s\S]*?transform:\s*translateY\(-4px\);[\s\S]*?box-shadow:\s*var\(--md-sys-elevation-3\);[\s\S]*?border-color:\s*var\(--md-sys-color-primary\);/i.test(css),
  'Wallpaper card hover raises elevation to Level 3 with translateY(-4px) lift'
);

assert(
  /\.m3-wallpaper-card:active[\s\S]*?\{\s*[\s\S]*?transform:\s*translateY\(-1px\)\s*scale\(0\.99\);[\s\S]*?box-shadow:\s*var\(--md-sys-elevation-2\);[\s\S]*?transition-duration:\s*80ms;/i.test(css),
  'Wallpaper card active click provides tactile depression scale(0.99) with 80ms snappy feedback'
);

assert(
  /@keyframes\s+m3-elevation-raise-1-3\s*\{[\s\S]*?box-shadow:\s*var\(--md-sys-elevation-1\);[\s\S]*?box-shadow:\s*var\(--md-sys-elevation-3\);[\s\S]*?\}/.test(css),
  'm3-elevation-raise-1-3 keyframe smoothly transitions Level 1 -> Level 3'
);

assert(
  /@keyframes\s+m3-elevation-lower-3-1\s*\{[\s\S]*?box-shadow:\s*var\(--md-sys-elevation-3\);[\s\S]*?box-shadow:\s*var\(--md-sys-elevation-1\);[\s\S]*?\}/.test(css),
  'm3-elevation-lower-3-1 keyframe smoothly transitions Level 3 -> Level 1'
);

// -----------------------------------------------------------------------------
// 5. Reduced-Motion Media Query (A11y & WCAG 2.1 SC 2.3.3)
// -----------------------------------------------------------------------------
console.log('\n--- 5. Reduced-Motion Media Query (WCAG 2.1 SC 2.3.3 Compliance) ---');

const reducedMotionBlockMatch = css.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\}\s*$/);
assert(
  reducedMotionBlockMatch !== null,
  '@media (prefers-reduced-motion: reduce) block is present in styles.css'
);

if (reducedMotionBlockMatch) {
  const rmContent = reducedMotionBlockMatch[1];

  const rmDurationTokens = [
    '--md-sys-motion-duration-short1: 0.01ms;',
    '--md-sys-motion-duration-short2: 0.01ms;',
    '--md-sys-motion-duration-short3: 0.01ms;',
    '--md-sys-motion-duration-short4: 0.01ms;',
    '--md-sys-motion-duration-medium1: 0.01ms;',
    '--md-sys-motion-duration-medium2: 0.01ms;',
    '--md-sys-motion-duration-medium3: 0.01ms;',
    '--md-sys-motion-duration-medium4: 0.01ms;',
    '--md-sys-motion-duration-long1: 0.01ms;',
    '--md-sys-motion-duration-long2: 0.01ms;',
    '--md-sys-motion-duration-long3: 0.01ms;',
    '--md-sys-motion-duration-long4: 0.01ms;',
    '--md-sys-motion-duration-extra-long1: 0.01ms;',
    '--md-sys-motion-duration-extra-long2: 0.01ms;',
    '--md-sys-motion-duration-extra-long3: 0.01ms;',
    '--md-sys-motion-duration-extra-long4: 0.01ms;',
    '--md-sys-motion-duration-short: 0.01ms;',
    '--md-sys-motion-duration-medium: 0.01ms;',
    '--md-sys-motion-duration-long: 0.01ms;',
    '--md-sys-motion-duration-extra-long: 0.01ms;'
  ];

  for (const token of rmDurationTokens) {
    assert(
      rmContent.includes(token),
      `Reduced motion overrides :root ${token.split(':')[0]} to 0.01ms`
    );
  }

  assert(
    /\*,\s*\*::before,\s*\*::after\s*\{[\s\S]*?animation-duration:\s*0\.01ms\s*!important;[\s\S]*?animation-iteration-count:\s*1\s*!important;[\s\S]*?transition-duration:\s*0\.01ms\s*!important;[\s\S]*?scroll-behavior:\s*auto\s*!important;/i.test(rmContent),
    'Reduced motion sets universal selector *, *::before, *::after to 0.01ms duration and auto scroll'
  );

  assert(
    /\.skeleton::before,\s*\.skeleton-shimmer::after,\s*\.spinner-inner\s*\{\s*animation:\s*none\s*!important;\s*\}/i.test(rmContent),
    'Reduced motion disables all continuous loop keyframes (skeleton, shimmer, spinner)'
  );

  assert(
    /\.tab-page\.active\s*\{\s*animation:\s*none\s*!important;\s*opacity:\s*1\s*!important;\s*transform:\s*none\s*!important;\s*\}/i.test(rmContent),
    'Reduced motion enforces instantaneous tab page switching without animation or transform delay'
  );

  assert(
    /\.m3-dialog-backdrop,\s*\.m3-dialog-surface,\s*\.fullscreen-lightbox-backdrop,\s*\.lightbox-floating-toolbar,\s*\.lightbox-close-btn,\s*\.m3-snackbar,\s*\.flutter-snackbar-container,\s*\.m3-ripple-wave,\s*\.md-ripple-wave\s*\{\s*transition:\s*none\s*!important;\s*animation:\s*none\s*!important;\s*\}/i.test(rmContent),
    'Reduced motion disables transitions and animations on all dialogs, lightboxes, snackbars, and ripples'
  );
}

// -----------------------------------------------------------------------------
// 6. Ripple Engine & Event Isolation in app.js
// -----------------------------------------------------------------------------
console.log('\n--- 6. Ripple Engine Runtime & Event Delegation in app.js ---');

assert(
  appJs.includes('function initM3RippleEngine()'),
  'app.js defines initM3RippleEngine function'
);

assert(
  appJs.includes("Math.hypot(dX, dY)") && appJs.includes("const dX = Math.max(x, width - x);"),
  'Ripple engine computes exact furthest corner radius via Math.hypot(dX, dY)'
);

assert(
  appJs.includes("window.__M3_RIPPLE_INITIALIZED__"),
  'Ripple engine has idempotent initialization guard'
);

assert(
  appJs.includes("document.addEventListener('pointerdown'"),
  'Ripple engine binds passive global pointerdown event listener'
);

console.log('\n==============================================================================');
console.log(`Summary: ${passedChecks}/${totalChecks} assertions PASSED (${failedChecks} failed).`);
console.log('==============================================================================\n');

if (failedChecks > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
