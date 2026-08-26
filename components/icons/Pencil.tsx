import type { SVGProps } from "react";

export function Pencil(props: SVGProps<SVGSVGElement>) {
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
      <path d="M13.5 6.5 17.5 10.5" />
      <path d="M4 20h4l10.5-10.5-4-4L4 16v4Z" />
    </svg>
  );
}
