import { Hero } from "@/components/Hero";
import { Projects } from "@/components/Projects";
import { Skills } from "@/components/Skills";
import { Contact, Footer } from "@/components/Contact";
import { Dock } from "@/components/Dock";

export default function Home() {
  return (
    <>
      <main className="flex-1">
        <Hero />
        <Projects />
        <Skills />
        <Contact />
      </main>
      <Footer />
      <Dock />
    </>
  );
}
