import type { Stat } from "@/lib/types";

/**
 * The three figures in the floating hero stats bar. The committee count is
 * replaced with the live number of published committees on the homepage. This is the ONLY stat block
 * on the site, see the hero-metric ban in `context/ui-rules.md`.
 */
export const heroStats: Stat[] = [
  { id: "committees", value: 12, label: "Committees" },
  { id: "institutions", value: 40, label: "Participating institutions", suffix: "+" },
  { id: "alumni", value: 300, label: "Alumni delegates", suffix: "+" },
];
