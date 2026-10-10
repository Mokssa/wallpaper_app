import fs from 'node:fs';
import assert from 'node:assert/strict';

const cargo = fs.readFileSync(new URL('../Cargo.toml', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const config = JSON.parse(fs.readFileSync(new URL('../tauri.conf.json', import.meta.url), 'utf8'));
const version = cargo.match(/^version = "([^"]+)"/m)[1];
assert.equal(pkg.version, version, 'package.json version differs from Cargo.toml');
assert.equal(config.version, version, 'Tauri version differs from Cargo.toml');
const backend = fs.readFileSync(new URL('../src/main.rs', import.meta.url), 'utf8');
const commands = new Set([...backend.matchAll(/#\[tauri::command\]\s*(?:async\s+)?fn\s+(\w+)/g)].map(m => m[1]));
for (const file of ['app.js', 'images.js']) {
  const code = fs.readFileSync(new URL(`../ui/${file}`, import.meta.url), 'utf8');
  for (const match of code.matchAll(/invoke\(['"]([a-z_]+)['"]/g)) {
    assert(commands.has(match[1]), `Unknown IPC command ${match[1]} in ${file}`);
  }
}
console.log(`Version ${version} and ${commands.size} IPC commands verified.`);
