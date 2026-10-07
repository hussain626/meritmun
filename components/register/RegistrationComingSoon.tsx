import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { conference } from "@/content/site";

type RegistrationComingSoonProps = {
  className?: string;
};

export function RegistrationComingSoon({ className }: RegistrationComingSoonProps) {
  return (
    <EmptyState
      className={className}
      title="Opening date to be announced"
      body={`We're putting the finishing touches on registration for ${conference.fullName}. Check back here soon — we'll announce the opening date on our social channels.`}
      action={
        <Link
          href="/contact"
          className="text-sm font-semibold text-brand-fg underline underline-offset-4 transition-colors duration-[var(--dur-fast)] ease-out hover:text-accent-fg focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2"
        >
          Questions? Contact the secretariat
        </Link>
      }
    />
  );
}
