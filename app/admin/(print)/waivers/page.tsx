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
  title: "Waivers",
  robots: { index: false, follow: false },
};

/**
 * One consent/waiver slip per seated delegate, pre-filled with their seat
 * and contact details. Two per A4 page; signed on arrival.
 */
export default async function WaiversPage({
  searchParams,
}: {
  searchParams: Promise<{ committee?: string }>;
}) {
  const params = await searchParams;
  const [committees, portfolios, allotments, delegates, delegations] =
    await Promise.all([
      listCommitteesAdmin(),
      listPortfolios(),
      listAllotments(),
      listDelegates(),
      listDelegations(),
    ]);

  const slips = buildSeatMatrix({
    committees,
    portfolios,
    allotments,
    delegates,
    delegations,
  })
    .filter((c) => !params.committee || c.committee.id === params.committee)
    .flatMap((c) =>
      [...c.seats, ...c.offPool]
        .filter((s) => s.holder)
        .map((s) => ({ committee: c.committee, seat: s })),
    )
    .sort(
      (a, b) =>
        a.committee.sortOrder - b.committee.sortOrder ||
        a.seat.portfolio.countryName.localeCompare(b.seat.portfolio.countryName),
    );

  return (
    <>
      <PrintToolbar title={`Waivers · ${slips.length} delegates`} />
      {slips.length === 0 ? (
        <p className="p-8 text-sm text-neutral-600">
          No seated delegates yet — allot seats first.
        </p>
      ) : null}
      <div className="mx-auto grid max-w-[52rem] gap-6 px-6 py-8 print:max-w-none print:gap-0 print:p-0">
        {slips.map(({ committee, seat }) => {
          const delegate = seat.holder!.delegate;
          return (
            <article
              key={delegate.id}
              className="break-inside-avoid border border-neutral-400 p-6 print:h-[148mm] print:border-0 print:border-b print:border-dashed"
            >
              <header className="flex items-start justify-between border-b border-neutral-300 pb-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    MERITMUN III · Delegate waiver
                  </p>
                  <h2 className="text-lg font-bold">{delegate.fullName}</h2>
                </div>
                <p className="font-mono text-sm">{delegate.delegateCode}</p>
              </header>
              <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                <div>
                  <dt className="text-xs text-neutral-500">Committee</dt>
                  <dd>{committee.abbr} — {committee.name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-neutral-500">Country</dt>
                  <dd>{seat.portfolio.countryName}</dd>
                </div>
                <div>
                  <dt className="text-xs text-neutral-500">Phone</dt>
                  <dd>{delegate.phone}</dd>
                </div>
                <div>
                  <dt className="text-xs text-neutral-500">Email</dt>
                  <dd className="break-all">{delegate.email}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-neutral-500">Institution</dt>
                  <dd>{seat.holder!.delegationName ?? delegate.institution}</dd>
                </div>
              </dl>
              <p className="mt-4 text-xs leading-relaxed text-neutral-700">
                I confirm the details above are correct. I agree to follow the MERITMUN code of
                conduct and the instructions of the Secretariat and Executive Board, and I accept
                responsibility for my personal belongings at the venue. In an emergency the
                organisers may contact me on the number above.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-6 text-xs text-neutral-600">
                <p className="border-t border-neutral-500 pt-1">Delegate signature</p>
                <p className="border-t border-neutral-500 pt-1">Parent / guardian (if under 18)</p>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
