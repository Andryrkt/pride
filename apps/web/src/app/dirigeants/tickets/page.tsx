import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, desc, db, eq, inArray, schema } from "@pride/db";
import { PageTitle } from "@/components/site/app-shell";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, Card } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireDirigeant } from "@/lib/session";
import { githubText, TICKET_STATUS, ticketRef } from "@/lib/tickets";
import { cn, formatDate } from "@/lib/utils";
import { updateTicketAction } from "../actions";
import { CopyButton } from "./copy-button";

const VIEWS = { "": ["À traiter", ["NOUVEAU", "EN_COURS"]], traites: ["Traités", ["RESOLU", "REFUSE"]] } as const;
const KINDS = { "": "Tous", BUG: "Bugs", AMELIORATION: "Améliorations" } as const;

/** Tickets « Signaler un problème » (administrateur seul) : prendre en charge, résoudre ou refuser ; l'auteur est prévenu. */
export default async function TicketsPage({ searchParams }: { searchParams: Promise<{ vue?: string; type?: string; ok?: string }> }) {
  const sp = await searchParams;
  const v = await requireDirigeant();
  if (!v.isAdmin) redirect("/dirigeants");
  const vue = sp.vue === "traites" ? "traites" : "";
  const type = sp.type === "BUG" || sp.type === "AMELIORATION" ? sp.type : "";
  const tickets = await db.query.tickets.findMany({
    where: and(inArray(schema.tickets.status, [...VIEWS[vue][1]]), type ? eq(schema.tickets.kind, type) : undefined),
    orderBy: vue ? desc(schema.tickets.handledAt) : [asc(schema.tickets.status), asc(schema.tickets.createdAt)],
    with: { member: true },
    limit: vue ? 50 : undefined,
  });
  const href = (o: { vue?: string; type?: string }) => {
    const q = new URLSearchParams(Object.entries({ vue, type, ...o }).filter(([, x]) => x) as [string, string][]).toString();
    return `/dirigeants/tickets${q ? `?${q}` : ""}`;
  };
  const pill = (active: boolean) => cn("inline-flex min-h-10 items-center rounded-full px-4 text-[15px] font-semibold", active ? "bg-white text-brand-800 shadow-sm" : "text-[#2b3832]");

  return (
    <>
      <PageTitle title="Tickets" sub="Bugs et idées d'amélioration signalés par les utilisateurs du site. Réservé à l'administrateur." />
      {sp.ok && <p role="status" className="rounded-xl bg-brand-50 px-4 py-3 font-semibold text-brand-800">{sp.ok}</p>}
      <div className="flex flex-wrap gap-3">
        <nav aria-label="État" className="flex flex-wrap gap-1.5 rounded-full bg-[#e6eae4] p-1.5">
          {Object.entries(VIEWS).map(([k, [label]]) => <Link key={k} href={href({ vue: k })} aria-current={vue === k ? "page" : undefined} className={pill(vue === k)}>{label}</Link>)}
        </nav>
        <nav aria-label="Type" className="flex flex-wrap gap-1.5 rounded-full bg-[#e6eae4] p-1.5">
          {Object.entries(KINDS).map(([k, label]) => <Link key={k} href={href({ type: k })} aria-current={type === k ? "page" : undefined} className={pill(type === k)}>{label}</Link>)}
        </nav>
      </div>

      {tickets.length === 0 && <Card><p className="text-muted">{vue ? "Aucun ticket traité." : "Aucun ticket à traiter. Bravo !"}</p></Card>}
      {tickets.map((t) => (
        <Card key={t.id} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={TICKET_STATUS[t.status][1]}>{TICKET_STATUS[t.status][0]}</Badge>
            <Badge tone={t.kind === "BUG" ? "red" : "green"}>{t.kind === "BUG" ? "Bug" : "Amélioration"}</Badge>
            <span className="text-sm text-muted">
              {ticketRef(t.number)} · le {formatDate(t.createdAt)} par{" "}
              <Link href={`/dirigeants/membres/${t.member.id}`} className="font-semibold hover:underline">{t.member.lastName} {t.member.firstNames}</Link>
            </span>
          </div>
          <h2 className="text-lg font-bold">{t.title}</h2>
          <p className="whitespace-pre-line">{t.description}</p>
          <p className="text-[13px] text-muted">
            Page : {t.page ? <Link href={t.page} className="underline">{t.page}</Link> : "non indiquée"} · Navigateur : {t.userAgent ?? "inconnu"}
          </p>
          {t.screenshotKey && (
            <a href={`/api/tickets/${t.id}`} target="_blank" rel="noreferrer" className="self-start">
              {/* eslint-disable-next-line @next/next/no-img-element -- image servie par l'API réservée */}
              <img src={`/api/tickets/${t.id}`} alt={`Capture d'écran du ticket ${ticketRef(t.number)}`} className="max-h-60 rounded-lg border border-line" />
            </a>
          )}
          {t.adminNote && <p className="rounded-lg bg-[#f2f5f1] px-3 py-2 text-[14px]">Réponse envoyée : {t.adminNote}</p>}
          {t.status === "NOUVEAU" || t.status === "EN_COURS" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <ActionForm action={updateTicketAction.bind(null, t.id, "RESOLU")} className="flex flex-col gap-2">
                <Input label="Message à l'auteur (facultatif)" name="note" id={`ok-${t.id}`} hint="Ex. : corrigé, merci ! Rechargez la page." />
                <SubmitButton size="sm" className="self-start">Résolu</SubmitButton>
              </ActionForm>
              <ActionForm action={updateTicketAction.bind(null, t.id, "REFUSE")} className="flex flex-col gap-2">
                <Input label="Pourquoi ?" name="note" id={`ko-${t.id}`} required />
                <SubmitButton size="sm" variant="outline" className="self-start">Refuser</SubmitButton>
              </ActionForm>
              <div className="flex flex-wrap gap-2 md:col-span-2">
                {t.status === "NOUVEAU" && (
                  <ActionForm action={updateTicketAction.bind(null, t.id, "EN_COURS")} className="flex">
                    <SubmitButton size="sm" variant="outline">Prendre en charge</SubmitButton>
                  </ActionForm>
                )}
                <CopyButton label="Copier pour GitHub" text={`${t.title}\n\n${githubText(t)}`} />
              </div>
            </div>
          ) : (
            <div className="flex"><CopyButton label="Copier pour GitHub" text={`${t.title}\n\n${githubText(t)}`} /></div>
          )}
        </Card>
      ))}
    </>
  );
}
