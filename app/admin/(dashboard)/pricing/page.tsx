import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { getPricing, listBankAccounts } from "@/lib/admin/data";
import { PricingClient } from "./PricingClient";

export const metadata: Metadata = {
  title: "Pricing",
  robots: { index: false, follow: false },
};

export default async function PricingPage() {
  const session = await requireAdminSession(["admin", "eb"]);
  const [pricing, bankAccounts] = await Promise.all([
    getPricing(),
    listBankAccounts(),
  ]);

  return (
    <PricingClient
      pricing={pricing}
      bankAccounts={bankAccounts}
      role={session.role}
    />
  );
}
