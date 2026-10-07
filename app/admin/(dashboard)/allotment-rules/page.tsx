import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import {
  getAllotmentRules,
  listAllotments,
  listCommitteesAdmin,
  listPortfolios,
} from "@/lib/admin/data";
import { isP5Country } from "@/lib/merit/p5";
import { AllotmentRulesClient, type PoolHealthRow } from "./AllotmentRulesClient";

export const metadata: Metadata = {
  title: "Allotment Rules",
  robots: { index: false, follow: false },
};

export default async function AllotmentRulesPage() {
  const session = await requireAdminSession();
  const [rules, committees, portfolios, allotments] = await Promise.all([
    getAllotmentRules(),
    listCommitteesAdmin(),
    listPortfolios(),
    listAllotments(),
  ]);

  const held = new Set(allotments.map((a) => a.portfolioId));
  const pool: PoolHealthRow[] = committees.map((committee) => {
    const active = portfolios.filter(
      (p) => p.committeeId === committee.id && p.isActive,
    );
    const p5 = active.filter((p) => p.isP5 || isP5Country(p.countryName));
    const autoPool = active.filter((p) => !p.isP5 && !isP5Country(p.countryName));
    return {
      committee,
      activeCountries: active.length,
      p5Countries: p5.length,
      taken: active.filter((p) => held.has(p.id)).length,
      freeForEngine: autoPool.filter((p) => !held.has(p.id)).length,
    };
  });

  return (
    <AllotmentRulesClient
      rules={rules}
      pool={pool}
      role={session.role}
      aiAvailable={Boolean(process.env.GEMINI_API_KEY?.trim())}
    />
  );
}
