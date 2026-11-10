import Link from "next/link";
import { FileDown } from "lucide-react";
import { PageTitle } from "@/components/site/app-shell";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCv } from "@/lib/cv";
import { requireMember } from "@/lib/session";
import { cn } from "@/lib/utils";
import { CvForm } from "./cv-form";

/** « Mon CV » : saisi par le membre, PDF généré par le serveur ; contact et compétences repris de la fiche. Visible de lui seul. */
export default async function CvPage() {
  const { member } = await requireMember();
  const cv = await getCv(member.id);
  return (
    <>
      <PageTitle title="Mon CV" sub="Créez un CV propre, à télécharger en PDF pour vos candidatures. Vous seul le voyez.">
        {cv && (
          <a href="/api/cv" download className={cn(buttonVariants(), "gap-2")}>
            <FileDown className="size-5" aria-hidden /> Télécharger en PDF
          </a>
        )}
      </PageTitle>
      <Card className="flex flex-col gap-1 text-[15px]">
        <p>
          <strong>Repris de votre fiche :</strong> nom, téléphone, e-mail, quartier / ville, photo et compétences
          {member.skills.length ? ` (${member.skills.join(", ")})` : " (aucune pour l'instant)"}.
        </p>
        <p className="text-muted">
          Pour les changer : <Link href="/membre/profil" className="font-semibold text-brand-700 hover:underline">Mon profil</Link>.
        </p>
      </Card>
      <Card>
        <CvForm hasPhoto={!!member.photoKey} initial={cv ?? { title: member.profession ?? "", summary: "", experiences: [], education: [], languages: [{ name: "Malagasy", level: "Langue maternelle" }, { name: "Français", level: "Courant" }], interests: "", showPhoto: true }} />
      </Card>
    </>
  );
}
