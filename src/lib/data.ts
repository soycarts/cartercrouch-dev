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
      "Turns data gaps into bounties — a platform that converts missing or incomplete datasets into incentivized tasks, crowdsourcing the data collection and completion that teams need.",
    tags: ["AI", "Data", "Web"],
    website: "https://bountify.ai",
    gradient: "from-violet-500 to-indigo-500",
  },
  {
    name: "Zapflex",
    description:
      "An autonomous home-battery flexibility company run by a swarm of AI agents. It optimizes home batteries against dynamic electricity tariffs, aggregates the fleet, and earns grid-services flexibility revenue — with the agents running the company end-to-end. Built for the Cursor “Hands Off” hackathon.",
    tags: ["Python", "DuckDB", "Supabase", "dbt", "Modal", "Anthropic", "Next.js"],
    github: "https://github.com/soycarts/zapflex",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    name: "Swarmtip",
    description:
      "A swarm of AI agents that finds underpriced draws at the 2026 World Cup — reading live standings, deriving which teams qualify on a draw, grounding every claim in real sources, and pricing it against the market to flag value bets.",
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
