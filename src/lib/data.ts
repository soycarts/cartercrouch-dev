// ---------------------------------------------------------------------------
// Edit this file to update the content of the site. Everything the portfolio
// renders (bio, roles, projects, skills, socials) lives here.
// ---------------------------------------------------------------------------

export const profile = {
  name: "Carter Crouch",
  initials: "CC",
  // Hero avatar — place the image file at public/profile.jpeg.
  avatar: "/profile.jpeg",
  role: "Analytics Engineer",
  // The one-liner under the hero heading (also used for social share cards).
  tagline: "Analytics engineer building AI agent systems.",
  location: "Los Angeles / London",
  // Shown as a static tile in the live stats strip (no public API for this).
  instagramViews: "10M+",
  // Shown in the About section.
  bio: "Hi, I'm Carter Crouch, passionate about building scalable systems that tangibly advance human flourishing. I work with Python, SQL, JavaScript, LangChain, DBT, and Snowflake, and I'm also a content creator with 10M+ Instagram views.",
  // Drop a PDF at public/resume.pdf, or point this at any hosted URL.
  resumeUrl: "/resume.pdf",
};

export type Social = {
  label: string;
  href: string;
  handle: string;
};

export const socials: Social[] = [
  { label: "GitHub", href: "https://github.com/soycarts", handle: "@soycarts" },
  { label: "X", href: "https://x.com/soycarts", handle: "@soycarts" },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/crtrc/",
    handle: "in/crtrc",
  },
  {
    label: "Instagram",
    href: "https://instagram.com/soycarts",
    handle: "@soycarts",
  },
  {
    label: "Substack",
    href: "https://soycarts.substack.com",
    handle: "@soycarts",
  },
];

// The dated "Now" strip. Keep `updated` current whenever the items change —
// a stale Now block is worse than none.
export const now = {
  // ISO year-month; rendered as e.g. "July 2026".
  updated: "2026-07",
  lede: "TODO — one or two sentences on what you're focused on right now.",
  items: [
    { text: "TODO — what's happening with Zapflex.", href: "https://github.com/soycarts/zapflex" },
    { text: "TODO — what's happening with Bountify.ai.", href: "https://bountify.ai" },
    { text: "TODO — anything else worth saying you're doing." },
  ] as { text: string; href?: string }[],
};

export type Project = {
  name: string;
  description: string;
  tags: string[];
  website?: string;
  github?: string;
  // Screenshot shown alongside the entry (place files in public/projects).
  image?: string;
};

export const projects: Project[] = [
  {
    name: "Bountify.ai",
    description:
      "Turn data gaps into bounties — crowdsource the data your AI lab is missing via incentivised tasks.",
    // Run as a business — stack kept proprietary.
    tags: [],
    website: "https://bountify.ai",
    image: "/projects/bountify.jpg",
  },
  {
    name: "Jobmaxxing.ai",
    description:
      "A job tracking superapp — prospect-to-offer board, AI research briefs, and application drafts.",
    // Run as a business — stack kept proprietary.
    tags: [],
    website: "https://jobmaxxing.ai",
    image: "/projects/jobmaxxing.jpg",
  },
  {
    name: "Samefacts.co.uk",
    description:
      "Most PIP claims are denied at first — yet 91% of winning appeals present nothing new.",
    // Run as a business — stack kept proprietary.
    tags: [],
    website: "https://samefacts.co.uk",
    image: "/projects/samefacts.jpg",
  },
  {
    name: "Gameover.fyi",
    description:
      "A next-gen BattleBots overlay: vision-model hit breakdowns, fan predictions, social chatter.",
    tags: ["Python", "Claude", "ChatGPT", "Bright Data", "ElevenLabs", "Vanilla JS"],
    website: "https://gameover.fyi",
    github: "https://github.com/soycarts/gameover",
    image: "/projects/gameover.jpg",
  },
  {
    name: "Zapflex",
    description:
      "An autonomous home-battery flexibility company run by AI agents, with gamified usage predictions.",
    tags: ["Python", "DuckDB", "Supabase", "dbt", "Modal", "Claude", "Next.js"],
    github: "https://github.com/soycarts/zapflex",
    image: "/projects/zapflex.jpg",
  },
  {
    name: "Swarmtip",
    description:
      "AI agents scan 2026 World Cup odds for matches where both teams are incentivised to draw.",
    tags: ["Python", "ClickHouse", "Gemini", "Tavily", "Prometheux", "FastAPI"],
    github: "https://github.com/soycarts/swarmtip",
    image: "/projects/swarmtip.jpg",
  },
];

export const skills: string[] = [
  "Python",
  "SQL",
  "dbt",
  "Snowflake",
  "Airflow",
  "LangChain",
  "React / Next.js",
  "AWS",
  "GCP",
];
