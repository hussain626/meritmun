import { CONTROL_BASE, CONTROL_BORDER } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import type { TextareaHTMLAttributes } from "react";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

export function Textarea({
  invalid,
  className,
  rows = 5,
  ...props
}: TextareaProps) {
  return (
    <textarea
      {...props}
      rows={rows}
      aria-invalid={invalid ? "true" : props["aria-invalid"]}
      className={cn(
        CONTROL_BASE,
        invalid ? CONTROL_BORDER.invalid : CONTROL_BORDER.default,
        "min-h-30 resize-y px-3 py-2.5",
        className,
      )}
    />
  );
}
