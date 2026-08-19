"use client";

import { useEffect } from "react";
import { ArrowRight } from "@/components/icons/ArrowRight";
import { Button, ButtonLink } from "@/components/ui/Button";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // The seam where a real error reporter would go.
    console.error(error);
  }, [error]);

  return (
    <main
      id="content"
      className="flex flex-1 items-center pt-[var(--header-h)] pb-24"
    >
      <div className="container-page">
        <div className="max-w-[46ch]">
          <h1 className="font-display text-h1 text-fg">
            Something broke on our end
          </h1>
          <p className="mt-5 text-lg leading-normal text-fg-muted">
            This is our fault, not yours. Try again — if it keeps happening,
            email the secretariat and we will sort it out.
          </p>
          {error.digest ? (
            <p className="mt-4 font-mono text-xs text-fg-faint">
              Reference: {error.digest}
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap gap-3">
            <Button onClick={reset}>
              Try again
              <ArrowRight className="size-4" />
            </Button>
            <ButtonLink href="/contact" variant="outline">
              Contact the secretariat
            </ButtonLink>
          </div>
        </div>
      </div>
    </main>
  );
}
