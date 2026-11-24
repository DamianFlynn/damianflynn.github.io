// Feed-reader metrics for a static site on Cloudflare Pages.
// Readers do not run JavaScript, so the site counts them on the server:
//  - a fetch of a feed is one `rss_fetch` event (reader name and the subscriber
//    count that hosted readers such as Feedly put in their user agent);
//  - a 1x1 image at the end of each feed item is one `rss_view` event (the item
//    was displayed in a reader that loads images).
// Events go to the self-hosted Rybbit instance with an API key kept in the Pages
// secret RYBBIT_API_KEY. Without the key nothing is sent and the site still works.

export const RYBBIT = 'https://pulse.deercrest.info';
export const SITE_ID = '82add8b3b627';

const READERS = [
  ['Feedly', /feedly/i], ['Inoreader', /inoreader/i], ['NewsBlur', /newsblur/i], ['Feedbin', /feedbin/i],
  ['The Old Reader', /theoldreader/i], ['Feedspot', /feedspot/i], ['Flipboard', /flipboard/i],
  ['Miniflux', /miniflux/i], ['FreshRSS', /freshrss/i], ['Tiny Tiny RSS', /tiny tiny rss|tt-rss/i],
  ['NetNewsWire', /netnewswire/i], ['Reeder', /reeder/i], ['Thunderbird', /thunderbird/i],
  ['Newsboat', /newsboat/i], ['Fluent Reader', /fluent reader/i], ['Vienna', /vienna/i],
  ['Akregator', /akregator/i], ['Feeder', /feeder\.co/i], ['Readwise', /readwise/i], ['Follow', /follow\//i],
];
const CRAWLERS = /googlebot|bingbot|duckduckbot|yandex|baidu|applebot|ahrefs|semrush|mj12|petalbot|facebookexternalhit|slackbot|twitterbot|linkedinbot/i;

export function parseReader(userAgent) {
  const ua = String(userAgent || '');
  if (CRAWLERS.test(ua)) return { reader: 'crawler', kind: 'crawler', subscribers: 0 };
  const match = ua.match(/(\d[\d,]*)\s+subscribers?/i);
  const subscribers = match ? Number(match[1].replace(/,/g, '')) : 0;
  for (const [name, re] of READERS) if (re.test(ua)) return { reader: name, kind: 'reader', subscribers };
  return { reader: subscribers ? 'hosted reader' : 'other', kind: subscribers ? 'reader' : 'unknown', subscribers };
}

// A browser-looking agent keeps the event out of the bot filter; the real reader is in the properties and the tag.
const EVENT_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

export function buildEvent({ name, pathname, hostname, ip, userAgent, extra = {} }) {
  const info = parseReader(userAgent);
  return {
    site_id: SITE_ID,
    type: 'custom_event',
    event_name: name,
    pathname,
    hostname,
    tag: 'rss',
    ip_address: ip || undefined,
    user_agent: EVENT_AGENT,
    properties: JSON.stringify({ reader: info.reader, kind: info.kind, subscribers: info.subscribers, ...extra }),
  };
}

export function send(env, event) {
  if (!env || !env.RYBBIT_API_KEY || !event) return Promise.resolve(null);
  return fetch(RYBBIT + '/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + env.RYBBIT_API_KEY },
    body: JSON.stringify(event),
  }).catch(() => null);
}

// Serve the static feed untouched and count the fetch in the background.
// The response, including a 304 with its ETag, Last-Modified and Cache-Control, is returned as the
// asset store produced it. A reader revalidating with If-None-Match / If-Modified-Since is still a
// feed fetch, so 200 and 304 both count; errors and redirects do not.
export async function serveFeed({ request, env, waitUntil }) {
  const response = await env.ASSETS.fetch(request);
  if (request.method === 'GET' && (response.ok || response.status === 304)) {
    const url = new URL(request.url);
    const event = buildEvent({
      name: 'rss_fetch', pathname: url.pathname, hostname: url.hostname,
      ip: request.headers.get('CF-Connecting-IP'), userAgent: request.headers.get('User-Agent'),
      extra: { feed: url.pathname },
    });
    if (event && JSON.parse(event.properties).kind !== 'crawler') waitUntil(send(env, event));
  }
  return response;
}

const GIF = Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'), (c) => c.charCodeAt(0));

export function pixelResponse() {
  return new Response(GIF, { headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'private, no-store, max-age=0' } });
}
