import { profile, socials } from "@/lib/data";
import { socialIcons } from "./icons";
import { Section } from "./Section";

export function About() {
  return (
    <Section id="about" eyebrow="01 / About" title="A bit about me">
      <div className="grid gap-12 md:grid-cols-3">
        <div className="space-y-5 text-lg leading-relaxed text-foreground/70 md:col-span-2">
          <p>{profile.bio}</p>
          <p>
            I care most about systems that{" "}
            <span className="text-foreground">
              tangibly advance human flourishing
            </span>{" "}
            — turning messy data and ambiguous problems into reliable products
            people actually use. Based in{" "}
            <span className="text-foreground">{profile.location}</span>.
          </p>
        </div>

        <div>
          <h3 className="mb-4 font-mono text-sm text-foreground/50">
            Find me online
          </h3>
          <ul className="space-y-3">
            {socials.map((s) => {
              const Icon = socialIcons[s.label];
              return (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 text-foreground/70 transition hover:text-accent"
                  >
                    {Icon && <Icon className="h-5 w-5" />}
                    <span className="text-sm">{s.label}</span>
                    <span className="text-sm text-foreground/40 transition group-hover:text-accent/70">
                      {s.handle}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </Section>
  );
}
