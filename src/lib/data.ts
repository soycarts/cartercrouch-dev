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

export type Project = {
  name: string;
  description: string;
  tags: string[];
  website?: string;
  github?: string;
  // Screenshot shown in the card's preview banner (place files in public/projects).
  image?: string;
  // Tailwind gradient classes used as the banner fallback when there's no image.
  gradient: string;
};

export const projects: Project[] = [
  {
    name: "Bountify.ai",
    description:
      "Turns data gaps into bounties — crowdsourcing the data teams are missing through incentivized tasks.",
    tags: ["AI", "Data", "Web"],
    website: "https://bountify.ai",
    image: "/projects/bountify.jpg",
    gradient: "from-violet-500 to-indigo-500",
  },
  {
    name: "Zapflex",
    description:
      "An autonomous home-battery flexibility company run by a swarm of AI agents — optimizing batteries against dynamic tariffs to earn grid-services revenue.",
    tags: ["Python", "DuckDB", "Supabase", "dbt", "Modal", "Anthropic", "Next.js"],
    github: "https://github.com/soycarts/zapflex",
    image: "/projects/zapflex.jpg",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    name: "Swarmtip",
    description:
      "A swarm of AI agents that finds underpriced draws at the 2026 World Cup, flagging value bets where a draw is mutually convenient.",
    tags: ["Python", "ClickHouse", "Gemini", "Tavily", "Prometheux", "FastAPI"],
    github: "https://github.com/soycarts/swarmtip",
    image: "/projects/swarmtip.jpg",
    gradient: "from-orange-500 to-rose-500",
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
