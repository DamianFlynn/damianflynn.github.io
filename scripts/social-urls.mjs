// Strict, offline validation of the thread links the site accepts (never fetches or rewrites a URL).
// Mirrors the vault validator (neocortex-platform scripts/content-comments.py): same patterns, same 300-char cap,
// full-string match, no whitespace or control characters anywhere. Used by the social-links writer and by sync-comments.
export const PLATFORMS = ['bluesky', 'x', 'linkedin', 'mastodon'];
export const MAX_URL = 300;

const PREFIX = String.raw`^(?!.*[\s\u0000- \u007f-\u009f])https://`;
const QUERY = String.raw`(?:\?[^#]*)?$`;
const NAME = String.raw`[^/?#@:]+`;
const AN = String.raw`[\p{L}\p{N}]`;
const LABEL = `${AN}(?:(?:${AN}|-)*${AN})?`;
const H = '[0-9A-Fa-f]{1,4}';
const OCTET = '(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])';
const IPV4 = `${OCTET}(?:\\.${OCTET}){3}`;
const V6 = [`(?:${H}:){7}${H}`, `(?:${H}:){1,7}:`, `:(?::${H}){1,7}`, '::'];
for (let n = 1; n <= 6; n++) V6.push(`(?:${H}:){1,${7 - n}}(?::${H}){1,${n}}`);
V6.push(`(?:${H}:){6}${IPV4}`, `::(?:${H}:){0,5}${IPV4}`);
for (let n = 1; n <= 5; n++) V6.push(`(?:${H}:){${n}}:(?:${H}:){0,${5 - n}}${IPV4}`);
const HOST = `(?:${LABEL}(?:\\.${LABEL})*\\.?|\\[(?:${V6.join('|')})\\])`;

export const PATTERNS = {
  bluesky: new RegExp(PREFIX + String.raw`bsky\.app/profile/[^/?#@]+/post/[A-Za-z0-9]{10,20}` + QUERY, 'u'),
  mastodon: new RegExp(PREFIX + HOST + String.raw`(?::[0-9]{1,5})?/(?:@` + NAME + String.raw`/[0-9]+|users/` + NAME + String.raw`/statuses/[0-9]+)` + QUERY, 'u'),
  x: new RegExp(PREFIX + String.raw`(?:x\.com|twitter\.com)/` + NAME + String.raw`/status/[0-9]+` + QUERY, 'u'),
  linkedin: new RegExp(PREFIX + String.raw`www\.linkedin\.com/(?:feed/update/|posts/)[^#]*` + QUERY, 'u'),
};

// The links this pipeline WRITES are narrower than the validator allows: one canonical form per network.
const CANON = {
  bluesky: /^https:\/\/bsky\.app\/profile\/[^/?#@]+\/post\/[A-Za-z0-9]{10,20}$/,
  x: /^https:\/\/x\.com\/(?:[A-Za-z0-9_]{1,15}|i)\/status\/[0-9]{1,25}$/,
  linkedin: /^https:\/\/www\.linkedin\.com\/feed\/update\/urn:li:(?:share|ugcPost|activity):[0-9]{1,25}\/$/,
};

export function isValidLink(platform, value) {
  return typeof value === 'string' && value.length <= MAX_URL && Object.hasOwn(PATTERNS, platform) && PATTERNS[platform].test(value);
}
export function isCanonicalLink(platform, value) {
  return isValidLink(platform, value) && Object.hasOwn(CANON, platform) && CANON[platform].test(value);
}
