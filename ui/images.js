// Visible image requests share a small queue; full-resolution images are fetched on demand.
(() => {
  const pending = [];
  let active = 0;
  const jobs = new WeakMap();
  function pump() {
    while (active < 4 && pending.length) {
      const job = pending.shift();
      if (!job.img.isConnected) continue;
      active++;
      job.run().catch(() => {
        markBroken(job.img, job.onFail);
      }).finally(() => { active--; pump(); });
    }
  }
  const observer = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        enqueue(entry.target);
      });
      pump();
    }, { rootMargin: '240px' }) : null;

  function enqueue(img) {
    const job = jobs.get(img);
    if (!job) return;
    observer?.unobserve(img);
    jobs.delete(img);
    pending.push(job);
    pump();
  }

  function markBroken(img, onFail) {
    img.closest('.skeleton')?.classList.remove('skeleton');
    img.classList.remove('loaded');
    img.alt = '';
    img.removeAttribute('src');
    if (typeof onFail === 'function' && onFail(img) === true) return;
    img.closest('.m3-card-img-wrapper')?.classList.add('img-error');
  }

  async function localUrl(path, thumbnail, invoke) {
    const localPath = await invoke('get_local_image_path', { filePath: path, thumbnail });
    if (!localPath) throw new Error('Local image path unavailable');
    if (
      localPath.startsWith('data:') ||
      localPath.startsWith('http://') ||
      localPath.startsWith('https://') ||
      localPath.startsWith('asset:')
    ) {
      return localPath;
    }
    const convert = window.__TAURI__?.core?.convertFileSrc || window.__TAURI_INTERNALS__?.convertFileSrc;
    if (typeof convert !== 'function') {
      return invoke('read_file_data_url', { filePath: path });
    }
    return convert(localPath);
  }
  function loadLocal(img, path, invoke, options = {}) {
    img.loading = 'lazy'; img.decoding = 'async';
    let stage = 0;
    img.onerror = async () => {
      if (!img.isConnected) return;
      while (stage < 2) {
        stage++;
        try {
          const nextUrl = stage === 1
            ? await localUrl(path, false, invoke)
            : await invoke('read_file_data_url', { filePath: path });
          if (nextUrl && img.isConnected) {
            img.src = nextUrl;
            return;
          }
        } catch (_) {}
      }
      stage = 3;
      markBroken(img, options.onFail);
    };
    const job = { img, onFail: options.onFail, run: async () => {
      let url;
      try {
        stage = 0;
        url = await localUrl(path, true, invoke);
      } catch (_) {
        try {
          stage = 1;
          url = await localUrl(path, false, invoke);
        } catch (__) {
          stage = 2;
          url = await invoke('read_file_data_url', { filePath: path });
        }
      }
      if (!url) throw new Error('Image unavailable');
      if (img.isConnected) img.src = url;
    } };
    if (observer) { jobs.set(img, job); observer.observe(img); }
    else { pending.push(job); queueMicrotask(pump); }
  }
  function release(container) {
    container?.querySelectorAll('img').forEach(img => { observer?.unobserve(img); jobs.delete(img); });
  }
  // WebView2 may not emit a new intersection after a display:none tab becomes visible.
  // A virtual grid only mounts its visible window, so waking all mounted cards stays bounded.
  function activate(container) {
    let activated = 0;
    container?.querySelectorAll('img').forEach(img => {
      if (jobs.has(img)) activated++;
      enqueue(img);
    });
    return activated;
  }
  window.WallpaperImages = { localUrl, loadLocal, activate, release };
})();
