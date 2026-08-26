import type { Metadata } from "next";
import { DelegateForm } from "@/components/forms/DelegateForm";
import { PageHero } from "@/components/layout/PageHero";
import { RegistrationComingSoon } from "@/components/register/RegistrationComingSoon";
import { Section } from "@/components/ui/Section";
import { committees } from "@/content/committees";
import { pricing } from "@/content/site";
import { getRegistrationOpen } from "@/lib/admin/data";
import { submitDelegate } from "@/lib/actions";

export const metadata: Metadata = {
  title: "Register as a Delegate",
  description:
    "Apply to MERITMUN III as an individual delegate. Rank three committees and we will allocate you a portfolio pitched at your experience.",
};

export default async function RegisterDelegatePage({
  searchParams,
}: {
  searchParams: Promise<{ committee?: string }>;
}) {
  const registrationOpen = await getRegistrationOpen();
  if (!registrationOpen) {
    return (
      <main id="content">
        <PageHero
          title="Registration coming soon"
          lead="Delegate registration is not open yet. Check back here soon."
        />
        <Section width="prose">
          <RegistrationComingSoon />
        </Section>
      </main>
    );
  }

  // searchParams is async in Next.js 16.
  const params = await searchParams;
  const raw = params.committee;
  const preselect = typeof raw === "string" ? raw : undefined;

  return (
    <main id="content">
      <PageHero
        title="Register as a delegate"
        lead="Four steps, about four minutes. Nothing is charged now — the fee is payable after you are allocated."
      />

      <Section width="prose">
        <DelegateForm
          committees={committees.map(({ slug, abbr, name, difficulty }) => ({
            slug,
            abbr,
            name,
            difficulty,
          }))}
          preselect={preselect}
          fee={{ currency: pricing.currency, amount: pricing.delegate }}
          action={submitDelegate}
        />
      </Section>
    </main>
  );
}
