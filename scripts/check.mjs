// Contrôle automatisé du jeu de données et de ce que le site en montre : `npm run check`.
// Il exerce le code réellement livré (site/js/stats.js), pas une réimplémentation, et refait
// indépendamment les comptages tag par tag, période par période. Sortie non nulle si un test échoue.
//
// Écrit après un test manuel qui a trouvé en une manipulation trois défauts qu'un audit de chiffres
// avait laissés passer : chercher « Tir et extraction » sur 2025 ne renvoyait rien.
import { join } from 'node:path';
import { ROOT, SITE_DATA, readJson } from './lib.mjs';
import { aggregateTags, filterGames, keptTags, matches, periodPresets, periodRange, prepare, summary, wilsonLow } from '../site/js/stats.js';

const DAY = 86400e3;
let failures = 0;
let checks = 0;
const ok = (cond, label, detail = '') => {
  checks++;
  if (!cond) {
    failures++;
    console.error(`  ECHEC  ${label}${detail ? ` — ${detail}` : ''}`);
  }
  return cond;
};
const section = (name) => console.log(`\n== ${name} ==`);

const ds = prepare(await readJson(join(SITE_DATA, 'dataset.json'), null) ?? {});
if (!ds.games) {
  console.error('site/data/dataset.json introuvable : lance `npm run build` d’abord.');
  process.exit(2);
}
const g = ds.games;
const N = ds.count;
const tagIds = Object.keys(ds.tags).map(Number);

// ---------- 1. Intégrité du jeu de données ----------
section('Intégrité du jeu de données');
ok(N === ds.meta.games, 'meta.games correspond au nombre de lignes', `${ds.meta.games} vs ${N}`);
ok(new Set(g.appid).size === N, 'aucun appid en double', `${N - new Set(g.appid).size} doublons`);
ok(
  g.tags.every((t) => new Set(t).size === t.length),
  'aucun tag en double dans un même jeu',
);
ok(g.tags.every((t) => t.length <= 20), 'au plus 20 tags par jeu');
ok(
  g.day.every((d) => d >= 0 && d <= ds.spanDays),
  'toutes les dates tombent dans la fenêtre',
);
ok(g.price.every((p) => p > 0 && p < 150), 'tous les prix sont dans ]0, 150[', `max ${Math.max(...g.price)}`);
ok(g.copies.every((c) => c >= 0), 'aucun nombre de copies négatif');
ok(
  g.cls.every((c) => ds.classes[c] !== undefined),
  'toutes les classes de studio sont résolues',
);
ok(
  g.tags.every((t) => t.every((id) => ds.tags[id])),
  'tout tag référencé existe dans la table des tags',
);

// ---------- 2. Table des tags ----------
section('Table des tags');
const steamTags = await readJson(join(ROOT, 'data', 'raw', 'tags.json'), {});
const knownNames = new Set(Object.values(steamTags).map((n) => (n.en ?? '').trim()));
const classes = await readJson(join(ROOT, 'data', 'tag-classes.json'), {});
const ease = (await readJson(join(ROOT, 'data', 'dev-ease.json'), {})).scores ?? {};
const classed = ['praise', 'meta', 'style'].flatMap((k) => classes[k] ?? []);

ok(classed.every((n) => knownNames.has(n)), 'toute entrée de tag-classes.json correspond à un tag Steam',
  classed.filter((n) => !knownNames.has(n)).join(', '));
ok(Object.keys(ease).every((n) => knownNames.has(n)), 'toute clé de dev-ease.json correspond à un tag Steam',
  Object.keys(ease).filter((n) => !knownNames.has(n)).join(', '));
ok(new Set(classed).size === classed.length, 'aucun tag classé deux fois');
const hidden = new Set(tagIds.filter((id) => ds.tags[id].generic).map((id) => ds.tags[id].en));
ok(!Object.keys(ease).some((n) => hidden.has(n)), 'aucune note de facilité sur un tag masqué',
  Object.keys(ease).filter((n) => hidden.has(n)).join(', '));
ok(tagIds.every((id) => ds.tags[id].en.trim() === ds.tags[id].en && ds.tags[id].fr.trim() === ds.tags[id].fr),
  'aucun libellé avec espace parasite');
ok(tagIds.every((id) => ds.tags[id].en && !ds.tags[id].en.startsWith('#')), 'aucun libellé anglais manquant');
ok(tagIds.every((id) => ds.tags[id].ease === null || (ds.tags[id].ease >= 1 && ds.tags[id].ease <= 5)),
  'les notes de facilité sont dans 1..5');
for (const lang of ['fr', 'en']) {
  const seen = new Map();
  for (const id of tagIds) seen.set(ds.tags[id][lang], (seen.get(ds.tags[id][lang]) ?? 0) + 1);
  const dup = [...seen].filter(([, n]) => n > 1).map(([l]) => l);
  ok(dup.length === 0, `aucun libellé ${lang} en double (deux lignes indistinguables)`, dup.join(', '));
}

// ---------- 3. Agrégation : chaque tag, chaque période ----------
// Recomptage indépendant, sans passer par aggregateTags, pour toutes les périodes proposées par l'UI.
section('Agrégation, tag par tag, sur toutes les périodes');
const baseState = {
  pFrom: null, pTo: null, price: 'all', ea: 'all', recent: 0, threshold: 100_000,
  topN: 10, minN: 10, minEase: 0, hideGeneric: true, cls: ds.classes, q: '',
};
const periods = periodPresets(ds).map((p) => p.id);
let mismatches = 0;
let searchMisses = 0;
let emptyPeriods = 0;
for (const period of periods) {
  const st = { ...baseState, period };
  const range = periodRange(ds, st);
  const idx = filterGames(ds, st, range);
  if (!idx.length) { emptyPeriods++; continue; }
  const sum = summary(ds, idx, st.threshold);

  // recomptage indépendant
  const expect = new Map();
  for (const i of idx) {
    for (const id of keptTags(ds, g.tags[i], st)) {
      const e = expect.get(id) ?? { n: 0, hits: 0 };
      e.n++;
      if (g.copies[i] * g.price[i] >= st.threshold) e.hits++;
      expect.set(id, e);
    }
  }
  const rows = aggregateTags(ds, idx, { ...st, minN: 1 }, sum.rate);
  if (!ok(rows.length === expect.size, `${period} : même nombre de tags`, `${rows.length} vs ${expect.size}`)) continue;
  for (const r of rows) {
    const e = expect.get(r.key);
    const good = e && e.n === r.n && e.hits === r.hits
      && Math.abs(r.rate - e.hits / e.n) < 1e-12
      && Math.abs(r.wilson - wilsonLow(e.hits, e.n)) < 1e-12;
    if (!good) {
      mismatches++;
      if (mismatches <= 5) console.error(`  ECHEC  ${period} / ${ds.tags[r.key].en}: n=${r.n}/${e?.n} hits=${r.hits}/${e?.hits}`);
    }
    // ce que l'utilisateur tape doit ramener ce tag : nom français et nom anglais
    const fr = ds.tags[r.key].fr;
    const en = ds.tags[r.key].en;
    for (const q of [fr, en, fr.toLowerCase(), en.toLowerCase()]) {
      if (!matches(q, fr, en)) {
        searchMisses++;
        if (searchMisses <= 5) console.error(`  ECHEC  ${period} : « ${q} » ne retrouve pas ${en}`);
      }
    }
  }
}
checks += 2;
if (mismatches) { failures++; console.error(`  ECHEC  ${mismatches} écarts de comptage`); }
if (searchMisses) { failures++; console.error(`  ECHEC  ${searchMisses} tags introuvables par leur propre nom`); }
console.log(`  ${periods.length - emptyPeriods} périodes contrôlées, ${tagIds.length} tags, recomptage indépendant`);

// ---------- 4. Le piège du seuil : un tag réel doit rester trouvable ----------
section('Trouvabilité sous le seuil');
let unreachable = 0;
for (const period of periods) {
  const st = { ...baseState, period };
  const range = periodRange(ds, st);
  const idx = filterGames(ds, st, range);
  if (!idx.length) continue;
  const sum = summary(ds, idx, st.threshold);
  const all = aggregateTags(ds, idx, { ...st, minN: 1, minEase: 0 }, sum.rate); // ce que voit une recherche
  const present = new Set();
  for (const i of idx) for (const id of keptTags(ds, g.tags[i], st)) present.add(id);
  for (const id of present) {
    if (!all.some((r) => r.key === id)) {
      unreachable++;
      if (unreachable <= 5) console.error(`  ECHEC  ${period} : ${ds.tags[id].en} existe mais aucune recherche ne le ramène`);
    }
  }
}
checks++;
if (unreachable) { failures++; } else console.log('  tout tag présent sur une période y est atteignable par la recherche');

// ---------- 5. Cohérence des indicateurs ----------
section('Cohérence des indicateurs');
const st12 = { ...baseState, period: 'last12' };
const idx12 = filterGames(ds, st12, periodRange(ds, st12));
const sum12 = summary(ds, idx12, st12.threshold);
const rows12 = aggregateTags(ds, idx12, { ...st12, minN: 1 }, sum12.rate);
ok(rows12.every((r) => r.hits <= r.n), 'jamais plus de succès que de sorties');
ok(rows12.every((r) => r.wilson <= r.rate + 1e-12), 'la borne prudente ne dépasse jamais le taux brut');
ok(rows12.every((r) => r.top3 >= -1e-12 && r.top3 <= 1 + 1e-12), 'la part top 3 reste dans [0, 1]');
ok(rows12.every((r) => r.median >= 0 && r.total >= 0), 'médiane et total positifs');
ok(rows12.every((r) => r.hits === 0 || r.median > 0), 'un tag avec des succès a une médiane non nulle');
ok(rows12.every((r) => r.ease === -1 || (r.ease >= 1 && r.ease <= 5)), 'facilité dans 1..5 ou -1');
ok(Math.abs(sum12.rate - sum12.hits / sum12.n) < 1e-12, 'le taux global est cohérent');
ok(rows12.every((r) => Math.abs(r.lift - r.rate / sum12.rate) < 1e-9), 'l’indice vaut bien taux ÷ taux global');

// Valeurs de référence de la borne de Wilson (calculateur standard, 95 %)
for (const [hits, n, expected] of [[10, 100, 0.0552], [50, 50, 0.9286], [2, 3, 0.2077], [0, 50, 0]]) {
  ok(Math.abs(wilsonLow(hits, n) - expected) < 5e-4, `Wilson ${hits}/${n} ≈ ${expected}`, wilsonLow(hits, n).toFixed(4));
}

console.log(`\n${failures ? 'ECHEC' : 'OK'} — ${checks - failures}/${checks} contrôles passés`);
process.exit(failures ? 1 : 0);
