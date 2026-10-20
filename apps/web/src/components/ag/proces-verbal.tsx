import { MAJORITES } from "@pride/shared";
import { KIND_LABELS, type AssemblyDetail } from "@/lib/assemblies";
import { formatDate, formatDateTime } from "@/lib/utils";

const time = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
const person = (m: { lastName: string; firstNames: string } | null) => (m ? `${m.lastName} ${m.firstNames}` : "—");

/** Procès-verbal de l'AG, établi à partir des données enregistrées pendant la séance. */
export function ProcesVerbal({ a }: { a: AssemblyDetail }) {
  const carence = a.status === "CARENCE";
  const final = a.status === "CLOTUREE" || carence;
  const nonVoters = a.attendances.length - a.presentVoters;
  const kind = KIND_LABELS[a.kind].toLowerCase();
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
        <h1 className="mt-3 font-sans text-2xl font-extrabold">
          {carence ? "Procès-verbal de carence" : "Procès-verbal"} de l'{kind}
        </h1>
        <div className="font-sans text-sm text-muted">
          {a.reference}{a.convocationNumber >= 2 ? " · deuxième convocation" : ""} · {formatDate(a.scheduledAt)}
        </div>
      </header>

      <p>
        {a.openedAt ? `Le ${formatDate(a.openedAt)}` : `Le ${formatDateTime(a.scheduledAt)}`}, à {a.location}, les membres de l'association PRIDe se sont réunis en {kind}
        {a.convocationNumber >= 2 && a.previous ? `, sur deuxième convocation, l'assemblée du ${formatDate(a.previous.scheduledAt)} (${a.previous.reference}) n'ayant pas réuni le quorum` : ""}
        {a.convokedAt ? `, sur convocation envoyée le ${formatDate(a.convokedAt)}` : ""}.
      </p>
      {a.openedAt && (
        <p>
          La séance est ouverte à {time.format(new Date(a.openedAt))} sous la présidence de <strong>{person(a.president)}</strong>.{" "}
          <strong>{person(a.secretary)}</strong> assure le secrétariat de séance.
        </p>
      )}

      <section className="flex flex-col gap-1">
        <h2 className="font-sans text-lg font-bold">Quorum</h2>
        <ul className="list-disc pl-6">
          <li>Membres ayant le droit de vote : {a.eligibleVoters ?? "—"} (membres actifs majeurs ; pas de procuration)</li>
          {a.convocationNumber < 2 && <li>Quorum requis (majorité absolue) : {a.quorum ?? "—"}</li>}
          <li>Votants présents : {a.presentVoters}</li>
          {nonVoters > 0 && <li>Présents sans droit de vote (mineurs, bienfaiteurs) : {nonVoters}</li>}
        </ul>
        <p className="mt-1">
          {carence
            ? `Le quorum n'étant pas atteint (${a.presentVoters} votants présents sur ${a.quorum} requis), l'assemblée ne peut pas délibérer. Une deuxième assemblée sera convoquée sur le même ordre du jour ; elle délibérera valablement quel que soit le nombre de membres présents.`
            : a.convocationNumber >= 2
              ? "Sur deuxième convocation, l'assemblée délibère valablement quel que soit le nombre de membres présents."
              : a.canDeliberate
                ? "Le quorum étant atteint, l'assemblée peut valablement délibérer."
                : "Le quorum n'est pas encore atteint."}
        </p>
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
              <h3 className="font-sans font-bold">Résolution n° {r.position} : {r.title}</h3>
              <p className="whitespace-pre-line">{r.text}</p>
              <p className="text-sm text-muted">{MAJORITES[r.majority].label} ({MAJORITES[r.majority].detail}).</p>
              {r.adopted === null ? (
                <p className="italic">Non encore votée.</p>
              ) : (
                <p>
                  Votants présents : {r.voters}. Pour : {r.votesFor} · contre : {r.votesAgainst} · abstentions : {r.abstentions}.{" "}
                  <strong className={r.adopted ? "text-brand-800" : "text-flame-800"}>{r.adopted ? "La résolution est adoptée." : "La résolution est rejetée."}</strong>
                </p>
              )}
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

      {a.closedAt && (
        <p>
          {carence ? "La carence est constatée" : "L'ordre du jour étant épuisé, la séance est levée"} à {time.format(new Date(a.closedAt))}. De tout ce qui précède, il est dressé le présent procès-verbal.
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-8 break-inside-avoid font-sans text-sm">
        {[["Le président de séance", a.president], ["Le secrétaire de séance", a.secretary]].map(([label, m]) => (
          <div key={label as string} className="flex flex-col gap-12">
            <span className="font-semibold">{label as string}</span>
            <span className="border-t border-ink pt-1">{person(m as AssemblyDetail["president"])}</span>
          </div>
        ))}
      </div>

      <section className="mt-6 flex flex-col gap-2 break-before-page">
        <h2 className="font-sans text-lg font-bold">Annexe : liste d'émargement ({a.attendances.length})</h2>
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
                  <td>{time.format(new Date(x.signedAt))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </article>
  );
}
