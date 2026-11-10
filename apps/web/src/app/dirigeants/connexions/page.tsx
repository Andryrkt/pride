import Link from "next/link";
import { redirect } from "next/navigation";
import { and, count, countDistinct, desc, db, eq, gt, gte, isNull, min, notExists, schema, sql } from "@pride/db";
import { addDays, localDay } from "@pride/shared";
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
  const stats = await usage(now);

  return (
    <>
      <PageTitle title="Utilisation du site" sub="Combien de personnes utilisent l'espace membres, et qui est connecté. Réservé à l'administrateur.">
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
      <UsageDashboard stats={stats} />

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

const dayLabel = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });

/** Chiffres d'utilisation : en ligne, utilisateurs distincts sur 1, 7 et 30 jours (table `activity_days`), comptes jamais revus. */
async function usage(now: Date) {
  const today = localDay(now);
  const since = (n: number) => addDays(today, -(n - 1));
  const distinctSince = (n: number) =>
    db.select({ n: countDistinct(schema.activityDays.userId) }).from(schema.activityDays).where(gte(schema.activityDays.day, since(n)));
  const [[online], [d1], [d7], [d30], [accounts], [noAccount], [start], perDay, unseen] = await Promise.all([
    db.select({ n: countDistinct(schema.session.userId) }).from(schema.session).where(and(gt(schema.session.expiresAt, now), gt(schema.session.updatedAt, new Date(now.getTime() - ONLINE)))),
    distinctSince(1),
    distinctSince(7),
    distinctSince(30),
    db.select({ n: count() }).from(schema.user),
    db.select({ n: count() }).from(schema.members).where(and(eq(schema.members.status, "ACTIF"), eq(schema.members.technical, false), isNull(schema.members.userId))),
    db.select({ day: min(schema.activityDays.day) }).from(schema.activityDays),
    db.select({ day: schema.activityDays.day, n: count() }).from(schema.activityDays).where(gte(schema.activityDays.day, since(30))).groupBy(schema.activityDays.day),
    db
      .select({ user: schema.user, member: schema.members })
      .from(schema.user)
      .leftJoin(schema.members, eq(schema.members.userId, schema.user.id))
      .where(notExists(db.select({ x: sql`1` }).from(schema.activityDays).where(eq(schema.activityDays.userId, schema.user.id))))
      .orderBy(schema.user.createdAt),
  ]);
  const byDay = new Map(perDay.map((r) => [r.day, r.n]));
  const days = Array.from({ length: 30 }, (_, i) => { const day = since(30 - i); return { day, n: byDay.get(day) ?? 0 }; });
  return { online: online!.n, d1: d1!.n, d7: d7!.n, d30: d30!.n, accounts: accounts!.n, noAccount: noAccount!.n, start: start?.day ?? null, days, unseen };
}

function UsageDashboard({ stats }: { stats: Awaited<ReturnType<typeof usage>> }) {
  const kpis = [
    ["En ligne", stats.online, "activité depuis moins de 15 min"],
    ["Aujourd'hui", stats.d1, "utilisateurs différents"],
    ["7 derniers jours", stats.d7, "utilisateurs différents"],
    ["30 derniers jours", stats.d30, `sur ${stats.accounts} compte(s) ouvert(s)`],
  ] as const;
  const max = Math.max(1, ...stats.days.map((d) => d.n));
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(([t, n, sub]) => (
          <Card key={t}>
            <div className="text-xs font-bold uppercase tracking-wider text-muted">{t}</div>
            <div className="font-display text-3xl font-extrabold">{n}</div>
            <div className="text-sm text-muted">{sub}</div>
          </Card>
        ))}
      </div>
      <Card className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">Utilisateurs par jour <span className="text-base font-normal text-muted">· 30 derniers jours</span></h2>
        <div className="flex h-40 items-end gap-[3px]" role="img" aria-label={`Utilisateurs par jour sur 30 jours, au plus ${max} par jour.`}>
          {stats.days.map((d) => (
            <div key={d.day} title={`${dayLabel.format(new Date(d.day))} : ${d.n}`} className="flex h-full flex-1 flex-col justify-end">
              <div className={cn("rounded-t", d.n ? "bg-brand-600" : "bg-[#e6eae4]")} style={{ height: d.n ? `${(d.n / max) * 100}%` : "3px" }} />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[13px] text-muted">
          <span>{dayLabel.format(new Date(stats.days[0]!.day))}</span>
          <span>aujourd&apos;hui</span>
        </div>
        <p className="text-[13px] text-muted">
          Un utilisateur compte une fois par jour, quel que soit le nombre de pages vues ou d&apos;appareils.
          {stats.start ? ` Suivi depuis le ${formatDate(new Date(stats.start))}.` : ""} Les visiteurs du site public (sans compte) ne sont pas comptés.
        </p>
      </Card>
      <Card className="flex flex-col gap-2">
        <h2 className="text-xl font-bold">À relancer</h2>
        <p className="text-[15px]">
          <strong>{stats.noAccount}</strong> membre(s) actif(s) sans compte en ligne : donnez-leur l&apos;accès depuis leur fiche (<Link href="/dirigeants/membres" className="font-semibold text-brand-700 hover:underline">Registre</Link>).
        </p>
        <p className="text-[15px]"><strong>{stats.unseen.length}</strong> compte(s) jamais utilisé(s) depuis le début du suivi :</p>
        {stats.unseen.length > 0 && (
          <ul className="flex flex-col gap-1 text-[15px]">
            {stats.unseen.slice(0, 30).map(({ user, member }) => (
              <li key={user.id}>
                {member ? <Link href={`/dirigeants/membres/${member.id}`} className="font-semibold hover:underline">{member.lastName} {member.firstNames}</Link> : <strong>{user.name}</strong>}
                <span className="text-muted"> · {user.email} · compte créé le {formatDate(user.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-[13px] text-muted">Sur la fiche, « Renvoyer le lien » envoie de nouveau l&apos;e-mail pour choisir le mot de passe.</p>
      </Card>
    </>
  );
}
