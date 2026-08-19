import type { Metadata } from "next";
import { PageHero } from "@/components/layout/PageHero";

export const metadata: Metadata = { title: "Register" };

export default function RegisterPage() {
  return (
    <main id="content">
      <PageHero title="Register" lead="Placeholder — built in phase 7." />
    </main>
  );
}
