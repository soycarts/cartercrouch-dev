import { Hero } from "@/components/Hero";
import { LiveStats } from "@/components/LiveStats";
import { Projects } from "@/components/Projects";
import { Writing } from "@/components/Writing";
import { Skills } from "@/components/Skills";
import { Contact, Footer } from "@/components/Contact";
import { Dock } from "@/components/Dock";

export default function Home() {
  return (
    <>
      <main className="flex-1">
        <Hero />
        <LiveStats />
        <Projects />
        <Writing />
        <Skills />
        <Contact />
      </main>
      <Footer />
      <Dock />
    </>
  );
}
