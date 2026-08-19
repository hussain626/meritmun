import { InitialsMedallion } from "@/components/board/InitialsMedallion";
import type { Chair } from "@/lib/types";

type ChairListProps = {
  chairs: Chair[];
};

export function ChairList({ chairs }: ChairListProps) {
  return (
    <ul className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:gap-x-8">
      {chairs.map((chair) => (
        <li key={chair.name} className="flex items-center gap-3">
          <InitialsMedallion initials={chair.initials} size="md" />
          <span className="min-w-0">
            <span className="block font-semibold text-fg">{chair.name}</span>
            <span className="block text-sm text-fg-muted">{chair.role}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
