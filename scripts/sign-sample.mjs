#!/usr/bin/env node
// Compute the Zernio signature for a sample payload, locally. The secret comes from the environment only.
//   ZERNIO_WEBHOOK_SECRET=... node scripts/sign-sample.mjs <post_id> [post.platform.published|post.published]
//   ... add --send <url> to POST it (e.g. a `wrangler pages dev` address). A real event id makes the workflow run; use a real post id.
import { createHmac, randomUUID } from 'node:crypto';

const secret = process.env.ZERNIO_WEBHOOK_SECRET;
const [postId, event = 'post.platform.published'] = process.argv.slice(2).filter(a => !a.startsWith('--') && !a.startsWith('http'));
if (!secret || !/^[0-9a-f]{24}$/.test(postId || '')) {
  console.error('usage: ZERNIO_WEBHOOK_SECRET=... node scripts/sign-sample.mjs <24-hex post id> [event] [--send <url>]');
  process.exit(2);
}
const body = JSON.stringify({ id: randomUUID(), event, timestamp: new Date().toISOString(), post: { id: postId, status: 'published', platforms: [] } });
const signature = createHmac('sha256', secret).update(body).digest('hex');
const at = process.argv.indexOf('--send');
if (at < 0) {
  console.log(`X-Zernio-Signature: ${signature}\nX-Zernio-Event: ${event}\n\n${body}`);
} else {
  const res = await fetch(process.argv[at + 1], { method: 'POST', headers: { 'content-type': 'application/json', 'x-zernio-event': event, 'x-zernio-signature': signature }, body });
  console.log(`HTTP ${res.status} ${await res.text()}`);
}
