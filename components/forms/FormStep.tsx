import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type FormStepProps = {
  title: string;
  description?: string;
  /** Inactive steps stay mounted (and hidden) so FormData carries every field. */
  active: boolean;
  children: ReactNode;
};

export function FormStep({
  title,
  description,
  active,
  children,
}: FormStepProps) {
  return (
    <fieldset
      // `hidden` rather than unmounting: a display:none input still submits, so
      // the final POST carries every step's values without any hidden-field
      // mirroring. It also keeps typed values intact when stepping back.
      hidden={!active}
      className={cn("min-w-0 border-0 p-0", active && "animate-rise")}
    >
      <legend className="sr-only">{title}</legend>
      <h2 className="text-h3 text-fg">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-[56ch] text-sm leading-normal text-fg-muted">
          {description}
        </p>
      ) : null}
      <div className="mt-7 grid gap-5">{children}</div>
    </fieldset>
  );
}
