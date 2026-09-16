const NS = 'http://www.w3.org/2000/svg';

function el(name, attrs = {}, parent) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  parent?.appendChild(node);
  return node;
}

function text(parent, x, y, content, attrs = {}) {
  const node = el('text', { x, y, ...attrs }, parent);
  node.textContent = content;
  return node;
}

// Shared floating tooltip; rows are [value, label, swatch?]
const tooltip = document.createElement('div');
tooltip.className = 'tooltip';
tooltip.hidden = true;
document.body.appendChild(tooltip);

export function showTooltip(evt, title, rows) {
  tooltip.replaceChildren();
  const h = document.createElement('div');
  h.className = 'tooltip-title';
  h.textContent = title;
  tooltip.appendChild(h);
  for (const [value, label] of rows) {
    const row = document.createElement('div');
    row.className = 'tooltip-row';
    const v = document.createElement('strong');
    v.textContent = value;
    const l = document.createElement('span');
    l.textContent = label;
    row.append(v, l);
    tooltip.appendChild(row);
  }
  tooltip.hidden = false;
  const { innerWidth: w, innerHeight: hgt } = window;
  const rect = tooltip.getBoundingClientRect();
  let x = evt.clientX + 14;
  let y = evt.clientY + 14;
  if (x + rect.width > w - 8) x = evt.clientX - rect.width - 14;
  if (y + rect.height > hgt - 8) y = evt.clientY - rect.height - 14;
  tooltip.style.transform = `translate(${Math.max(8, x)}px, ${Math.max(8, y)}px)`;
}

export function hideTooltip() {
  tooltip.hidden = true;
}

function niceLogTicks(min, max) {
  const ticks = [];
  for (let p = Math.floor(Math.log10(min)); p <= Math.ceil(Math.log10(max)); p++) {
    for (const m of [1, 2, 5]) {
      const v = m * 10 ** p;
      if (v >= min && v <= max) ticks.push(v);
    }
  }
  return ticks;
}

function niceLinearTicks(max, count = 5) {
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  const ticks = [];
  for (let v = 0; ; v += step) {
    ticks.push(+v.toFixed(10));
    if (v >= max - 1e-9) break;
  }
  return ticks;
}

/**
 * Scatter of tags: x = releases (log), y = success rate.
 * opts: { rows, baseRate, selected, labelOf, fmt, t, onSelect, onHover }
 */
export function scatter(container, opts) {
  const { rows, baseRate, selected, labelOf, fmt, t, onSelect, animate = false } = opts;
  container.replaceChildren();
  if (!rows.length) return;

  const width = Math.max(320, container.clientWidth);
  const height = Math.round(Math.min(520, Math.max(320, width * 0.62)));
  const m = { top: 20, right: 20, bottom: 48, left: 52 };
  const iw = width - m.left - m.right;
  const ih = height - m.top - m.bottom;

  const xMin = Math.max(1, Math.min(...rows.map((r) => r.n)) * 0.85);
  const xMax = Math.max(...rows.map((r) => r.n)) * 1.15;
  const yMaxData = Math.max(...rows.map((r) => r.rate), baseRate * 2);
  const yTicks = niceLinearTicks(Math.min(1, yMaxData * 1.08));
  const yMax = yTicks.at(-1);
  const sx = (v) => m.left + ((Math.log10(v) - Math.log10(xMin)) / (Math.log10(xMax) - Math.log10(xMin))) * iw;
  const sy = (v) => m.top + ih - (v / yMax) * ih;

  const svg = el('svg', { viewBox: `0 0 ${width} ${height}`, width, height, class: animate ? 'chart enter' : 'chart', role: 'img' });
  svg.setAttribute('aria-label', t('scatterTitle'));
  container.appendChild(svg);

  // grid + axes
  const grid = el('g', { class: 'grid' }, svg);
  for (const v of yTicks) {
    el('line', { x1: m.left, x2: width - m.right, y1: sy(v), y2: sy(v) }, grid);
    text(grid, m.left - 8, sy(v) + 4, fmt.pct(v, 0), { class: 'tick', 'text-anchor': 'end' });
  }
  let lastTickX = -Infinity;
  for (const v of niceLogTicks(xMin, xMax)) {
    if (sx(v) - lastTickX < 40) continue; // keep tick labels apart on narrow screens
    lastTickX = sx(v);
    el('line', { x1: sx(v), x2: sx(v), y1: m.top, y2: m.top + ih }, grid);
    text(grid, sx(v), m.top + ih + 18, fmt.int(v), { class: 'tick', 'text-anchor': 'middle' });
  }
  el('line', { x1: m.left, x2: width - m.right, y1: m.top + ih, y2: m.top + ih, class: 'baseline' }, svg);
  text(svg, m.left + iw / 2, height - 8, t('axisReleases'), { class: 'axis-label', 'text-anchor': 'middle' });
  const yLabel = text(svg, 0, 0, t('axisRate'), { class: 'axis-label', 'text-anchor': 'middle' });
  yLabel.setAttribute('transform', `translate(14 ${m.top + ih / 2}) rotate(-90)`);

  // average line + quadrant hints
  const medianN = [...rows].map((r) => r.n).sort((a, b) => a - b)[rows.length >> 1];
  el('line', { x1: m.left, x2: width - m.right, y1: sy(baseRate), y2: sy(baseRate), class: 'ref-line' }, svg);
  text(svg, width - m.right - 4, sy(baseRate) - 6, t('average', { rate: fmt.pct(baseRate, 1) }), {
    class: 'ref-label',
    'text-anchor': 'end',
  });
  const qx = sx(medianN);
  // tint the "promising niches" quadrant: fewer releases than the median tag, above-average success
  el('rect', { x: m.left, y: m.top, width: Math.max(0, qx - m.left), height: Math.max(0, sy(baseRate) - m.top), class: 'quadrant-fill' }, grid);
  if (iw > 420) {
    text(svg, m.left + 6, m.top + 14, t('qNiche'), { class: 'quadrant' });
    text(svg, width - m.right - 6, m.top + 14, t('qCrowded'), { class: 'quadrant', 'text-anchor': 'end' });
    text(svg, width - m.right - 6, m.top + ih - 8, t('qSaturated'), { class: 'quadrant', 'text-anchor': 'end' });
    text(svg, m.left + 6, m.top + ih - 8, t('qCold'), { class: 'quadrant' });
  }
  el('line', { x1: qx, x2: qx, y1: m.top, y2: m.top + ih, class: 'ref-line ref-line--faint' }, svg);

  // dots: selected drawn last so it sits on top
  const pts = rows.map((r) => ({ r, x: sx(r.n), y: sy(r.rate) }));
  const dots = el('g', {}, svg);
  const ordered = [...pts].sort((a, b) => (a.r.key === selected) - (b.r.key === selected));
  ordered.forEach((p, k) => {
    const isSel = p.r.key === selected;
    const dot = el('circle', { cx: p.x, cy: p.y, r: isSel ? 7 : 4.5, class: `dot${isSel ? ' dot--selected' : ''}${selected != null && !isSel ? ' dot--muted' : ''}` }, dots);
    if (animate) dot.style.setProperty('--i', k);
  });

  // selective labels: best cautious rates + biggest markets + selected, skipping collisions
  const labelSet = new Set();
  const byWilson = [...pts].sort((a, b) => b.r.wilson - a.r.wilson).slice(0, 8);
  const byN = [...pts].sort((a, b) => b.r.n - a.r.n).slice(0, 4);
  const candidates = [...pts.filter((p) => p.r.key === selected), ...byWilson, ...byN];
  const boxes = [];
  const labels = el('g', {}, svg);
  for (const p of candidates) {
    if (labelSet.has(p.r.key)) continue;
    const label = labelOf(p.r);
    const w = label.length * 6.4 + 4;
    let x = p.x + 8;
    let anchor = 'start';
    if (x + w > width - m.right) {
      x = p.x - 8;
      anchor = 'end';
      if (x - w < 0 && p.r.key !== selected) continue; // fits on neither side
    }
    const box = { x1: anchor === 'start' ? x : x - w, x2: anchor === 'start' ? x + w : x, y1: p.y - 12, y2: p.y + 4 };
    if (p.r.key !== selected && boxes.some((b) => b.x1 < box.x2 && box.x1 < b.x2 && b.y1 < box.y2 && box.y1 < b.y2)) continue;
    boxes.push(box);
    labelSet.add(p.r.key);
    text(labels, x, p.y + 4, label, { class: `point-label${p.r.key === selected ? ' point-label--selected' : ''}`, 'text-anchor': anchor });
  }

  // nearest-point hover layer
  const hit = el('rect', { x: m.left, y: m.top, width: iw, height: ih, class: 'hit-layer' }, svg);
  const nearest = (evt) => {
    const box = svg.getBoundingClientRect();
    const px = ((evt.clientX - box.left) / box.width) * width;
    const py = ((evt.clientY - box.top) / box.height) * height;
    let best = null;
    let bestD = 24 * 24;
    for (const p of pts) {
      const d = (p.x - px) ** 2 + (p.y - py) ** 2;
      if (d < bestD) [best, bestD] = [p, d];
    }
    return best;
  };
  const hover = el('circle', { r: 9, class: 'dot-hover', visibility: 'hidden' }, svg);
  hit.addEventListener('pointermove', (evt) => {
    const p = nearest(evt);
    if (!p) {
      hover.setAttribute('visibility', 'hidden');
      hit.style.cursor = 'default';
      return hideTooltip();
    }
    hover.setAttribute('cx', p.x);
    hover.setAttribute('cy', p.y);
    hover.setAttribute('visibility', 'visible');
    hit.style.cursor = 'pointer';
    showTooltip(evt, labelOf(p.r), [
      [fmt.pct(p.r.rate, 1), t('colRate')],
      [fmt.int(p.r.hits), `${t('colHits')} / ${fmt.int(p.r.n)} ${t('colReleased').toLowerCase()}`],
      [fmt.pct(p.r.wilson, 1), t('colWilson')],
      [fmt.money(p.r.median), t('colMedian')],
    ]);
  });
  hit.addEventListener('pointerleave', () => {
    hover.setAttribute('visibility', 'hidden');
    hideTooltip();
  });
  hit.addEventListener('click', (evt) => {
    const p = nearest(evt);
    if (p) onSelect(p.r.key);
  });
}

/** Small column chart (one series) over months. */
export function columns(container, { data, value, label, fmt, t, locale, className = '', animate = false }) {
  container.replaceChildren();
  const width = Math.max(260, container.clientWidth);
  const height = 140;
  const m = { top: 12, right: 6, bottom: 24, left: 34 };
  const iw = width - m.left - m.right;
  const ih = height - m.top - m.bottom;
  const max = Math.max(1, ...data.map(value));
  const ticks = niceLinearTicks(max, 3);
  const yMax = ticks.at(-1);
  const band = iw / data.length;
  const bw = Math.min(24, band - 2);

  const svg = el('svg', { viewBox: `0 0 ${width} ${height}`, width, height, class: `chart ${className}${animate ? ' enter' : ''}`, role: 'img' });
  svg.setAttribute('aria-label', label);
  container.appendChild(svg);
  const grid = el('g', { class: 'grid' }, svg);
  for (const v of ticks) {
    const y = m.top + ih - (v / yMax) * ih;
    el('line', { x1: m.left, x2: width - m.right, y1: y, y2: y }, grid);
    text(grid, m.left - 6, y + 4, fmt.compact(v), { class: 'tick', 'text-anchor': 'end' });
  }
  const monthFmt = new Intl.DateTimeFormat(locale, { month: 'narrow', timeZone: 'UTC' });
  // long ranges: only label January, with the year, so labels never collide
  const long = data.length > 18;
  const tickLabel = (date) => (long ? (date.getUTCMonth() === 0 ? `'${String(date.getUTCFullYear()).slice(2)}` : '') : monthFmt.format(date));
  data.forEach((d, i) => {
    const v = value(d);
    const x = m.left + i * band + (band - bw) / 2;
    const h = (v / yMax) * ih;
    if (h > 0) {
      // 4px rounded data-end, square at the baseline
      const r = Math.min(4, h, bw / 2);
      const y = m.top + ih - h;
      const bar = el('path', { d: `M${x},${m.top + ih}V${y + r}Q${x},${y} ${x + r},${y}H${x + bw - r}Q${x + bw},${y} ${x + bw},${y + r}V${m.top + ih}Z`, class: 'bar' }, svg);
      if (animate) bar.style.setProperty('--i', i);
    }
    if (tickLabel(d.date)) text(svg, x + bw / 2, height - 8, tickLabel(d.date), { class: 'tick', 'text-anchor': 'middle' });
    const hitArea = el('rect', { x: m.left + i * band, y: m.top, width: band, height: ih, class: 'hit-layer' }, svg);
    const monthLong = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d.date);
    hitArea.addEventListener('pointermove', (evt) =>
      showTooltip(evt, monthLong, [
        [fmt.int(d.n), t('colReleased')],
        [fmt.int(d.hits), t('colHits')],
        [d.n ? fmt.pct(d.hits / d.n, 1) : '–', t('colRate')],
      ]),
    );
    hitArea.addEventListener('pointerleave', hideTooltip);
  });
  el('line', { x1: m.left, x2: width - m.right, y1: m.top + ih, y2: m.top + ih, class: 'baseline' }, svg);
}
