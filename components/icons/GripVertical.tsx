import type { SVGProps } from "react";

export function GripVertical(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <circle cx="9" cy="6" r="1.25" />
      <circle cx="15" cy="6" r="1.25" />
      <circle cx="9" cy="12" r="1.25" />
      <circle cx="15" cy="12" r="1.25" />
      <circle cx="9" cy="18" r="1.25" />
      <circle cx="15" cy="18" r="1.25" />
    </svg>
  );
}
