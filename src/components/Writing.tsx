import { getSubstackPosts } from "@/lib/substack";
import { Section } from "./Section";

const dateFormat = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export async function Writing() {
  const posts = await getSubstackPosts(3);
  if (posts.length === 0) return null;

  const [feature, ...rest] = posts;

  return (
    <Section id="writing" eyebrow="02 / Writing" meta="Substack">
      <div className="border-t border-rule-strong">
        {/* The latest post gets the full excerpt; the rest are index rows. */}
        <a
          href={feature.link}
          target="_blank"
          rel="noopener noreferrer"
          className="group grid gap-x-10 gap-y-2 border-b border-rule py-7 md:grid-cols-[minmax(0,1fr)_auto]"
        >
          <div className="min-w-0">
            <h3 className="max-w-[26ch] text-[1.6rem] transition-colors group-hover:text-accent">
              {feature.title}
            </h3>
            {feature.excerpt && (
              <p className="mt-3 max-w-[58ch] text-[0.9rem] leading-relaxed text-ink-soft">
                {feature.excerpt}
              </p>
            )}
          </div>
          <span className="kicker shrink-0 text-ink-muted tabular-nums md:pt-2">
            {dateFormat.format(feature.pubDate)}
          </span>
        </a>

        {rest.map((post) => (
          <a
            key={post.link}
            href={post.link}
            target="_blank"
            rel="noopener noreferrer"
            className="group grid items-baseline gap-x-10 gap-y-1 border-b border-rule py-5 md:grid-cols-[minmax(0,1fr)_auto]"
          >
            <h3 className="min-w-0 text-[1.05rem] transition-colors group-hover:text-accent">
              {post.title}
            </h3>
            <span className="kicker shrink-0 text-ink-muted tabular-nums">
              {dateFormat.format(post.pubDate)}
            </span>
          </a>
        ))}
      </div>

      <a
        href="https://soycarts.substack.com"
        target="_blank"
        rel="noopener noreferrer"
        className="link-mono mt-7"
      >
        All posts
      </a>
    </Section>
  );
}
