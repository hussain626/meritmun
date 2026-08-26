import type { SVGProps } from "react";

export function Shield(props: SVGProps<SVGSVGElement>) {
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
      <path d="M12 3 4.5 6.2v5.1c0 4.5 3.1 8.6 7.5 9.7 4.4-1.1 7.5-5.2 7.5-9.7V6.2Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
