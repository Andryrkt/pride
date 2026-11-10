import { FileDown } from "lucide-react";
import { PageTitle } from "@/components/site/app-shell";
import { buttonVariants } from "@/components/ui/button";
import { getCv } from "@/lib/cv";
import { requireMember } from "@/lib/session";
import { cn } from "@/lib/utils";
import { CvForm } from "./cv-form";

/** « Mon CV » : modifié directement sur son aperçu, PDF de même mise en page généré par le serveur. Visible du membre seul. */
export default async function CvPage() {
  const { member } = await requireMember();
  const cv = await getCv(member.id);
  return (
    <>
      <PageTitle title="Mon CV" sub="Cliquez sur un texte du CV pour le modifier, puis enregistrez. Vous seul le voyez.">
        {cv && (
          <a href="/api/cv" download className={cn(buttonVariants(), "gap-2")}>
            <FileDown className="size-5" aria-hidden /> Télécharger en PDF
          </a>
        )}
      </PageTitle>
      <CvForm
        person={{
          name: `${member.firstNames} ${member.lastName.toUpperCase()}`,
          contact: [member.phone, member.email, member.address].filter((x): x is string => !!x),
          skills: member.skills,
          photo: member.photoKey ? `/api/photo/${member.id}?v=${encodeURIComponent(member.photoKey)}` : null,
        }}
        initial={cv ?? { title: member.profession ?? "", summary: "", experiences: [], education: [], languages: [{ name: "Malagasy", level: "Langue maternelle" }, { name: "Français", level: "Courant" }], interests: "", showPhoto: true }}
      />
    </>
  );
}
