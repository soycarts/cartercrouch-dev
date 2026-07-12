// Fetches recent posts from the Substack RSS feed at build/revalidate time.
// Deliberately dependency-free: the feed is simple enough for string parsing,
// and any failure degrades to an empty list so the build never breaks on it.

export type SubstackPost = {
  title: string;
  link: string;
  pubDate: Date;
  excerpt: string;
};

const FEED_URL = "https://soycarts.substack.com/feed";

function extractTag(block: string, tag: string): string {
  const match = block.match(
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"),
  );
  return match ? match[1].trim() : "";
}

function clean(value: string): string {
  return value
    .replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(Number(num)))
    .replace(/\s+/g, " ")
    .trim();
}

export async function getSubstackPosts(limit = 3): Promise<SubstackPost[]> {
  try {
    const res = await fetch(FEED_URL, { next: { revalidate: 86400 } });
    if (!res.ok) return [];
    const xml = await res.text();

    return xml
      .split("<item>")
      .slice(1)
      .map((block) => {
        const pubDate = new Date(clean(extractTag(block, "pubDate")));
        return {
          title: clean(extractTag(block, "title")),
          link: clean(extractTag(block, "link")),
          pubDate,
          excerpt: clean(extractTag(block, "description")),
        };
      })
      .filter((p) => p.title && p.link && !Number.isNaN(p.pubDate.getTime()))
      .slice(0, limit);
  } catch {
    return [];
  }
}
