import type { SVGProps } from "react";

export function LayoutGrid(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <circle cx="7" cy="7" r="1.35" />
      <circle cx="12" cy="7" r="1.35" />
      <circle cx="17" cy="7" r="1.35" />
      <circle cx="7" cy="12" r="1.35" />
      <circle cx="12" cy="12" r="1.35" />
      <circle cx="17" cy="12" r="1.35" />
    </svg>
  );
}
