import { InitialsMedallion } from "@/components/board/InitialsMedallion";
import { Mail } from "@/components/icons/Mail";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { BoardMember } from "@/lib/types";

type BoardMemberCardProps = {
  member: BoardMember;
  /** The Secretary-General only. Larger medallion, more padding, longer measure. */
  featured?: boolean;
};

export function BoardMemberCard({
  member,
  featured = false,
}: BoardMemberCardProps) {
  return (
    <Card padding={featured ? "lg" : "md"} className="flex h-full flex-col">
      <div className={cn("flex items-start gap-4", featured && "sm:gap-5")}>
        {member.photoUrl ? (
          // Admin-uploaded portrait; decorative because the name is adjacent.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={member.photoUrl}
            alt=""
            className={cn(
              "shrink-0 rounded-full object-cover",
              featured ? "size-16" : "size-12",
            )}
          />
        ) : (
          <InitialsMedallion
            initials={member.initials}
            size={featured ? "lg" : "md"}
          />
        )}
        <div className="min-w-0">
          <h3
            className={cn(
              "font-semibold text-fg text-balance",
              featured ? "text-h3" : "text-base leading-snug",
            )}
          >
            {member.name}
          </h3>
          <p
            className={cn(
              "mt-1 font-medium text-brand-fg",
              featured ? "text-base" : "text-sm",
            )}
          >
            {member.role}
          </p>
        </div>
      </div>

      <p
        className={cn(
          "mt-5 flex-1 leading-relaxed text-fg-muted",
          featured ? "max-w-[58ch] text-base" : "text-sm",
        )}
      >
        {member.bio}
      </p>

      {member.email ? (
        <a
          href={`mailto:${member.email}`}
          className={cn(
            "mt-3 inline-flex min-h-11 max-w-full items-center gap-2 self-start",
            "text-sm font-medium text-fg-muted",
            "transition-colors duration-[var(--dur-fast)] ease-out hover:text-brand-fg",
            "focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2",
          )}
        >
          <Mail className="size-4 shrink-0" />
          <span className="truncate">{member.email}</span>
        </a>
      ) : null}
    </Card>
  );
}
