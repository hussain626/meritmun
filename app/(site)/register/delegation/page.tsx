import type { Metadata } from "next";
import { DelegationForm } from "@/components/forms/DelegationForm";
import { PageHero } from "@/components/layout/PageHero";
import { RegistrationComingSoon } from "@/components/register/RegistrationComingSoon";
import { Section } from "@/components/ui/Section";
import { committees } from "@/content/committees";
import { pricing } from "@/content/site";
import { getRegistrationOpen } from "@/lib/admin/data";
import { submitDelegation } from "@/lib/actions";

export const metadata: Metadata = {
  title: "Register a Delegation",
  description:
    "Bring a delegation of five to thirty students to MERITMUN III. One form, one invoice, and a reduced rate per head.",
};

export default async function RegisterDelegationPage() {
  const registrationOpen = await getRegistrationOpen();
  if (!registrationOpen) {
    return (
      <main id="content">
        <PageHero
          title="Registration coming soon"
          lead="Delegation registration is not open yet. Check back here soon."
        />
        <Section width="prose">
          <RegistrationComingSoon />
        </Section>
      </main>
    );
  }

  return (
    <main id="content">
      <PageHero
        title="Register a delegation"
        lead={`For society heads and faculty bringing ${pricing.minDelegation} to ${pricing.maxDelegation} students. One form covers everyone, and Finance sends a single invoice.`}
      />

      <Section width="prose">
        <DelegationForm
          committees={committees.map(({ slug, abbr, name }) => ({
            slug,
            abbr,
            name,
          }))}
          pricing={{
            currency: pricing.currency,
            delegationStandard: pricing.delegationStandard,
            delegationLarge: pricing.delegationLarge,
            largeThreshold: pricing.largeThreshold,
            minDelegation: pricing.minDelegation,
            maxDelegation: pricing.maxDelegation,
          }}
          action={submitDelegation}
        />
      </Section>
    </main>
  );
}
