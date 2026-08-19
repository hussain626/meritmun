import type { Stat } from "@/lib/types";

/**
 * The four figures in the floating hero stats bar. This is the ONLY stat block
 * on the site — see the hero-metric ban in `context/ui-rules.md`.
 */
export const heroStats: Stat[] = [
  { id: "registrants", value: 2140, label: "Registrants to date", suffix: "+" }, // PLACEHOLDER
  { id: "committees", value: 12, label: "Committees" },
  { id: "institutions", value: 41, label: "Participating institutions" }, // PLACEHOLDER
  { id: "alumni", value: 1800, label: "Alumni delegates", suffix: "+" }, // PLACEHOLDER
];
