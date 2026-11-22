// Run: node --test tests/pulse-proxy.test.mjs   (Node 20+)
import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/pulse/[[path]].js';

function run(path, init = {}) {
  const calls = [];
  globalThis.fetch = async (target, opts) => { calls.push({ target: String(target), opts }); return new Response('ok', { status: 200 }); };
  const request = new Request('https://example.test' + path, init);
  return onRequest({ request }).then((response) => ({ response, calls }));
}

test('forwards the script to /api with the query string', async () => {
  const { response, calls } = await run('/pulse/script.js?siteId=abc');
  assert.equal(response.status, 200);
  assert.equal(calls[0].target, 'https://pulse.deercrest.info/api/script.js?siteId=abc');
  assert.equal(response.headers.get('Cache-Control'), 'public, max-age=3600');
});

test('forwards a track POST with the visitor address, without cookies', async () => {
  const { calls } = await run('/pulse/track', { method: 'POST', body: '{}', headers: { 'CF-Connecting-IP': '203.0.113.9', Cookie: 'a=b', Authorization: 'x' } });
  const h = calls[0].opts.headers;
  assert.equal(calls[0].target, 'https://pulse.deercrest.info/api/track');
  assert.equal(h.get('X-Real-IP'), '203.0.113.9');
  assert.equal(h.get('X-Forwarded-For'), '203.0.113.9');
  assert.equal(h.get('cookie'), null);
  assert.equal(h.get('authorization'), null);
});

test('refuses everything outside the tracking endpoints', async () => {
  for (const path of ['/pulse/', '/pulse/sites', '/pulse/overview/abc', '/pulse/../x', '/pulse/script.js/extra', '/pulse/site/tracking-config/a/b']) {
    const { response, calls } = await run(path);
    assert.equal(response.status, 404, path);
    assert.equal(calls.length, 0, path);
  }
});

test('refuses other methods', async () => {
  const { response, calls } = await run('/pulse/track', { method: 'DELETE' });
  assert.equal(response.status, 405);
  assert.equal(calls.length, 0);
});
