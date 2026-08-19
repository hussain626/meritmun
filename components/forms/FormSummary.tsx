export type SummarySection = {
  id: string;
  title: string;
  /** Index of the step this section came from, so "Edit" jumps back to it. */
  step: number;
  rows: { label: string; value: string }[];
};

type FormSummaryProps = {
  sections: SummarySection[];
  onEdit: (step: number) => void;
};

export function FormSummary({ sections, onEdit }: FormSummaryProps) {
  return (
    <div className="grid gap-4">
      {sections.map((section) => (
        <div
          key={section.id}
          className="rounded-md border border-line bg-surface p-5"
        >
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="text-sm font-semibold text-fg">{section.title}</h3>
            <button
              type="button"
              onClick={() => onEdit(section.step)}
              className="rounded-sm text-sm font-semibold text-brand-fg underline-offset-4 transition-colors duration-[var(--dur-fast)] ease-out hover:text-accent-fg hover:underline focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2"
            >
              Edit
              <span className="sr-only"> {section.title.toLowerCase()}</span>
            </button>
          </div>
          <dl className="mt-4 grid gap-2.5">
            {section.rows.map((row) => (
              <div
                key={row.label}
                className="grid gap-0.5 sm:grid-cols-[minmax(0,11rem)_1fr] sm:gap-4"
              >
                <dt className="text-sm text-fg-faint">{row.label}</dt>
                <dd className="text-sm break-words text-fg">
                  {row.value || "—"}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}
