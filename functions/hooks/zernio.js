// Zernio webhook receiver (Cloudflare Pages Function) at POST /hooks/zernio.
// Deliberately thin: verify the signature, then ask GitHub Actions to do the work. It never logs a body, header or secret.
//   env.ZERNIO_WEBHOOK_SECRET  shared secret registered with Zernio (HMAC-SHA256 over the raw body, lowercase hex)
//   env.GITHUB_DISPATCH_TOKEN  fine-grained token: this repository only, "Actions: Read and write", nothing else
export const MAX_BODY = 256 * 1024;
export const REPO = 'DamianFlynn/damianflynn.github.io';
export const WORKFLOW = 'social-links.yaml';
const EVENTS = new Set(['post.platform.published', 'post.published']);
const POST_ID = /^[0-9a-f]{24}$/;
const EVENT_ID = /^[A-Za-z0-9-]{8,64}$/;
const SIGNATURE = /^[0-9a-f]{64}$/;
const DISPATCH_TIMEOUT_MS = 4000;

const reply = (status, body = '', headers = {}) => new Response(body, { status, headers: { 'cache-control': 'no-store', ...headers } });
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');

export async function sign(secret, bytes) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, bytes));
}
// Constant time over two equal-length strings; the length is public, the content is not.
function equal(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
export async function verify(secret, bytes, header) {
  const got = String(header || '').trim().toLowerCase();
  if (!secret || !SIGNATURE.test(got)) return false;
  return equal(await sign(secret, bytes), got);
}

// Reads at most MAX_BODY bytes; returns null when the body is larger.
async function readLimited(request) {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_BODY) return null;
  if (!request.body) return new Uint8Array(0);
  const reader = request.body.getReader();
  const chunks = []; let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY) { try { await reader.cancel(); } catch { /* ignore */ } return null; }
    chunks.push(value);
  }
  const out = new Uint8Array(size); let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.byteLength; }
  return out;
}

// One catch-all export (not onRequestPost + onRequest) so routing precedence between the two can never matter.
export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return reply(405, 'Method not allowed', { allow: 'POST' });
  const bytes = await readLimited(request);
  if (bytes === null) return reply(413, 'Payload too large');
  const signature = request.headers.get('x-zernio-signature') || request.headers.get('x-late-signature');
  // Nothing below this line runs for an unsigned or wrongly signed request.
  if (!env?.ZERNIO_WEBHOOK_SECRET) return reply(503, 'Not configured');
  if (!(await verify(env.ZERNIO_WEBHOOK_SECRET, bytes, signature))) return reply(401, 'Invalid signature');

  let payload;
  try { payload = JSON.parse(new TextDecoder().decode(bytes)); } catch { return reply(400, 'Invalid JSON'); }
  const event = payload?.event;
  if (payload?.test === true || !EVENTS.has(event)) return reply(200, 'Ignored');
  const postId = payload?.post?.id; const eventId = payload?.id;
  if (!POST_ID.test(String(postId)) || !EVENT_ID.test(String(eventId))) return reply(400, 'Unexpected payload');
  if (!env.GITHUB_DISPATCH_TOKEN) return reply(503, 'Not configured');

  let res;
  try {
    res = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.GITHUB_DISPATCH_TOKEN}`,
        accept: 'application/vnd.github+json',
        'content-type': 'application/json',
        'x-github-api-version': '2022-11-28',
        'user-agent': 'damianflynn-zernio-hook',
      },
      body: JSON.stringify({ ref: 'main', inputs: { post_id: postId, event_id: eventId, event } }),
      signal: AbortSignal.timeout(DISPATCH_TIMEOUT_MS),
    });
  } catch { return reply(502, 'Dispatch failed'); } // 5xx: Zernio retries with back-off
  return res.status === 204 ? reply(202, 'Accepted') : reply(502, 'Dispatch failed');
}
