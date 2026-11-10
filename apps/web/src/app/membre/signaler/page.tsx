import { desc, db, eq, schema } from "@pride/db";
import { PageTitle } from "@/components/site/app-shell";
import { Badge, Card } from "@/components/ui/card";
import { requireMember } from "@/lib/session";
import { TICKET_STATUS, ticketRef } from "@/lib/tickets";
import { formatDate } from "@/lib/utils";
import { TicketForm } from "./ticket-form";

/** « Signaler un problème » : bug ou idée d'amélioration, envoyé à l'administrateur ; suivi des signalements du membre. */
export default async function ReportPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { member } = await requireMember();
  const from = (await searchParams).page ?? "";
  const mine = await db.query.tickets.findMany({ where: eq(schema.tickets.memberId, member.id), orderBy: desc(schema.tickets.createdAt), limit: 20 });
  return (
    <>
      <PageTitle title="Signaler un problème" sub="Un bug, ou une idée pour améliorer le site ? L'administrateur lit chaque signalement et vous répond par e-mail." />
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <Card>
          {/* Seule une adresse interne au site est gardée comme « page concernée ». */}
          <TicketForm page={from.startsWith("/") && !from.startsWith("//") ? from.slice(0, 300) : ""} />
        </Card>
        <Card className="flex flex-col gap-3 self-start">
          <h2 className="text-xl font-bold">Mes signalements</h2>
          {mine.length === 0 && <p className="text-muted">Aucun signalement pour l&apos;instant.</p>}
          <ul className="divide-y divide-line">
            {mine.map((t) => (
              <li key={t.id} className="flex flex-col gap-1 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="min-w-0">{t.title}</strong>
                  <Badge tone={TICKET_STATUS[t.status][1]}>{TICKET_STATUS[t.status][0]}</Badge>
                </div>
                <span className="text-sm text-muted">{ticketRef(t.number)} · {t.kind === "BUG" ? "Bug" : "Amélioration"} · {formatDate(t.createdAt)}</span>
                {t.adminNote && <p className="rounded-lg bg-[#f2f5f1] px-3 py-2 text-[14px]">Réponse : {t.adminNote}</p>}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
