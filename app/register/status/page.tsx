import type { Metadata } from "next";
import { PageHero } from "@/components/layout/PageHero";

export const metadata: Metadata = { title: "Check your status" };

export default function RegisterStatusPage() {
  return (
    <main id="content">
      <PageHero title="Check your status" lead="Placeholder — built in phase 7." />
    </main>
  );
}
