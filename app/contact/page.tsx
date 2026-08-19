import type { Metadata } from "next";
import { PageHero } from "@/components/layout/PageHero";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <main id="content">
      <PageHero title="Contact" lead="Placeholder — built in phase 6." />
    </main>
  );
}
