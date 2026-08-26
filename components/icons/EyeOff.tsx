import type { SVGProps } from "react";

export function EyeOff(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d="M6.5 6.6C4.2 8.1 2.6 10.3 2.2 12c0 0 3.3 6.5 9.8 6.5 1.6 0 3-.3 4.2-.8" />
      <path d="M10.1 10.2a3 3 0 0 0 3.7 3.7" />
      <path d="M17.4 13.6c1.4-1 2.4-2.3 2.6-3.6 0 0-3.3-6.5-9.8-6.5-.9 0-1.8.1-2.6.4" />
      <path d="m4 4 16 16" />
    </svg>
  );
}
