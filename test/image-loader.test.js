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

  it('recovers via read_file_data_url when asset protocol URLs fail to decode', async () => {
    const wrapper = document.createElement('div');
    wrapper.className = 'm3-card-img-wrapper skeleton';
    const image = document.createElement('img');
    wrapper.appendChild(image);
    document.body.appendChild(wrapper);

    const calls = [];
    const invoke = async (command, args) => {
      calls.push({ command, args });
      if (command === 'get_local_image_path') {
        return args.thumbnail ? 'D:/thumb.jpg' : 'D:/original.jpg';
      }
      if (command === 'read_file_data_url') {
        return 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
      }
      throw new Error(`Unexpected command: ${command}`);
    };

    window.WallpaperImages.loadLocal(image, '\\\\?\\D:\\wallpaper.jpg', invoke);
    window.WallpaperImages.activate(document.body);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(image.src).toContain(encodeURIComponent('D:/thumb.jpg'));

    // Stage 0 -> Stage 1 (original asset URL)
    await image.onerror();
    expect(image.src).toContain(encodeURIComponent('D:/original.jpg'));

    // Stage 1 -> Stage 2 (Base64 data URL fallback)
    await image.onerror();
    expect(image.src).toBe('data:image/jpeg;base64,/9j/4AAQSkZJRg==');
    expect(calls.some(c => c.command === 'read_file_data_url')).toBe(true);
  });

  it('cleans up broken src/alt and marks wrapper with img-error when all local fallbacks fail', async () => {
    const wrapper = document.createElement('div');
    wrapper.className = 'm3-card-img-wrapper skeleton';
    const image = document.createElement('img');
    image.alt = 'Should Not Leak';
    wrapper.appendChild(image);
    document.body.appendChild(wrapper);

    const invoke = async () => {
      throw new Error('file deleted from disk');
    };

    window.WallpaperImages.loadLocal(image, 'D:/missing.jpg', invoke);
    window.WallpaperImages.activate(document.body);
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(wrapper.classList.contains('skeleton')).toBe(false);
    expect(wrapper.classList.contains('img-error')).toBe(true);
    expect(image.getAttribute('src')).toBeNull();
    expect(image.alt).toBe('');
  });
});
