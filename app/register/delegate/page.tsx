import type { Metadata } from "next";
import { PageHero } from "@/components/layout/PageHero";

export const metadata: Metadata = { title: "Register as a Delegate" };

export default function RegisterDelegatePage() {
  return (
    <main id="content">
      <PageHero title="Register as a Delegate" lead="Placeholder — built in phase 7." />
    </main>
  );
}
