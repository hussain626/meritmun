import { Section } from "@/components/ui/Section";

type ValuePropProps = {
  points: readonly { id: string; title: string; body: string }[];
};

/**
 * Deliberately NOT a three-identical-cards grid — see the ban in `ui-rules.md`.
 * An editorial two-column layout: the argument on the left, the numbered
 * points as a rhythmic list on the right, with the first point given weight.
 */
export function ValueProp({ points }: ValuePropProps) {
  const [lead, ...rest] = points;

  return (
    <Section id="why" band="subtle">
      <div className="grid gap-14 lg:grid-cols-[5fr_7fr] lg:gap-20">
        <div className="lg:sticky lg:top-[calc(var(--chrome-h)+3rem)] lg:self-start">
          <h2 className="text-h2 text-fg text-balance">
            Why give MERITMUN III your weekend
          </h2>
          <p className="mt-5 max-w-[46ch] leading-relaxed text-fg-muted">
            Most conferences sell you a certificate. This one is built around
            the part that actually changes how you argue: a real agenda, a chair
            who knows it, and a room that will not let a vague speech pass.
          </p>
          <div className="mt-8 h-px w-24 bg-accent" />
        </div>

        <div>
          {lead ? (
            <div className="pb-10">
              <h3 className="text-h3 text-fg text-balance">{lead.title}</h3>
              <p className="mt-3 max-w-[58ch] text-lg leading-relaxed text-fg-muted">
                {lead.body}
              </p>
            </div>
          ) : null}

          <ul className="divide-y divide-line border-t border-line">
            {rest.map((point) => (
              <li
                key={point.id}
                className="grid gap-2 py-8 sm:grid-cols-[minmax(0,15rem)_1fr] sm:gap-8"
              >
                <h3 className="text-base font-semibold text-fg text-balance">
                  {point.title}
                </h3>
                <p className="max-w-[54ch] leading-relaxed text-fg-muted">
                  {point.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
