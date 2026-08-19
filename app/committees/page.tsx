import type { Metadata } from "next";
import { PageHero } from "@/components/layout/PageHero";

export const metadata: Metadata = { title: "Committees" };

export default function CommitteesPage() {
  return (
    <main id="content">
      <PageHero title="Committees" lead="Placeholder — built in phase 5." />
    </main>
  );
}
