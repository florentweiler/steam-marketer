// Step 3: merge Gamalytic + Steam into the compact dataset the website loads (site/data/dataset.json).
// All aggregation (per tag, tag pairs, filters) happens client-side so visitors can slice freely.
import { join } from 'node:path';
import { RAW, ROOT, SITE_DATA, readJson, writeJson } from './lib.mjs';

const MAX_TAGS = 20;
const STEAM_TYPE_GAME = 0;

// Editorial tag classes live in data/tag-classes.json (praise / meta / style); everything else is a genre.
// Only 'praise' and 'meta' are hidden by the site's "hide generic tags" box — see that file for the rule.
// Fail loudly rather than quietly ship a dataset where nothing is classified: a missing file here
// would leave every praise and meta tag visible, and nobody would notice for weeks.
const tagClasses = await readJson(join(ROOT, 'data', 'tag-classes.json'), null);
if (!tagClasses?.hiddenKinds) throw new Error('data/tag-classes.json missing or malformed');
const HIDDEN_KINDS = new Set(tagClasses.hiddenKinds ?? []);
const KIND = new Map();
for (const kind of ['praise', 'meta', 'style']) for (const name of tagClasses[kind] ?? []) KIND.set(name, kind);

const { from, to, fetchedAt, games } = await readJson(join(RAW, 'gamalytic.json'), {});
const steam = await readJson(join(RAW, 'steam-items.json'), {});
const tagNames = await readJson(join(RAW, 'tags.json'), {});
const devEase = (await readJson(join(ROOT, 'data', 'dev-ease.json'), {})).scores ?? {};
if (!games) throw new Error('Run the fetch scripts first');

const DAY = 86400e3;
const rows = [];
let dropped = { free: 0, noSteam: 0, notGame: 0 };
for (const g of games) {
  if (!(g.price > 0)) { dropped.free++; continue; }
  const s = steam[g.appid];
  if (!s?.ok) { dropped.noSteam++; continue; }
  if (s.type !== STEAM_TYPE_GAME) { dropped.notGame++; continue; }
  const tags = [...s.tags].sort((a, b) => b[1] - a[1]).slice(0, MAX_TAGS).map(([id]) => id);
  rows.push({ ...g, tags, reviews: s.reviews, positive: s.positive, capsule: s.capsule });
}

const classes = [...new Set(rows.map((r) => r.cls))].sort();
const usedTags = new Set(rows.flatMap((r) => r.tags));
const tags = {};
// Steam ships a couple of tag labels with a trailing space ('Parody ', 'Dystopian '), which silently
// breaks every name-keyed lookup (classes, ease scores). Trim once, here.
for (const id of usedTags) {
  const n = tagNames[id] ?? {};
  const en = (n.en ?? `#${id}`).trim();
  const kind = KIND.get(en) ?? 'genre';
  tags[id] = { en, fr: (n.fr ?? n.en ?? `#${id}`).trim(), kind, generic: HIDDEN_KINDS.has(kind) ? 1 : 0, ease: devEase[en] ?? null };
}

// A renamed or mistyped entry in tag-classes.json would silently stop matching: say so instead.
const knownNames = new Set(Object.values(tagNames).map((n) => (n.en ?? '').trim()));
const unknown = [...KIND.keys()].filter((name) => !knownNames.has(name));
if (unknown.length) console.warn(`tag-classes.json: ${unknown.length} entr(y|ies) match no Steam tag:`, unknown.join(', '));

// Column-oriented to keep the JSON small. Display-only fields (name, studio, image, reviews) are kept only for
// games the site can list, i.e. above the lowest selectable success threshold.
const LISTED_MIN_GROSS = 50_000;
const listed = (r) => r.copies * r.price >= LISTED_MIN_GROSS;
const col = (fn) => rows.map(fn);
const listedCol = (fn, empty) => rows.map((r) => (listed(r) ? fn(r) : empty));
const dataset = {
  meta: {
    from, to, fetchedAt, builtAt: Date.now(),
    games: rows.length, dropped,
    sources: ['Gamalytic public list (copies sold estimates)', 'Steam IStoreBrowseService (tags, reviews)'],
  },
  classes,
  tags,
  games: {
    appid: col((r) => r.appid),
    name: listedCol((r) => r.name, ''),
    dev: listedCol((r) => r.dev, ''),
    price: col((r) => r.price),
    copies: col((r) => r.copies),
    day: col((r) => Math.floor((r.released - from) / DAY)),
    ea: col((r) => (r.earlyAccess ? 1 : 0)),
    // self-published: developer is its own publisher
    selfPub: col((r) => (!r.pub || r.pub.toLowerCase() === r.dev.toLowerCase() ? 1 : 0)),
    cls: col((r) => classes.indexOf(r.cls)),
    tags: col((r) => r.tags),
    reviews: listedCol((r) => r.reviews, 0),
    capsule: listedCol((r) => r.capsule?.replace(/^steam\/apps\/\d+\//, '') ?? '', ''),
  },
};

await writeJson(join(SITE_DATA, 'dataset.json'), dataset);
const hits = rows.filter((r) => r.copies * r.price >= 100_000).length;
console.log(`dataset.json: ${rows.length} paid games, ${hits} ≥ $100k gross, ${Object.keys(tags).length} tags. Dropped:`, dropped);
