// Step 2: enrich paid games with official Steam data (user tags + weights, reviews) and localized tag names.
// Resumable: fetched apps are cached in data/raw/steam-items.json and refreshed once they are older than MAX_AGE,
// since player tags and review counts keep evolving after release.
import { join } from 'node:path';
import { RAW, fetchJson, readJson, sleep, writeJson } from './lib.mjs';

const BATCH = 200;
const MAX_AGE = 30 * 86400e3;
const API = 'https://api.steampowered.com';
const refresh = process.argv.includes('--refresh');

const { games } = await readJson(join(RAW, 'gamalytic.json'), {});
if (!games) throw new Error('Run fetch-gamalytic first');

const cachePath = join(RAW, 'steam-items.json');
const cache = refresh ? {} : await readJson(cachePath, {});
const stale = (entry) => !entry || Date.now() - (entry.at ?? 0) > MAX_AGE;
const todo = games.filter((g) => g.price > 0 && stale(cache[g.appid])).map((g) => g.appid);
console.log(`Steam: ${todo.length} apps to fetch (${Object.keys(cache).length} cached)`);

for (let i = 0; i < todo.length; i += BATCH) {
  const ids = todo.slice(i, i + BATCH).map((appid) => ({ appid }));
  const input = {
    ids,
    context: { language: 'english', country_code: 'US' },
    data_request: { include_tag_count: 20, include_reviews: true, include_assets: true },
  };
  const data = await fetchJson(`${API}/IStoreBrowseService/GetItems/v1/?input_json=${encodeURIComponent(JSON.stringify(input))}`, {
    label: `batch ${i / BATCH + 1}`,
  });
  for (const item of data.response?.store_items ?? []) {
    cache[item.appid ?? item.id] = {
      at: Date.now(),
      ok: item.success === 1,
      type: item.type,
      tags: (item.tags ?? []).map((t) => [t.tagid, t.weight]),
      reviews: item.reviews?.summary_filtered?.review_count ?? 0,
      positive: item.reviews?.summary_filtered?.percent_positive ?? null,
      capsule: item.assets?.small_capsule ? item.assets.asset_url_format.replace('${FILENAME}', item.assets.small_capsule) : null,
    };
  }
  console.log(`  ${Math.min(i + BATCH, todo.length)}/${todo.length}`);
  if ((i / BATCH) % 10 === 9) await writeJson(cachePath, cache);
  await sleep(1200);
}
await writeJson(cachePath, cache);

const tagNames = {};
for (const lang of ['english', 'french']) {
  const data = await fetchJson(`${API}/IStoreService/GetTagList/v1/?language=${lang}`);
  for (const { tagid, name } of data.response.tags) (tagNames[tagid] ??= {})[lang === 'english' ? 'en' : 'fr'] = name;
}
await writeJson(join(RAW, 'tags.json'), tagNames);
console.log(`Saved ${Object.keys(cache).length} apps, ${Object.keys(tagNames).length} tags`);
