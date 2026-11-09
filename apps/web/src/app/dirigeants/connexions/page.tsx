import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, db, eq, gt, schema } from "@pride/db";
import { PageTitle } from "@/components/site/app-shell";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { ACTIVITY_STEP, requireDirigeant } from "@/lib/session";
import { cn, formatDate } from "@/lib/utils";
import { revokeSessionsAction } from "../actions";

/** « En ligne » : une activité dans les 15 dernières minutes (la dernière activité est notée toutes les 5 minutes). */
const ONLINE = 15 * 60_000;
const time = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Indian/Antananarivo" });

/** Appareil lisible à partir de l'en-tête du navigateur (approximatif). */
function device(ua: string | null) {
  if (!ua) return "Appareil inconnu";
  if (/okhttp|Expo|CFNetwork|Dalvik/i.test(ua)) return "Application mobile";
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iPhone / iPad" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Navigateur";
  return os ? `${browser} sur ${os}` : browser;
}

function ago(d: Date) {
  const min = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (min < ACTIVITY_STEP / 60_000) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  if (min < 24 * 60) return `il y a ${Math.floor(min / 60)} h`;
  return `le ${formatDate(d)} à ${time.format(d)}`;
}

/** Suivi des connexions (administrateur seul) : qui est en ligne, sur quel appareil, et déconnexion à distance. */
export default async function ConnexionsPage({ searchParams }: { searchParams: Promise<{ vue?: string; ok?: string }> }) {
  const { vue, ok } = await searchParams;
  const v = await requireDirigeant();
  if (!v.isAdmin) redirect("/dirigeants");
  const all = vue === "toutes";
  const now = new Date();
  const rows = await db
    .select({ s: schema.session, user: schema.user, member: schema.members })
    .from(schema.session)
    .innerJoin(schema.user, eq(schema.user.id, schema.session.userId))
    .leftJoin(schema.members, eq(schema.members.userId, schema.user.id))
    .where(and(gt(schema.session.expiresAt, now), gt(schema.session.updatedAt, all ? new Date(0) : new Date(now.getTime() - ONLINE))))
    .orderBy(desc(schema.session.updatedAt));
  const people = new Set(rows.map((r) => r.user.id)).size;

  return (
    <>
      <PageTitle title="Connexions" sub="Qui utilise l'espace membres en ce moment. Réservé à l'administrateur.">
        <nav aria-label="Vue" className="flex flex-wrap gap-1.5 rounded-full bg-[#e6eae4] p-1.5">
          {[["", "En ligne"], ["toutes", "Toutes les sessions ouvertes"]].map(([k, label]) => (
            <Link
              key={k}
              href={k ? `/dirigeants/connexions?vue=${k}` : "/dirigeants/connexions"}
              aria-current={(k === "toutes") === all ? "page" : undefined}
              className={cn("inline-flex min-h-10 items-center rounded-full px-5 text-[15px] font-semibold", (k === "toutes") === all ? "bg-white text-brand-800 shadow-sm" : "text-[#2b3832]")}
            >
              {label}
            </Link>
          ))}
        </nav>
      </PageTitle>
      {ok && <p role="status" className="rounded-xl bg-brand-50 px-4 py-3 font-semibold text-brand-800">{ok}</p>}

      <Card className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">
          {all ? `${rows.length} session(s) ouverte(s)` : `${people} utilisateur(s) en ligne`}
          <span className="ml-2 text-base font-normal text-muted">{all ? `pour ${people} utilisateur(s)` : "· activité depuis moins de 15 min"}</span>
        </h2>
        {rows.length === 0 && <p className="text-muted">{all ? "Aucune session ouverte." : "Personne n'est en ligne en ce moment (à part vous, peut-être dans quelques minutes)."}</p>}
        <ul className="divide-y divide-line">
          {rows.map(({ s, user, member }) => {
            const mine = s.id === v.sessionId;
            const online = now.getTime() - s.updatedAt.getTime() < ONLINE;
            return (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 flex-col">
                  <div className="flex flex-wrap items-center gap-2">
                    {member ? (
                      <Link href={`/dirigeants/membres/${member.id}`} className="font-semibold underline-offset-2 hover:underline">{member.lastName} {member.firstNames}</Link>
                    ) : (
                      <strong>{user.name}</strong>
                    )}
                    {online ? <Badge>En ligne</Badge> : <Badge tone="gray">Inactif</Badge>}
                    {mine && <Badge tone="dark">Vous, sur cet appareil</Badge>}
                  </div>
                  <span className="text-sm text-muted">{user.email}{member ? ` · ${member.number}` : ""}</span>
                  <span className="text-sm text-muted">
                    {device(s.userAgent)}{s.ipAddress ? ` · adresse ${s.ipAddress}` : ""} · connecté le {formatDate(s.createdAt)} à {time.format(s.createdAt)} · dernière activité {ago(s.updatedAt)}
                  </span>
                </div>
                {!mine && (
                  <div className="flex flex-wrap gap-2">
                    <ActionForm action={revokeSessionsAction.bind(null, { sessionId: s.id })} className="flex">
                      <SubmitButton variant="outline" size="sm" pendingLabel="Déconnexion…">Déconnecter</SubmitButton>
                    </ActionForm>
                    {rows.filter((r) => r.user.id === user.id).length > 1 && (
                      <ActionForm action={revokeSessionsAction.bind(null, { userId: user.id })} className="flex">
                        <SubmitButton variant="danger" size="sm" pendingLabel="Déconnexion…">Partout</SubmitButton>
                      </ActionForm>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <p className="text-[13px] text-muted">
          « Déconnecter » ferme la session tout de suite : à sa prochaine action, la personne revient à la page de connexion et doit retaper son mot de passe. Pour l&apos;empêcher de revenir, changez aussi son mot de passe ou fermez sa fiche. Chaque déconnexion est tracée.
        </p>
      </Card>
    </>
  );
}
