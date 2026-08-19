import Image from "next/image";
import delegates from "@/public/ppl.png";

/**
 * The cutout collage of delegates on the right of the hero — speaking at
 * microphones, holding placards, presenting.
 *
 * This was originally authored as flat SVG figures because no photography was
 * available. Real cutouts were supplied, so the SVG version was retired: a
 * genuine photograph of delegates does the persuasion job that an illustration
 * could only gesture at. The asset carries its own alpha channel, so it sits
 * over the duotone backdrop with no plate behind it.
 *
 * Layout is entirely the caller's: this wrapper sets NO position, display, or
 * sizing class of its own. `cn()` does no conflict resolution, so a base
 * `relative` here would silently fight an incoming `absolute`.
 */
export function DelegateCollage({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Image
        src={delegates}
        alt=""
        aria-hidden="true"
        priority
        sizes="(min-width: 1280px) 600px, (min-width: 1024px) 480px, 0px"
        className="h-auto w-full animate-rise object-contain object-bottom"
      />
    </div>
  );
}
