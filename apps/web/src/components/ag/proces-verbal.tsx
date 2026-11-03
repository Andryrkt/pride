import type { AssemblyDetail } from "@/lib/assemblies";
import {
  hour, person, pvAnnexTitle, pvClosing, pvMajority, pvNotVoted, pvOpening, pvQuorumConclusion, pvQuorumItems,
  pvResolutionTitle, pvSession, pvSubtitle, pvTitle, pvVote, PV_SIGNATURES,
} from "@/lib/pv-text";

/** Procès-verbal de l'AG, établi à partir des données enregistrées pendant la séance ; textes communs avec le PDF (`pv-text.ts`). */
export function ProcesVerbal({ a }: { a: AssemblyDetail }) {
  const carence = a.status === "CARENCE";
  const final = a.status === "CLOTUREE" || carence;
  return (
    <article className="relative mx-auto flex w-full max-w-[820px] flex-col gap-5 rounded-2xl border border-line bg-white p-8 font-serif text-[15.5px] leading-relaxed text-ink print:max-w-none print:border-0 print:p-0">
      {!final && (
        <p className="rounded-xl bg-sun-50 px-4 py-2 font-sans text-sm font-semibold text-sun-800 print:border print:border-sun-800">
          Projet de procès-verbal : il ne deviendra définitif qu'à la clôture de la séance.
        </p>
      )}
      <header className="flex flex-col items-center gap-1 border-b border-line pb-4 text-center">
        <div className="font-sans text-sm font-bold uppercase tracking-[0.14em] text-brand-800">Association PRIDe</div>
        <div className="font-sans text-xs text-muted">Partage Responsabilité Intégrité pour le Développement · Antananarivo</div>
        <h1 className="mt-3 font-sans text-2xl font-extrabold">{pvTitle(a)}</h1>
        <div className="font-sans text-sm text-muted">{pvSubtitle(a)}</div>
      </header>

      <p>{pvOpening(a)}</p>
      {a.openedAt && <p>{pvSession(a)}</p>}

      <section className="flex flex-col gap-1">
        <h2 className="font-sans text-lg font-bold">Quorum</h2>
        <ul className="list-disc pl-6">
          {pvQuorumItems(a).map((x) => <li key={x}>{x}</li>)}
        </ul>
        <p className="mt-1">{pvQuorumConclusion(a)}</p>
      </section>

      <section className="flex flex-col gap-1">
        <h2 className="font-sans text-lg font-bold">Ordre du jour</h2>
        <p className="whitespace-pre-line">{a.agenda}</p>
      </section>

      {!carence && a.resolutions.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-sans text-lg font-bold">Délibérations</h2>
          {a.resolutions.map((r) => (
            <div key={r.id} className="flex flex-col gap-1 break-inside-avoid">
              <h3 className="font-sans font-bold">{pvResolutionTitle(r)}</h3>
              <p className="whitespace-pre-line">{r.text}</p>
              <p className="text-sm text-muted">{pvMajority(r)}</p>
              {(() => {
                const vote = pvVote(r);
                return vote ? (
                  <p>
                    {vote.count}{" "}
                    <strong className={r.adopted ? "text-brand-800" : "text-flame-800"}>{vote.verdict}</strong>
                  </p>
                ) : (
                  <p className="italic">{pvNotVoted(a)}</p>
                );
              })()}
            </div>
          ))}
        </section>
      )}

      {a.notes && (
        <section className="flex flex-col gap-1">
          <h2 className="font-sans text-lg font-bold">Observations</h2>
          <p className="whitespace-pre-line">{a.notes}</p>
        </section>
      )}

      {a.closedAt && <p>{pvClosing(a)}</p>}

      <div className="mt-6 grid grid-cols-2 gap-8 break-inside-avoid font-sans text-sm">
        {PV_SIGNATURES.map((label, i) => (
          <div key={label} className="flex flex-col gap-12">
            <span className="font-semibold">{label}</span>
            <span className="border-t border-ink pt-1">{person(i === 0 ? a.president : a.secretary)}</span>
          </div>
        ))}
      </div>

      <section className="mt-6 flex flex-col gap-2 break-before-page">
        <h2 className="font-sans text-lg font-bold">{pvAnnexTitle(a)}</h2>
        {a.attendances.length === 0 ? (
          <p className="text-muted">Aucun membre n'a émargé.</p>
        ) : (
          <table className="w-full text-left font-sans text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wider text-muted">
              <tr><th className="py-2">N°</th><th>Nom</th><th>Droit de vote</th><th>Arrivée</th></tr>
            </thead>
            <tbody>
              {a.attendances.map((x) => (
                <tr key={x.memberId} className="border-b border-line">
                  <td className="py-1.5 font-mono">{x.member.number}</td>
                  <td>{x.member.lastName} {x.member.firstNames}</td>
                  <td>{x.canVote ? "Oui" : "Non"}</td>
                  <td>{hour(x.signedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </article>
  );
}
