import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/auth";
import { getPresidentAddress } from "@/lib/email/send";
import { MailClient } from "./MailClient";

export const metadata: Metadata = {
  title: "Mail",
  robots: { index: false, follow: false },
};

export default async function MailPage() {
  const session = await requireAdminSession(["admin"]);
  return (
    <MailClient
      from={getPresidentAddress()}
      defaultSignature={`${session.user.fullName}\nPresident, MERITMUN III`}
    />
  );
}
