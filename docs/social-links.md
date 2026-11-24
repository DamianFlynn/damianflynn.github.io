# Social links: automatic thread links from Zernio

When Zernio publishes an announcement (LinkedIn, X, Bluesky), the link to that social post is recorded on the page it announces. No vault edit. The Discussion block (join links) and the synced replies then follow the page.

## Data flow

```
Zernio publishes a post
  |  POST /hooks/zernio  (JSON, X-Zernio-Signature = HMAC-SHA256 hex of the raw body)
  v
Cloudflare Pages Function  functions/hooks/zernio.js
  |  verify HMAC (timing-safe) -> 401 on failure; POST only (405); body <= 256 KiB (413)
  |  keep only post.platform.published and post.published (everything else: 200, ignored)
  |  POST api.github.com/repos/DamianFlynn/damianflynn.github.io/actions/workflows/social-links.yaml/dispatches
  |      inputs: post_id, event_id, event          -> answers 202
  v
GitHub Action  .github/workflows/social-links.yaml  (also nightly 03:17 UTC with backfill)
  |  GET Zernio /posts/<post_id>  (read-only)
  |  find the first https://damianflynn.com/(posts|talks)/<slug>/ in content, firstComment, threadItems
  |  take platformPostUrl, normalise (X, Bluesky, LinkedIn), validate (same patterns as the vault validator)
  |  write data/social/<kind>-<slug>.json   {page, links:{bluesky,x,linkedin,mastodon}, updatedAt}
  |  commit "chore(social): record <platform> thread for <slug>" (bot), then
  |  gh workflow run deploy-production.yaml  and  sync-comments.yaml
  v
Hugo build: theme merges front matter `comments` with site.Data.social (front matter wins)
sync-comments.mjs: follows the union of garden `comments` and data/social links
```

Where the page link lives in a Zernio post (verified against real posts):

| Network | Page link | Post URL (`platforms[].platformPostUrl`) |
|---|---|---|
| LinkedIn | `platformSpecificData.firstComment`, or `content` | `https://www.linkedin.com/feed/update/urn:li:share:<id>/` |
| X | `platformSpecificData.threadItems[1].content`, or `content` | `https://twitter.com/i/web/status/<id>` (rewritten to `https://x.com/<account username>/status/<id>`) |
| Bluesky | inline in `content` | `https://bsky.app/profile/<handle>/post/<rkey>` |

Rules: the earliest announcement of a page on a network is the thread that is kept (a later re-post never replaces it; edit the data file by hand to change it). Re-running anything is safe: the file is rewritten only when a link is added, so there is no commit when nothing changes. Mastodon is never written by this pipeline (Zernio does not cover it); a mastodon link in front matter still works.

## One-time setup (after the PRs are merged)

1. **Fine-grained token for the Function.** GitHub, Settings, Developer settings, Fine-grained tokens, Generate new token.
   - Resource owner: DamianFlynn. Repository access: **Only select repositories** and pick `damianflynn.github.io`.
   - Repository permissions: **Actions: Read and write** (this is what `POST .../dispatches` needs). Leave everything else, including Contents, at "No access". Metadata: Read is added automatically.
   - Expiry: the longest you are comfortable with; put the date in your calendar. When it expires the Function answers 502 and Zernio retries for about 51 hours, so renew early.
2. **Pages secrets** (production project is `damianflynn`):
   ```
   printf '%s' "$SECRET" | wrangler pages secret put ZERNIO_WEBHOOK_SECRET --project-name=damianflynn
   printf '%s' "$TOKEN"  | wrangler pages secret put GITHUB_DISPATCH_TOKEN --project-name=damianflynn
   ```
   Generate the webhook secret with `openssl rand -hex 32`; keep it for step 3. Redeploy (or push to main) so the Function sees the new secrets. Do the same with `--project-name=damianflynn-preview` only if you want the hook on the preview project (not needed).
3. **Register the webhook** with Zernio (placeholders, run once):
   ```
   curl -sS -X POST https://zernio.com/api/v1/webhooks/settings \
     -H "Authorization: Bearer $ZERNIO_API_KEY" -H "Content-Type: application/json" \
     -d '{"name":"damianflynn.com social links","url":"https://damianflynn.com/hooks/zernio","events":["post.platform.published","post.published"],"secret":"'"$ZERNIO_WEBHOOK_SECRET"'"}'
   ```
   `post.platform.published` fires once per network as each finishes; `post.published` fires when all are done and is a safety net (both produce the same result; the second run is a no-op).
4. **Seed once**: Actions, Social Links, Run workflow, tick `backfill`. It lists posts published in the last 30 days and records every announcement it can match. The nightly run repeats this, which also catches any webhook that was lost.
5. Existing secrets already used by the repo: `ZERNIO_API_KEY` (read-only use here).

## Test it with a signed sample

```
# print a signed payload for a real, published post (nothing is sent)
ZERNIO_WEBHOOK_SECRET=... node scripts/sign-sample.mjs 6b04d54a0b5053e8bfd819c6

# or exercise a local Function:  npx wrangler pages dev static --binding ZERNIO_WEBHOOK_SECRET=... --binding GITHUB_DISPATCH_TOKEN=...
ZERNIO_WEBHOOK_SECRET=... node scripts/sign-sample.mjs 6b04d54a0b5053e8bfd819c6 --send http://localhost:8788/hooks/zernio
```

With a real token that sends a real dispatch (the workflow then runs and is a no-op if the link is already recorded). Without `GITHUB_DISPATCH_TOKEN` a correctly signed request answers 503, which proves the signature passed. Zernio also has `POST /v1/webhooks/test`; test samples are accepted and ignored (200).

Automated tests (offline): `node --test scripts/ tests/`.

## Troubleshooting

- **Zernio shows 401 deliveries**: the secret in Zernio and in `ZERNIO_WEBHOOK_SECRET` differ, or the Pages project was not redeployed after `secret put`. 4xx other than 408/429 are not retried by Zernio.
- **502 deliveries**: GitHub rejected the dispatch (token expired, wrong repository, missing Actions: write). Zernio retries 7 times over about 51 hours.
- **503**: a secret is not set on the Pages project.
- **Run is green but nothing recorded**: the Actions log lists why per network (`no page link in the post`, `no valid post URL yet`, `not published`). A post whose text has no `https://damianflynn.com/posts|talks/<slug>/` link is ignored on purpose. Run the backfill later if the platform URL was not ready yet.
- **Lookup warnings** (`::warning::`): Zernio unreachable or rate limited. The run still exits 0; the nightly backfill catches up.
- **Dropped runs**: workflow concurrency keeps one pending run, so a burst of webhooks can drop one. The nightly backfill covers it.
- **Wrong link recorded**: edit or delete `data/social/<kind>-<slug>.json`; the pipeline never overwrites an existing link on a network.

## Security notes

- Nothing unsigned does any work: the signature is checked (HMAC-SHA256 over the raw bytes, constant-time compare) before the body is parsed, and before any call to GitHub. Method and size are checked first because they cost nothing.
- The Function forwards only the post id, event id and event name, each validated by pattern; Zernio content never reaches GitHub through it.
- The workflow re-reads the post from Zernio with the API key; the webhook is only a trigger, so a forged or replayed event cannot write anything that Zernio does not itself say.
- URLs written to `data/social` are validated offline with patterns at least as strict as the vault validator (`scripts/content-comments.py`): https only, fixed hosts for X, Bluesky and LinkedIn, no whitespace or control characters, at most 300 characters, and a single canonical form per network. The sync script re-validates them when it reads them.
- The Function never logs a body, header or secret. The workflow passes inputs through environment variables, never interpolated into shell.
- The dispatch token can only run workflows on this one repository. Rotate both secrets by `secret put` again and updating Zernio (`PUT /v1/webhooks/settings`).
- Consider a Cloudflare rate-limiting rule on `/hooks/zernio` as extra cover; unsigned requests already cost one HMAC and nothing else.

## Cost and limits

- Pages Functions: one invocation per delivery (about 2 per announced network, a few per day). The free plan allows 100,000 requests per day.
- Actions: a run is about 15 to 30 seconds (the repository is public, so minutes are free). The nightly backfill is one run a day.
- Zernio: one read per run (`GET /posts/<id>`), one list call per backfill; webhooks need no extra plan feature to receive.
