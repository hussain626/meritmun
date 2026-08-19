/**
 * Small local utilities. Deliberately dependency-free — see
 * `context/library-docs.md` for why `clsx`/`tailwind-merge` were rejected.
 */

type ClassValue =
  | string
  | number
  | null
  | undefined
  | false
  | ClassValue[]
  | Record<string, boolean | null | undefined>;

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];

  for (const input of inputs) {
    if (!input) continue;

    if (typeof input === "string" || typeof input === "number") {
      out.push(String(input));
    } else if (Array.isArray(input)) {
      const nested = cn(...input);
      if (nested) out.push(nested);
    } else {
      for (const [key, value] of Object.entries(input)) {
        if (value) out.push(key);
      }
    }
  }

  return out.join(" ");
}

/** Narrow a FormData entry to a trimmed string. The only sanctioned cast site. */
export function getField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function getCheckbox(formData: FormData, name: string): boolean {
  const value = formData.get(name);
  return value === "on" || value === "true" || value === "1";
}

export function getNumberField(formData: FormData, name: string): number {
  const raw = getField(formData, name);
  if (raw === "") return Number.NaN;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function getAllFields(formData: FormData, name: string): string[] {
  return formData
    .getAll(name)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** "09:30" + "11:00" → "09:30 – 11:00" (en dash, not a hyphen). */
export function formatTimeRange(start: string, end: string): string {
  return `${start} – ${end}`;
}

/** "09:30" → 570. Used to sort and to size timeline rows. */
export function minutesFromTime(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

const REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** MMIII-XXXXXX. Ambiguous glyphs (I, O, 0, 1) are excluded — people read these aloud. */
export function generateReference(): string {
  let body = "";
  for (let index = 0; index < 6; index += 1) {
    body += REFERENCE_ALPHABET.charAt(
      Math.floor(Math.random() * REFERENCE_ALPHABET.length),
    );
  }
  return `MMIII-${body}`;
}

export function isValidReferenceShape(value: string): boolean {
  return /^MMIII-[A-HJ-NP-Z2-9]{6}$/i.test(value.trim());
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function pluralise(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

export function titleCase(input: string): string {
  return input
    .split(/[\s-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
