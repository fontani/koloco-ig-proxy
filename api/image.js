// Vercel Serverless Function: GET /api/image?url=<instagram-cdn-url>
// Proxies images from Instagram's CDN (which blocks hotlinking by Referer)
// so the browser fetches them through this domain instead.

const ALLOWED_HOSTS = [/\.cdninstagram\.com$/, /\.fbcdn\.net$/];

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const target = url.searchParams.get("url");

  if (!target) {
    return res.status(400).json({ error: "Missing 'url' query param" });
  }

  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    return res.status(400).json({ error: "Invalid URL" });
  }

  if (!ALLOWED_HOSTS.some((re) => re.test(parsed.hostname))) {
    return res.status(403).json({ error: "Host not allowed" });
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://www.instagram.com/",
      },
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Upstream returned ${upstream.status}` });
    }

    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await upstream.arrayBuffer());

    res.setHeader("Content-Type", contentType);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800");
    return res.status(200).send(buffer);
  } catch (err) {
    console.error("Image proxy error:", err.message);
    return res.status(502).json({ error: "Failed to fetch image" });
  }
}
