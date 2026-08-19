import type { SVGProps } from "react";

export function Filter(props: SVGProps<SVGSVGElement>) {
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
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3Z" />
    </svg>
  );
}
