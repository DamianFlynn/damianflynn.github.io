import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/_middleware.js';

test('www goes to the apex, path and query kept, permanently', async () => {
  const r = await onRequest({ request: new Request('https://www.damianflynn.com/posts/x/?a=1'), next: async () => new Response('page') });
  assert.equal(r.status, 301);
  assert.equal(r.headers.get('Location'), 'https://damianflynn.com/posts/x/?a=1');
});

test('the apex and the pages.dev address pass through', async () => {
  for (const host of ['damianflynn.com', 'damianflynn.pages.dev', 'preview.damianflynn-preview.pages.dev']) {
    const r = await onRequest({ request: new Request('https://' + host + '/'), next: async () => new Response('page') });
    assert.equal(await r.text(), 'page', host);
  }
});
