import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

type PkrInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "prefix"
> & {
  invalid?: boolean;
};

/** Numeric fee field with a locked PKR prefix. */
export function PkrInput({ className, ...props }: PkrInputProps) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-fg-muted">
        PKR
      </span>
      <Input
        {...props}
        type="number"
        min={0}
        inputMode="numeric"
        className={cn("pl-14", className)}
      />
    </div>
  );
}
