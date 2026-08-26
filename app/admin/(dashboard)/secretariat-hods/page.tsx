import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import {
  listCommitteesAdmin,
  listHods,
  listSecretariat,
} from "@/lib/admin/data";
import { SecHodsClient } from "./SecHodsClient";

export const metadata: Metadata = {
  title: "Secretariat & HODs",
  robots: { index: false, follow: false },
};

export default async function SecretariatHodsPage() {
  await requireAdminSession(["admin", "eb"]);
  const [secretariat, hods, committees] = await Promise.all([
    listSecretariat(),
    listHods(),
    listCommitteesAdmin(),
  ]);

  const committeeMap = new Map(committees.map((c) => [c.id, c.abbr]));
  const enriched = secretariat.map((s) => ({
    ...s,
    committeeAbbr: committeeMap.get(s.committeeId) ?? s.committeeId,
  }));

  return (
    <SecHodsClient
      secretariat={enriched}
      hods={hods}
      committeeOptions={committees.map((c) => ({
        id: c.id,
        abbr: c.abbr,
        name: c.name,
      }))}
    />
  );
}
