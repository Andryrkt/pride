/** Résultats d'une consultation : une barre par réponse. */
export function ConsultationResults({ total, rows }: { total: number; rows: { label: string; n: number; pct: number }[] }) {
  return (
    <div className="flex flex-col gap-3">
      {rows.map((r) => (
        <div key={r.label} className="flex flex-col gap-1.5">
          <div className="flex justify-between gap-3 text-[14.5px]">
            <span>{r.label}</span>
            <strong>{r.pct} %</strong>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[#e6eae4]" role="img" aria-label={`${r.label} : ${r.n} voix sur ${total}`}>
            <div className="h-full rounded-full bg-brand-600" style={{ width: `${r.pct}%` }} />
          </div>
        </div>
      ))}
      <p className="text-sm text-muted">{total} vote{total > 1 ? "s" : ""} · vote anonyme</p>
    </div>
  );
}
