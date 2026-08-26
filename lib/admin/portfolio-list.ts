/**
 * Helpers for the committee allotment (portfolio) list.
 */

import { matchP5Country, normalizeCountryName } from "@/lib/merit/p5";

/** Split a pasted allotment list into unique country names. */
export function parseCountryList(raw: string): string[] {
  const seen = new Set<string>();
  const names: string[] = [];

  for (const part of raw.split(/[\n,;]+/)) {
    const name = part.trim().replace(/\s+/g, " ");
    if (!name) continue;
    const key = normalizeCountryName(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }

  return names;
}

export function clampPortfolioHardness(value: number): number {
  if (!Number.isFinite(value)) return 5;
  return Math.min(10, Math.max(1, Math.round(value)));
}

/** Match by normalized name, or by P5 alias (USA vs United States). */
export function findExistingPortfolio<T extends { countryName: string }>(
  portfolios: T[],
  countryName: string,
): T | undefined {
  const p5 = matchP5Country(countryName);
  const key = normalizeCountryName(countryName);
  return portfolios.find((portfolio) => {
    if (p5 && matchP5Country(portfolio.countryName) === p5) return true;
    return normalizeCountryName(portfolio.countryName) === key;
  });
}
