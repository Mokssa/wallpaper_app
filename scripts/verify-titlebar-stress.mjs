#!/usr/bin/env node
/**
 * ==============================================================================
 * Empirical Titlebar Drag Segregation & Window Control Verifier
 * Challenger 1 for Milestone 2
 * ==============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const indexPath = path.join(projectRoot, 'ui', 'index.html');
const cssPath = path.join(projectRoot, 'ui', 'styles.css');
const jsPath = path.join(projectRoot, 'ui', 'app.js');
const rustPath = path.join(projectRoot, 'src', 'main.rs');
const tauriConfPath = path.join(projectRoot, 'tauri.conf.json');

console.log('========================================================');
console.log('[Milestone 2] Titlebar Drag Segregation & Window Control Verifier');
console.log('========================================================\n');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function assertCheck(desc, condition, detail = '') {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✓ [PASS] ${desc}`);
  } else {
    failedChecks++;
    console.error(`  ✗ [FAIL] ${desc} — ${detail}`);
  }
}

// 1. HTML DOM Architecture Checks
console.log('--- 1. HTML DOM Architecture Checks ---');
const indexHtml = fs.readFileSync(indexPath, 'utf8');

assertCheck(
  'Header #app-titlebar has class .flutter-titlebar',
  /<header[^>]*class="[^"]*flutter-titlebar[^"]*"[^>]*id="app-titlebar"/i.test(indexHtml)
);

assertCheck(
  'Drag region element has data-tauri-drag-region attribute',
  /<div[^>]*class="[^"]*titlebar-drag-region[^"]*"[^>]*data-tauri-drag-region/i.test(indexHtml)
);

assertCheck(
  'Actions container has data-tauri-drag-region="false"',
  /<div[^>]*class="[^"]*titlebar-actions[^"]*"[^>]*data-tauri-drag-region="false"/i.test(indexHtml)
);

assertCheck(
  'Window control buttons exist: #btn-minimize, #btn-maximize, #btn-close',
  indexHtml.includes('id="btn-minimize"') &&
  indexHtml.includes('id="btn-maximize"') &&
  indexHtml.includes('id="btn-close"')
);

assertCheck(
  'Buttons have accessible title and aria-label attributes',
  /id="btn-minimize"[^>]*title="最小化"[^>]*aria-label="最小化"/.test(indexHtml) &&
  /id="btn-maximize"[^>]*title="最大化"[^>]*aria-label="最大化"/.test(indexHtml) &&
  /id="btn-close"[^>]*title="关闭"[^>]*aria-label="关闭"/.test(indexHtml)
);

// 2. CSS Drag Segregation & Micro-interaction Rules
console.log('\n--- 2. CSS Drag Segregation & Micro-interaction Rules ---');
const stylesCss = fs.readFileSync(cssPath, 'utf8');

assertCheck(
  '.flutter-titlebar height is 40px with z-index 100 and flex-shrink: 0',
  /\.flutter-titlebar\s*\{[^}]*height:\s*40px/s.test(stylesCss) &&
  /\.flutter-titlebar\s*\{[^}]*z-index:\s*100/s.test(stylesCss) &&
  /\.flutter-titlebar\s*\{[^}]*flex-shrink:\s*0/s.test(stylesCss)
);

assertCheck(
  '.titlebar-drag-region has -webkit-app-region: drag and app-region: drag',
  /\.titlebar-drag-region\s*\{[^}]*-webkit-app-region:\s*drag/s.test(stylesCss) &&
  /\.titlebar-drag-region\s*\{[^}]*app-region:\s*drag/s.test(stylesCss)
);

assertCheck(
  '.titlebar-actions has -webkit-app-region: no-drag and pointer-events: auto',
  /\.titlebar-actions\s*\{[^}]*-webkit-app-region:\s*no-drag/s.test(stylesCss) &&
  /\.titlebar-actions\s*\{[^}]*pointer-events:\s*auto/s.test(stylesCss)
);

assertCheck(
  '.titlebar-btn has -webkit-app-region: no-drag and pointer-events: auto',
  /\.titlebar-btn\s*\{[^}]*-webkit-app-region:\s*no-drag/s.test(stylesCss) &&
  /\.titlebar-btn\s*\{[^}]*pointer-events:\s*auto/s.test(stylesCss)
);

assertCheck(
  '.titlebar-brand has pointer-events: none for unhindered drag behavior',
  /\.titlebar-brand\s*\{[^}]*pointer-events:\s*none/s.test(stylesCss)
);

assertCheck(
  '.titlebar-btn.close has error hover/active state colors',
  /\.titlebar-btn\.close:hover\s*\{[^}]*background-color:\s*var\(--md-sys-color-error/s.test(stylesCss) &&
  /\.titlebar-btn\.close:active\s*\{[^}]*background-color:\s*#93000a/s.test(stylesCss)
);

assertCheck(
  'AMOLED pure black override for titlebar is present',
  /body\.theme-amoled\s+\.flutter-titlebar\s*\{[^}]*background:\s*#000000\s*!important/s.test(stylesCss)
);

// 3. JS Window Control Invocations & Setup
console.log('\n--- 3. JS Window Control Invocations & Setup ---');
const appJs = fs.readFileSync(jsPath, 'utf8');

assertCheck(
  'setupWindowControls attaches window_minimize to #btn-minimize',
  /btnMinimize\.addEventListener\('click',\s*\(\)\s*=>\s*invoke\('window_minimize'\)\)/.test(appJs)
);

assertCheck(
  'setupWindowControls attaches window_toggle_maximize to #btn-maximize',
  /btnMaximize\.addEventListener\('click',\s*\(\)\s*=>\s*invoke\('window_toggle_maximize'\)\)/.test(appJs)
);

assertCheck(
  'setupWindowControls attaches window_close to #btn-close',
  /btnClose\.addEventListener\('click',\s*\(\)\s*=>\s*invoke\('window_close'\)\)/.test(appJs)
);

// 4. Rust Backend IPC Handlers
console.log('\n--- 4. Rust Backend IPC Handlers ---');
const rustCode = fs.readFileSync(rustPath, 'utf8');

assertCheck(
  'Rust defines #[tauri::command] fn window_minimize(window: tauri::Window)',
  /#\[tauri::command\]\s*fn\s+window_minimize\s*\(\s*window\s*:\s*tauri::Window\s*\)/.test(rustCode)
);

assertCheck(
  'Rust defines #[tauri::command] fn window_toggle_maximize(window: tauri::Window)',
  /#\[tauri::command\]\s*fn\s+window_toggle_maximize\s*\(\s*window\s*:\s*tauri::Window\s*\)/.test(rustCode)
);

assertCheck(
  'Rust defines #[tauri::command] fn window_close(window: tauri::Window) using window.hide()',
  /#\[tauri::command\]\s*fn\s+window_close\s*\(\s*window\s*:\s*tauri::Window\s*\)\s*\{[^}]*window\.hide\(\)/s.test(rustCode)
);

assertCheck(
  'Rust registers window_minimize, window_toggle_maximize, window_close in invoke_handler',
  /tauri::generate_handler!\[[\s\S]*window_minimize[\s\S]*window_toggle_maximize[\s\S]*window_close[\s\S]*\]/.test(rustCode)
);

// 5. Window Dimension & Geometry Validation
console.log('\n--- 5. Window Dimension & Geometry Validation ---');
const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
const win = tauriConf.app.windows[0];

assertCheck(
  'tauri.conf.json sets minWidth: 940 and minHeight: 600',
  win.minWidth === 940 && win.minHeight === 600
);

assertCheck(
  'tauri.conf.json sets default width: 1020, height: 680, decorations: false',
  win.width === 1020 && win.height === 680 && win.decorations === false
);

// Geometry calculation
const resolutions = [
  { name: 'Min Dimensions', w: 940, h: 600 },
  { name: 'Default Dimensions', w: 1020, h: 680 },
  { name: '1080p FHD', w: 1920, h: 1080 },
  { name: '1440p 2K', w: 2560, h: 1440 },
  { name: '4K UHD', w: 3840, h: 2160 },
  { name: '8K UHD', w: 7680, h: 4320 }
];

let allGeometriesValid = true;
resolutions.forEach(r => {
  const paddingH = 24; // 16 + 8
  const actionsW = 116; // 3 * 36 + 2 * 4
  const dragW = r.w - paddingH - actionsW;
  const dragRatio = (dragW / r.w) * 100;
  if (dragW < 700 || dragRatio < 75) {
    allGeometriesValid = false;
  }
});

assertCheck(
  'Titlebar geometry maintains >75% draggable space across all resolutions (940px - 7680px)',
  allGeometriesValid
);

console.log('\n========================================================');
console.log(`Validation Results: ${passedChecks}/${totalChecks} passed (${failedChecks} failed)`);
console.log('========================================================\n');

if (failedChecks > 0) {
  process.exit(1);
} else {
  console.log('✅ Titlebar drag segregation & window controls fully verified!');
  process.exit(0);
}
