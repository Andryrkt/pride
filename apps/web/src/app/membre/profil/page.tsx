import { PageTitle } from "@/components/site/app-shell";
import { Card } from "@/components/ui/card";
import { requireMember } from "@/lib/session";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const { member, user } = await requireMember();
  return (
    <>
      <PageTitle title="Mon profil" sub={`N° ${member.number} · ${user.email}`} />
      <Card>
        <ProfileForm initial={{ phone: member.phone ?? "", address: member.address ?? "", profession: member.profession ?? "", skills: member.skills.join(", ") }} />
      </Card>
    </>
  );
}
