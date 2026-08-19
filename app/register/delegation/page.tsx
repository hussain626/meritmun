import type { Metadata } from "next";
import { PageHero } from "@/components/layout/PageHero";

export const metadata: Metadata = { title: "Register a Delegation" };

export default function RegisterDelegationPage() {
  return (
    <main id="content">
      <PageHero title="Register a Delegation" lead="Placeholder — built in phase 7." />
    </main>
  );
}
