import { ButtonLink } from "@/components/ui/Button";
import { ArrowRight } from "@/components/icons/ArrowRight";

export default function NotFound() {
  return (
    <main
      id="content"
      className="flex flex-1 items-center pt-[var(--header-h)] pb-24"
    >
      <div className="container-page">
        <div className="max-w-[46ch]">
          <p className="font-mono text-sm text-fg-faint">404</p>
          <h1 className="mt-3 font-display text-h1 text-fg">
            This page is not on the agenda
          </h1>
          <p className="mt-5 text-lg leading-normal text-fg-muted">
            The link you followed does not point anywhere on the MERITMUN III
            site. It may have been moved, or the address may have a typo.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/">
              Back to the homepage
              <ArrowRight className="size-4" />
            </ButtonLink>
            <ButtonLink href="/committees" variant="outline">
              Browse committees
            </ButtonLink>
          </div>
        </div>
      </div>
    </main>
  );
}
