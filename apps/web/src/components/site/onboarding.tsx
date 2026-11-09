import Link from "next/link";
import { CircleCheck, Circle } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { dismissOnboardingAction } from "@/app/membre/actions";
import { cn } from "@/lib/utils";

type Member = { photoKey: string | null; phone: string | null; address: string | null; skills: string[]; technical: boolean };
type Step = { done: boolean; title: string; text: string; href: string; cta: string };

function Dismiss({ kind, label }: { kind: "MEMBRE" | "DIRIGEANT"; label: string }) {
  return (
    <ActionForm action={dismissOnboardingAction.bind(null, kind)} className="flex">
      <SubmitButton variant="outline" size="sm" pendingLabel="…">{label}</SubmitButton>
    </ActionForm>
  );
}

/** Premiers pas du membre (tableau de bord) : étapes cochées d'après sa fiche, jusqu'à ce qu'il masque l'encadré. */
export function MemberOnboarding({ member, duesUpToDate }: { member: Member; duesUpToDate: boolean }) {
  const steps: Step[] = [
    { done: !!member.photoKey, title: "Ajoutez votre photo d'identité", text: "Elle figure sur votre carte de membre, à télécharger ensuite depuis cette page.", href: "/membre/profil", cta: "Ajouter" },
    { done: !!member.phone && !!member.address, title: "Indiquez votre téléphone et votre quartier", text: "Pour que l'association puisse vous joindre.", href: "/membre/profil", cta: "Compléter" },
    { done: duesUpToDate, title: "Réglez vos cotisations", text: "Par mobile money depuis votre menu habituel, puis déclarez la référence.", href: "/membre/cotisations", cta: "Voir" },
    { done: member.skills.length > 0, title: "Partagez vos compétences", text: "Facultatif : pour proposer votre aide aux autres membres.", href: "/membre/profil", cta: "Ajouter" },
  ];
  const n = steps.filter((s) => s.done).length;
  return (
    <Card className="flex flex-col gap-4 border-brand-600">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{n === steps.length ? "Votre espace est prêt !" : "Bienvenue ! Vos premiers pas"}</h2>
          <p className="text-sm text-muted">{n} étape(s) sur {steps.length} · {n === steps.length ? "vous pouvez masquer cet encadré." : "cochées automatiquement quand c'est fait."}</p>
        </div>
        <Dismiss kind="MEMBRE" label="Masquer ce guide" />
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#e6eae4]" role="progressbar" aria-label="Premiers pas" aria-valuenow={n} aria-valuemin={0} aria-valuemax={steps.length}>
        <div className="h-full rounded-full bg-brand-600" style={{ width: `${(n / steps.length) * 100}%` }} />
      </div>
      <ol className="flex flex-col gap-2">
        {steps.map((s) => (
          <li key={s.title} className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-3">
            {s.done ? <CircleCheck className="size-6 shrink-0 text-brand-600" aria-label="Fait" /> : <Circle className="size-6 shrink-0 text-muted" aria-label="À faire" />}
            <div className="flex min-w-0 flex-1 flex-col">
              <strong className={cn(s.done && "text-muted line-through")}>{s.title}</strong>
              {!s.done && <span className="text-sm text-muted">{s.text}</span>}
            </div>
            {!s.done && <Link href={s.href} className="font-semibold text-brand-700 underline-offset-2 hover:underline">{s.cta} →</Link>}
          </li>
        ))}
      </ol>
      <p className="text-sm text-muted">
        À découvrir aussi : <Link href="/membre/formations" className="font-semibold text-brand-700 hover:underline">les formations et ressources</Link> (menu « Apprendre »),{" "}
        <Link href="/membre/messages" className="font-semibold text-brand-700 hover:underline">la messagerie</Link> (l&apos;assistant répond tout de suite) et{" "}
        <Link href="/aide/membres" className="font-semibold text-brand-700 hover:underline">le guide des membres</Link>.
      </p>
    </Card>
  );
}

/** Premiers pas d'un dirigeant (tableau de bord des dirigeants) : comment l'espace fonctionne, jusqu'à « J'ai compris ». */
export function LeaderOnboarding({ isAdmin }: { isAdmin: boolean }) {
  const points = [
    ["« À traiter »", "liste ce qui attend une action de votre part, selon vos rôles. Elle se vide au fur et à mesure."],
    ["Les pastilles rouges du menu", "comptent les demandes en attente : candidatures, solidarité, offres, propositions, messages."],
    ["Chaque action est tracée", "avec votre nom (statuts : transparence). Les décisions envoient un e-mail au membre concerné."],
    ["Votre espace membre reste le même", "on y arrive à la connexion ; « Espace dirigeants » est dans son menu."],
    ...(isAdmin ? [["Administrateur", "vous attribuez les rôles et donnez l'accès en ligne depuis la fiche du membre (Registre). Vous consultez les finances sans les modifier."]] : []),
  ];
  return (
    <Card className="flex flex-col gap-3 border-brand-600">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-xl font-bold">Bienvenue dans l&apos;espace dirigeants</h2>
        <Dismiss kind="DIRIGEANT" label="J'ai compris" />
      </div>
      <ul className="flex flex-col gap-1.5 text-[15px]">
        {points.map(([t, d]) => (
          <li key={t}><strong>{t}</strong> {d}</li>
        ))}
      </ul>
      <p className="text-sm text-muted">
        Pas à pas, avec des captures : <Link href="/aide/dirigeants" className="font-semibold text-brand-700 hover:underline">le guide des dirigeants</Link>.
      </p>
    </Card>
  );
}
