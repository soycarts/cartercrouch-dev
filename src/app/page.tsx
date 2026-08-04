import { Hero } from "@/components/Hero";
import { Now } from "@/components/Now";
import { LiveStats } from "@/components/LiveStats";
import { Projects } from "@/components/Projects";
import { Writing } from "@/components/Writing";
import { Skills } from "@/components/Skills";
import { Quests } from "@/components/Quests";
import { Contact, Footer } from "@/components/Contact";

export default function Home() {
  return (
    <>
      <main className="flex-1">
        <Hero />
        <Now />
        <LiveStats />
        <Projects />
        <Writing />
        <Skills />
        <Quests />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
