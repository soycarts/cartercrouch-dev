import { getSubstackPosts } from "@/lib/substack";
import { ArrowIcon } from "./icons";
import { Section } from "./Section";

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export async function Writing() {
  const posts = await getSubstackPosts(3);
  if (posts.length === 0) return null;

  return (
    <Section id="writing" eyebrow="02 / Writing" title="Recent writing">
      <ul className="flex flex-col">
        {posts.map((post) => (
          <li key={post.link}>
            <a
              href={post.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-baseline justify-between gap-6 border-b border-black/5 py-4 first:pt-0 dark:border-white/5"
            >
              <div className="min-w-0">
                <h3 className="font-medium text-foreground/90 transition group-hover:text-accent">
                  {post.title}
                </h3>
                {post.excerpt && (
                  <p className="mt-1 truncate text-sm text-foreground/50">
                    {post.excerpt}
                  </p>
                )}
              </div>
              <span className="flex shrink-0 items-center gap-2 font-mono text-xs text-foreground/40">
                {dateFormat.format(post.pubDate)}
                <ArrowIcon className="h-3.5 w-3.5 -translate-x-0.5 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
              </span>
            </a>
          </li>
        ))}
      </ul>
      <a
        href="https://soycarts.substack.com"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex items-center gap-1.5 text-sm text-foreground/60 transition hover:text-accent"
      >
        All posts on Substack
        <ArrowIcon className="h-3.5 w-3.5" />
      </a>
    </Section>
  );
}
