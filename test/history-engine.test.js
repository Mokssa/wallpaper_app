/**
 * ==============================================================================
 * Browsing History Engine & Lifecycle Test Suite
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

describe('Browsing History Engine & Navigation Suite', () => {
  beforeEach(async () => {
    resetMockBackendState();
    mockBackendState.browseHistory = [];
    setupMockTauri();
    loadIndexHTML();
    initializeAppRuntime();
    await new Promise((resolve) => setTimeout(resolve, 80));
  });

  it('renders history navigation tab and empty state when history is empty', async () => {
    const navHistory = document.getElementById('nav-tab-history');
    expect(navHistory).not.toBeNull();
    expect(navHistory?.getAttribute('data-tab')).toBe('history');

    navHistory?.click();
    await new Promise((r) => setTimeout(r, 60));

    const tabHistory = document.getElementById('tab-history');
    expect(tabHistory?.classList.contains('active')).toBe(true);

    const emptyState = document.getElementById('history-empty-state');
    expect(emptyState?.style.display).not.toBe('none');

    const countBadge = document.getElementById('history-count-badge');
    expect(countBadge?.textContent).toContain('0');
  });

  it('records online wallpaper to history when card is clicked', async () => {
    // Switch to explore
    const navExplore = document.getElementById('nav-tab-explore');
    navExplore?.click();
    await new Promise((r) => setTimeout(r, 80));

    const cards = document.querySelectorAll('#online-grid .m3-wallpaper-card');
    expect(cards.length).toBeGreaterThan(0);

    // Click the first card
    cards[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 60));

    // Verify record_browse_history was called
    const recordCalls = mockBackendState.invokedCommands.filter((c) => c.cmd === 'record_browse_history');
    expect(recordCalls.length).toBeGreaterThan(0);
    expect(mockBackendState.browseHistory.length).toBeGreaterThan(0);
  });

  it('renders history cards and count badge after wallpapers are recorded', async () => {
    mockBackendState.browseHistory = [
      {
        id: 'hist-item-1',
        title: 'Aurora Borealis 4K',
        thumb_url: 'https://images.mock-cdn.com/thumb_1.jpg',
        raw_url: 'https://images.mock-cdn.com/raw_1.jpg',
        source: 'pexels',
        viewed_at: 1788400000
      },
      {
        id: 'hist-item-2',
        title: 'Cyberpunk Tokyo Night',
        thumb_url: 'https://images.mock-cdn.com/thumb_2.jpg',
        raw_url: 'https://images.mock-cdn.com/raw_2.jpg',
        source: 'unsplash',
        viewed_at: 1788400050
      }
    ];

    const navHistory = document.getElementById('nav-tab-history');
    navHistory?.click();
    await new Promise((r) => setTimeout(r, 80));

    const cards = document.querySelectorAll('#history-grid .m3-wallpaper-card');
    expect(cards.length).toBe(2);

    // Verify Card Info Footer
    const firstCard = cards[0];
    const infoFooter = firstCard.querySelector('.history-card-info');
    expect(infoFooter).not.toBeNull();

    const titleEl = firstCard.querySelector('.history-card-title');
    expect(titleEl?.textContent).toBe('Aurora Borealis 4K');

    const sourceTag = firstCard.querySelector('.history-source-tag');
    expect(sourceTag?.textContent).toBe('Pexels');
    expect(sourceTag?.classList.contains('source-pexels')).toBe(true);

    const timeTag = firstCard.querySelector('.history-time-tag');
    expect(timeTag).not.toBeNull();

    const countBadge = document.getElementById('history-count-badge');
    expect(countBadge?.textContent).toContain('2');

    const emptyState = document.getElementById('history-empty-state');
    expect(emptyState?.style.display).toBe('none');
  });

  it('deletes a single history item via card action button', async () => {
    mockBackendState.browseHistory = [
      {
        id: 'hist-item-del-1',
        title: 'Item to Delete',
        thumb_url: 'https://images.mock-cdn.com/del.jpg',
        raw_url: 'https://images.mock-cdn.com/del_raw.jpg',
        source: 'wallhaven',
        viewed_at: 1788400000
      },
      {
        id: 'hist-item-del-2',
        title: 'Item to Keep',
        thumb_url: 'https://images.mock-cdn.com/keep.jpg',
        raw_url: 'https://images.mock-cdn.com/keep_raw.jpg',
        source: 'bing',
        viewed_at: 1788400010
      }
    ];

    const navHistory = document.getElementById('nav-tab-history');
    navHistory?.click();
    await new Promise((r) => setTimeout(r, 80));

    const deleteBtns = document.querySelectorAll('#history-grid .action-delete-history');
    expect(deleteBtns.length).toBe(2);

    // Click delete on first card
    deleteBtns[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 300));

    // Verify delete command was dispatched
    const delCalls = mockBackendState.invokedCommands.filter((c) => c.cmd === 'delete_browse_history_item');
    expect(delCalls.length).toBe(1);
    expect(mockBackendState.browseHistory.length).toBe(1);
    expect(mockBackendState.browseHistory[0].id).toBe('hist-item-del-2');
  });

  it('clears browse history via confirmation dialog and updates UI', async () => {
    mockBackendState.browseHistory = [
      {
        id: 'hist-item-1',
        title: 'Sunset Beach',
        thumb_url: 'https://images.mock-cdn.com/thumb_beach.jpg',
        raw_url: 'https://images.mock-cdn.com/raw_beach.jpg',
        source: 'bing',
        viewed_at: 1788400000
      }
    ];

    const navHistory = document.getElementById('nav-tab-history');
    navHistory?.click();
    await new Promise((r) => setTimeout(r, 80));

    expect(document.querySelectorAll('#history-grid .m3-wallpaper-card').length).toBe(1);

    // Click Clear History button
    const btnClear = document.getElementById('btn-clear-history');
    expect(btnClear).not.toBeNull();
    btnClear?.click();

    // Confirm dialog should open
    const confirmBackdrop = document.getElementById('confirm-dialog-backdrop');
    expect(confirmBackdrop?.style.display).toBe('flex');

    // Click confirm OK button
    const btnConfirmOk = document.getElementById('btn-confirm-ok');
    btnConfirmOk?.click();
    await new Promise((r) => setTimeout(r, 80));

    expect(mockBackendState.browseHistory.length).toBe(0);
    expect(document.querySelectorAll('#history-grid .m3-wallpaper-card').length).toBe(0);

    const emptyState = document.getElementById('history-empty-state');
    expect(emptyState?.style.display).not.toBe('none');
  });
});
