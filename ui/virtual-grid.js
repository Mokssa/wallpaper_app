// Uniform grids retain item metadata while mounting only visible rows and a small buffer.
// Original-ratio grids retain their natural layout until row heights can be measured reliably.
(() => {
  class VirtualGrid {
    constructor(container, scroll, createCard) {
      this.container = container; this.scroll = scroll; this.createCard = createCard;
      this.items = []; this.cards = new Map(); this.frame = null;
      this.schedule = () => {
        if (this.frame !== null) return;
        this.frame = requestAnimationFrame(() => { this.frame = null; this.render(); });
      };
      scroll?.addEventListener('scroll', this.schedule, { passive: true });
      if (typeof ResizeObserver === 'function') {
        this.resize = new ResizeObserver(this.schedule); this.resize.observe(container);
      }
    }
    update(items) { this.items = items; this.render(); }
    key(item) { return item.file_path || item.raw_url || item.id; }
    release(card) {
      window.WallpaperImages?.release(card);
      card.querySelectorAll('img').forEach(img => { img.onerror = null; img.onload = null; img.removeAttribute('src'); });
      card.remove();
    }
    render() {
      const { container, scroll } = this;
      // Hidden tabs have zero width; keep their current window until ResizeObserver reports visibility.
      if (this.items.length > 120 && container.clientWidth <= 0 && this.cards.size) return;
      let start = 0; let end = this.items.length; let stride = 0; let columns = 1; let gap = 0;
      if (this.items.length > 120 && scroll?.clientHeight > 0 && !container.classList.contains('ratio-original')) {
        const style = getComputedStyle(container);
        columns = Math.max(1, style.gridTemplateColumns.split(' ').filter(x => x && x !== 'none').length);
        gap = parseFloat(style.rowGap) || 16;
        const width = (container.clientWidth - gap * (columns - 1)) / columns;
        stride = width / 1.6 + gap;
        if (stride > gap) {
          const offset = container.getBoundingClientRect().top - scroll.getBoundingClientRect().top + scroll.scrollTop;
          const row = Math.max(0, Math.floor((scroll.scrollTop - offset) / stride) - 3);
          start = Math.min(Math.max(0, Math.ceil(this.items.length / columns) - 1), row) * columns;
          end = Math.min(this.items.length, start + (Math.ceil(scroll.clientHeight / stride) + 7) * columns);
        }
      }
      const visible = this.items.slice(start, end);
      const keys = new Set(visible.map(item => this.key(item)));
      for (const [key, card] of this.cards) {
        if (!keys.has(key)) { this.release(card); this.cards.delete(key); }
      }
      const fragment = document.createDocumentFragment();
      const spacer = height => {
        const element = document.createElement('div'); element.setAttribute('aria-hidden', 'true');
        element.style.gridColumn = '1 / -1'; element.style.height = `${Math.max(0, height)}px`;
        fragment.appendChild(element);
      };
      if (start && stride) spacer((start / columns) * stride - gap);
      visible.forEach(item => {
        const key = this.key(item);
        let card = this.cards.get(key);
        if (!card) { card = this.createCard(item); this.cards.set(key, card); }
        fragment.appendChild(card);
      });
      if (end < this.items.length && stride) spacer(Math.ceil((this.items.length - end) / columns) * stride - gap);
      container.replaceChildren(fragment);
    }
    destroy() {
      this.scroll?.removeEventListener('scroll', this.schedule); this.resize?.disconnect();
      if (this.frame !== null) cancelAnimationFrame(this.frame);
      for (const card of this.cards.values()) this.release(card);
      this.cards.clear(); this.items = [];
    }
  }
  window.WallpaperVirtualGrid = VirtualGrid;
})();
