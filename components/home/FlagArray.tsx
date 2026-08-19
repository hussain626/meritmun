import Image from "next/image";
import flags from "@/public/flags.png";

/**
 * The array of world flags lining the hero base.
 *
 * Real photography with its own alpha channel, replacing the stylised SVG row
 * this originally shipped with. A gradient scrim sits over the top edge so the
 * flags emerge out of the duotone field rather than being pasted onto it, and
 * the whole strip is very slightly desaturated so full-saturation national
 * colours do not fight the emerald palette.
 */
export function FlagArray() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-32 overflow-hidden sm:h-40 lg:h-48"
    >
      <Image
        src={flags}
        alt=""
        priority
        sizes="100vw"
        className="absolute inset-0 size-full object-cover object-bottom saturate-[0.88]"
      />
      {/* Emerge-from-the-dark grade: opaque at the top where the flags meet the
          architecture, clear at the base where they should read as themselves. */}
      <div className="absolute inset-0 bg-[linear-gradient(to_top,transparent_42%,var(--art-scrim)_88%)]" />
      <div className="absolute inset-0 bg-forest/15 mix-blend-multiply" />
    </div>
  );
}
