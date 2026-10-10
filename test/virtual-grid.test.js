import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadIndexHTML } from './setup.js';

describe('Virtual grid preserves scrollable item access', () => {
  let container, scroll;
  beforeEach(() => {
    loadIndexHTML(); container = document.getElementById('online-grid'); scroll = document.getElementById('flutter-main-scroll');
    Object.defineProperty(container, 'clientWidth', { configurable: true, value: 800 });
    Object.defineProperty(scroll, 'clientHeight', { configurable: true, value: 600 });
    container.getBoundingClientRect = () => ({ top: -scroll.scrollTop });
    scroll.getBoundingClientRect = () => ({ top: 0 });
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({ gridTemplateColumns: '250px 250px 250px', rowGap: '12px' });
  });
  function makeGrid(count) {
    const grid = new window.WallpaperVirtualGrid(container, scroll, item => {
      const card = document.createElement('div'); card.dataset.id = item.id; return card;
    });
    grid.update(Array.from({ length: count }, (_, id) => ({ id: String(id) })));
    return grid;
  }
  it('bounds mounted cards with 500 and 1000 items and restores earlier rows', () => {
    for (const count of [500, 1000]) {
      const grid = makeGrid(count);
      expect(grid.cards.size).toBeLessThan(50); expect(container.querySelector('[data-id="0"]')).not.toBeNull();
      scroll.scrollTop = 5000; grid.render();
      expect(grid.cards.size).toBeLessThan(50); expect(container.querySelector('[data-id="0"]')).toBeNull();
      scroll.scrollTop = 0; grid.render();
      expect(container.querySelector('[data-id="0"]')).not.toBeNull();
      grid.destroy();
    }
  });
  it('retains normal rendering for small and original-ratio grids', () => {
    const small = makeGrid(100); expect(small.cards.size).toBe(100); small.destroy();
    container.classList.add('ratio-original');
    const original = makeGrid(150); expect(original.cards.size).toBe(150); original.destroy();
  });
});
