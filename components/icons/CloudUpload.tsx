import type { SVGProps } from "react";

export function CloudUpload(props: SVGProps<SVGSVGElement>) {
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
      <path d="M8 18H7a4 4 0 0 1 0-8 5.5 5.5 0 0 1 10.6-1.5A3.5 3.5 0 0 1 18 18h-2" />
      <path d="M12 12v8" />
      <path d="m9 15 3-3 3 3" />
    </svg>
  );
}
