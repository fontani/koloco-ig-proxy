// Vercel Serverless Function: GET /api/instagram?limit=12
// Scrapes Instagram's public web profile API for @koloco_x and returns recent posts.

const INSTAGRAM_USERNAME = "koloco_x";
const IG_APP_ID = "936619743392459";
const CACHE_TTL = 1000 * 60 * 5;

let cache = { data: null, timestamp: 0 };

async function fetchInstagramPosts(username, limit = 12) {
  const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "X-IG-App-ID": IG_APP_ID,
      "X-Requested-With": "XMLHttpRequest",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      Referer: "https://www.instagram.com/",
      Origin: "https://www.instagram.com",
    },
  });

  if (!res.ok) throw new Error(`Instagram API returned ${res.status}`);

  const info = await res.json();
  const user = info?.data?.user;
  if (!user) throw new Error("User not found");

  const edges = user.edge_owner_to_timeline_media?.edges || [];

  return edges.slice(0, limit).map((e) => {
    const node = e.node;
    return {
      id: node.id,
      shortcode: node.shortcode,
      caption: node.edge_media_to_caption?.edges?.[0]?.node?.text || "",
      media_url: node.display_url,
      thumbnail_url: node.thumbnail_src || node.display_url,
      permalink: `https://www.instagram.com/p/${node.shortcode}/`,
      timestamp: new Date(node.taken_at_timestamp * 1000).toISOString(),
      media_type: node.is_video
        ? "VIDEO"
        : node.__typename === "GraphSidecar"
          ? "CAROUSEL_ALBUM"
          : "IMAGE",
      likes: node.edge_liked_by?.count || 0,
    };
  });
}

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const limit = parseInt(url.searchParams.get("limit") || "12");

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");

  if (cache.data && Date.now() - cache.timestamp < CACHE_TTL) {
    return res.status(200).json({
      posts: cache.data.slice(0, limit),
      cached: true,
      timestamp: new Date(cache.timestamp).toISOString(),
    });
  }

  try {
    const posts = await fetchInstagramPosts(INSTAGRAM_USERNAME, limit);
    cache = { data: posts, timestamp: Date.now() };
    return res.status(200).json({
      posts: posts.slice(0, limit),
      cached: false,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Instagram fetch error:", error.message);
    if (cache.data) {
      return res.status(200).json({
        posts: cache.data.slice(0, limit),
        cached: true,
        stale: true,
        timestamp: new Date(cache.timestamp).toISOString(),
      });
    }
    return res.status(500).json({ error: "Failed to fetch Instagram feed", posts: [] });
  }
}
