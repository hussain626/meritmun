import type { Metadata } from "next";
import { PageHero } from "@/components/layout/PageHero";

export const metadata: Metadata = { title: "Executive Board" };

export default function ExecutiveBoardPage() {
  return (
    <main id="content">
      <PageHero title="Executive Board" lead="Placeholder — built in phase 6." />
    </main>
  );
}
