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
        job.img.closest('.skeleton')?.classList.remove('skeleton');
        job.img.alt = 'Image unavailable';
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

  async function localUrl(path, thumbnail, invoke) {
    const localPath = await invoke('get_local_image_path', { filePath: path, thumbnail });
    if (!localPath) throw new Error('Local image path unavailable');
    if (localPath.startsWith('data:')) return localPath;
    const convert = window.__TAURI__?.core?.convertFileSrc;
    if (typeof convert !== 'function') throw new Error('Asset protocol unavailable');
    return convert(localPath);
  }
  function loadLocal(img, path, invoke) {
    img.loading = 'lazy'; img.decoding = 'async';
    let fallbackUsed = false;
    img.onerror = async () => {
      if (fallbackUsed || !img.isConnected) {
        img.closest('.skeleton')?.classList.remove('skeleton');
        img.alt = 'Image unavailable';
        return;
      }
      fallbackUsed = true;
      try {
        const original = await localUrl(path, false, invoke);
        if (img.isConnected) img.src = original;
      } catch (_) {
        img.closest('.skeleton')?.classList.remove('skeleton');
        img.alt = 'Image unavailable';
      }
    };
    const job = { img, run: async () => {
      let url;
      try {
        url = await localUrl(path, true, invoke);
      } catch (_) {
        fallbackUsed = true;
        url = await localUrl(path, false, invoke);
      }
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
