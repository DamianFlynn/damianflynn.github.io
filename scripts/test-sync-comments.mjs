// Offline tests: node --test scripts/test-sync-comments.mjs   (no network; fetch is mocked)
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run, postKey, normaliseComments, parseFrontMatter, plainText, serialize, readSocialPages, unionPages } from './sync-comments.mjs';

const BSKY_URL = 'https://bsky.app/profile/damianflynn.com/post/3n2xokvq4ae2s';
const X_URL = 'https://x.com/damian_flynn/status/2124775768513204629';
const LI_URL = 'https://www.linkedin.com/feed/update/urn:li:share:7530541469049229314/';
const NOTE = `---\ntitle: T\nslug: agents-need-an-identity\ncomments:\n  bluesky: ${BSKY_URL}\n  x: ${X_URL}\n  linkedin: ${LI_URL}\n  mastodon: https://social.example/@d/1\n---\nbody\n`;
const NOW = new Date('2026-11-23T12:00:00Z');

const listItem = (platform, id, permalink, commentCount, accountId = 'acc-' + platform) => ({ id, platform, permalink, commentCount, accountId, createdTime: '2026-11-23T08:00:00Z' });
const LIST = (counts = {}) => ({
  data: [
    listItem('bluesky', 'at://did:plc:abc/app.bsky.feed.post/3n2xokvq4ae2s', BSKY_URL, counts.bluesky ?? 0),
    listItem('linkedin', 'urn:li:share:7530541469049229314', 'https://www.linkedin.com/feed/update/urn:li:share:7530541469049229314', counts.linkedin ?? 1),
    listItem('twitter', '2124775768513204629', 'https://twitter.com/i/web/status/2124775768513204629', counts.x ?? 0),
    listItem('twitter', '1111', 'https://twitter.com/i/web/status/1111', 5),
  ],
  pagination: { hasMore: false, nextCursor: null },
});
const LI_THREAD = JSON.parse(readFileSync(new URL('./fixtures/linkedin-thread.json', import.meta.url), 'utf8'));
const mkComment = (id, over = {}) => ({ id, message: 'm ' + id, createdTime: '2026-11-23T10:00:00Z', from: { id: 'u', name: 'Ann Lee', username: 'ann', picture: 'https://cdn.example/a.png', isOwner: false }, likeCount: 0, replies: [], isHidden: false, ...over });

function harness({ note = NOTE, list = LIST(), threads = {}, sha = 'sha1', failList = null, failThread = {} } = {}) {
  const dataDir = mkdtempSync(join(tmpdir(), 'cm-'));
  const h = { dataDir, urls: [], sha, note, list, threads, failList, failThread };
  h.fetch = async (url, init = {}) => {
    const u = String(url); h.urls.push(u);
    const json = (b, status = 200) => ({ ok: status < 400, status, json: async () => b, headers: { get: n => (h.headers || {})[n.toLowerCase()] ?? null } });
    if (u.includes('/git/ref/')) return json({ object: { sha: h.sha } });
    if (u.includes('/git/trees/')) return json({ tree: [{ type: 'blob', path: 'content/talks/agents-need-an-identity/index.md', sha: 'blob-' + h.sha }, { type: 'blob', path: 'content/posts/plain/index.md', sha: 'blob-plain' }, { type: 'blob', path: 'content/about-me/index.md', sha: 'x' }] });
    if (u.endsWith('/graphql')) {
      const q = JSON.parse(init.body).query; const repo = {};
      if (q.includes('blob-' + h.sha)) repo.b0 = { text: h.note }; 
      for (const m of q.matchAll(/(b\d+):object\(oid:"([^"]+)"/g)) repo[m[1]] = { text: m[2] === 'blob-plain' ? '---\ntitle: p\n---\n' : h.note };
      return json({ data: { repository: repo } });
    }
    if (u.startsWith('https://getlate.dev/api/v1/inbox/comments?')) { if (h.failList) return json({}, h.failList); return json(h.list); }
    if (u.startsWith('https://getlate.dev/api/v1/inbox/comments/')) {
      const id = decodeURIComponent(u.split('/comments/')[1].split('?')[0]);
      const code = h.failThread[id]; if (code) return json({ error: 'rate_limited' }, code);
      return json({ status: 'success', comments: h.threads[id] || [], pagination: { hasMore: false } });
    }
    throw new Error('unexpected url ' + u);
  };
  h.run = (extra = {}) => run({ fetch: h.fetch, apiKey: 'test-key-not-real', ghToken: 'gh', dataDir, now: NOW, ...extra });
  h.read = f => JSON.parse(readFileSync(join(dataDir, f), 'utf8'));
  return h;
}
const LI_ID = 'urn:li:share:7530541469049229314';

test('URL matching: X, Bluesky and LinkedIn forms agree', () => {
  assert.equal(postKey('x', X_URL), 'x:2124775768513204629');
  assert.equal(postKey('twitter', 'https://twitter.com/i/web/status/2124775768513204629'), 'x:2124775768513204629');
  assert.equal(postKey('x', 'https://twitter.com/damian_flynn/status/2124775768513204629?s=20'), 'x:2124775768513204629');
  assert.equal(postKey('twitter', '2124775768513204629'), 'x:2124775768513204629');
  assert.equal(postKey('bluesky', BSKY_URL), 'bluesky:3n2xokvq4ae2s');
  assert.equal(postKey('bluesky', 'at://did:plc:abc/app.bsky.feed.post/3n2xokvq4ae2s'), 'bluesky:3n2xokvq4ae2s');
  assert.equal(postKey('linkedin', LI_URL), 'linkedin:7530541469049229314');
  assert.equal(postKey('linkedin', 'urn:li:share:7530541469049229314'), 'linkedin:7530541469049229314');
  assert.equal(postKey('linkedin', 'https://www.linkedin.com/feed/update/urn%3Ali%3Ashare%3A7530541469049229314'), 'linkedin:7530541469049229314');
  assert.equal(postKey('mastodon', 'https://social.example/@d/1'), null);
  assert.notEqual(postKey('x', 'https://x.com/a/status/1'), postKey('x', 'https://x.com/a/status/2'));
});

test('front matter: comments links, slug and mastodon', () => {
  const fm = parseFrontMatter(NOTE, 'content/talks/agents-need-an-identity/index.md');
  assert.equal(fm.kind, 'talks'); assert.equal(fm.slug, 'agents-need-an-identity');
  assert.deepEqual(Object.keys(fm.links).sort(), ['bluesky', 'linkedin', 'mastodon', 'x']);
  assert.equal(parseFrontMatter('---\ntitle: x\n---\n', 'content/posts/a/index.md'), null);
  assert.equal(parseFrontMatter(`---\ncomments:\n  x: ${X_URL}\n---\n`, 'content/posts/my-post/index.md').slug, 'my-post');
});

test('new thread: LinkedIn comment written, no avatar URLs, deterministic', async () => {
  const h = harness({ threads: { [LI_ID]: LI_THREAD.comments } });
  const r = await h.run();
  assert.deepEqual(r.changed.sort(), ['_state.json', 'talks-agents-need-an-identity.json']);
  const d = h.read('talks-agents-need-an-identity.json');
  assert.equal(d.page, '/talks/agents-need-an-identity/');
  assert.deepEqual(d.threads.map(t => t.platform), ['x', 'linkedin', 'bluesky']);
  const li = d.threads[1];
  assert.equal(li.count, 1); assert.equal(li.url, LI_URL);
  assert.equal(li.comments[0].text, 'Agree 100% :)');
  assert.equal(li.comments[0].author.name, 'Sohail Shaikh');
  const raw = readFileSync(join(h.dataDir, 'talks-agents-need-an-identity.json'), 'utf8');
  assert.ok(!/picture|licdn|https:\/\/cdn\.example/.test(raw), 'no third-party image URLs');
  assert.equal(raw, serialize(JSON.parse(raw)), 'sorted keys, stable formatting');
  assert.equal(d.threads[0].comments.length, 0);
  assert.equal(h.urls.filter(u => u.includes('/inbox/comments/')).length, 1, 'zero-count threads cost no read');
});

test('no change: second run makes two calls, writes nothing', async () => {
  const h = harness({ threads: { [LI_ID]: LI_THREAD.comments } });
  await h.run();
  h.urls.length = 0;
  const r = await h.run();
  assert.deepEqual(r.changed, []);
  assert.equal(r.calls, 2, h.urls.join('\n'));
  assert.ok(h.urls[0].includes('/git/ref/') && h.urls[1].includes('/inbox/comments?'));
});

test('count change: only the changed thread is fetched; unchanged data is not rewritten', async () => {
  const h = harness({ threads: { [LI_ID]: LI_THREAD.comments } });
  await h.run();
  h.list = LIST({ linkedin: 2 });
  h.threads[LI_ID] = [...LI_THREAD.comments, mkComment('c2', { createdTime: '2026-11-23T12:30:00Z' })];
  h.urls.length = 0;
  const r = await h.run({ now: new Date('2026-11-23T13:00:00Z') });
  assert.equal(h.urls.filter(u => u.includes('/inbox/comments/')).length, 1);
  assert.ok(r.changed.includes('talks-agents-need-an-identity.json'));
  assert.equal(h.read('talks-agents-need-an-identity.json').threads[1].count, 2);
  // fetched but identical content: count says changed, content same -> data file untouched
  h.list = LIST({ linkedin: 3 }); h.urls.length = 0;
  const r2 = await h.run();
  assert.ok(!r2.changed.includes('talks-agents-need-an-identity.json'));
});

test('daily window re-reads threads with comments only', async () => {
  const h = harness({ threads: { [LI_ID]: LI_THREAD.comments } });
  await h.run(); h.urls.length = 0;
  await h.run({ now: new Date('2026-11-24T03:05:00Z') });
  assert.equal(h.urls.filter(u => u.includes('/inbox/comments/')).length, 1);
});

test('429 on the list is non-fatal: data kept, backoff recorded, nothing hammered', async () => {
  const h = harness({ threads: { [LI_ID]: LI_THREAD.comments } });
  await h.run();
  const file = join(h.dataDir, 'talks-agents-need-an-identity.json');
  const before = readFileSync(file, 'utf8');
  h.failList = 429; h.list = LIST({ linkedin: 9 }); h.headers = { 'retry-after': '1200' };
  const r = await h.run({ now: new Date('2026-11-23T12:15:00Z') });
  assert.equal(readFileSync(file, 'utf8'), before, 'stale data is kept, never blanked');
  assert.ok(r.changed.includes('_state.json') && !r.deployable, 'backoff is saved but nothing is deployed');
  const st = h.read('_state.json').threads['linkedin:7530541469049229314'];
  assert.equal(st.consecutiveFailures, 1);
  assert.ok(new Date(st.nextAttempt) - new Date('2026-11-23T12:15:00Z') >= 1200e3, 'Retry-After honoured');
  h.urls.length = 0; h.failList = null; h.headers = {};
  await h.run({ now: new Date('2026-11-23T12:30:00Z') });
  assert.equal(h.urls.filter(u => u.includes('getlate')).length, 0, 'inside the backoff window there are no Zernio calls');
  h.threads[LI_ID] = [...LI_THREAD.comments, mkComment('c9')];
  const r2 = await h.run({ now: new Date('2026-11-23T13:00:00Z') });
  assert.ok(r2.deployable, 'recovers once the backoff has passed');
  assert.equal(h.read('_state.json').threads['linkedin:7530541469049229314'].consecutiveFailures, 0);
});

test('stale data is kept when a thread read fails or comes back empty', async () => {
  const h = harness({ threads: { [LI_ID]: LI_THREAD.comments } });
  await h.run();
  const file = join(h.dataDir, 'talks-agents-need-an-identity.json');
  const before = readFileSync(file, 'utf8');
  h.list = LIST({ linkedin: 2 }); h.failThread = { [LI_ID]: 503 };
  await h.run({ now: new Date('2026-11-23T13:00:00Z') });
  assert.equal(readFileSync(file, 'utf8'), before);
  h.failThread = {}; h.threads[LI_ID] = [];
  const r = await h.run({ now: new Date('2026-11-23T21:00:00Z') });
  assert.equal(readFileSync(file, 'utf8'), before, 'an empty answer for a thread known to have comments is not trusted');
  assert.ok(!r.deployable);
});

test('X rate-limited for 10 runs in a row still commits LinkedIn and Bluesky updates', async () => {
  const XID = '2124775768513204629', BID = 'at://did:plc:abc/app.bsky.feed.post/3n2xokvq4ae2s';
  const h = harness({ threads: { [LI_ID]: [], [BID]: [] }, failThread: { [XID]: 429 } });
  h.headers = { 'retry-after': '60' };
  let t = new Date('2026-11-23T12:00:00Z'); const logs = [];
  for (let i = 1; i <= 10; i++) {
    h.list = LIST({ x: 2, linkedin: i, bluesky: i });
    h.threads[LI_ID] = Array.from({ length: i }, (_, k) => mkComment('li' + k, { createdTime: `2026-11-23T1${k % 10}:00:00Z` }));
    h.threads[BID] = Array.from({ length: i }, (_, k) => mkComment('bs' + k, { createdTime: `2026-11-23T1${k % 10}:00:00Z` }));
    const r = await h.run({ now: t, log: m => logs.push(m) });
    assert.ok(r.deployable, `run ${i} commits the platforms that did change`);
    assert.equal(h.read('talks-agents-need-an-identity.json').threads.find(x => x.platform === 'linkedin').count, i);
    assert.equal(h.read('talks-agents-need-an-identity.json').threads.find(x => x.platform === 'bluesky').count, i);
    t = new Date(t.getTime() + 7 * 3600e3);
  }
  const st = h.read('_state.json');
  assert.equal(st.platforms.x.consecutiveFailures, 10);
  assert.equal(st.platforms.linkedin.consecutiveFailures, 0);
  assert.equal(st.threads['x:2124775768513204629'].consecutiveFailures, 10);
  assert.ok(logs.some(m => m.startsWith('::warning::')), 'warning after 6 failed runs');
  assert.ok(!logs.some(m => m.startsWith('::error::')), 'no error annotation yet');
  assert.ok(!h.read('talks-agents-need-an-identity.json').threads.some(x => x.platform === 'x'), 'X thread was never written; the page keeps its join link');
  for (let i = 11; i <= 25; i++) { await h.run({ now: t, log: m => logs.push(m) }); t = new Date(t.getTime() + 7 * 3600e3); }
  assert.ok(logs.some(m => m.startsWith('::error::')), 'error annotation after 24');
});

test('a failing platform does not block the others, and the run still exits cleanly', async () => {
  const h = harness({ threads: { [LI_ID]: LI_THREAD.comments }, failThread: { '2124775768513204629': 503 } });
  h.list = LIST({ x: 3, linkedin: 1 });
  const r = await h.run();
  assert.ok(r.deployable);
  assert.equal(h.read('talks-agents-need-an-identity.json').threads.find(t => t.platform === 'linkedin').count, 1);
});

test('exponential backoff doubles to a cap and failure counters are per run, not per call', async () => {
  const h = harness({ failList: 500 });
  let t = new Date('2026-11-23T12:00:00Z'); const waits = [];
  for (let i = 0; i < 8; i++) {
    await h.run({ now: t });
    const st = h.read('_state.json').threads['linkedin:7530541469049229314'];
    waits.push((new Date(st.nextAttempt) - t) / 60e3);
    t = new Date(st.nextAttempt);
  }
  assert.deepEqual(waits, [15, 30, 60, 120, 240, 360, 360, 360]);
});

test('age-based polling: young every run, up to 14 days hourly, older daily', async () => {
  const h = harness();
  await h.run({ now: new Date('2026-11-23T12:00:00Z') });
  const created = d => { const st = h.read('_state.json'); for (const k of Object.keys(st.threads)) st.threads[k].created = d; writeFileSync(join(h.dataDir, '_state.json'), JSON.stringify(st)); };
  const zcalls = async now => { h.urls.length = 0; await h.run({ now }); return h.urls.filter(u => u.includes('getlate')).length; };
  created('2026-11-23T08:00:00Z'); // 4 h old
  assert.equal(await zcalls(new Date('2026-11-23T12:20:00Z')), 1);
  created('2026-11-18T08:00:00Z'); // 5 days
  assert.equal(await zcalls(new Date('2026-11-23T12:20:00Z')), 0);
  assert.equal(await zcalls(new Date('2026-11-23T13:05:00Z')), 1);
  created('2026-10-01T08:00:00Z'); // old
  assert.equal(await zcalls(new Date('2026-11-23T13:05:00Z')), 0);
  assert.equal(await zcalls(new Date('2026-11-24T03:05:00Z')), 2, 'daily window: list plus the forced re-read of a thread that has comments');
});

test('call budget: at most N thread reads per run, the rest wait for the next run', async () => {
  const BID = 'at://did:plc:abc/app.bsky.feed.post/3n2xokvq4ae2s', XID = '2124775768513204629';
  const h = harness({ threads: { [LI_ID]: [mkComment('l')], [BID]: [mkComment('b')], [XID]: [mkComment('x')] } });
  h.list = LIST({ x: 1, linkedin: 1, bluesky: 1 });
  await h.run({ maxFetches: 2 });
  assert.equal(h.urls.filter(u => u.includes('/inbox/comments/')).length, 2);
  h.urls.length = 0;
  await h.run({ maxFetches: 2 });
  assert.equal(h.urls.filter(u => u.includes('/inbox/comments/')).length, 1, 'the deferred thread is read next run');
  assert.deepEqual(h.read('talks-agents-need-an-identity.json').threads.map(t => t.count), [1, 1, 1]);
});

test('rate-limit headers: a low X-RateLimit-Remaining stops the run and keeps data', async () => {
  const BID = 'at://did:plc:abc/app.bsky.feed.post/3n2xokvq4ae2s';
  const h = harness({ threads: { [LI_ID]: [mkComment('l')], [BID]: [mkComment('b')] } });
  h.list = LIST({ linkedin: 1, bluesky: 1 });
  h.headers = { 'x-ratelimit-remaining': '3', 'x-ratelimit-limit': '600' };
  const r = await h.run();
  assert.equal(h.urls.filter(u => u.includes('/inbox/comments/')).length, 0, 'no thread reads after the list reported low quota');
  assert.ok(!h.read('talks-agents-need-an-identity.json').threads.some(t => t.platform === 'linkedin'), 'LinkedIn untouched this run');
  h.headers = { 'x-ratelimit-remaining': '500' }; h.urls.length = 0;
  const r2 = await h.run();
  assert.ok(r2.deployable, 'next run proceeds');
});

test('state-only changes are not deployable', async () => {
  const h = harness({ threads: { [LI_ID]: LI_THREAD.comments } });
  const r1 = await h.run();
  assert.ok(r1.deployable);
  h.failList = 500;
  const r2 = await h.run({ now: new Date('2026-11-23T12:20:00Z') });
  assert.deepEqual(r2.changed, ['_state.json']); assert.equal(r2.deployable, false);
});

test('401 from Zernio is fatal; missing key is a quiet no-op', async () => {
  const h = harness({ failList: 401 });
  await assert.rejects(h.run(), /HTTP 401/);
  assert.ok(existsSync(h.dataDir));
  const h2 = harness();
  const r = await h2.run({ apiKey: '' });
  assert.equal(r.calls, 0);
});

test('hidden flag, deny-list and nesting', async () => {
  const tree = [
    mkComment('a', { replies: [mkComment('a1', { replies: [mkComment('a1x', { createdTime: '2026-11-23T10:05:00Z' })], createdTime: '2026-11-23T10:02:00Z' }), mkComment('a2', { isHidden: true })] }),
    mkComment('b', { isHidden: true, replies: [mkComment('b1')] }),
    mkComment('c', { createdTime: '2026-11-23T09:00:00Z' }),
    mkComment('d', { from: { name: 'Damian Flynn', username: 'damianflynn.com', isOwner: true }, likeCount: 3 }),
  ];
  const h = harness({ threads: { [LI_ID]: tree } });
  writeFileSync(join(h.dataDir, '_hidden.json'), '["d"]');
  await h.run();
  const li = h.read('talks-agents-need-an-identity.json').threads[1];
  assert.deepEqual(li.comments.map(c => c.id), ['c', 'a']); // sorted by time; b hidden with its reply; d denied
  const a = li.comments[1];
  assert.deepEqual(a.replies.map(r => r.id), ['a1']);
  assert.deepEqual(a.replies[0].replies.map(r => r.id), ['a1x']);
  assert.equal(li.count, 4);
  const own = normaliseComments([mkComment('o', { from: { name: 'Damian Flynn', username: '@damian', isOwner: true } })]);
  assert.equal(own[0].isOwner, true); assert.equal(own[0].author.handle, 'damian');
  assert.equal(normaliseComments([mkComment('p')])[0].isOwner, undefined);
});

test('plain text: markup stripped, length capped', () => {
  assert.equal(plainText('<p>Hi <b>there</b> &amp; <a href="https://x.example">link</a></p><script>alert(1)</script>'), 'Hi there & link');
  assert.equal(plainText('a<br>b'), 'a\nb');
  assert.ok(plainText('x'.repeat(5000)).length <= 2000);
});

test('garden scan is skipped while the garden sha is unchanged and new blobs only are read', async () => {
  const h = harness();
  await h.run();
  assert.ok(h.urls.some(u => u.endsWith('/graphql')));
  h.urls.length = 0; await h.run();
  assert.ok(!h.urls.some(u => u.includes('/git/trees/') || u.endsWith('/graphql')));
  h.sha = 'sha2'; h.note = NOTE; h.urls.length = 0; await h.run();
  assert.ok(h.urls.some(u => u.includes('/git/trees/')));
  const state = h.read('_state.json');
  assert.equal(state.gardenSha, 'sha2');
  assert.ok(Object.keys(state.pages).length === 1);
});

test('the script never prints the key', async () => {
  const lines = []; const h = harness({ failList: 429 });
  await h.run({ log: m => lines.push(m) });
  assert.ok(lines.length > 0 && !lines.join('\n').includes('test-key-not-real'));
});

// ---------- data/social: the second source of thread links ----------
function socialDir(files) {
  const dir = mkdtempSync(join(tmpdir(), 'soc-'));
  for (const [n, d] of Object.entries(files)) writeFileSync(join(dir, n), typeof d === 'string' ? d : JSON.stringify(d));
  return dir;
}
const X2 = 'https://x.com/damian_flynn/status/5555';
const X_LIST = () => { const l = LIST({ x: 0 }); l.data.push(listItem('twitter', '5555', 'https://twitter.com/i/web/status/5555', 0)); return l; };

test('union: a page with no front matter links is followed through data/social alone', async () => {
  const h = harness({ list: X_LIST() });
  const socialDirPath = socialDir({ 'posts-plain.json': { page: '/posts/plain/', links: { x: X2 }, updatedAt: 't' } });
  await h.run({ socialDir: socialDirPath });
  const d = h.read('posts-plain.json');
  assert.equal(d.page, '/posts/plain/');
  assert.deepEqual(d.threads.map(t => [t.platform, t.url]), [['x', X2]]);
});

test('union: front matter wins per network and data fills the gaps; pages absent from the garden still sync', async () => {
  const other = 'https://x.com/damian_flynn/status/9999';
  const dir = socialDir({
    'talks-agents-need-an-identity.json': { page: '/talks/agents-need-an-identity/', links: { x: other, mastodon: 'https://social.example/@d/7' }, updatedAt: 't' },
    'posts-only-in-data.json': { page: '/posts/only-in-data/', links: { x: X2 }, updatedAt: 't' },
  });
  const pages = unionPages([{ kind: 'talks', slug: 'agents-need-an-identity', src: 'content/talks/agents-need-an-identity/index.md', links: { x: X_URL, bluesky: BSKY_URL } }], readSocialPages(dir));
  assert.equal(pages.length, 2);
  const talk = pages.find(p => p.slug === 'agents-need-an-identity');
  assert.deepEqual(talk.links, { bluesky: BSKY_URL, mastodon: 'https://social.example/@d/7', x: X_URL });
  assert.equal(pages.find(p => p.slug === 'only-in-data').src, 'data/social/posts-only-in-data.json');
  const h = harness({ list: X_LIST() });
  await h.run({ socialDir: dir });
  assert.equal(h.read('talks-agents-need-an-identity.json').threads.find(t => t.platform === 'x').url, X_URL);
});

test('union: invalid, mismatched or malformed data files are ignored', () => {
  const dir = socialDir({
    'posts-a.json': { page: '/posts/a/', links: { x: 'javascript:alert(1)', bluesky: 'http://bsky.app/profile/a/post/3n2xokvq4ae2s', linkedin: 'https://evil.example/www.linkedin.com/feed/update/1' }, updatedAt: 't' },
    'posts-b.json': { page: '/posts/not-b/', links: { x: X2 }, updatedAt: 't' },
    'posts-c.json': 'not json',
    'notes.json': { page: '/posts/n/', links: { x: X2 } },
    '_state.json': {},
  });
  assert.deepEqual(readSocialPages(dir), []);
  assert.deepEqual(readSocialPages(join(dir, 'missing')), []);
  assert.deepEqual(readSocialPages(null), []);
});

test('union keeps the cheap path: a second run with unchanged data makes two calls and writes nothing', async () => {
  const h = harness({ list: X_LIST() });
  const dir = socialDir({ 'posts-plain.json': { page: '/posts/plain/', links: { x: X2 }, updatedAt: 't' } });
  await h.run({ socialDir: dir });
  h.urls.length = 0;
  const r = await h.run({ socialDir: dir });
  assert.deepEqual(r.changed, []); assert.equal(r.calls, 2);
});


import { isSeedComment } from './sync-comments.mjs';
test('the announcement\'s own link comment is not part of the conversation', () => {
  const owner = { id: 's1', message: 'The full post: https://damianflynn.com/posts/x/', createdTime: '2026-11-24T09:00:30Z', from: { name: 'D', username: 'd', isOwner: true }, replies: [] };
  const until = Date.parse('2026-11-24T09:00:00Z') + 10 * 60 * 1000;
  assert.equal(isSeedComment(owner, until), true);
  assert.deepEqual(normaliseComments([owner], new Set(), { seedUntil: until }), []);
  // later than the window, no link, replies underneath, not the owner, or no window given: all kept
  assert.equal(isSeedComment({ ...owner, createdTime: '2026-11-24T10:00:00Z' }, until), false);
  assert.equal(isSeedComment({ ...owner, message: 'Thanks for reading' }, until), false);
  assert.equal(isSeedComment({ ...owner, replies: [{ id: 'r' }] }, until), false);
  assert.equal(isSeedComment({ ...owner, from: { name: 'P', username: 'p', isOwner: false } }, until), false);
  assert.equal(isSeedComment(owner, undefined), false);
  assert.equal(normaliseComments([owner]).length, 1);
});
