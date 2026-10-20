import type { Metadata } from "next";
import { DelegationForm } from "@/components/forms/DelegationForm";
import { PageHero } from "@/components/layout/PageHero";
import { RegistrationComingSoon } from "@/components/register/RegistrationComingSoon";
import { Section } from "@/components/ui/Section";
import { canAcceptRegistration } from "@/lib/admin/auth";
import { getPublicPricing, listPublicCommittees } from "@/lib/public/data";
import { submitDelegation } from "@/lib/actions";

export const metadata: Metadata = {
  title: "Register a Delegation",
  description:
    "Bring a delegation of five to thirty students to MERITMUN III. One form, one payment, and a reduced rate per head.",
};

export default async function RegisterDelegationPage({
  searchParams,
}: {
  searchParams: Promise<{ manual?: string }>;
}) {
  const manual = (await searchParams).manual === "1";
  if (!(await canAcceptRegistration(manual))) {
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

  const [pricing, committees] = await Promise.all([
    getPublicPricing(),
    listPublicCommittees(),
  ]);

  return (
    <main id="content">
      <PageHero
        title="Register a delegation"
        lead={`For society heads and faculty bringing ${pricing.minDelegation} to ${pricing.maxDelegation} students. One form covers everyone, and one payment covers the whole roster.`}
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
            perDelegate: pricing.perDelegate,
            delegationFlat: pricing.delegationFlat,
            minDelegation: pricing.minDelegation,
            maxDelegation: pricing.maxDelegation,
          }}
          action={submitDelegation}
          manual={manual}
        />
      </Section>
    </main>
  );
}
