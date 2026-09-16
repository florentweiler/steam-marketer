import { METHOD, makeT } from './i18n.js';
import { columns, hideTooltip, scatter } from './charts.js';
import {
  PRICE_BANDS, aggregatePairs, aggregateTags, byRollingYear, filterGames, gamesWithTag, monthKeyOf, monthly, periodPresets,
  periodRange, prepare, summary,
} from './stats.js';

const CAPSULE_BASE = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/';
const THRESHOLDS = [50_000, 100_000, 250_000, 500_000, 1_000_000];
const RECENT = [0, 30, 60, 90];
const TOP_N = [3, 5, 10, 20];
const MIN_N = [10, 20, 30, 50, 100];
const MIN_EASE = [0, 2, 3, 4];
const PAGE = 50;

const DEFAULTS = {
  lang: navigator.language?.startsWith('fr') ? 'fr' : 'en',
  view: 'tags',
  cls: null, // all classes, filled once data is loaded
  price: 'all',
  ea: 'all',
  period: 'last12',
  pFrom: null,
  pTo: null,
  recent: 0,
  threshold: 100_000,
  topN: 10,
  minN: 20,
  minEase: 0,
  hideGeneric: true,
  tag: null,
  sort: 'wilson',
  dir: 'desc',
  q: '',
  pairTag: null,
};

let ds;
let st;
let t;
let fmt;
let gamesShown = PAGE;
let range; // selected period, recomputed on every render
let entering = false; // true on first load and when the tab or period changes: plays entrance animations
let lastScene = '';
let lastDrawerTag = null;
const kpiValues = new Map(); // previous KPI numbers, for the count-up
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (sel) => document.querySelector(sel);

// ---------- state <-> URL (shareable links) ----------

function readState() {
  const p = new URLSearchParams(location.hash.slice(1));
  const num = (k) => (p.has(k) ? Number(p.get(k)) : DEFAULTS[k]);
  return {
    ...DEFAULTS,
    lang: ['fr', 'en'].includes(p.get('lang')) ? p.get('lang') : DEFAULTS.lang,
    view: p.get('view') ?? DEFAULTS.view,
    cls: p.has('cls') ? p.get('cls').split(',').filter(Boolean) : ds.classes,
    price: p.get('price') ?? DEFAULTS.price,
    ea: p.get('ea') ?? DEFAULTS.ea,
    period: p.get('period') ?? DEFAULTS.period,
    pFrom: p.get('pFrom'),
    pTo: p.get('pTo'),
    recent: num('recent'),
    threshold: num('threshold'),
    topN: num('topN'),
    minN: num('minN'),
    minEase: num('minEase'),
    hideGeneric: p.has('generic') ? p.get('generic') === '0' : DEFAULTS.hideGeneric,
    tag: p.has('tag') ? Number(p.get('tag')) : null,
    sort: p.get('sort') ?? DEFAULTS.sort,
    dir: p.get('dir') ?? DEFAULTS.dir,
    q: p.get('q') ?? '',
    pairTag: p.has('pairTag') ? Number(p.get('pairTag')) : null,
  };
}

function writeState() {
  const p = new URLSearchParams();
  p.set('lang', st.lang);
  if (st.view !== DEFAULTS.view) p.set('view', st.view);
  if (st.cls.length !== ds.classes.length) p.set('cls', st.cls.join(','));
  for (const k of ['period', 'pFrom', 'pTo', 'price', 'ea', 'recent', 'threshold', 'topN', 'minN', 'minEase', 'sort', 'dir', 'q']) {
    if (st[k] !== DEFAULTS[k]) p.set(k, st[k]);
  }
  if (st.hideGeneric !== DEFAULTS.hideGeneric) p.set('generic', st.hideGeneric ? '0' : '1');
  if (st.tag != null) p.set('tag', st.tag);
  if (st.pairTag != null) p.set('pairTag', st.pairTag);
  history.replaceState(null, '', `#${p}`);
}

function update(patch, { resetPaging = true } = {}) {
  Object.assign(st, patch);
  if (resetPaging) gamesShown = PAGE;
  writeState();
  render();
}

// ---------- formatting ----------

function makeFmt(lang) {
  const locale = lang === 'fr' ? 'fr-FR' : 'en-US';
  const int = new Intl.NumberFormat(locale);
  const compact = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 });
  const money = new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 });
  const price = new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' });
  const date = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  return {
    locale,
    int: (v) => int.format(Math.round(v)),
    compact: (v) => compact.format(v),
    money: (v) => money.format(v),
    price: (v) => price.format(v),
    pct: (v, d = 1) => new Intl.NumberFormat(locale, { style: 'percent', minimumFractionDigits: d, maximumFractionDigits: d }).format(v),
    ratio: (v) => new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v),
    date: (d) => date.format(d),
  };
}

const tagName = (id) => ds.tags[id]?.[st.lang] ?? `#${id}`;
const rowLabel = (r) => r.ids.map(tagName).join(' + ');

function h(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (k === 'text') node.textContent = v;
    else if (k === 'class') node.className = v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null) node.append(c);
  return node;
}

// ---------- filters ----------

function select(label, value, options, onChange, hint) {
  return h(
    'label',
    { class: 'field', title: hint },
    h('span', { class: 'field-label', text: label }),
    h(
      'select',
      { onchange: (e) => onChange(e.target.value) },
      options.map(([v, text]) => h('option', { value: v, selected: String(v) === String(value), text })),
    ),
  );
}

function periodFilter() {
  const presets = periodPresets(ds);
  const monthFmt = new Intl.DateTimeFormat(fmt.locale, { month: 'short', year: 'numeric', timeZone: 'UTC' });
  const span = (p) => `${monthFmt.format(p.start)} → ${monthFmt.format(p.end - 86400e3)}`;
  const label = (p) => {
    if (p.id === 'last12') return `${t('periodLast12')} (${span(p)})`;
    if (p.group === 'rolling') return span(p);
    if (p.group === 'span') return t('periodLastYears', { n: p.years });
    return p.partial ? `${p.year} (${t('periodPartial')}, ${span(p)})` : String(p.year);
  };
  const groups = [
    ['rolling', t('periodRolling')],
    ['span', t('periodSpan')],
    ['calendar', t('periodCalendar')],
  ];
  const selectEl = h(
    'select',
    {
      onchange: (e) => {
        const v = e.target.value;
        if (v !== 'custom') return update({ period: v, pFrom: null, pTo: null });
        update({ period: 'custom', pFrom: monthKeyOf(range.start), pTo: monthKeyOf(range.end - 86400e3) });
      },
    },
    groups.map(([g, name]) =>
      h('optgroup', { label: name }, presets.filter((p) => p.group === g).map((p) => h('option', { value: p.id, selected: st.period === p.id, text: label(p) }))),
    ),
    h('option', { value: 'custom', selected: st.period === 'custom', text: t('periodCustom') }),
  );
  const fields = [h('label', { class: 'field' }, h('span', { class: 'field-label', text: t('fPeriod') }), selectEl)];
  if (st.period === 'custom') {
    const months = [];
    for (let d = new Date(ds.meta.from); d.getTime() < ds.meta.to; d.setUTCMonth(d.getUTCMonth() + 1, 1)) months.push(monthKeyOf(d.getTime()));
    const opts = months.map((m) => [m, monthFmt.format(Date.parse(`${m}-01T00:00:00Z`))]);
    fields.push(
      select(t('periodFrom'), st.pFrom, opts, (v) => update({ pFrom: v })),
      select(t('periodTo'), st.pTo, opts, (v) => update({ pTo: v })),
    );
  }
  return fields;
}

function renderFilters() {
  const bar = $('#filters');
  const classChips = h(
    'fieldset',
    { class: 'field chips' },
    h('legend', { class: 'field-label', text: t('fClass') }),
    ds.classes.map((c) =>
      h(
        'label',
        { class: 'chip' },
        h('input', {
          type: 'checkbox',
          checked: st.cls.includes(c),
          onchange: (e) => {
            const next = e.target.checked ? [...st.cls, c] : st.cls.filter((x) => x !== c);
            if (next.length) update({ cls: ds.classes.filter((x) => next.includes(x)) });
            else e.target.checked = true;
          },
        }),
        h('span', { text: t(`classNames.${c}`) === `classNames.${c}` ? c : t(`classNames.${c}`) }),
      ),
    ),
  );
  bar.replaceChildren(
    ...periodFilter(),
    classChips,
    select(t('fPrice'), st.price, PRICE_BANDS.map((b) => [b.id, b.label ?? t('fPriceAll')]), (v) => update({ price: v })),
    select(t('fEa'), st.ea, [['all', t('fEaAll')], ['only', t('fEaOnly')], ['no', t('fEaNo')]], (v) => update({ ea: v })),
    select(
      t('fRecent'),
      st.recent,
      RECENT.map((n) => [n, n ? t('fRecentExclude', { n }) : t('fRecentAll')]),
      (v) => update({ recent: Number(v) }),
    ),
    select(t('fThreshold'), st.threshold, THRESHOLDS.map((v) => [v, fmt.money(v)]), (v) => update({ threshold: Number(v) })),
    select(t('fTopN'), st.topN, TOP_N.map((n) => [n, String(n)]), (v) => update({ topN: Number(v) }), t('fTopNHint')),
    select(t('fMinN'), st.minN, MIN_N.map((n) => [n, String(n)]), (v) => update({ minN: Number(v) })),
    select(
      t('fMinEase'),
      st.minEase,
      MIN_EASE.map((n) => [n, n ? `≥ ${n}/5` : t('fMinEaseAll')]),
      (v) => update({ minEase: Number(v) }),
      t('help.colEase'),
    ),
    h(
      'label',
      { class: 'field toggle' },
      h('input', { type: 'checkbox', checked: st.hideGeneric, onchange: (e) => update({ hideGeneric: e.target.checked }) }),
      h('span', { text: t('fGeneric') }),
    ),
  );
}

// ---------- shared table ----------

function sortRows(rows, key, dir) {
  const m = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = a[key];
    const vb = b[key];
    if (typeof va === 'string') return m * va.localeCompare(vb, fmt.locale);
    return m * (va - vb) || b.n - a.n;
  });
}

function table({ columns: cols, rows, onRow, selectedKey, sortable = true }) {
  const head = h(
    'tr',
    {},
    cols.map((c) => {
      const active = st.sort === c.sort;
      const help = t(`help.${c.key}`);
      return h(
        'th',
        {
          class: cellClass(c, active),
          scope: 'col',
          'aria-sort': active ? (st.dir === 'asc' ? 'ascending' : 'descending') : null,
        },
        sortable && c.sort
          ? h(
              'button',
              {
                class: 'th-btn',
                title: help.startsWith('help.') ? null : help,
                onclick: () =>
                  update({ sort: c.sort, dir: active && st.dir === 'desc' ? 'asc' : active ? 'desc' : c.num ? 'desc' : 'asc' }),
              },
              t(c.key),
              active ? h('span', { class: 'sort-arrow', 'aria-hidden': 'true', text: st.dir === 'asc' ? ' ↑' : ' ↓' }) : null,
            )
          : t(c.key),
      );
    }),
  );
  const body = rows.map((r) =>
    h(
      'tr',
      {
        class: `${onRow ? 'clickable' : ''}${selectedKey != null && r.key === selectedKey ? ' selected' : ''}`,
        tabindex: onRow ? 0 : null,
        onclick: onRow ? () => onRow(r) : null,
        onkeydown: onRow ? (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onRow(r)) : null,
      },
      cols.map((c) => h('td', { class: cellClass(c) }, c.render(r))),
    ),
  );
  return h('div', { class: 'table-wrap' }, h('table', {}, h('thead', {}, head), h('tbody', {}, body)));
}

// p = display priority: p2+ columns are hidden when the table gets narrow (see style.css)
const cellClass = (c, active = false) => [c.num && 'num', active && 'sorted', c.p && `p${c.p}`].filter(Boolean).join(' ');

function csvButton(filename, cols, rows) {
  return h('button', {
    class: 'btn btn-ghost',
    text: t('exportCsv'),
    onclick: () => {
      const esc = (v) => `"${String(v).replaceAll('"', '""')}"`;
      const lines = [cols.map((c) => esc(t(c.key))), ...rows.map((r) => cols.map((c) => esc(c.csv ? c.csv(r) : r[c.sort])))];
      const blob = new Blob([lines.map((l) => l.join(',')).join('\n')], { type: 'text/csv' });
      const a = h('a', { href: URL.createObjectURL(blob), download: filename });
      a.click();
      URL.revokeObjectURL(a.href);
    },
  });
}

const statCols = () => [
  { key: 'colEase', sort: 'ease', num: true, render: (r) => easeDots(r.ease), csv: (r) => (r.ease > 0 ? r.ease : '') },
  { key: 'colReleased', sort: 'n', num: true, render: (r) => fmt.int(r.n) },
  { key: 'colHits', sort: 'hits', num: true, p: 5, render: (r) => fmt.int(r.hits) },
  { key: 'colRate', sort: 'rate', num: true, p: 2, render: (r) => fmt.pct(r.rate), csv: (r) => r.rate.toFixed(4) },
  { key: 'colWilson', sort: 'wilson', num: true, render: (r) => rateBar(r), csv: (r) => r.wilson.toFixed(4) },
  { key: 'colSolo', sort: 'solo', num: true, p: 2, render: (r) => (r.hits ? fmt.pct(r.solo, 0) : '–'), csv: (r) => r.solo.toFixed(3) },
  { key: 'colMedian', sort: 'median', num: true, p: 3, render: (r) => (r.hits ? fmt.money(r.median) : '–'), csv: (r) => Math.round(r.median) },
  { key: 'colLift', sort: 'lift', num: true, p: 3, render: (r) => fmt.ratio(r.lift), csv: (r) => r.lift.toFixed(3) },
  { key: 'colTop3', sort: 'top3', num: true, p: 4, render: (r) => (r.hits ? fmt.pct(r.top3, 0) : '–'), csv: (r) => r.top3.toFixed(3) },
  { key: 'colTotal', sort: 'total', num: true, p: 4, render: (r) => (r.hits ? fmt.money(r.total) : '–'), csv: (r) => Math.round(r.total) },
  { key: 'colPrice', sort: 'price', num: true, p: 4, render: (r) => (r.hits ? fmt.price(r.price) : '–') },
];

function easeDots(ease) {
  if (ease < 1) return h('span', { class: 'muted', title: t('easeUnscored'), text: '–' });
  return h(
    'span',
    { class: 'ease', title: `${ease}/5`, role: 'img', 'aria-label': `${ease}/5` },
    [1, 2, 3, 4, 5].map((k) => h('span', { class: k <= ease ? 'ease-dot on' : 'ease-dot' })),
  );
}

let maxWilson = 1;
function rateBar(r) {
  return h(
    'span',
    { class: 'rate-cell' },
    h('span', { class: 'rate-track', 'aria-hidden': 'true' }, h('span', { class: 'rate-fill', style: `width:${(r.wilson / maxWilson) * 100}%` })),
    h('span', { text: fmt.pct(r.wilson) }),
  );
}

function searchBox(placeholder, onInput) {
  const input = h('input', { type: 'search', class: 'search', placeholder, value: st.q, 'aria-label': placeholder });
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      update({ q: input.value });
      const again = document.querySelector('.search');
      again?.focus();
      again?.setSelectionRange(again.value.length, again.value.length);
    }, 200);
  });
  return input;
}

const matches = (q, ...fields) => !q || fields.some((f) => f?.toLowerCase().includes(q.toLowerCase()));

// ---------- views ----------

// Animates a number from its previous value (or 0 on first display) to the new one
function countUp(node, key, value, format) {
  const from = kpiValues.has(key) ? kpiValues.get(key) : 0;
  kpiValues.set(key, value);
  if (from === value || reducedMotion()) {
    node.textContent = format(value);
    return node;
  }
  const start = performance.now();
  const duration = 700;
  const step = (now) => {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - (1 - p) ** 3;
    node.textContent = format(from + (value - from) * eased);
    if (p < 1 && node.isConnected) requestAnimationFrame(step);
  };
  node.textContent = format(from);
  requestAnimationFrame(step);
  return node;
}

function kpis(sum) {
  const tile = (label, value, format, key) =>
    h('div', { class: 'kpi' }, h('div', { class: 'kpi-label', text: label }), countUp(h('div', { class: 'kpi-value' }), key, value, format));
  // comparing periods that aren't the most recent 12 months exposes the lifetime-sales age bias
  const isLast12 = range.end === ds.meta.to && range.end - range.start <= 366 * 86400e3;
  return h(
    'div',
    { class: 'kpis-wrap' },
    isLast12 ? null : h('p', { class: 'notice', role: 'note', text: `⚠ ${t('ageBias')}` }),
    h(
      'div',
      { class: 'kpis' },
      tile(t('kReleased'), sum.n, fmt.int, 'n'),
      tile(t('kHits', { threshold: fmt.money(st.threshold) }), sum.hits, fmt.int, 'hits'),
      tile(t('kRate'), sum.rate, (v) => fmt.pct(v), 'rate'),
      tile(t('kGross'), sum.gross, fmt.money, 'gross'),
    ),
  );
}

function card(title, sub, ...children) {
  return h(
    'section',
    { class: 'card' },
    h('div', { class: 'card-head' }, h('div', {}, h('h2', { text: title }), sub ? h('p', { class: 'card-sub', text: sub }) : null)),
    children,
  );
}

function renderTagsView(main, idx, sum) {
  const rows = aggregateTags(ds, idx, st, sum.rate);
  maxWilson = Math.max(0.0001, ...rows.map((r) => r.wilson));
  const selected = rows.some((r) => r.key === st.tag) ? st.tag : null;

  const chartBox = h('div', { class: 'chart-box' });
  const detail = h('aside', { class: 'drawer', 'aria-live': 'polite', 'aria-label': t('detailLabel') });
  const scatterCard = card(t('scatterTitle'), t('scatterSub'), chartBox);

  const cols = [{ key: 'colTag', sort: 'label', render: (r) => r.label }, ...statCols()];
  const labeled = rows.map((r) => ({ ...r, label: rowLabel(r) }));
  const visible = sortRows(labeled.filter((r) => matches(st.q, r.label)), st.sort, st.dir);
  const tableCard = card(
    t('tableTitle'),
    t('tableSub'),
    h('div', { class: 'toolbar' }, searchBox(t('searchTag')), csvButton('steam-tags.csv', cols, visible)),
    visible.length
      ? table({ columns: cols, rows: visible, selectedKey: selected, onRow: (r) => update({ tag: r.key === st.tag ? null : r.key }) })
      : h('p', { class: 'empty', text: t('noResult') }),
  );

  main.replaceChildren(kpis(sum), scatterCard, tableCard, detail);
  scatter(chartBox, {
    rows,
    baseRate: sum.rate,
    selected,
    labelOf: rowLabel,
    fmt,
    t,
    onSelect: (key) => update({ tag: key === st.tag ? null : key }),
    animate: entering,
  });
  renderDetail(detail, idx, selected, rows, sum);
}

function yearlyTable(yearly) {
  const monthFmt = new Intl.DateTimeFormat(fmt.locale, { month: 'short', year: '2-digit', timeZone: 'UTC' });
  return h(
    'table',
    { class: 'yearly' },
    h('thead', {}, h('tr', {}, [t('periodCol'), t('colReleased'), t('colHits'), t('colRate'), t('colLift')].map((c, k) => h('th', { class: k ? 'num' : '', text: c })))),
    h(
      'tbody',
      {},
      yearly.map((y) =>
        h(
          'tr',
          {},
          h('td', { text: `${monthFmt.format(y.start)} → ${monthFmt.format(y.end - 86400e3)}` }),
          h('td', { class: 'num', text: fmt.int(y.n) }),
          h('td', { class: 'num', text: fmt.int(y.hits) }),
          h('td', { class: 'num', text: y.n ? fmt.pct(y.rate) : '–' }),
          h('td', { class: 'num', text: y.n ? fmt.ratio(y.lift) : '–' }),
        ),
      ),
    ),
  );
}

function renderDetail(box, idx, tagId, rows, sum) {
  box.hidden = tagId == null;
  box.classList.toggle('drawer--enter', tagId != null && lastDrawerTag == null && !reducedMotion());
  const drawerOpening = tagId != null && lastDrawerTag !== tagId;
  lastDrawerTag = tagId;
  document.body.classList.toggle('drawer-open', tagId != null);
  if (tagId == null) return;
  const r = rows.find((x) => x.key === tagId);
  const tagIdx = gamesWithTag(ds, idx, st, tagId);
  const months = monthly(ds, tagIdx, st.threshold, range);
  // year-over-year ignores the period filter (other filters still apply); the index compares each year to that
  // year's own average, which cancels out the age bias between years
  const allIdx = filterGames(ds, st, { fromDay: 0, toDay: ds.spanDays });
  const baseYearly = byRollingYear(ds, allIdx, st.threshold);
  const yearly = byRollingYear(ds, gamesWithTag(ds, allIdx, st, tagId), st.threshold).map((y, k) => ({
    ...y,
    lift: baseYearly[k].rate ? y.rate / baseYearly[k].rate : 0,
  }));
  const g = ds.games;

  const stat = (label, value) => h('div', { class: 'mini-stat' }, h('div', { class: 'kpi-label', text: label }), h('div', { class: 'mini-value', text: value }));
  const relC = h('div');
  const hitC = h('div');

  const top = tagIdx
    .filter((i) => g.gross[i] >= st.threshold)
    .sort((a, b) => g.gross[b] - g.gross[a])
    .slice(0, 8);

  const companions = aggregatePairs(ds, idx, { ...st, minN: Math.max(5, Math.round(st.minN / 2)) }, sum.rate, tagId)
    .sort((a, b) => b.wilson - a.wilson)
    .slice(0, 8);

  box.replaceChildren(
    h(
      'div',
      { class: 'detail-head' },
      h('h2', { text: tagName(tagId) }),
      h('button', { class: 'btn btn-ghost btn-icon', 'aria-label': t('close'), title: t('close'), text: '×', onclick: () => update({ tag: null }) }),
    ),
    h(
      'div',
      { class: 'mini-stats' },
      stat(t('colReleased'), fmt.int(r.n)),
      stat(t('colHits'), fmt.int(r.hits)),
      stat(t('colRate'), fmt.pct(r.rate)),
      stat(t('colLift'), fmt.ratio(r.lift)),
      stat(t('colMedian'), r.hits ? fmt.money(r.median) : '–'),
      stat(t('colTop3'), r.hits ? fmt.pct(r.top3, 0) : '–'),
      h('div', { class: 'mini-stat' }, h('div', { class: 'kpi-label', text: t('colEase') }), h('div', { class: 'mini-value' }, easeDots(r.ease))),
      stat(t('colSolo'), r.hits ? fmt.pct(r.solo, 0) : '–'),
      stat(t('colTotal'), r.hits ? fmt.money(r.total) : '–'),
    ),
    yearly.length > 1 ? h('h3', { text: t('detailYearly') }) : null,
    yearly.length > 1 ? yearlyTable(yearly) : null,
    yearly.length > 1 ? h('p', { class: 'card-sub', text: t('yearlyNote') }) : null,
    h('h3', { text: t('detailReleases') }),
    relC,
    h('h3', { text: t('detailHits') }),
    hitC,
    h('h3', { text: t('detailTopGames') }),
    h('ol', { class: 'game-list' }, top.map((i) => gameItem(i))),
    h('button', { class: 'btn btn-ghost', text: `${t('seeAllGames')} →`, onclick: () => update({ view: 'games', q: '', pairTag: tagId }) }),
    companions.length ? h('h3', { text: t('detailCompanions') }) : null,
    companions.length ? h('p', { class: 'card-sub', text: t('detailCompanionsSub') }) : null,
    companions.length
      ? h(
          'ul',
          { class: 'companions' },
          companions.map((c) => {
            const other = c.ids.find((id) => id !== tagId);
            return h(
              'li',
              {},
              h('button', { class: 'link', text: tagName(other), onclick: () => update({ tag: other }) }),
              h('span', { class: 'muted', text: `${fmt.pct(c.rate)} · ${fmt.int(c.hits)}/${fmt.int(c.n)}` }),
            );
          }),
        )
      : null,
  );
  const common = { fmt, t, locale: fmt.locale, animate: drawerOpening && !reducedMotion() };
  columns(relC, { ...common, data: months, value: (d) => d.n, label: t('detailReleases'), className: 'muted-bars' });
  columns(hitC, { ...common, data: months, value: (d) => d.hits, label: t('detailHits') });
}

const storeUrl = (i) => `https://store.steampowered.com/app/${ds.games.appid[i]}/`;

// Steam small capsule (231×87); decorative, the game name always sits next to it
function capsule(i) {
  const g = ds.games;
  return g.capsule[i]
    ? h('img', { class: 'capsule', src: `${CAPSULE_BASE}${g.appid[i]}/${g.capsule[i]}`, alt: '', loading: 'lazy', width: 231, height: 87 })
    : h('span', { class: 'capsule capsule-placeholder' });
}

function gameItem(i) {
  const g = ds.games;
  return h(
    'li',
    {},
    h(
      'a',
      { class: 'game', href: storeUrl(i), target: '_blank', rel: 'noopener' },
      capsule(i),
      h('span', { class: 'game-name', text: g.name[i] }),
      h('span', { class: 'game-value', text: fmt.money(g.gross[i]) }),
    ),
  );
}

function renderPairsView(main, idx, sum) {
  lastDrawerTag = null;
  const topN = Math.min(st.topN, 10); // 45 pairs per game max keeps this instant
  const rows = aggregatePairs(ds, idx, { ...st, topN }, sum.rate, st.pairTag).map((r) => ({ ...r, label: rowLabel(r) }));
  maxWilson = Math.max(0.0001, ...rows.map((r) => r.wilson));
  const visible = sortRows(rows.filter((r) => matches(st.q, r.label)), st.sort, st.dir).slice(0, 500);
  const cols = [{ key: 'colPair', sort: 'label', render: (r) => r.label }, ...statCols()];

  const tagOptions = aggregateTags(ds, idx, { ...st, minN: st.minN }, sum.rate)
    .map((r) => [r.key, tagName(r.key)])
    .sort((a, b) => a[1].localeCompare(b[1], fmt.locale));

  main.replaceChildren(
    kpis(sum),
    card(
      t('pairsTitle'),
      t('pairsSub', { n: topN }),
      h(
        'div',
        { class: 'toolbar' },
        select(t('pairsContaining'), st.pairTag ?? '', [['', t('anyTag')], ...tagOptions], (v) => update({ pairTag: v === '' ? null : Number(v) })),
        searchBox(t('searchTag')),
        csvButton('steam-tag-pairs.csv', cols, visible),
      ),
      visible.length ? table({ columns: cols, rows: visible }) : h('p', { class: 'empty', text: t('noResult') }),
    ),
  );
}

function renderGamesView(main, idx, sum) {
  lastDrawerTag = null;
  const g = ds.games;
  let list = idx.filter((i) => g.gross[i] >= st.threshold);
  if (st.pairTag != null) list = list.filter((i) => g.tags[i].slice(0, st.topN).includes(st.pairTag));
  list = list.filter((i) => matches(st.q, g.name[i], g.dev[i]));
  const rows = list.map((i) => ({
    key: i,
    name: g.name[i],
    gross: g.gross[i],
    copies: g.copies[i],
    price: g.price[i],
    day: g.day[i],
    cls: ds.classes[g.cls[i]],
    reviews: g.reviews[i],
  }));
  const sortKey = ['name', 'gross', 'copies', 'price', 'day', 'reviews'].includes(st.sort) ? st.sort : 'gross';
  const sorted = sortRows(rows, sortKey, sortKey === st.sort ? st.dir : 'desc');

  const cols = [
    {
      key: 'colGame',
      sort: 'name',
      render: (r) =>
        h(
          'span',
          { class: 'game-row' },
          h(
            'a',
            { class: 'thumb', href: storeUrl(r.key), target: '_blank', rel: 'noopener', tabindex: -1, 'aria-hidden': 'true' },
            capsule(r.key),
          ),
          h(
            'span',
            { class: 'game-cell' },
            h('a', { href: storeUrl(r.key), target: '_blank', rel: 'noopener', text: r.name }),
            h('span', { class: 'muted small', text: [g.dev[r.key], ...g.tags[r.key].slice(0, 4).map(tagName)].filter(Boolean).join(' · ') }),
          ),
        ),
    },
    { key: 'colGross', sort: 'gross', num: true, render: (r) => fmt.money(r.gross), csv: (r) => Math.round(r.gross) },
    { key: 'colCopies', sort: 'copies', num: true, p: 3, render: (r) => fmt.int(r.copies) },
    { key: 'colGamePrice', sort: 'price', num: true, render: (r) => fmt.price(r.price) },
    { key: 'colReviews', sort: 'reviews', num: true, p: 3, render: (r) => fmt.int(r.reviews) },
    { key: 'colReleasedOn', sort: 'day', num: true, p: 2, render: (r) => fmt.date(g.date[r.key]), csv: (r) => g.date[r.key].toISOString().slice(0, 10) },
    { key: 'colClass', p: 4, render: (r) => t(`classNames.${r.cls}`) },
  ];

  const tagFilter =
    st.pairTag != null
      ? h(
          'span',
          { class: 'chip chip--active' },
          tagName(st.pairTag),
          h('button', { class: 'btn-icon', 'aria-label': t('close'), text: '×', onclick: () => update({ pairTag: null }) }),
        )
      : null;

  main.replaceChildren(
    kpis(sum),
    card(
      t('gamesTitle'),
      t('gamesSub', { n: fmt.int(sorted.length) }),
      h('div', { class: 'toolbar' }, tagFilter, searchBox(t('searchGame')), csvButton('steam-hits.csv', cols, sorted)),
      sorted.length ? table({ columns: cols, rows: sorted.slice(0, gamesShown) }) : h('p', { class: 'empty', text: t('noResult') }),
      sorted.length > gamesShown
        ? h('button', { class: 'btn btn-ghost more', text: t('showMore'), onclick: () => ((gamesShown += PAGE * 2), render()) })
        : null,
    ),
  );
}

// ---------- shell ----------

function renderHeader() {
  document.documentElement.lang = st.lang;
  document.title = `SteamMarketer · ${t('title')}`;
  $('#title').textContent = t('title');
  $('#subtitle').textContent = t('subtitle', { from: fmt.date(new Date(range.start)), to: fmt.date(new Date(range.end - 86400e3)) });
  $('#updated').textContent = t('updated', { date: fmt.date(new Date(ds.meta.fetchedAt)) });
  $('#footer-text').textContent = t('footer');
  const langBtn = $('#lang');
  langBtn.textContent = t('langSwitch');
  langBtn.onclick = () => update({ lang: st.lang === 'fr' ? 'en' : 'fr' });

  $('#footer-legal').replaceChildren(
    t('footerLegal'),
    ' · ',
    h('a', { class: 'link', href: 'https://github.com/florentweiler/steam-marketer', target: '_blank', rel: 'noopener', text: t('sourceCode') }),
  );

  // tabs are built once so the indicator can slide between them
  const tabs = $('#tabs');
  if (!tabs.childElementCount) {
    tabs.append(
      ...VIEWS.map((v) =>
        h('button', {
          class: 'tab',
          role: 'tab',
          'data-view': v,
          onclick: () => update({ view: v, q: '', sort: v === 'games' ? 'gross' : 'wilson', dir: 'desc' }),
        }),
      ),
      h('span', { class: 'tab-indicator', 'aria-hidden': 'true' }),
    );
  }
  for (const btn of tabs.querySelectorAll('.tab')) {
    const v = btn.dataset.view;
    btn.textContent = t(`tab${v[0].toUpperCase()}${v.slice(1)}`);
    btn.setAttribute('aria-selected', st.view === v ? 'true' : 'false');
  }
  requestAnimationFrame(() => {
    const active = tabs.querySelector('[aria-selected="true"]');
    const indicator = tabs.querySelector('.tab-indicator');
    indicator.style.width = `${active.offsetWidth}px`;
    indicator.style.transform = `translateX(${active.offsetLeft}px)`;
  });
}

const VIEWS = ['tags', 'pairs', 'games', 'method'];

function render() {
  t = makeT(st.lang);
  fmt = makeFmt(st.lang);
  hideTooltip();
  range = periodRange(ds, st);
  const scene = [st.view, st.period, st.pFrom, st.pTo].join('|');
  entering = scene !== lastScene && !reducedMotion();
  lastScene = scene;
  $('#main').classList.toggle('reveal', entering);
  document.body.classList.remove('drawer-open');
  renderHeader();
  renderFilters();
  const main = $('#main');
  $('#filters').hidden = st.view === 'method';
  if (st.view === 'method') {
    lastDrawerTag = null;
    main.replaceChildren();
    const article = h('article', { class: 'card prose' });
    article.innerHTML = METHOD[st.lang]; // static trusted markup from i18n.js
    main.append(article);
    return;
  }
  const idx = filterGames(ds, st, range);
  const sum = summary(ds, idx, st.threshold);
  if (st.view === 'pairs') renderPairsView(main, idx, sum);
  else if (st.view === 'games') renderGamesView(main, idx, sum);
  else renderTagsView(main, idx, sum);
}

function setupTheme() {
  const root = document.documentElement;
  try {
    const saved = localStorage.getItem('theme');
    if (saved) root.dataset.theme = saved;
  } catch {}
  $('#theme').onclick = () => {
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try {
      localStorage.setItem('theme', root.dataset.theme);
    } catch {}
  };
}

async function main() {
  setupTheme();
  const status = $('#main');
  const lang = DEFAULTS.lang;
  status.textContent = makeT(new URLSearchParams(location.hash.slice(1)).get('lang') ?? lang)('loading');
  try {
    const res = await fetch('data/dataset.json');
    if (!res.ok) throw new Error(res.status);
    ds = prepare(await res.json());
  } catch (err) {
    status.textContent = `${makeT(lang)('loadError')} (${err.message})`;
    return;
  }
  st = readState();
  render();
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && st.tag != null && st.view === 'tags') update({ tag: null });
  });
  let resizeTimer;
  let lastWidth = 0;
  new ResizeObserver(([entry]) => {
    if (Math.abs(entry.contentRect.width - lastWidth) < 1) return;
    lastWidth = entry.contentRect.width;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => render(), 150);
  }).observe($('#main'));
}

main();
