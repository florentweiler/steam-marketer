// Step 3: merge Gamalytic + Steam into the compact dataset the website loads (site/data/dataset.json).
// All aggregation (per tag, tag pairs, filters) happens client-side so visitors can slice freely.
import { join } from 'node:path';
import { RAW, ROOT, SITE_DATA, readJson, writeJson } from './lib.mjs';

const MAX_TAGS = 20;
const STEAM_TYPE_GAME = 0;

// Tags describing presentation or business model rather than what the game is; the site can hide them
const GENERIC_TAGS = new Set([
  'Indie', 'Singleplayer', 'Early Access', 'Great Soundtrack', 'Atmospheric', 'Beautiful', 'Addictive', 'Classic',
  'Masterpiece', 'Controller', 'Family Friendly', 'Free to Play', 'Replay Value', 'Immersive', 'Cult Classic',
  'Well-Written', 'Epic', 'Moddable', 'Steam Achievements', 'Steam Trading Cards', 'Remake', 'Remaster', 'Sequel',
  'Soundtrack', 'Great Visuals', 'Good Story', 'Fun', 'Kickstarter', 'Crowdfunded', 'Software', 'Utilities',
]);

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
for (const id of usedTags) {
  const n = tagNames[id] ?? {};
  tags[id] = { en: n.en ?? `#${id}`, fr: n.fr ?? n.en ?? `#${id}`, generic: GENERIC_TAGS.has(n.en) ? 1 : 0, ease: devEase[n.en] ?? null };
}

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
