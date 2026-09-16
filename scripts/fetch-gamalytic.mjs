// Step 1: list every game first released on Steam inside the window, with Gamalytic's sales estimate.
import { join } from 'node:path';
import { RAW, fetchJson, getWindow, sleep, writeJson } from './lib.mjs';

const { from, to } = getWindow();
const PAGE = 1000;
console.log(`Gamalytic: games released ${new Date(from).toISOString().slice(0, 10)} → ${new Date(to).toISOString().slice(0, 10)}`);

// date_min filters on the latest release date (EA exit), so it returns a superset we narrow on firstReleaseDate
const games = [];
for (let page = 0; ; page++) {
  const url = `https://api.gamalytic.com/steam-games/list?limit=${PAGE}&page=${page}&date_min=${from}&date_max=${to}`;
  const data = await fetchJson(url, { label: `page ${page}` });
  games.push(...data.result);
  console.log(`  page ${page + 1}/${data.pages} (${games.length})`);
  if (!data.result.length || page >= data.pages - 1) break;
  await sleep(500);
}

const kept = games
  .filter((g) => g.firstReleaseDate >= from && g.firstReleaseDate < to && !g.unreleased)
  .map((g) => ({
    appid: g.steamId,
    name: g.name,
    copies: g.copiesSold ?? 0,
    price: g.price ?? 0,
    released: g.firstReleaseDate,
    earlyAccess: !!g.earlyAccess,
    cls: g.publisherClass ?? 'Unknown',
    dev: g.developers?.[0] ?? '',
    pub: g.publishers?.[0] ?? '',
    score: g.reviewScore ?? null,
  }));

await writeJson(join(RAW, 'gamalytic.json'), { from, to, fetchedAt: Date.now(), games: kept });
console.log(`Saved ${kept.length} games (${kept.filter((g) => g.price > 0).length} paid)`);
