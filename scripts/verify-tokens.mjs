#!/usr/bin/env node

/**
 * ==============================================================================
 * Tier 1: M3 Design Token & Static Style Validator
 * ==============================================================================
 * Parses `ui/styles.css` to validate:
 *  1. Material Design 3 Color Roles (--md-sys-color-*)
 *  2. M3 Shape Corner Radii (--md-shape-corner-*)
 *  3. M3 Elevation Shadows (--md-sys-elevation-*)
 *  4. M3 Motion & Easing Tokens (--md-sys-motion-*)
 *  5. 8 Dynamic Theme Palettes (Indigo, Ocean, Emerald, Sunset, Crimson, Lavender, Amber, AMOLED)
 *  6. Typography & Font Family Presets
 *  7. Component Structure & Interface Selectors
 * ==============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const stylesPath = path.join(projectRoot, 'ui', 'styles.css');

console.log(`\n========================================================`);
console.log(`[Tier 1] M3 Design Token & Static Style Validator`);
console.log(`Target: ${stylesPath}`);
console.log(`========================================================\n`);

if (!fs.existsSync(stylesPath)) {
  console.error(`❌ Error: styles.css not found at ${stylesPath}`);
  process.exit(1);
}

const cssContent = fs.readFileSync(stylesPath, 'utf8');

// Helper to extract CSS variable definitions
function extractVariables(css) {
  const vars = new Map();
  const regex = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g;
  let match;
  while ((match = regex.exec(css)) !== null) {
    const name = match[1].trim();
    const value = match[2].trim();
    if (!vars.has(name)) {
      vars.set(name, []);
    }
    vars.get(name).push(value);
  }
  return vars;
}

const allVars = extractVariables(cssContent);

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function assert(condition, category, message, detail = '') {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✓ [PASS] [${category}] ${message}`);
  } else {
    failedChecks++;
    console.error(`  ✗ [FAIL] [${category}] ${message} ${detail ? `(${detail})` : ''}`);
  }
}

// -----------------------------------------------------------------------------
// 1. M3 Color System Tokens
// -----------------------------------------------------------------------------
console.log(`\n--- 1. M3 Color System Tokens ---`);
const requiredColorTokens = [
  '--md-sys-color-primary',
  '--md-sys-color-primary-container',
  '--md-sys-color-on-primary-container',
  '--md-sys-color-secondary',
  '--md-sys-color-surface',
  '--md-sys-color-surface-dim',
  '--md-sys-color-surface-container-lowest',
  '--md-sys-color-surface-container-low',
  '--md-sys-color-surface-container',
  '--md-sys-color-surface-container-high',
  '--md-sys-color-surface-container-highest',
  '--md-sys-color-outline',
  '--md-sys-color-outline-variant',
  '--md-sys-color-on-surface',
  '--md-sys-color-on-surface-variant',
  '--md-sys-color-error',
  '--md-sys-color-error-container',
  '--md-sys-color-success'
];

for (const token of requiredColorTokens) {
  const exists = allVars.has(token);
  assert(exists, 'Color Roles', `Defines ${token}`, exists ? `Value: ${allVars.get(token)[0]}` : 'Missing');
}

// -----------------------------------------------------------------------------
// 2. M3 Shape Corner Tokens
// -----------------------------------------------------------------------------
console.log(`\n--- 2. M3 Shape Corner Radii ---`);
const requiredShapeTokens = [
  '--md-shape-corner-xs',
  '--md-shape-corner-sm',
  '--md-shape-corner-md',
  '--md-shape-corner-lg',
  '--md-shape-corner-xl',
  '--md-shape-corner-full'
];

for (const token of requiredShapeTokens) {
  const exists = allVars.has(token);
  assert(exists, 'Shape Tokens', `Defines ${token}`, exists ? `Value: ${allVars.get(token)[0]}` : 'Missing');
}

// -----------------------------------------------------------------------------
// 3. M3 Elevation Shadows
// -----------------------------------------------------------------------------
console.log(`\n--- 3. M3 Elevation Levels ---`);
const requiredElevationTokens = [
  '--md-sys-elevation-1',
  '--md-sys-elevation-2',
  '--md-sys-elevation-3',
  '--md-sys-elevation-4'
];

for (const token of requiredElevationTokens) {
  const exists = allVars.has(token);
  assert(exists, 'Elevation', `Defines ${token}`, exists ? `Value: ${allVars.get(token)[0]}` : 'Missing');
}

// -----------------------------------------------------------------------------
// 4. M3 Motion & Easing Tokens
// -----------------------------------------------------------------------------
console.log(`\n--- 4. M3 Motion & Durations ---`);
const requiredMotionTokens = [
  '--md-sys-motion-easing-standard',
  '--md-sys-motion-duration-short',
  '--md-sys-motion-duration-medium'
];

for (const token of requiredMotionTokens) {
  const exists = allVars.has(token);
  assert(exists, 'Motion', `Defines ${token}`, exists ? `Value: ${allVars.get(token)[0]}` : 'Missing');
}

// -----------------------------------------------------------------------------
// 5. Dynamic Theme Palettes (8 Themes)
// -----------------------------------------------------------------------------
console.log(`\n--- 5. Dynamic Theme Palettes (8 Themes) ---`);
const themePalettes = [
  { name: 'Indigo / Blue', patterns: [/\.theme-indigo\b/, /\.theme-blue\b/] },
  { name: 'Ocean / Teal', patterns: [/\.theme-ocean\b/, /\.theme-teal\b/] },
  { name: 'Emerald / Green', patterns: [/\.theme-emerald\b/, /\.theme-green\b/] },
  { name: 'Sunset / Amber', patterns: [/\.theme-sunset\b/, /\.theme-amber\b/] },
  { name: 'Crimson Flame', patterns: [/\.theme-crimson\b/] },
  { name: 'Lavender / Violet / Pink', patterns: [/\.theme-lavender\b/, /\.theme-violet\b/, /\.theme-pink\b/, /Default Theme: Violet/] },
  { name: 'Amber / Sunset', patterns: [/\.theme-amber\b/] },
  { name: 'Pure Black AMOLED', patterns: [/\.theme-amoled\b/] }
];

for (const theme of themePalettes) {
  const matches = theme.patterns.some(pattern => pattern.test(cssContent));
  assert(matches, 'Theme Palettes', `Palette verified: ${theme.name}`);
}

// Check AMOLED overrides surface to pure black
const amoledHasBlack = /theme-amoled[\s\S]*?--md-sys-color-surface\s*:\s*#000000/i.test(cssContent);
assert(amoledHasBlack, 'Theme AMOLED', 'AMOLED theme defines pure black #000000 surface');

// -----------------------------------------------------------------------------
// 6. Typography & Font Family Presets
// -----------------------------------------------------------------------------
console.log(`\n--- 6. Typography & Font Presets ---`);
const fontPresets = [
  { name: 'HarmonyOS / Rounded', patterns: [/\.font-rounded\b/, /\.font-harmony\b/] },
  { name: 'Cute YouYuan / Soft', patterns: [/\.font-youyuan\b/, /\.font-yahei\b/] },
  { name: 'Fluent / Segoe UI / Modern', patterns: [/\.font-fluent\b/, /\.font-modern\b/, /\.font-segoe\b/] },
  { name: 'MiSans Modern / Geometric', patterns: [/\.font-misans\b/, /\.font-miui\b/] }
];

for (const font of fontPresets) {
  const matches = font.patterns.some(pattern => pattern.test(cssContent));
  assert(matches, 'Typography', `Font Preset: ${font.name}`);
}

// -----------------------------------------------------------------------------
// 7. Component Structure & Interface Selectors
// -----------------------------------------------------------------------------
console.log(`\n--- 7. Component Structure & Interface Selectors ---`);
const componentSelectors = [
  { name: 'Navigation Rail', pattern: /\.flutter-nav-rail\b/ },
  { name: 'Navigation Items', pattern: /\.nav-item\b/ },
  { name: 'Titlebar Drag Region', pattern: /\.titlebar-drag-region\b|\[data-tauri-drag-region\]/ },
  { name: 'M3 Buttons', pattern: /\.m3-btn\b|\.md-btn/ },
  { name: 'M3 Dialog / Modal', pattern: /\.m3-dialog-surface\b|\.modal-container/ },
  { name: 'Fullscreen Lightbox', pattern: /\.fullscreen-lightbox-backdrop\b|#fullscreen-lightbox/ },
  { name: 'SnackBar Container', pattern: /\.flutter-snackbar-container\b|#flutter-snackbar/ },
  { name: 'Switch Toggle', pattern: /\.flutter-switch\b|\.md-switch/ }
];

for (const comp of componentSelectors) {
  const matches = comp.pattern.test(cssContent);
  assert(matches, 'Components', `Component CSS: ${comp.name}`);
}

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log(`\n========================================================`);
console.log(`Validation Results:`);
console.log(`  Total Checks : ${totalChecks}`);
console.log(`  Passed       : ${passedChecks}`);
console.log(`  Failed       : ${failedChecks}`);
console.log(`========================================================\n`);

if (failedChecks > 0) {
  console.error(`❌ Tier 1 Token Validation FAILED with ${failedChecks} errors.`);
  process.exit(1);
} else {
  console.log(`✅ Tier 1 Token Validation PASSED! All M3 tokens, themes, and components verified.`);
  process.exit(0);
}
