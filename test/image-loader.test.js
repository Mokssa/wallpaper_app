import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(projectRoot, 'ui', 'images.js'), 'utf8');

class DeferredObserver {
  observe() {}
  unobserve() {}
}

describe('local image loading lifecycle', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.IntersectionObserver = DeferredObserver;
    window.Function(source)();
    window.__TAURI__ = { core: { convertFileSrc: value => `http://asset.localhost/${encodeURIComponent(value)}` } };
  });

  it('wakes image jobs that were created while their tab was hidden', async () => {
    const container = document.createElement('div');
    const image = document.createElement('img');
    container.appendChild(image); document.body.appendChild(container);
    window.WallpaperImages.loadLocal(image, 'D:/wallpaper.jpg', async () => 'D:/thumb.jpg');
    expect(image.getAttribute('src')).toBeNull();
    expect(window.WallpaperImages.activate(container)).toBe(1);
    await Promise.resolve(); await Promise.resolve();
    expect(image.src).toContain(encodeURIComponent('D:/thumb.jpg'));
  });

  it('falls back to the original when thumbnail generation fails', async () => {
    const image = document.createElement('img'); document.body.appendChild(image);
    const invoke = async (_command, args) => {
      if (args.thumbnail) throw new Error('bad thumbnail cache');
      return 'D:/original.jpg';
    };
    window.WallpaperImages.loadLocal(image, 'D:/wallpaper.jpg', invoke);
    window.WallpaperImages.activate(document.body);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(image.src).toContain(encodeURIComponent('D:/original.jpg'));
  });
});
