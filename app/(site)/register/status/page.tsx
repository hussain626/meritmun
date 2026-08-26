import type { Metadata } from "next";
import { StatusLookupForm } from "@/components/forms/StatusLookupForm";
import { PageHero } from "@/components/layout/PageHero";
import { Section } from "@/components/ui/Section";
import { lookupStatus } from "@/lib/actions";

export const metadata: Metadata = {
  title: "Check your status",
  description:
    "Look up your MERITMUN III application with your reference code to see whether it has been received, reviewed, allocated, or confirmed.",
};

export default function RegisterStatusPage() {
  return (
    <main id="content">
      <PageHero
        title="Check your status"
        lead="Enter the reference code from your confirmation email to see where your application has got to."
      />

      <Section width="prose">
        <StatusLookupForm action={lookupStatus} />
      </Section>
    </main>
  );
}
