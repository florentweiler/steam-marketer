# SteamMarketer

**[steammarketer.com](https://steammarketer.com)**

**FR** · Quels genres de jeux marchent vraiment sur Steam ? Pour chaque tag Steam : combien de jeux payants sont sortis (la saturation) et quelle part a dépassé un seuil de chiffre d'affaires brut estimé (le taux de réussite), sur la période de ton choix parmi les 3 dernières années.

**EN** · Which game genres really sell on Steam? For every Steam tag: how many paid games were released (saturation) and what share passed an estimated gross revenue threshold (success rate), over any period within the last 3 years.

## Features

- Tag ranking by cautious success rate (95% Wilson lower bound), index vs average, median hit revenue, top-3 concentration
- Success rate vs saturation scatter; per-tag drawer with year-over-year index, monthly releases and hits, biggest hits, best companion tags
- Solo-dev ease: editorial 1–5 score per tag (`data/dev-ease.json`) plus the share of hits from self-published small studios
- Tag classes (`data/tag-classes.json`): praise and meta tags are hidden by default, style tags stay visible and labelled, everything else is a genre
- Two-tag combinations, searchable list of hits with Steam capsules, CSV export
- Filters: release period (rolling years, calendar years, custom months), studio size, price band, Early Access, recency, threshold, tags per game, minimum solo ease
- French / English, light / dark, shareable URLs (state lives in the hash)
- No dependencies, no build step, no tracking

## Usage

Requires Node.js ≥ 20.

```sh
npm run update   # fetch Gamalytic + Steam data (~15 min), build site/data/dataset.json, then check it
npm run check    # audit the built dataset on its own: integrity, tag table, per-tag counts on every
                 # period (recomputed independently), searchability, indicator coherence
npm run serve    # http://localhost:5173
```

The dataset is not committed: run `npm run update` once after cloning.
Default window: last 3 years. Custom window: `node scripts/fetch-gamalytic.mjs --years 5` (or `--from 2022-01-01 --to 2026-01-01`), then `npm run fetch:steam && npm run build`.

## Data sources & method

| Step | Source | Data |
|---|---|---|
| `fetch-gamalytic` | [Gamalytic](https://gamalytic.com) free public list | estimated copies sold, price, first release date, studio class |
| `fetch-steam` | Steam `IStoreBrowseService/GetItems`, `IStoreService/GetTagList` | user tags + weights, reviews, capsule images, FR/EN tag names (refreshed every 30 days) |
| `build-data` | `data/tag-classes.json`, `data/dev-ease.json` | keeps paid games under $150 (above that is $199.99 shovelware), joins, classifies tags, writes a column-oriented dataset |

Estimated gross = estimated copies × current USD price (before discounts, regional pricing, VAT, refunds and Steam's cut). Sales are lifetime totals, so older periods look better than recent ones; the index (tag rate ÷ same-period average) stays comparable. See the Methodology tab for all limitations.

Sales figures are third-party **estimates**, not official data. Not affiliated with Valve or Steam.

## Deployment

Self-hosted on a small VPS behind Caddy, with the data refreshed daily by a systemd timer. See [`deploy/README.md`](deploy/README.md).
The `site/` folder is fully static, so any static host works too once `site/data/dataset.json` is built.
