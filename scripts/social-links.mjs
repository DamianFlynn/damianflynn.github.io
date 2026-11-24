#!/usr/bin/env node
// Record the social post that announces a page (from a Zernio post) in data/social/<kind>-<slug>.json.
// Node 20, built-ins only. Never logs the API key. Lookup errors never fail the run (webhooks retry, the nightly backfill catches up).
import { readFileSync, writeFileSync, mkdirSync, appendFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isCanonicalLink, isValidLink, PLATFORMS } from './social-urls.mjs';

const ZERNIO = 'https://getlate.dev/api/v1';
const ZERNIO_PLATFORM = { twitter: 'x', x: 'x', linkedin: 'linkedin', bluesky: 'bluesky' };
const POST_ID = /^[0-9a-f]{24}$/;
const EVENTS = new Set(['post.platform.published', 'post.published', 'backfill', 'manual']);
export const BACKFILL_DAYS = 30;
const MAX_LIST_PAGES = 10;

// ---------- deterministic JSON ----------
export function stable(v) {
  if (Array.isArray(v)) return v.map(stable);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map(k => [k, stable(v[k])]));
  return v;
}
export const serialize = v => JSON.stringify(stable(v), null, 2) + '\n';

// ---------- which page does a post announce ----------
// Apex host only, posts or talks, lowercase slug, whole path segment (no deeper path), not glued to another host.
const PAGE_URL = /(?<![\w.@/-])https:\/\/damianflynn\.com\/(posts|talks)\/([a-z0-9]+(?:-[a-z0-9]+)*)\/(?=[?#\s)\]>"'.,;:!]|$)/;

export function textsOf(post, entry) {
  const out = [];
  const add = t => { if (typeof t === 'string' && t) out.push(t); };
  add(post?.content);
  add(entry?.customContent);
  const psd = entry?.platformSpecificData || {};
  add(psd.firstComment);
  for (const item of Array.isArray(psd.threadItems) ? psd.threadItems : []) add(item?.content);
  return out;
}
export function findPage(texts) {
  for (const t of texts) { const m = PAGE_URL.exec(t); if (m) return { kind: m[1], slug: m[2] }; }
  return null;
}

// ---------- platform post URL -> canonical, validated link ----------
export function normaliseLink(platform, entry) {
  const p = ZERNIO_PLATFORM[platform];
  const url = String(entry?.platformPostUrl || '');
  const pid = String(entry?.platformPostId || '');
  const acct = entry?.accountId && typeof entry.accountId === 'object' ? entry.accountId : {};
  let out = null;
  if (p === 'x') {
    const m = url.match(/^https:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/(?:i\/(?:web\/)?|([A-Za-z0-9_]{1,15})\/)status\/([0-9]{1,25})(?:[/?#].*)?$/i)
      || pid.match(/^()([0-9]{1,25})$/);
    if (m) {
      const user = m[1] || (/^[A-Za-z0-9_]{1,15}$/.test(String(acct.username || '')) ? acct.username : 'i');
      out = `https://x.com/${user}/status/${m[2]}`;
    }
  } else if (p === 'bluesky') {
    const m = url.match(/^https:\/\/bsky\.app\/profile\/([^/?#@]+)\/post\/([A-Za-z0-9]{10,20})(?:[/?#].*)?$/)
      || pid.match(/^at:\/\/(did:[a-z0-9:]+)\/app\.bsky\.feed\.post\/([A-Za-z0-9]{10,20})$/);
    if (m) out = `https://bsky.app/profile/${m[1]}/post/${m[2]}`;
  } else if (p === 'linkedin') {
    const dec = s => { try { return decodeURIComponent(s); } catch { return s; } };
    const m = dec(url).match(/^https:\/\/www\.linkedin\.com\/feed\/update\/urn:li:(share|ugcPost|activity):([0-9]{1,25})\/?(?:[?#].*)?$/)
      || pid.match(/^urn:li:(share|ugcPost|activity):([0-9]{1,25})$/);
    if (m) out = `https://www.linkedin.com/feed/update/urn:li:${m[1]}:${m[2]}/`;
  }
  return p && out && isCanonicalLink(p, out) ? out : null;
}

// ---------- one post -> proposed records ----------
// Returns [{kind, slug, platform, url}] and reasons for anything skipped.
export function extractLinks(post) {
  const found = []; const skipped = [];
  for (const entry of Array.isArray(post?.platforms) ? post.platforms : []) {
    const platform = ZERNIO_PLATFORM[entry?.platform];
    if (!platform) { skipped.push(`${entry?.platform}: unsupported network`); continue; }
    if (entry.status !== 'published') { skipped.push(`${platform}: not published (${entry.status})`); continue; }
    const page = findPage(textsOf(post, entry));
    if (!page) { skipped.push(`${platform}: no page link in the post`); continue; }
    const url = normaliseLink(entry.platform, entry);
    if (!url) { skipped.push(`${platform}: no valid post URL yet`); continue; }
    found.push({ ...page, platform, url });
  }
  return { found, skipped };
}

// ---------- merge into the data file ----------
const readJson = (file, d) => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return d; } };

// Existing valid links win (the earliest announcement is the canonical thread); an invalid stored link is replaced.
export function mergeRecord(existing, kind, slug, additions, nowIso) {
  const links = {};
  for (const p of PLATFORMS) if (existing?.links && isValidLink(p, existing.links[p])) links[p] = existing.links[p];
  const added = [];
  for (const { platform, url } of additions) {
    if (!links[platform]) { links[platform] = url; added.push(platform); }
  }
  const same = existing && serialize({ page: existing.page, links: existing.links }) === serialize({ page: `/${kind}/${slug}/`, links });
  if (!added.length && same) return { record: existing, changed: false, added };
  if (!added.length && !existing) return { record: null, changed: false, added };
  return { record: { page: `/${kind}/${slug}/`, links, updatedAt: added.length ? nowIso : (existing?.updatedAt || nowIso) }, changed: added.length > 0 || !same, added };
}

// ---------- Zernio ----------
async function zget(ctx, path) {
  let res;
  try { res = await ctx.fetch(`${ZERNIO}${path}`, { headers: { authorization: `Bearer ${ctx.apiKey}`, accept: 'application/json' }, signal: AbortSignal.timeout(20000) }); }
  catch { throw new Error(`Zernio ${path.split('?')[0]}: network error`); }
  if (!res.ok) throw new Error(`Zernio ${path.split('?')[0]}: HTTP ${res.status}`);
  try { return await res.json(); } catch { throw new Error(`Zernio ${path.split('?')[0]}: invalid JSON`); }
}
export async function fetchPost(ctx, id) { return (await zget(ctx, `/posts/${id}`))?.post || null; }
export async function listRecent(ctx) {
  const since = new Date(ctx.now.getTime() - BACKFILL_DAYS * 86400e3);
  const posts = []; let cursor = '';
  for (let page = 0; page < MAX_LIST_PAGES; page++) {
    const q = new URLSearchParams({ status: 'published', fromDate: since.toISOString().slice(0, 10), limit: '100', sortBy: 'scheduled-desc' });
    if (cursor) q.set('cursor', cursor);
    const res = await zget(ctx, `/posts?${q}`);
    posts.push(...(res.posts || []));
    cursor = res.pagination?.nextCursor || '';
    if (!cursor) break;
  }
  const when = p => Date.parse(p.publishedAt || p.scheduledFor || p.createdAt || '') || 0;
  // oldest first: the earliest announcement of a page wins, deterministically
  return posts.filter(p => when(p) >= since.getTime() && POST_ID.test(String(p._id))).sort((a, b) => when(a) - when(b) || String(a._id).localeCompare(String(b._id)));
}

// ---------- main ----------
export async function run(opts) {
  const ctx = { fetch: globalThis.fetch, now: new Date(), log: () => {}, dataDir: 'data/social', backfill: false, ...opts };
  const { log } = ctx;
  const warn = m => log(`::warning::${m}`);
  const out = { changed: [], summary: '', warnings: 0 };
  if (!ctx.apiKey) { warn('ZERNIO_API_KEY is not set; nothing to do'); return out; }
  if (ctx.event && !EVENTS.has(ctx.event)) { warn(`ignoring unknown event name`); }

  let posts = [];
  try {
    if (ctx.backfill) posts = await listRecent(ctx);
    else if (POST_ID.test(String(ctx.postId || ''))) { const p = await fetchPost(ctx, ctx.postId); if (p) posts = [p]; }
    else { warn('no valid post id given and backfill is off; nothing to do'); return out; }
  } catch (e) { warn(`${e.message}; the nightly backfill will catch up`); out.warnings++; return out; }

  mkdirSync(ctx.dataDir, { recursive: true });
  const nowIso = ctx.now.toISOString();
  const perPage = new Map();
  for (const post of posts) {
    let r;
    try { r = extractLinks(post); } catch (e) { warn(`post ${post?._id}: could not be read (${e.message})`); out.warnings++; continue; }
    for (const s of r.skipped) log(`info: post ${post?._id}: ${s}`);
    for (const f of r.found) {
      const k = `${f.kind}-${f.slug}`;
      if (!perPage.has(k)) perPage.set(k, { kind: f.kind, slug: f.slug, adds: [] });
      perPage.get(k).adds.push({ platform: f.platform, url: f.url });
    }
  }
  const recorded = [];
  for (const [k, { kind, slug, adds }] of [...perPage].sort((a, b) => a[0].localeCompare(b[0]))) {
    const file = join(ctx.dataDir, `${k}.json`);
    const { record, changed, added } = mergeRecord(readJson(file, null), kind, slug, adds, nowIso);
    if (!changed) { log(`info: ${k}: already recorded`); continue; }
    writeFileSync(file, serialize(record));
    out.changed.push(`${k}.json`);
    recorded.push({ slug, added });
  }
  if (recorded.length === 1) out.summary = `record ${recorded[0].added.join(', ')} thread for ${recorded[0].slug}`;
  else if (recorded.length > 1) out.summary = `record social threads for ${recorded.length} pages`;
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const log = m => console.log(m.startsWith('::') ? m : `[social-links] ${m}`);
  try {
    const r = await run({
      apiKey: process.env.ZERNIO_API_KEY,
      postId: process.env.POST_ID,
      event: process.env.EVENT,
      backfill: process.env.BACKFILL === 'true',
      dataDir: join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'social'),
      log,
    });
    log(`done: ${r.changed.length ? r.changed.join(', ') : 'nothing changed'}`);
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `changed=${r.changed.length > 0}\nmessage=${r.summary}\n`);
  } catch (e) {
    console.log(`::warning::social-links: unexpected error (${String(e?.message || e).slice(0, 200)}); exiting cleanly`);
  }
}
