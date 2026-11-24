import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readdirSync, existsSync } from 'node:fs';
import { onRequest, sign, verify, MAX_BODY } from '../functions/hooks/zernio.js';
import { onRequest as middleware } from '../functions/_middleware.js';
import { onRequest as pulse } from '../functions/pulse/[[path]].js';

const SECRET = 'test-secret-not-real';
const TOKEN = 'gh-token-not-real';
const env = { ZERNIO_WEBHOOK_SECRET: SECRET, GITHUB_DISPATCH_TOKEN: TOKEN };
const POST = '6b04d54a0b5053e8bfd819c6';
const EVT = '0b1f1c2e-5d9a-4c53-9b61-111111111111';
const body = (over = {}) => JSON.stringify({ id: EVT, event: 'post.platform.published', timestamp: '2026-11-24T09:03:09.000Z', post: { id: POST, status: 'published', platforms: [] }, platform: { name: 'linkedin', status: 'published' }, ...over });
const hmac = (raw, secret = SECRET) => createHmac('sha256', secret).update(raw).digest('hex');
const req = (raw, headers = {}, method = 'POST', url = 'https://damianflynn.com/hooks/zernio') => new Request(url, { method, body: method === 'GET' || method === 'HEAD' ? undefined : raw, headers });
const signed = (raw, name = 'x-zernio-signature') => req(raw, { [name]: hmac(raw), 'content-type': 'application/json' });

function withFetch(fn, impl) {
  const calls = []; const real = globalThis.fetch;
  globalThis.fetch = async (url, init) => { calls.push({ url: String(url), init }); return impl ? impl(url, init) : new Response(null, { status: 204 }); };
  return fn(calls).finally(() => { globalThis.fetch = real; });
}

test('verify: valid, wrong key, missing, altered body, legacy alias, malformed', async () => {
  const raw = body();
  assert.equal(await sign(SECRET, new TextEncoder().encode(raw)), hmac(raw));
  assert.equal(await verify(SECRET, new TextEncoder().encode(raw), hmac(raw)), true);
  assert.equal(await verify(SECRET, new TextEncoder().encode(raw), hmac(raw).toUpperCase()), true);
  assert.equal(await verify(SECRET, new TextEncoder().encode(raw), hmac(raw, 'other')), false);
  assert.equal(await verify(SECRET, new TextEncoder().encode(raw), ''), false);
  assert.equal(await verify(SECRET, new TextEncoder().encode(raw), null), false);
  assert.equal(await verify(SECRET, new TextEncoder().encode(raw + ' '), hmac(raw)), false);
  assert.equal(await verify(SECRET, new TextEncoder().encode(raw), 'sha256=' + hmac(raw)), false);
  assert.equal(await verify('', new TextEncoder().encode(raw), hmac(raw, '')), false);
});

test('a good signature dispatches the workflow with the minimum inputs and answers 202', async () => {
  await withFetch(async calls => {
    const r = await onRequest({ request: signed(body()), env });
    assert.equal(r.status, 202);
    assert.equal(calls.length, 1);
    const c = calls[0];
    assert.equal(c.url, 'https://api.github.com/repos/DamianFlynn/damianflynn.github.io/actions/workflows/social-links.yaml/dispatches');
    assert.equal(c.init.method, 'POST');
    assert.equal(c.init.headers.authorization, `Bearer ${TOKEN}`);
    assert.equal(c.init.headers.accept, 'application/vnd.github+json');
    assert.ok(c.init.headers['user-agent']);
    assert.deepEqual(JSON.parse(c.init.body), { ref: 'main', inputs: { post_id: POST, event_id: EVT, event: 'post.platform.published' } });
    assert.ok(c.init.signal, 'dispatch has a timeout');
  });
});

test('the legacy X-Late-Signature header is accepted; post.published too', async () => {
  await withFetch(async calls => {
    const raw = body({ event: 'post.published' });
    assert.equal((await onRequest({ request: signed(raw, 'x-late-signature'), env })).status, 202);
    assert.equal(JSON.parse(calls[0].init.body).inputs.event, 'post.published');
  });
});

test('bad, missing or wrong-key signatures are 401 and nothing is dispatched', async () => {
  await withFetch(async calls => {
    const raw = body();
    for (const headers of [{}, { 'x-zernio-signature': 'abc' }, { 'x-zernio-signature': hmac(raw, 'wrong') }, { 'x-zernio-signature': hmac(raw + 'x') }, { 'x-zernio-signature': '' }]) {
      assert.equal((await onRequest({ request: req(raw, headers), env })).status, 401, JSON.stringify(headers));
    }
    assert.equal(calls.length, 0);
  });
});

test('wrong methods are 405 with Allow: POST', async () => {
  for (const m of ['GET', 'HEAD', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']) {
    const r = await onRequest({ request: req('', {}, m), env });
    assert.equal(r.status, 405, m); assert.equal(r.headers.get('allow'), 'POST');
  }
});

test('oversized bodies are 413, by declared length and by streamed length, before any signature work', async () => {
  const big = 'x'.repeat(MAX_BODY + 1);
  assert.equal((await onRequest({ request: req(big, { 'x-zernio-signature': hmac(big) }), env })).status, 413);
  const lying = new Request('https://damianflynn.com/hooks/zernio', { method: 'POST', body: big, headers: { 'content-length': '10' } });
  assert.equal((await onRequest({ request: lying, env })).status, 413);
  const exact = 'x'.repeat(MAX_BODY);
  assert.equal((await onRequest({ request: req(exact, { 'x-zernio-signature': hmac(exact) }), env })).status, 400); // signed, within the limit, but not JSON
});

test('other events, test samples and unusable payloads never dispatch', async () => {
  await withFetch(async calls => {
    for (const e of ['post.failed', 'post.scheduled', 'post.platform.failed', 'comment.received', 'webhook.test', undefined]) {
      assert.equal((await onRequest({ request: signed(body({ event: e })), env })).status, 200, String(e));
    }
    assert.equal((await onRequest({ request: signed(body({ test: true })), env })).status, 200);
    assert.equal(calls.length, 0);
    for (const over of [{ post: { id: '../../x' } }, { post: {} }, { id: 'short' }, { id: 'a b c d e f g h' }]) {
      assert.equal((await onRequest({ request: signed(body(over)), env })).status, 400, JSON.stringify(over));
    }
    assert.equal((await onRequest({ request: signed('not json'), env })).status, 400);
    assert.equal(calls.length, 0);
  });
});

test('missing configuration is a 503 and does no work; GitHub failures are 502 so Zernio retries', async () => {
  await withFetch(async calls => {
    assert.equal((await onRequest({ request: signed(body()), env: {} })).status, 503);
    assert.equal((await onRequest({ request: signed(body()), env: { ZERNIO_WEBHOOK_SECRET: SECRET } })).status, 503);
    assert.equal(calls.length, 0);
  });
  await withFetch(async () => assert.equal((await onRequest({ request: signed(body()), env })).status, 502), async () => new Response('{}', { status: 403 }));
  await withFetch(async () => assert.equal((await onRequest({ request: signed(body()), env })).status, 502), async () => { throw new Error('timeout'); });
});

test('nothing is logged: no body, header or secret reaches the console', async () => {
  const seen = []; const orig = {};
  for (const k of ['log', 'info', 'warn', 'error', 'debug']) { orig[k] = console[k]; console[k] = (...a) => seen.push(a.join(' ')); }
  try {
    await withFetch(async () => {
      await onRequest({ request: signed(body()), env });
      await onRequest({ request: req(body(), { 'x-zernio-signature': 'bad' }), env });
      await onRequest({ request: req('x'.repeat(MAX_BODY + 1)), env });
    }, async () => { throw new Error('boom'); });
  } finally { Object.assign(console, orig); }
  assert.deepEqual(seen, []);
});

test('routing: the Function lives at /hooks/zernio next to the middleware and the /pulse proxy', async () => {
  const files = [];
  const walk = d => { for (const e of readdirSync(new URL(d, import.meta.url), { withFileTypes: true })) { const p = d + e.name; e.isDirectory() ? walk(p + '/') : files.push(p); } };
  walk('../functions/');
  assert.ok(files.includes('../functions/hooks/zernio.js'));
  assert.ok(files.includes('../functions/_middleware.js'));
  assert.ok(files.includes('../functions/pulse/[[path]].js'));
  assert.equal(existsSync(new URL('../static/_routes.json', import.meta.url)), false, 'a _routes.json would restrict which paths invoke Functions');
});

test('middleware passes /hooks/zernio through untouched and still redirects www; /pulse is still limited to its allow-list', async () => {
  const chain = async (request) => middleware({ request, next: () => onRequest({ request, env }) });
  await withFetch(async calls => {
    const raw = body(); const r = await chain(req(raw, { 'x-zernio-signature': hmac(raw) }));
    assert.equal(r.status, 202); assert.equal(calls.length, 1);
    assert.equal((await chain(req(raw, {}))).status, 401);
    const www = await chain(req(raw, { 'x-zernio-signature': hmac(raw) }, 'POST', 'https://www.damianflynn.com/hooks/zernio'));
    assert.equal(www.status, 301); assert.equal(www.headers.get('location'), 'https://damianflynn.com/hooks/zernio');
    assert.equal(calls.length, 1, 'a www request is redirected before any work');
    const p = await pulse({ request: new Request('https://damianflynn.com/pulse/admin/users'), env: {}, waitUntil() {} });
    assert.equal(p.status, 404);
  });
});
