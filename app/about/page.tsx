import type { Metadata } from "next";
import { PageHero } from "@/components/layout/PageHero";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <main id="content">
      <PageHero title="About" lead="Placeholder — built in phase 6." />
    </main>
  );
}
