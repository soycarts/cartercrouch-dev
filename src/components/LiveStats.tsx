import { profile } from "@/lib/data";
import { getSubstackPosts } from "@/lib/substack";
import { Section } from "./Section";

// The site's signature: a small live dashboard about its owner. Every tile
// degrades independently — a failed fetch or missing env var hides that tile
// rather than breaking the page.

type Tile = {
  label: string;
  value: string;
  href?: string;
  sparkline?: number[];
};

const GITHUB_USER = "soycarts";
const WEEKS_BACK = 12;

async function getGithubTile(): Promise<Tile | null> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;
  try {
    const from = new Date(
      Date.now() - WEEKS_BACK * 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const query = `query {
      user(login: "${GITHUB_USER}") {
        contributionsCollection(from: "${from}") {
          contributionCalendar {
            totalContributions
            weeks { contributionDays { contributionCount } }
          }
        }
      }
    }`;
    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const calendar =
      json?.data?.user?.contributionsCollection?.contributionCalendar;
    if (!calendar) return null;
    const weeks: number[] = calendar.weeks.map(
      (w: { contributionDays: { contributionCount: number }[] }) =>
        w.contributionDays.reduce((sum, d) => sum + d.contributionCount, 0),
    );
    return {
      value: String(calendar.totalContributions),
      label: `GitHub contributions · ${WEEKS_BACK} wks`,
      href: `https://github.com/${GITHUB_USER}`,
      sparkline: weeks,
    };
  } catch {
    return null;
  }
}

async function getSubstackTile(): Promise<Tile | null> {
  const [latest] = await getSubstackPosts(1);
  if (!latest) return null;
  const days = Math.max(
    0,
    Math.floor((Date.now() - latest.pubDate.getTime()) / 86_400_000),
  );
  // A recency counter only reads well when it's small — fall back to the
  // post date once it stops being news.
  const value =
    days === 0
      ? "today"
      : days <= 30
        ? `${days}d ago`
        : new Intl.DateTimeFormat("en-US", {
            month: "short",
            year: "numeric",
          }).format(latest.pubDate);
  return {
    value,
    label: "latest Substack post",
    href: latest.link,
  };
}

async function getZapflexTile(): Promise<Tile | null> {
  const url = process.env.ZAPFLEX_STATS_URL;
  if (!url) return null;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const json = await res.json();
    if (typeof json?.value !== "string" && typeof json?.value !== "number") {
      return null;
    }
    return { value: String(json.value), label: String(json.label ?? "Zapflex") };
  } catch {
    return null;
  }
}

function Sparkline({ data }: { data: number[] }) {
  const width = 88;
  const height = 28;
  const max = Math.max(...data, 1);
  const step = width / Math.max(data.length - 1, 1);
  const points = data
    .map((v, i) => {
      const x = (i * step).toFixed(1);
      const y = (height - 3 - (v / max) * (height - 6)).toFixed(1);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-7 w-[88px] text-ink-muted"
      fill="none"
      aria-hidden
    >
      <polyline
        points={points}
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export async function LiveStats() {
  const [github, substack, zapflex] = await Promise.all([
    getGithubTile(),
    getSubstackTile(),
    getZapflexTile(),
  ]);

  const instagram: Tile = {
    value: profile.instagramViews,
    label: "lifetime Instagram views",
    href: "https://instagram.com/soycarts",
  };

  const tiles = [github, substack, instagram, zapflex].filter(
    (t): t is Tile => t !== null,
  );

  return (
    <Section
      id="live"
      eyebrow="00 / Live"
      meta={
        <span className="inline-flex items-center gap-2">
          <span className="animate-pulse-dot h-1.5 w-1.5 rounded-full bg-accent" />
          Hourly
        </span>
      }
    >
      {/* A ledger band, not tiles: columns divided by hairlines, no fills. */}
      <div className="grid grid-cols-2 sm:grid-cols-3">
        {tiles.map((tile, i) => {
          const inner = (
            <>
              <div className="flex items-end justify-between gap-2">
                <span className="font-mono text-[1.7rem] leading-none tabular-nums">
                  {tile.value}
                </span>
                {tile.sparkline && <Sparkline data={tile.sparkline} />}
              </div>
              <p className="mt-2.5 text-[0.78rem] leading-snug text-ink-muted">
                {tile.label}
              </p>
            </>
          );

          // First column in each row sits flush left; the rest carry a rule.
          const cell = [
            "py-5 pr-5",
            i % 2 === 0 ? "" : "border-l border-rule pl-5",
            "sm:pr-6",
            i % 3 === 0
              ? "sm:border-l-0 sm:pl-0"
              : "sm:border-l sm:border-rule sm:pl-6",
          ].join(" ");

          return tile.href ? (
            <a
              key={tile.label}
              href={tile.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`${cell} transition-colors hover:text-accent`}
            >
              {inner}
            </a>
          ) : (
            <div key={tile.label} className={cell}>
              {inner}
            </div>
          );
        })}
      </div>
    </Section>
  );
}
