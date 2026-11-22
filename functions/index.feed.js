import { serveFeed } from './_shared/feed.js';
export const onRequest = ({ request, env, waitUntil }) => serveFeed({ request, env, waitUntil });
