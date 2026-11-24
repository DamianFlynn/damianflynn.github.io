// Offline tests: node --test scripts/test-social-links.mjs   (no network; fetch is mocked, fixtures are recorded and sanitised)
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run, findPage, normaliseLink, extractLinks, mergeRecord, serialize, textsOf } from './social-links.mjs';
import { isValidLink, isCanonicalLink } from './social-urls.mjs';

const fx = n => JSON.parse(readFileSync(new URL(`./fixtures/zernio/${n}.json`, import.meta.url), 'utf8')).post;
const NOW = new Date('2026-11-24T12:00:00Z');
const BLOG = { kind: 'posts', slug: 'markdown-notion-obsidian-building-this-blog' };
const TALK = { kind: 'talks', slug: 'agents-need-an-identity' };
const LI = 'https://www.linkedin.com/feed/update/urn:li:share:7530918910544740353/';
const X = 'https://x.com/test_author/status/2125153322625585254';
const BSKY = 'https://bsky.app/profile/author.example/post/3n32ceud77u22';

test('page link per platform, from the recorded shapes (LinkedIn firstComment, X threadItems[1], Bluesky content)', () => {
  assert.deepEqual(findPage(textsOf(fx('linkedin'), fx('linkedin').platforms[0])), BLOG);
  assert.deepEqual(findPage(textsOf(fx('x'), fx('x').platforms[0])), BLOG);
  assert.deepEqual(findPage(textsOf(fx('bluesky'), fx('bluesky').platforms[0])), BLOG);
  // the Dublin posts carry the link in the content itself and announce a talk
  for (const n of ['dublin-linkedin', 'dublin-x', 'dublin-bluesky']) assert.deepEqual(findPage(textsOf(fx(n), fx(n).platforms[0])), TALK, n);
});

test('page link: first match wins; other hosts, lookalikes, deeper paths and uppercase slugs are ignored', () => {
  assert.deepEqual(findPage(['see https://damianflynn.com/talks/a-b/?utm=1 and https://damianflynn.com/posts/c/']), { kind: 'talks', slug: 'a-b' });
  assert.deepEqual(findPage(['x', 'https://damianflynn.com/posts/c/#frag']), { kind: 'posts', slug: 'c' });
  for (const bad of [
    'https://damianflynn.com.evil.example/posts/c/', 'https://evil.example/?u=https://damianflynn.com.evil/posts/c/', 'https://xdamianflynn.com/posts/c/',
    'http://damianflynn.com/posts/c/', 'https://www.damianflynn.com/posts/c/', 'https://damianflynn.com/tags/c/', 'https://damianflynn.com/posts/c/more/',
    'https://damianflynn.com/posts/Upper/', 'https://damianflynn.com/posts/c', 'https://user@damianflynn.com/posts/c/', 'https://damianflynn.com/posts//',
  ]) assert.equal(findPage([bad]), null, bad);
  assert.equal(findPage([]), null);
});

test('normalisation: X web-status form uses the account username; LinkedIn urn form; Bluesky bsky.app form', () => {
  assert.equal(normaliseLink('twitter', fx('x').platforms[0]), X);
  assert.equal(normaliseLink('linkedin', fx('linkedin').platforms[0]), LI);
  assert.equal(normaliseLink('bluesky', fx('bluesky').platforms[0]), BSKY);
  const acct = { username: 'test_author' };
  assert.equal(normaliseLink('twitter', { platformPostUrl: 'https://twitter.com/someone/status/12?s=20', accountId: acct }), 'https://x.com/someone/status/12');
  assert.equal(normaliseLink('twitter', { platformPostUrl: 'https://twitter.com/i/web/status/12', accountId: { username: 'bad name!' } }), 'https://x.com/i/status/12');
  assert.equal(normaliseLink('twitter', { platformPostId: '12', accountId: acct }), 'https://x.com/test_author/status/12');
  assert.equal(normaliseLink('linkedin', { platformPostUrl: 'https://www.linkedin.com/feed/update/urn:li:share:77' }), 'https://www.linkedin.com/feed/update/urn:li:share:77/');
  assert.equal(normaliseLink('linkedin', { platformPostUrl: 'https://www.linkedin.com/feed/update/urn%3Ali%3AugcPost%3A77/' }), 'https://www.linkedin.com/feed/update/urn:li:ugcPost:77/');
  assert.equal(normaliseLink('linkedin', { platformPostId: 'urn:li:share:77' }), 'https://www.linkedin.com/feed/update/urn:li:share:77/');
  assert.equal(normaliseLink('bluesky', { platformPostId: 'at://did:plc:abcdefgh/app.bsky.feed.post/3n32ceud77u22' }), 'https://bsky.app/profile/did:plc:abcdefgh/post/3n32ceud77u22');
});

test('validation rejects javascript:, http:, other hosts, lookalike domains, whitespace, and oversize links', () => {
  const bad = {
    x: ['javascript:alert(1)', 'http://x.com/a/status/1', 'https://x.com.evil.example/a/status/1', 'https://evilx.com/a/status/1', 'https://x.com@evil.example/a/status/1', 'https://x.com/a/status/1 ', 'https://x.com/a/status/1\n', 'https://x.com/a/status/abc', 'https://nottwitter.com/a/status/1', 'https://x.com/a/status/1#frag', 'data:text/html,x'],
    bluesky: ['javascript:alert(1)', 'http://bsky.app/profile/a/post/3n32ceud77u22', 'https://bsky.app.evil.example/profile/a/post/3n32ceud77u22', 'https://xbsky.app/profile/a/post/3n32ceud77u22', 'https://bsky.app/profile/a/post/short'],
    linkedin: ['javascript:alert(1)', 'http://www.linkedin.com/feed/update/urn:li:share:1/', 'https://linkedin.com.evil.example/feed/update/urn:li:share:1/', 'https://evil.example/www.linkedin.com/feed/update/1', 'https://www.linkedin.com/feed/update/urn:li:share:1/ x', 'https://www.linkedin.com/in/someone'],
    mastodon: ['javascript:alert(1)', 'http://social.example/@a/1', 'https://social.example/@a/notnumber'],
  };
  for (const [p, list] of Object.entries(bad)) for (const u of list) { assert.equal(isValidLink(p, u), false, `${p} ${u}`); }
  assert.equal(isValidLink('x', 'https://x.com/' + 'a'.repeat(300) + '/status/1'), false);
  assert.equal(isValidLink('unknown', X), false);
  assert.equal(isValidLink('x', 42), false);
  for (const [p, u] of [['x', X], ['bluesky', BSKY], ['linkedin', LI], ['mastodon', 'https://social.example/@a/1']]) assert.ok(isValidLink(p, u), u);
  assert.equal(isCanonicalLink('x', 'https://twitter.com/a/status/1'), false); // valid for the vault, not what this pipeline writes
  assert.equal(isCanonicalLink('linkedin', 'https://www.linkedin.com/posts/anything-here'), false);
});

test('extractLinks pairs each published platform with its page link and reports why others are skipped', () => {
  const p = fx('x'); p.platforms[0].status = 'failed';
  assert.deepEqual(extractLinks(p).found, []);
  const q = fx('linkedin'); delete q.platforms[0].platformSpecificData; q.content = 'no link here';
  assert.match(extractLinks(q).skipped[0], /no page link/);
  const r = fx('bluesky'); r.platforms[0].platformPostUrl = 'https://evil.example/x'; delete r.platforms[0].platformPostId;
  assert.match(extractLinks(r).skipped[0], /no valid post URL/);
  assert.deepEqual(extractLinks(fx('dublin-x')).found, [{ ...TALK, platform: 'x', url: 'https://x.com/test_author/status/2124775768513204629' }]);
});

test('mergeRecord: merges, never replaces an existing link, and is idempotent', () => {
  const a = mergeRecord(null, 'posts', 's', [{ platform: 'x', url: X }], 'T1');
  assert.equal(a.changed, true); assert.deepEqual(a.record, { page: '/posts/s/', links: { x: X }, updatedAt: 'T1' });
  const b = mergeRecord(a.record, 'posts', 's', [{ platform: 'linkedin', url: LI }], 'T2');
  assert.deepEqual(b.record.links, { linkedin: LI, x: X }); assert.equal(b.record.updatedAt, 'T2');
  const c = mergeRecord(b.record, 'posts', 's', [{ platform: 'linkedin', url: LI }, { platform: 'x', url: 'https://x.com/other/status/9' }], 'T3');
  assert.equal(c.changed, false); assert.equal(c.record.updatedAt, 'T2'); assert.equal(c.record.links.x, X);
  const d = mergeRecord({ page: '/posts/s/', links: { x: 'javascript:alert(1)', bluesky: BSKY }, updatedAt: 'T0' }, 'posts', 's', [{ platform: 'x', url: X }], 'T4');
  assert.deepEqual(d.record.links, { bluesky: BSKY, x: X });
});

function harness({ posts = {}, list = [], failPost = null, failList = false } = {}) {
  const dataDir = mkdtempSync(join(tmpdir(), 'sl-'));
  const h = { dataDir, urls: [], headers: [] };
  h.fetch = async (url, init = {}) => {
    const u = String(url); h.urls.push(u); h.headers.push(init.headers);
    const json = (b, status = 200) => ({ ok: status < 400, status, json: async () => b });
    if (u.startsWith('https://getlate.dev/api/v1/posts?')) { if (failList) return json({}, 500); return json({ posts: list, pagination: { nextCursor: null } }); }
    const m = u.match(/\/posts\/([0-9a-f]{24})$/);
    if (m) { if (failPost) return json({}, failPost); return posts[m[1]] ? json({ post: posts[m[1]] }) : json({}, 404); }
    throw new Error('unexpected ' + u);
  };
  h.run = (extra = {}) => run({ fetch: h.fetch, apiKey: 'test-key-not-real', dataDir, now: NOW, log: m => (h.logs ||= []).push(m), ...extra });
  h.read = f => JSON.parse(readFileSync(join(dataDir, f), 'utf8'));
  return h;
}

test('single post: writes the deterministic file, then a repeated delivery (same event twice) changes nothing', async () => {
  const h = harness({ posts: { [fx('x')._id]: fx('x') } });
  const r1 = await h.run({ postId: fx('x')._id, event: 'post.platform.published' });
  assert.deepEqual(r1.changed, ['posts-markdown-notion-obsidian-building-this-blog.json']);
  assert.equal(r1.summary, 'record x thread for markdown-notion-obsidian-building-this-blog');
  const file = join(h.dataDir, r1.changed[0]);
  assert.equal(readFileSync(file, 'utf8'), serialize({ page: '/posts/markdown-notion-obsidian-building-this-blog/', links: { x: X }, updatedAt: NOW.toISOString() }));
  const before = readFileSync(file, 'utf8');
  const r2 = await h.run({ postId: fx('x')._id, now: new Date('2027-01-01T00:00:00Z') });
  assert.deepEqual(r2.changed, []); assert.equal(r2.summary, ''); assert.equal(readFileSync(file, 'utf8'), before);
});

test('a second network for the same page merges into the same file', async () => {
  const h = harness({ posts: { [fx('x')._id]: fx('x'), [fx('linkedin')._id]: fx('linkedin') } });
  await h.run({ postId: fx('x')._id }); await h.run({ postId: fx('linkedin')._id });
  assert.deepEqual(h.read('posts-markdown-notion-obsidian-building-this-blog.json').links, { linkedin: LI, x: X });
  assert.deepEqual(readdirSync(h.dataDir), ['posts-markdown-notion-obsidian-building-this-blog.json']);
});

test('a post without a page link is ignored quietly; no file is written', async () => {
  const p = fx('linkedin'); p.content = 'nothing'; delete p.platforms[0].platformSpecificData;
  const h = harness({ posts: { [p._id]: p } });
  const r = await h.run({ postId: p._id });
  assert.deepEqual(r.changed, []); assert.equal(readdirSync(h.dataDir).length, 0);
  assert.ok(!h.logs.some(l => l.startsWith('::warning')));
});

test('lookup errors never throw: warning annotation, nothing written; bad ids and missing key are no-ops', async () => {
  for (const code of [404, 429, 500]) {
    const h = harness({ failPost: code }); const r = await h.run({ postId: fx('x')._id });
    assert.deepEqual(r.changed, []); assert.ok(h.logs.some(l => l.startsWith('::warning::')), String(code));
  }
  const net = harness(); net.fetch = async () => { throw new Error('boom'); };
  assert.deepEqual((await run({ fetch: net.fetch, apiKey: 'k', dataDir: net.dataDir, postId: fx('x')._id, now: NOW, log: m => (net.logs ||= []).push(m) })).changed, []);
  assert.ok(net.logs.some(l => l.includes('network error')));
  const h = harness();
  await h.run({ postId: '../../etc' }); assert.equal(h.urls.length, 0);
  await h.run({ apiKey: '', postId: fx('x')._id }); assert.equal(h.urls.length, 0);
});

test('backfill: ignores the post id, lists the last 30 days, oldest announcement wins, skips old and malformed posts', async () => {
  const old = fx('dublin-x'); old._id = 'a'.repeat(24); old.publishedAt = '2026-09-01T00:00:00Z'; old.platforms[0].publishedAt = old.publishedAt;
  delete old.publishedAt; old.scheduledFor = '2026-09-01T00:00:00Z';
  const first = fx('x'); first.scheduledFor = '2026-11-01T09:00:00Z';
  const dup = fx('x'); dup._id = 'b'.repeat(24); dup.scheduledFor = '2026-11-20T09:00:00Z';
  dup.platforms[0].platformPostUrl = 'https://twitter.com/i/web/status/999'; dup.platforms[0].platformPostId = '999'; // a later re-post of the same page
  const bad = fx('bluesky'); bad._id = 'not-an-id';
  const list = [fx('linkedin'), dup, first, old, bad, fx('dublin-linkedin'), fx('dublin-bluesky')];
  const h = harness({ list });
  const r = await h.run({ backfill: true, postId: 'ignored' });
  assert.ok(h.urls[0].includes('status=published') && h.urls[0].includes('limit=100') && h.urls[0].includes('fromDate=2026-10-25'));
  assert.ok(h.urls.every(u => !u.includes('ignored')));
  assert.equal(r.summary, 'record social threads for 2 pages');
  assert.deepEqual(h.read('posts-markdown-notion-obsidian-building-this-blog.json').links, { linkedin: LI, x: X });
  assert.deepEqual(Object.keys(h.read('talks-agents-need-an-identity.json').links), ['bluesky', 'linkedin']);
  const again = await h.run({ backfill: true });
  assert.deepEqual(again.changed, []);
});

test('backfill list failure: warning and a clean return', async () => {
  const h = harness({ failList: true }); const r = await h.run({ backfill: true });
  assert.deepEqual(r.changed, []); assert.ok(h.logs.some(l => l.startsWith('::warning::')));
});

test('the key is only sent to Zernio and never logged', async () => {
  const h = harness({ posts: { [fx('x')._id]: fx('x') } });
  await h.run({ postId: fx('x')._id });
  assert.ok(h.urls.every(u => u.startsWith('https://getlate.dev/api/v1/')));
  assert.ok(!(h.logs || []).join('\n').includes('test-key-not-real'));
});
