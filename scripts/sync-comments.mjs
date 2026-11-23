#!/usr/bin/env node
// Sync social replies from Zernio into data/comments/*.json (build-time discussion).
// Node 20, built-ins only. Never logs the API key or any request header.
import { readFileSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ZERNIO = 'https://getlate.dev/api/v1';
const PLATFORM_ORDER = ['x', 'linkedin', 'bluesky', 'mastodon'];
const ZERNIO_PLATFORM = { twitter: 'x', x: 'x', linkedin: 'linkedin', bluesky: 'bluesky' };
const MAX_TEXT = 2000;
const MAX_LIST_PAGES = 3;
const MAX_THREAD_PAGES = 5;

export class Fatal extends Error {}

// ---------- URL normalisation: native post URL (or Zernio id) -> "platform:id" ----------
export function postKey(platform, value) {
  const v = String(value || '');
  const p = ZERNIO_PLATFORM[platform] || platform;
  if (p === 'x') {
    const m = v.match(/(?:^|\/\/)(?:www\.|mobile\.)?(?:x|twitter)\.com\/.*?\/status(?:es)?\/(\d+)/i);
    if (m) return `x:${m[1]}`;
    return /^\d+$/.test(v) ? `x:${v}` : null;
  }
  if (p === 'bluesky') {
    const m = v.match(/bsky\.app\/profile\/[^/]+\/post\/([a-z0-9]+)/i) || v.match(/^at:\/\/[^/]+\/app\.bsky\.feed\.post\/([a-z0-9]+)/i);
    return m ? `bluesky:${m[1]}` : null;
  }
  if (p === 'linkedin') {
    const d = safeDecode(v);
    const m = d.match(/urn:li:(?:share|ugcPost|activity):(\d+)/) || d.match(/activity-(\d+)/);
    return m ? `linkedin:${m[1]}` : null;
  }
  return null;
}
function safeDecode(s) { try { return decodeURIComponent(s); } catch { return s; } }

// ---------- deterministic JSON ----------
export function stable(v) {
  if (Array.isArray(v)) return v.map(stable);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map(k => [k, stable(v[k])]));
  return v;
}
export const serialize = v => JSON.stringify(stable(v), null, 2) + '\n';

// ---------- text ----------
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
export function plainText(s) {
  let t = String(s ?? '').replace(/<(script|style)[\s\S]*?<\/\1>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<[^>]*>/g, '');
  t = t.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') { const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); try { return String.fromCodePoint(n); } catch { return ''; } }
    return ENT[e.toLowerCase()] ?? m;
  });
  t = t.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return t.length > MAX_TEXT ? t.slice(0, MAX_TEXT - 1).trimEnd() + '…' : t;
}

// ---------- comment tree ----------
export function normaliseComments(list, hidden = new Set()) {
  const out = [];
  for (const c of Array.isArray(list) ? list : []) {
    if (!c || c.isHidden === true || hidden.has(String(c.id))) continue; // a hidden comment takes its replies with it
    const when = Date.parse(c.createdTime);
    const node = {
      id: String(c.id),
      author: { name: plainText(c.from?.name || c.from?.username || 'Unknown').slice(0, 120), handle: plainText(c.from?.username || '').replace(/^@/, '').slice(0, 120) },
      text: plainText(c.message),
      createdAt: Number.isFinite(when) ? new Date(when).toISOString() : '',
      likes: Number.isFinite(c.likeCount) && c.likeCount > 0 ? Math.floor(c.likeCount) : 0,
      replies: normaliseComments(c.replies, hidden),
    };
    if (typeof c.url === 'string' && /^https:\/\//.test(c.url)) node.url = c.url;
    if (c.from?.isOwner === true) node.isOwner = true;
    out.push(node);
  }
  return out.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}
const countAll = list => list.reduce((n, c) => n + 1 + countAll(c.replies), 0);
const newest = list => list.reduce((m, c) => [m, c.createdAt, newest(c.replies)].sort().pop(), '');

// ---------- front matter ----------
export function parseFrontMatter(text, path) {
  const m = String(text).match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const lines = m[1].split(/\r?\n/);
  const unq = s => s.trim().replace(/^(['"])(.*)\1$/, '$2');
  let slug = null; const links = {};
  for (let i = 0; i < lines.length; i++) {
    const s = lines[i].match(/^slug:\s*(.+)$/);
    if (s) slug = unq(s[1]);
    if (/^comments:\s*$/.test(lines[i])) {
      for (let j = i + 1; j < lines.length && /^\s+\S/.test(lines[j]); j++) {
        const kv = lines[j].match(/^\s+(\w+):\s*(\S.*)$/);
        if (kv && PLATFORM_ORDER.includes(kv[1]) && /^https:\/\//.test(unq(kv[2]))) links[kv[1]] = unq(kv[2]);
      }
    }
  }
  if (!Object.keys(links).length) return null;
  const parts = path.split('/');
  const kind = parts[1];
  const file = parts[parts.length - 1];
  slug = slug || (file === 'index.md' ? parts[parts.length - 2] : file.replace(/\.md$/, ''));
  return { kind, slug, links };
}

// ---------- HTTP ----------
export class Transient extends Error { constructor(m, retryAfter = 0) { super(m); this.retryAfter = retryAfter; } }
async function http(fetchFn, url, headers, label, onHeaders) {
  let res;
  try { res = await fetchFn(url, { headers }); } catch (e) { throw new Transient(`${label}: network error`); }
  const h = n => { try { return res.headers?.get?.(n) ?? null; } catch { return null; } };
  const retryAfter = Number.parseInt(h('retry-after'), 10) || 0;
  if (onHeaders) onHeaders({ remaining: h('x-ratelimit-remaining') === null ? null : Number(h('x-ratelimit-remaining')), retryAfter });
  if (res.status === 429 || res.status >= 500) throw new Transient(`${label}: HTTP ${res.status}`, retryAfter);
  if (res.status === 401) throw new Fatal(`${label}: HTTP 401 (the credential was rejected)`);
  if (!res.ok) throw new Transient(`${label}: HTTP ${res.status}`, retryAfter);
  try { return await res.json(); } catch { throw new Transient(`${label}: invalid JSON`); }
}

// ---------- garden scan ----------
async function scanGarden(ctx, state) {
  const gh = { authorization: `Bearer ${ctx.ghToken}`, accept: 'application/vnd.github+json', 'user-agent': 'sync-comments' };
  const repo = ctx.gardenRepo;
  const ref = await http(ctx.fetch, `https://api.github.com/repos/${repo}/git/ref/heads/main`, gh, 'garden ref');
  const sha = ref?.object?.sha;
  if (!sha) throw new Transient('garden ref: no sha');
  if (sha === state.gardenSha) return false;
  const tree = await http(ctx.fetch, `https://api.github.com/repos/${repo}/git/trees/${sha}?recursive=1`, gh, 'garden tree');
  const files = (tree.tree || []).filter(t => t.type === 'blob' && /^content\/(posts|talks)\/.+\.md$/.test(t.path) && !/\/_index\.md$/.test(t.path));
  const seen = new Set(state.seen); const pages = {}; const todo = [];
  for (const f of files) {
    if (seen.has(f.sha)) { const old = Object.values(state.pages).find(p => p.sha === f.sha && p.src === f.path); if (old) pages[f.path] = old; }
    else todo.push(f);
  }
  const nextSeen = new Set(files.filter(f => seen.has(f.sha)).map(f => f.sha));
  for (let i = 0; i < todo.length; i += 40) {
    const batch = todo.slice(i, i + 40);
    const q = `query($o:String!,$n:String!){repository(owner:$o,name:$n){${batch.map((f, k) => `b${k}:object(oid:"${f.sha}"){...on Blob{text}}`).join(' ')}}}`;
    const [o, n] = repo.split('/');
    let body;
    try {
      const res = await ctx.fetch('https://api.github.com/graphql', { method: 'POST', headers: { ...gh, 'content-type': 'application/json' }, body: JSON.stringify({ query: q, variables: { o, n } }) });
      if (!res.ok) throw new Transient(`graphql: HTTP ${res.status}`);
      body = await res.json();
    } catch (e) { throw e instanceof Transient ? e : new Transient('graphql: network error'); }
    const repoData = body?.data?.repository;
    if (!repoData) throw new Transient('graphql: no data');
    batch.forEach((f, k) => {
      const fm = parseFrontMatter(repoData[`b${k}`]?.text || '', f.path);
      nextSeen.add(f.sha);
      if (fm) pages[f.path] = { sha: f.sha, src: f.path, kind: fm.kind, slug: fm.slug, links: fm.links };
    });
  }
  state.gardenSha = sha; state.seen = [...nextSeen].sort(); state.pages = pages;
  return true;
}

// ---------- polling policy ----------
const HOUR = 3600e3;
export const WARN_AFTER = 6;
export const ERROR_AFTER = 24;
export const MAX_THREAD_FETCHES = 20;
const BACKOFF_MIN = 15, BACKOFF_CAP_MIN = 360;
const API_PLATFORM = { x: 'twitter', linkedin: 'linkedin', bluesky: 'bluesky' };

// Clock-derived throttle (stateless, so a quiet run needs no state write):
// younger than 48 h: every run; up to 14 days: first run of each hour; older: first run after 03:00 UTC.
export function isDue(prev, now) {
  if (!prev) return true;
  if (prev.nextAttempt && now < new Date(prev.nextAttempt)) return false;
  const age = prev.created ? now - new Date(prev.created) : 0;
  if (age < 48 * HOUR) return true;
  if (age < 14 * 24 * HOUR) return now.getUTCMinutes() < 15;
  return now.getUTCHours() === 3 && now.getUTCMinutes() < 15;
}
export const backoffMinutes = n => Math.min(BACKOFF_CAP_MIN, BACKOFF_MIN * 2 ** Math.max(0, n - 1));

// ---------- main ----------
// Volatile bookkeeping (lastAttempt, lastSuccess) rides along whenever the state file is written for another reason;
// on its own it never causes a commit.
const VOLATILE = new Set(['lastAttempt', 'lastSuccess']);
const core = state => serialize(JSON.parse(JSON.stringify(state), (k, v) => (VOLATILE.has(k) ? undefined : v)));

export async function run(opts) {
  const ctx = { fetch: globalThis.fetch, now: new Date(), log: () => {}, gardenRepo: 'DamianFlynn/garden', dataDir: 'data/comments', maxFetches: MAX_THREAD_FETCHES, ...opts };
  const { log } = ctx;
  if (!ctx.apiKey) { log('notice: ZERNIO_API_KEY is not set; nothing to do'); return { changed: [], calls: 0, deployable: false }; }
  const dir = ctx.dataDir;
  mkdirSync(dir, { recursive: true });
  const readJson = (f, d) => { try { return JSON.parse(readFileSync(join(dir, f), 'utf8')); } catch { return d; } };
  const state = { gardenSha: '', seen: [], pages: {}, threads: {}, platforms: {}, ...readJson('_state.json', {}) };
  const before = core(state);
  const hidden = new Set((readJson('_hidden.json', []) || []).map(String));
  const nowIso = ctx.now.toISOString();
  let calls = 0;
  const base = ctx.fetch; ctx.fetch = (...a) => { calls++; return base(...a); };
  const changed = []; let fatal = null;
  const zh = { authorization: `Bearer ${ctx.apiKey}`, accept: 'application/json' };
  let halted = false; let fetches = 0;
  // Only the shared quota halts the whole run; a 429 (with its Retry-After) backs off that platform alone.
  const onHeaders = ({ remaining }) => { if (remaining !== null && remaining <= 5) halted = true; };
  const zget = (url, label) => http(ctx.fetch, url, zh, label, onHeaders);

  try { await scanGarden(ctx, state); } catch (e) { if (e instanceof Fatal) fatal = e; else log(`warn: ${e.message}; using cached page list`); }

  const wanted = new Map(); // key -> [{page, platform, url}]
  for (const p of Object.values(state.pages).sort((a, b) => a.src.localeCompare(b.src))) for (const [platform, url] of Object.entries(p.links)) {
    const key = postKey(platform, url);
    if (key) { if (!wanted.has(key)) wanted.set(key, []); wanted.get(key).push({ page: p, platform, url }); }
  }
  const platformOf = key => key.split(':')[0];
  const fresh = {}; // key -> {tree,count}
  const forceRead = ctx.now.getUTCHours() === 3 && ctx.now.getUTCMinutes() < 15;
  const existing = key => { const w = wanted.get(key)[0]; const d = readJson(`${w.page.kind}-${w.page.slug}.json`, null); return (d?.threads || []).find(t => t.platform === w.platform) || null; };

  const failedKeys = new Set(); const failedPlatforms = new Set();
  function failure(platform, keys, err) {
    const ps = state.platforms[platform] = { consecutiveFailures: 0, ...state.platforms[platform] };
    if (!failedPlatforms.has(platform)) { failedPlatforms.add(platform); ps.consecutiveFailures += 1; }
    ps.lastAttempt = nowIso;
    for (const key of keys) {
      failedKeys.add(key);
      const t = state.threads[key] = { count: -1, ...state.threads[key] };
      t.consecutiveFailures = (t.consecutiveFailures || 0) + 1; t.lastAttempt = nowIso;
      const wait = Math.max(backoffMinutes(t.consecutiveFailures) * 60, err.retryAfter || 0);
      t.nextAttempt = new Date(ctx.now.getTime() + wait * 1000).toISOString();
    }
    log(`warn: ${platform}: ${err.message}; keeping existing data, retry after ${state.threads[keys[0]]?.nextAttempt ?? 'next run'}`);
    if (ps.consecutiveFailures >= ERROR_AFTER) log(`::error::Zernio sync for ${platform} has failed ${ps.consecutiveFailures} runs in a row`);
    else if (ps.consecutiveFailures >= WARN_AFTER) log(`::warning::Zernio sync for ${platform} has failed ${ps.consecutiveFailures} runs in a row`);
  }
  function success(platform, keys, wholePlatform = true) {
    if (wholePlatform) {
      const ps = state.platforms[platform] = { ...state.platforms[platform] };
      ps.consecutiveFailures = 0; ps.lastAttempt = ps.lastSuccess = nowIso;
    }
    for (const key of keys) { const t = state.threads[key]; if (!t) continue; t.consecutiveFailures = 0; t.lastAttempt = t.lastSuccess = nowIso; delete t.nextAttempt; }
  }

  // (b) ONE list call for every platform that has a due post (more pages only while due posts are still missing).
  // A failure of the whole call marks every due platform; a failed account inside a 200 marks only its platform.
  const dueByPlatform = {};
  for (const platform of Object.keys(API_PLATFORM)) {
    const due = [...wanted.keys()].filter(k => platformOf(k) === platform && isDue(state.threads[k], ctx.now));
    if (due.length) dueByPlatform[platform] = due;
  }
  const allDue = Object.values(dueByPlatform).flat();
  const found = new Map(); const listFailed = new Map();
  if (!fatal && allDue.length) {
    try {
      let cursor = '';
      for (let page = 0; page < MAX_LIST_PAGES && found.size < allDue.length; page++) {
        const q = new URLSearchParams({ limit: '100', view: 'summary', sortBy: 'date', sortOrder: 'desc' });
        if (cursor) q.set('cursor', cursor);
        const res = await zget(`${ZERNIO}/inbox/comments?${q}`, 'zernio list');
        for (const a of res.meta?.failedAccounts || []) {
          const p = ZERNIO_PLATFORM[a.platform];
          if (p) listFailed.set(p, new Transient(`zernio list ${p}: account failed (${a.code || a.error || 'unknown'})`, Number(a.retryAfter) || 0));
        }
        for (const item of res.data || []) {
          const key = postKey(item.platform, item.permalink) || postKey(item.platform, item.id);
          if (key && allDue.includes(key) && !found.has(key)) found.set(key, item);
        }
        if (!res.pagination?.hasMore || !res.pagination.nextCursor) break;
        cursor = res.pagination.nextCursor;
      }
    } catch (e) {
      if (e instanceof Fatal) fatal = e;
      else for (const platform of Object.keys(dueByPlatform)) listFailed.set(platform, e);
    }
  }

  if (!fatal) for (const [platform, due] of Object.entries(dueByPlatform)) {
    if (listFailed.has(platform)) { failure(platform, due, listFailed.get(platform)); continue; }
    try {
      let threadFailed = null;
      for (const key of due) {
        const item = found.get(key);
        if (!item) { log(`info: ${key} not in the first ${MAX_LIST_PAGES} list pages`); continue; }
        const prev = state.threads[key];
        const count = Number.isFinite(item.commentCount) ? item.commentCount : 0;
        const need = !prev || prev.count !== count || (forceRead && count > 0);
        const rec = { ...prev, count: prev?.count ?? -1, id: item.id, accountId: item.accountId, created: prev?.created || item.createdTime };
        if (!need) { state.threads[key] = rec; continue; }
        if (count === 0) { fresh[key] = { tree: [], count: 0 }; state.threads[key] = { ...rec, count, newest: '' }; continue; }
        if (fetches >= ctx.maxFetches || halted) { state.threads[key] = rec; log(`info: ${key} deferred to the next run (budget or rate limit)`); continue; }
        fetches++;
        try {
          const comments = []; let c = '';
          for (let page = 0; page < MAX_THREAD_PAGES; page++) {
            const q = new URLSearchParams({ accountId: item.accountId, limit: '100' });
            if (c) q.set('cursor', c);
            const res = await zget(`${ZERNIO}/inbox/comments/${encodeURIComponent(item.id)}?${q}`, `zernio thread ${platform}`);
            comments.push(...(res.comments || []));
            if (!res.pagination?.hasMore || !res.pagination.cursor) break;
            c = res.pagination.cursor;
          }
          const tree = normaliseComments(comments, hidden);
          const old = existing(key);
          if (!tree.length && old?.comments?.length && !comments.length) throw new Transient(`zernio thread ${platform}: empty answer for a thread that has comments`);
          fresh[key] = { tree, count: countAll(tree) };
          state.threads[key] = { ...rec, count, newest: newest(tree) };
        } catch (e) {
          if (e instanceof Fatal) throw e;
          threadFailed = e; failure(platform, [key], e);
          // keep the old count so the thread is retried once its backoff has passed
          state.threads[key] = { ...state.threads[key], count: prev?.count ?? -1, id: item.id, accountId: item.accountId, created: prev?.created || item.createdTime };
        }
      }
      success(platform, due.filter(k => !failedKeys.has(k)), !threadFailed);
    } catch (e) {
      if (e instanceof Fatal) { fatal = e; break; }
      failure(platform, due, e);
    }
  }

  // write only changed page files (a failed platform simply has no entry in `fresh`, so its stored thread is kept)
  const byPage = new Map();
  for (const [key, th] of Object.entries(fresh)) for (const w of wanted.get(key)) {
    const pk = `${w.page.kind}-${w.page.slug}`;
    if (!byPage.has(pk)) byPage.set(pk, { page: w.page, threads: {} });
    byPage.get(pk).threads[w.platform] = { platform: w.platform, url: w.url, count: th.count, comments: th.tree };
  }
  for (const [pk, { page, threads }] of byPage) {
    const file = `${pk}.json`;
    const old = readJson(file, null);
    const merged = {};
    for (const t of old?.threads || []) merged[t.platform] = t;
    Object.assign(merged, threads);
    const list = PLATFORM_ORDER.filter(p => merged[p]).map(p => ({ ...merged[p], url: page.links[p] || merged[p].url }));
    const next = { page: `/${page.kind}/${page.slug}/`, threads: list };
    const strip = d => d && serialize({ page: d.page, threads: d.threads });
    if (strip(old) === strip(next)) continue;
    writeFileSync(join(dir, file), serialize({ ...next, fetchedAt: nowIso }));
    changed.push(file);
  }
  const deployable = changed.length > 0;
  if (core(state) !== before) { writeFileSync(join(dir, '_state.json'), serialize(state)); changed.push('_state.json'); }
  if (fatal) { log(`error: ${fatal.message}`); throw Object.assign(fatal, { changed, calls }); }
  return { changed, calls, deployable };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dirArg = process.argv.indexOf('--data-dir');
  const log = m => console.log(m.startsWith('::') ? m : `[sync-comments] ${m}`);
  try {
    const r = await run({
      apiKey: process.env.ZERNIO_API_KEY,
      ghToken: process.env.GARDEN_TOKEN || process.env.GITHUB_TOKEN,
      dataDir: dirArg > 0 ? process.argv[dirArg + 1] : join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'comments'),
      log,
    });
    log(`done: ${r.calls} API calls, changed: ${r.changed.length ? r.changed.join(', ') : 'nothing'}`);
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `deploy=${r.deployable}\n`);
  } catch (e) {
    log(`failed: ${e.message}`);
    if (process.env.GITHUB_OUTPUT && e.changed) appendFileSync(process.env.GITHUB_OUTPUT, `deploy=${e.changed.some(f => f !== '_state.json')}\n`);
    process.exit(1);
  }
}
