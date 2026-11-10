import { PageTitle } from "@/components/site/app-shell";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireMember } from "@/lib/session";
import { PhotoForm } from "./photo-form";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const { member, user } = await requireMember();
  return (
    <>
      <PageTitle title="Mon profil" sub={`N° ${member.number} · ${user.email}`} />
      <Card>
        {/* « ?v= » change avec la photo : le navigateur ne garde pas l'ancienne en cache. */}
        <PhotoForm current={member.photoKey ? `/api/photo/${member.id}?v=${encodeURIComponent(member.photoKey)}` : null} />
      </Card>
      <Card>
        <ProfileForm initial={{ phone: member.phone ?? "", address: member.address ?? "", profession: member.profession ?? "", skills: member.skills.join(", ") }} shareSkills={member.shareSkills} />
      </Card>
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Mon CV</h2>
          <p className="text-muted">Expériences, formations, langues : créez votre CV et téléchargez-le en PDF. Vos coordonnées et compétences ci-dessus y sont reprises.</p>
        </div>
        <ButtonLink href="/membre/cv">Créer ou modifier mon CV</ButtonLink>
      </Card>
    </>
  );
}
