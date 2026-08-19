import type { SVGProps } from "react";

export function Gavel(props: SVGProps<SVGSVGElement>) {
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
      <path d="M15.3 1.8 21.2 7.7 16.7 12.2 10.8 6.3Z" />
      <path d="M13.7 9.3 7.4 15.6" />
      <rect x="4" y="18.5" width="16" height="3" rx="1" />
    </svg>
  );
}
