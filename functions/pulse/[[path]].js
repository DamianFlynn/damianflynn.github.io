// First-party proxy for the self-hosted Rybbit instance (Cloudflare Pages Function).
// /pulse/<name> is forwarded to https://pulse.deercrest.info/api/<name>. Only the
// public tracking endpoints are reachable; every other path, including the admin
// API, answers 404, so this is not an open proxy.
const RYBBIT = 'https://pulse.deercrest.info';
const ALLOWED = [
  /^script\.js$/,
  /^replay\.js$/,
  /^track$/,
  /^identify$/,
  /^site\/tracking-config\/[A-Za-z0-9_-]+$/,
  /^site\/[A-Za-z0-9_-]+\/feature-flags\/evaluate$/,
  /^session-replay\/record\/[A-Za-z0-9_-]+$/,
];

export async function onRequest({ request }) {
  const url = new URL(request.url);
  const name = url.pathname.replace(/^\/pulse\//, '');
  if (!ALLOWED.some((re) => re.test(name))) return new Response('Not found', { status: 404 });
  if (!['GET', 'HEAD', 'POST', 'OPTIONS'].includes(request.method)) return new Response('Method not allowed', { status: 405 });

  const ip = request.headers.get('CF-Connecting-IP') || '';
  const headers = new Headers(request.headers);
  for (const h of ['cookie', 'authorization', 'cf-connecting-ip', 'host']) headers.delete(h);
  if (ip) { headers.set('X-Real-IP', ip); headers.set('X-Forwarded-For', ip); }

  const target = new URL('/api/' + name, RYBBIT);
  target.search = url.search;
  const response = await fetch(target, {
    method: request.method,
    headers,
    body: request.method === 'POST' ? request.body : undefined,
    redirect: 'manual',
  });
  const out = new Response(response.body, response);
  if (request.method === 'GET' && name.endsWith('.js')) out.headers.set('Cache-Control', 'public, max-age=3600');
  return out;
}
