import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const RAW = join(ROOT, 'data', 'raw');
export const SITE_DATA = join(ROOT, 'site', 'data');

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

// Write to a temp file then rename, so the live site never serves a half-written file
export async function writeJson(path, data, pretty = false) {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, pretty ? 1 : 0));
  await rename(tmp, path);
}

// fetch JSON with retries and exponential backoff (Steam and Gamalytic both rate-limit)
export async function fetchJson(url, { retries = 5, label = url } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'steam-genre-market-research (open data project)' } });
      if (res.ok) return await res.json();
      if (res.status !== 429 && res.status < 500) throw new Error(`HTTP ${res.status}`);
      throw new Error(`HTTP ${res.status} (retryable)`);
    } catch (err) {
      if (attempt >= retries || /HTTP 4\d\d$/.test(err.message)) throw new Error(`${label}: ${err.message}`);
      const wait = 2000 * 2 ** attempt;
      console.warn(`  ${label}: ${err.message}, retry in ${wait / 1000}s`);
      await sleep(wait);
    }
  }
}

// Analysis window: the last 3 years ending today, overridable with --from / --to (YYYY-MM-DD) or --years N
export function getWindow(argv = process.argv) {
  const arg = (name) => {
    const i = argv.indexOf(`--${name}`);
    return i > -1 ? argv[i + 1] : undefined;
  };
  const to = arg('to') ? Date.parse(arg('to')) : Date.parse(new Date().toISOString().slice(0, 10));
  const start = new Date(to);
  start.setUTCFullYear(start.getUTCFullYear() - Number(arg('years') ?? 3));
  const from = arg('from') ? Date.parse(arg('from')) : start.getTime();
  return { from, to };
}
