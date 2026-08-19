import type { SVGProps } from "react";

export function Mail(props: SVGProps<SVGSVGElement>) {
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
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2.5 6.5 8.47 5.7a2 2 0 0 0 2.06 0l8.47-5.7" />
    </svg>
  );
}
