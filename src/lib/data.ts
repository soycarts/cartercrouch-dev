// ---------------------------------------------------------------------------
// Edit this file to update the content of the site. Everything the portfolio
// renders (bio, roles, projects, skills, socials) lives here.
// ---------------------------------------------------------------------------

export const profile = {
  name: "Carter Crouch",
  initials: "CC",
  // The hero cycles through these one at a time.
  roles: ["Analytics Engineer", "Entrepreneur", "Lifelong Learner"],
  location: "Los Angeles / London",
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
  // Tailwind gradient classes used for the card's preview banner.
  gradient: string;
};

// TODO: refine descriptions / links — these are placeholders Carter can edit.
export const projects: Project[] = [
  {
    name: "Bountify.ai",
    description:
      "Turns data gaps into bounties — crowdsourcing the data teams are missing through incentivized tasks.",
    tags: ["AI", "Data", "Web"],
    website: "https://bountify.ai",
    gradient: "from-violet-500 to-indigo-500",
  },
  {
    name: "Zapflex",
    description:
      "An autonomous home-battery flexibility company run by a swarm of AI agents — optimizing batteries against dynamic tariffs to earn grid-services revenue.",
    tags: ["Python", "DuckDB", "Supabase", "dbt", "Modal", "Anthropic", "Next.js"],
    github: "https://github.com/soycarts/zapflex",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    name: "Swarmtip",
    description:
      "A swarm of AI agents that finds underpriced draws at the 2026 World Cup, flagging value bets where a draw is mutually convenient.",
    tags: ["Python", "ClickHouse", "Gemini", "Tavily", "Prometheux", "FastAPI"],
    github: "https://github.com/soycarts/swarmtip",
    gradient: "from-orange-500 to-rose-500",
  },
];

export const skills: string[] = [
  "Python",
  "SQL",
  "JavaScript",
  "LangChain",
  "DBT",
  "Snowflake",
  "AWS",
  "GCP",
  "React.js",
  "Node.js",
  "Git",
  "Airflow",
  "Excel",
  "Jupyter",
  "Looker",
  "PowerBI",
  "QuickSight",
  "Tableau",
  "Supabase",
  "Docker",
  "VS Code",
  "Salesforce",
];
