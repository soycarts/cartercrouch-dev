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
  email: "soycarts@gmail.com",
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
  href?: string;
};

// TODO: refine descriptions / links — these are placeholders Carter can edit.
export const projects: Project[] = [
  {
    name: "Bountify.ai",
    description:
      "An AI-powered platform that turns open problems into rewarded bounties, matching contributors with work that advances real-world goals.",
    tags: ["Python", "LangChain", "React.js", "Supabase"],
    href: "#",
  },
  {
    name: "Zapflex",
    description:
      "A flexible automation layer that wires together data sources and workflows so teams can ship pipelines without boilerplate.",
    tags: ["Python", "Airflow", "Snowflake", "DBT"],
    href: "#",
  },
  {
    name: "Swarmtip",
    description:
      "A lightweight tipping and coordination tool for online communities, built for speed and low-friction payouts.",
    tags: ["JavaScript", "Node.js", "AWS", "Docker"],
    href: "#",
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
