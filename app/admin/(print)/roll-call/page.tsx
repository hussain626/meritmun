import type { Metadata } from "next";
import { PrintToolbar } from "@/components/admin/PrintToolbar";
import {
  listAllotments,
  listCommitteesAdmin,
  listDelegates,
  listDelegations,
  listPortfolios,
} from "@/lib/admin/data";
import { buildSeatMatrix } from "@/lib/admin/seat-matrix";

export const metadata: Metadata = {
  title: "Roll Call",
  robots: { index: false, follow: false },
};

const SESSION_CHOICES = [4, 6, 8, 10, 12];

export default async function RollCallPage({
  searchParams,
}: {
  searchParams: Promise<{ committee?: string; sessions?: string }>;
}) {
  const params = await searchParams;
  const sessions = SESSION_CHOICES.includes(Number(params.sessions))
    ? Number(params.sessions)
    : 8;

  const [committees, portfolios, allotments, delegates, delegations] =
    await Promise.all([
      listCommitteesAdmin(),
      listPortfolios(),
      listAllotments(),
      listDelegates(),
      listDelegations(),
    ]);

  const matrix = buildSeatMatrix({
    committees,
    portfolios,
    allotments,
    delegates,
    delegations,
  }).filter(
    (c) =>
      (!params.committee || c.committee.id === params.committee) &&
      c.taken > 0,
  );

  const query = (n: number) =>
    `?${params.committee ? `committee=${params.committee}&` : ""}sessions=${n}`;

  return (
    <>
      <PrintToolbar title="Roll-call sheets">
        <span className="text-sm text-neutral-600">Sessions:</span>
        {SESSION_CHOICES.map((n) => (
          <a
            key={n}
            href={query(n)}
            className={
              n === sessions
                ? "text-sm font-semibold underline"
                : "text-sm text-neutral-600 hover:underline"
            }
          >
            {n}
          </a>
        ))}
      </PrintToolbar>

      {matrix.length === 0 ? (
        <p className="p-8 text-sm text-neutral-600">
          No seated delegates yet — allot seats first.
        </p>
      ) : null}

      {matrix.map((c) => {
        const seated = [...c.seats, ...c.offPool]
          .filter((s) => s.holder)
          .sort((a, b) => a.portfolio.countryName.localeCompare(b.portfolio.countryName));
        return (
          <section
            key={c.committee.id}
            className="mx-auto max-w-[72rem] break-after-page px-6 py-8 print:px-0 print:py-0"
          >
            <header className="mb-4 flex items-end justify-between border-b-2 border-neutral-900 pb-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  MERITMUN III · Roll call
                </p>
                <h1 className="text-xl font-bold">
                  {c.committee.abbr} — {c.committee.name}
                </h1>
              </div>
              <p className="text-sm text-neutral-600">{seated.length} delegates</p>
            </header>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="w-48 border border-neutral-400 px-2 py-1.5 text-left">Country</th>
                  <th className="w-64 border border-neutral-400 px-2 py-1.5 text-left">Delegate</th>
                  {Array.from({ length: sessions }, (_, i) => (
                    <th
                      key={i}
                      className="w-12 border border-neutral-400 px-1 py-1.5 text-center text-xs"
                    >
                      S{i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {seated.map((seat) => (
                  <tr key={seat.portfolio.id} className="break-inside-avoid">
                    <td className="border border-neutral-400 px-2 py-1.5 font-medium">
                      {seat.portfolio.countryName}
                    </td>
                    <td className="border border-neutral-400 px-2 py-1.5">
                      {seat.holder!.delegate.fullName}
                    </td>
                    {Array.from({ length: sessions }, (_, i) => (
                      <td key={i} className="border border-neutral-400" />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-neutral-500">P = present · PV = present and voting · A = absent</p>
          </section>
        );
      })}
    </>
  );
}
