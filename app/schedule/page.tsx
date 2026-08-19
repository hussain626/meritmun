import type { Metadata } from "next";
import { PageHero } from "@/components/layout/PageHero";

export const metadata: Metadata = { title: "Schedule" };

export default function SchedulePage() {
  return (
    <main id="content">
      <PageHero title="Schedule" lead="Placeholder — built in phase 6." />
    </main>
  );
}
