const DAY = 86400e3;

export const PRICE_BANDS = [
  { id: 'all', min: 0, max: Infinity },
  { id: 'lt10', min: 0, max: 10, label: '< $10' },
  { id: '10-20', min: 10, max: 20, label: '$10–20' },
  { id: '20-40', min: 20, max: 40, label: '$20–40' },
  { id: '40+', min: 40, max: Infinity, label: '$40+' },
];

export function prepare(ds) {
  const g = ds.games;
  g.gross = g.copies.map((c, i) => c * g.price[i]);
  g.date = g.day.map((d) => new Date(ds.meta.from + d * DAY));
  const spanDays = Math.round((ds.meta.to - ds.meta.from) / DAY);
  return { ...ds, spanDays, count: g.appid.length };
}

const shiftYears = (ts, years) => {
  const d = new Date(ts);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.getTime();
};
const monthStart = (key) => Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, 1);
export const monthKeyOf = (ts) => new Date(ts).toISOString().slice(0, 7);

// Rolling 12-month windows ending at the data end, most recent first
export function rollingYears(ds) {
  const years = [];
  for (let end = ds.meta.to; shiftYears(end, -1) >= ds.meta.from - DAY; end = shiftYears(end, -1)) {
    years.push({ start: shiftYears(end, -1), end });
  }
  return years;
}

// Period presets offered in the UI, derived from the data window
export function periodPresets(ds) {
  const { from, to } = ds.meta;
  const presets = [];
  rollingYears(ds).forEach((y, k) => presets.push({ id: k === 0 ? 'last12' : `roll${k}`, group: 'rolling', ...y }));
  for (let n = 2; shiftYears(to, -n) >= from - DAY; n++) presets.push({ id: `last${n * 12}`, group: 'span', years: n, start: shiftYears(to, -n), end: to });
  for (let y = new Date(from).getUTCFullYear(); y <= new Date(to - DAY).getUTCFullYear(); y++) {
    const [start, end] = [Math.max(from, Date.UTC(y, 0, 1)), Math.min(to, Date.UTC(y + 1, 0, 1))];
    presets.push({ id: `cal${y}`, group: 'calendar', year: y, partial: end - start < 365 * DAY, start, end });
  }
  return presets;
}

// Selected period as [start, end) timestamps and day indices into the dataset
export function periodRange(ds, st) {
  const { from, to } = ds.meta;
  let start;
  let end;
  if (st.period === 'custom' && st.pFrom && st.pTo) {
    const [a, b] = st.pFrom <= st.pTo ? [st.pFrom, st.pTo] : [st.pTo, st.pFrom];
    const next = new Date(monthStart(b));
    next.setUTCMonth(next.getUTCMonth() + 1);
    [start, end] = [monthStart(a), next.getTime()];
  } else {
    const preset = periodPresets(ds).find((p) => p.id === st.period) ?? periodPresets(ds)[0];
    [start, end] = [preset.start, preset.end];
  }
  start = Math.max(from, start);
  end = Math.min(to, end);
  return { start, end, fromDay: Math.floor((start - from) / DAY), toDay: Math.floor((end - from) / DAY) };
}

// Indices of games passing the global filters
export function filterGames(ds, st, range = periodRange(ds, st)) {
  const g = ds.games;
  const band = PRICE_BANDS.find((b) => b.id === st.price) ?? PRICE_BANDS[0];
  const maxDay = Math.min(range.toDay, ds.spanDays - st.recent);
  const out = [];
  for (let i = 0; i < ds.count; i++) {
    if (g.day[i] < range.fromDay || g.day[i] >= maxDay) continue;
    if (!st.cls.includes(ds.classes[g.cls[i]])) continue;
    if (g.price[i] < band.min || g.price[i] >= band.max) continue;
    if (st.ea === 'only' && !g.ea[i]) continue;
    if (st.ea === 'no' && g.ea[i]) continue;
    out.push(i);
  }
  return out;
}

export function wilsonLow(hits, n, z = 1.96) {
  if (!n) return 0;
  const p = hits / n;
  const z2 = z * z;
  return (p + z2 / (2 * n) - z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / (1 + z2 / n);
}

export function median(sorted) {
  if (!sorted.length) return 0;
  const m = sorted.length >> 1;
  return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
}

export function summary(ds, idx, threshold) {
  let hits = 0;
  let gross = 0;
  for (const i of idx) {
    if (ds.games.gross[i] >= threshold) {
      hits++;
      gross += ds.games.gross[i];
    }
  }
  return { n: idx.length, hits, rate: idx.length ? hits / idx.length : 0, gross };
}

const SMALL_STUDIOS = new Set(['Hobbyist', 'Indie']);

// Ease of a row: the hardest scored tag wins (a co-op + puzzle game is as hard as co-op)
function easeOf(ds, ids) {
  const scores = ids.map((id) => ds.tags[id]?.ease).filter((e) => e != null);
  return scores.length ? Math.min(...scores) : null;
}

function finalize(ds, acc, baseRate) {
  const revs = acc.revs.sort((a, b) => b - a);
  const total = revs.reduce((s, r) => s + r, 0);
  const prices = acc.prices.sort((a, b) => a - b);
  const rate = acc.hits / acc.n;
  return {
    key: acc.key,
    ids: acc.ids,
    n: acc.n,
    hits: acc.hits,
    rate,
    wilson: wilsonLow(acc.hits, acc.n),
    lift: baseRate ? rate / baseRate : 0,
    median: median(revs),
    total,
    top3: total ? (revs[0] + (revs[1] ?? 0) + (revs[2] ?? 0)) / total : 0,
    price: median(prices),
    ease: easeOf(ds, acc.ids) ?? -1, // -1 sorts unscored rows last
    solo: acc.hits ? acc.soloHits / acc.hits : 0,
  };
}

function bump(ds, map, key, ids, i, threshold) {
  const g = ds.games;
  let acc = map.get(key);
  if (!acc) map.set(key, (acc = { key, ids, n: 0, hits: 0, soloHits: 0, revs: [], prices: [] }));
  acc.n++;
  if (g.gross[i] >= threshold) {
    acc.hits++;
    acc.revs.push(g.gross[i]);
    acc.prices.push(g.price[i]);
    if (g.selfPub[i] && SMALL_STUDIOS.has(ds.classes[g.cls[i]])) acc.soloHits++;
  }
}

const keepRow = (st) => (r) => r.n >= st.minN && (!st.minEase || r.ease >= st.minEase);

export function aggregateTags(ds, idx, st, baseRate) {
  const g = ds.games;
  const map = new Map();
  for (const i of idx) {
    const tags = g.tags[i];
    for (let k = 0; k < Math.min(st.topN, tags.length); k++) {
      if (st.hideGeneric && ds.tags[tags[k]].generic) continue;
      bump(ds, map, tags[k], [tags[k]], i, st.threshold);
    }
  }
  return [...map.values()].map((a) => finalize(ds, a, baseRate)).filter(keepRow(st));
}

export function aggregatePairs(ds, idx, st, baseRate, mustContain = null) {
  const g = ds.games;
  const map = new Map();
  for (const i of idx) {
    const tags = g.tags[i]
      .slice(0, st.topN)
      .filter((t) => !(st.hideGeneric && ds.tags[t].generic))
      .sort((a, b) => a - b);
    if (mustContain != null && !tags.includes(mustContain)) continue;
    for (let a = 0; a < tags.length; a++) {
      for (let b = a + 1; b < tags.length; b++) {
        if (mustContain != null && tags[a] !== mustContain && tags[b] !== mustContain) continue;
        bump(ds, map, tags[a] * 1e7 + tags[b], [tags[a], tags[b]], i, st.threshold);
      }
    }
  }
  return [...map.values()].filter((a) => a.n >= st.minN).map((a) => finalize(ds, a, baseRate)).filter(keepRow(st));
}

// Releases / hits / rate of a subset for each rolling year of the dataset (most recent first)
export function byRollingYear(ds, idx, threshold) {
  return rollingYears(ds).map((y) => {
    const fromDay = Math.floor((y.start - ds.meta.from) / DAY);
    const toDay = Math.floor((y.end - ds.meta.from) / DAY);
    let n = 0;
    let hits = 0;
    for (const i of idx) {
      if (ds.games.day[i] < fromDay || ds.games.day[i] >= toDay) continue;
      n++;
      if (ds.games.gross[i] >= threshold) hits++;
    }
    return { ...y, n, hits, rate: n ? hits / n : 0 };
  });
}

export function gamesWithTag(ds, idx, st, tagId) {
  return idx.filter((i) => ds.games.tags[i].slice(0, st.topN).includes(tagId));
}

// Per calendar month over the selected period: releases and hits, for a subset of games
export function monthly(ds, idx, threshold, range) {
  const start = new Date(range.start);
  const monthKey = (d) => (d.getUTCFullYear() - start.getUTCFullYear()) * 12 + d.getUTCMonth() - start.getUTCMonth();
  const count = monthKey(new Date(range.end - 1)) + 1;
  const months = Array.from({ length: count }, (_, m) => ({
    date: new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + m, 1)),
    n: 0,
    hits: 0,
  }));
  for (const i of idx) {
    const m = months[monthKey(ds.games.date[i])];
    if (!m) continue;
    m.n++;
    if (ds.games.gross[i] >= threshold) m.hits++;
  }
  return months;
}
