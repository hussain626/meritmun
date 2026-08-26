/**
 * P5 (UNSC permanent members with veto) — never auto-allotted by the merit
 * engine. EB may assign manually. Canonical set: USA, China, Russia, UK, France.
 */

export const P5_CANONICAL = [
  "USA",
  "China",
  "Russia",
  "UK",
  "France",
] as const;

export type P5Canonical = (typeof P5_CANONICAL)[number];

/** Alias → canonical P5 name. Keys are already normalized (see normalizeCountryName). */
const P5_ALIASES: Record<string, P5Canonical> = {
  usa: "USA",
  us: "USA",
  "u.s.": "USA",
  "u.s.a.": "USA",
  "u.s.a": "USA",
  "united states": "USA",
  "united states of america": "USA",
  america: "USA",

  china: "China",
  prc: "China",
  "people's republic of china": "China",
  "peoples republic of china": "China",
  "people s republic of china": "China",

  russia: "Russia",
  "russian federation": "Russia",
  "russian federation of": "Russia",

  uk: "UK",
  "u.k.": "UK",
  "u.k": "UK",
  "united kingdom": "UK",
  "united kingdom of great britain and northern ireland": "UK",
  britain: "UK",
  "great britain": "UK",
  england: "UK",

  france: "France",
  "french republic": "France",
};

/**
 * Lowercase, strip diacritics-ish punctuation noise, collapse whitespace,
 * and drop surrounding quotes/brackets so alias lookup is stable.
 */
export function normalizeCountryName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’`]/g, "'")
    .replace(/[."""]/g, "")
    .replace(/[_/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Returns the canonical P5 label when `name` is a P5 country, else null. */
export function matchP5Country(name: string): P5Canonical | null {
  const key = normalizeCountryName(name);
  if (!key) return null;
  return P5_ALIASES[key] ?? null;
}

export function isP5Country(name: string): boolean {
  return matchP5Country(name) !== null;
}
