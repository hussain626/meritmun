export function SkipLink() {
  return (
    <a
      href="#content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[var(--z-tooltip)] focus:rounded-md focus:bg-accent focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-on-accent focus:outline-2 focus:outline-focus focus:outline-offset-2"
    >
      Skip to content
    </a>
  );
}
