// Run: node --test tests/*.test.mjs   (Node 20+)
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseReader, buildEvent, send, serveFeed } from '../functions/_shared/feed.js';
import { onRequest as proxy } from '../functions/pulse/[[path]].js';

function capture() {
  const calls = [];
  globalThis.fetch = async (target, opts) => { calls.push({ target: String(target), opts }); return new Response('ok'); };
  return calls;
}
const env = (extra = {}) => ({ ASSETS: { fetch: async () => new Response('<rss/>', { status: 200 }) }, ...extra });

test('reads the hosted subscriber count from the agent', () => {
  assert.deepEqual(parseReader('Feedly/1.0 (+http://www.feedly.com/fetcher.html; 1,234 subscribers; like FeedFetcher-Google)'), { reader: 'Feedly', kind: 'reader', subscribers: 1234 });
  assert.equal(parseReader('Inoreader/1.0 (+http://www.inoreader.com; 17 subscribers)').subscribers, 17);
  assert.equal(parseReader('NetNewsWire (RSS Reader; https://netnewswire.com/)').reader, 'NetNewsWire');
  assert.equal(parseReader('Mozilla/5.0 (compatible; Googlebot/2.1)').kind, 'crawler');
  assert.equal(parseReader('curl/8.0').reader, 'other');
  assert.equal(parseReader('SomeNewReader/2.0; 5 subscribers').reader, 'hosted reader');
});

test('the event carries the reader and a browser agent, never the real one', () => {
  const e = buildEvent({ name: 'rss_fetch', pathname: '/index.xml', hostname: 'example.test', ip: '203.0.113.9', userAgent: 'Feedly/1.0 (3 subscribers)' });
  assert.equal(e.type, 'custom_event'); assert.equal(e.tag, 'rss'); assert.equal(e.ip_address, '203.0.113.9');
  assert.ok(e.user_agent.startsWith('Mozilla/5.0'));
  assert.deepEqual(JSON.parse(e.properties), { reader: 'Feedly', kind: 'reader', subscribers: 3 });
});

test('nothing is sent without the key; with it the key travels as a bearer token', async () => {
  const calls = capture();
  await send({}, { a: 1 }); assert.equal(calls.length, 0);
  await send({ RYBBIT_API_KEY: 'k' }, { a: 1 });
  assert.equal(calls[0].target, 'https://pulse.deercrest.info/api/track');
  assert.equal(calls[0].opts.headers.Authorization, 'Bearer k');
});

test('a feed fetch is served untouched and counted in the background; crawlers and HEAD are not', async () => {
  const calls = capture(); const pending = [];
  const wait = (p) => pending.push(p);
  const mk = (ua, method = 'GET') => new Request('https://example.test/index.xml', { method, headers: { 'User-Agent': ua, 'CF-Connecting-IP': '203.0.113.9' } });
  const r = await serveFeed({ request: mk('Feedly/1.0 (9 subscribers)'), env: env({ RYBBIT_API_KEY: 'k' }), waitUntil: wait });
  await Promise.all(pending); assert.equal(await r.text(), '<rss/>'); assert.equal(calls.length, 1);
  assert.equal(JSON.parse(JSON.parse(calls[0].opts.body).properties).subscribers, 9);
  await serveFeed({ request: mk('Googlebot/2.1'), env: env({ RYBBIT_API_KEY: 'k' }), waitUntil: wait });
  await serveFeed({ request: mk('Feedly/1.0 (9 subscribers)', 'HEAD'), env: env({ RYBBIT_API_KEY: 'k' }), waitUntil: wait });
  await Promise.all(pending); assert.equal(calls.length, 1);
});

test('the item pixel returns a gif and counts one view', async () => {
  const calls = capture(); const pending = [];
  const request = new Request('https://example.test/pulse/p/some-post.gif', { headers: { 'User-Agent': 'Inoreader/1.0 (4 subscribers)' } });
  const response = await proxy({ request, env: { RYBBIT_API_KEY: 'k' }, waitUntil: (p) => pending.push(p) });
  await Promise.all(pending);
  assert.equal(response.headers.get('Content-Type'), 'image/gif');
  const body = JSON.parse(calls[0].opts.body);
  assert.equal(body.event_name, 'rss_view'); assert.equal(body.pathname, '/posts/some-post/');
  assert.equal(JSON.parse(body.properties).slug, 'some-post');
  const bad = await proxy({ request: new Request('https://example.test/pulse/p/Bad_Slug.gif'), env: {}, waitUntil() {} });
  assert.equal(bad.status, 404);
});
