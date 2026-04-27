# koloco-ig-proxy

Serverless proxy for the Instagram feed of [@koloco_x](https://www.instagram.com/koloco_x/), consumed by the main `koloco-artbeat-nexus` site (which is hosted on Apache via FTP and has no backend of its own).

## Endpoint

```
GET /api/instagram?limit=12
```

Returns:

```json
{
  "posts": [ { "id": "...", "shortcode": "...", "caption": "...", "media_url": "...", "permalink": "...", "timestamp": "...", "media_type": "IMAGE|VIDEO|CAROUSEL_ALBUM", "likes": 0 } ],
  "cached": false,
  "timestamp": "2026-04-27T..."
}
```

## Caching

- In-memory cache per warm Lambda: 5 min
- HTTP `Cache-Control`: `s-maxage=60, stale-while-revalidate=300` — Vercel edge serves the cached response for 60 s, then revalidates in the background for up to 5 min.

## Deploy to Vercel

1. Push this repo to GitHub.
2. https://vercel.com/new → Import the repo. No build step, no env vars.
3. After the first deploy, Vercel gives you a URL like `https://koloco-ig-proxy.vercel.app`. The endpoint is `https://koloco-ig-proxy.vercel.app/api/instagram`.
4. Paste that URL into `IG_PROXY_URL` in `src/lib/instagram.ts` of the main site.

## Notes

This scrapes Instagram's public `web_profile_info` endpoint with `X-IG-App-ID` — no auth, no Graph API token. Instagram may rate-limit or block this at any time. If posts stop loading, the main site falls back to the static `public/ig-feed.json` (regenerable with `npm run ig:fetch` in the main repo).
