import flags from "@/public/flags.png";

/**
 * The array of world flags lining the hero base.
 *
 * Real photography with its own alpha channel, replacing the stylised SVG row
 * this originally shipped with.
 *
 * Rendered as a repeating background rather than an <Image>, because the source
 * is a 4:1 strip: stretched to the full viewport width it would need a ~480px
 * band to stay uncropped, which would swallow the hero. `background-size:
 * auto 100%` instead scales the strip to the band height — so every flag is
 * shown whole, cloth and mast and finial — and tiles it horizontally to cover
 * any viewport width.
 */
export function FlagArray() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-40 overflow-hidden sm:h-52 lg:h-64"
    >
      <div
        className="absolute inset-0 bg-bottom bg-repeat-x saturate-[0.88]"
        style={{
          backgroundImage: `url(${flags.src})`,
          backgroundSize: "auto 100%",
        }}
      />
      {/* Emerge-from-the-dark grade: opaque at the top where the flags meet the
          architecture, clear at the base where they should read as themselves. */}
      <div className="absolute inset-0 bg-[linear-gradient(to_top,transparent_45%,var(--art-scrim)_92%)]" />
      <div className="absolute inset-0 bg-forest/15 mix-blend-multiply" />
    </div>
  );
}
