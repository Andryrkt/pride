import { Facebook, Mail, MapPin, Phone } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ContactForm } from "./contact-form";

export const metadata = { title: "Contact" };

const infos = [
  { Icon: Mail, label: "E-mail", value: <a href="mailto:association4pride@gmail.com" className="text-brand-600">association4pride@gmail.com</a> },
  { Icon: Phone, label: "Téléphone", value: <a href="tel:+261326728862" className="text-brand-600">032 67 288 62</a> },
  { Icon: MapPin, label: "Siège", value: <span>CLT Tsiadana, Antananarivo</span> },
  { Icon: Facebook, label: "Facebook", value: <span>Association PRIDe</span> },
];

export default function ContactPage() {
  return (
    <>
      <PageHero eyebrow="Contact" title="Écrivez-nous, nous vous répondons par e-mail">
        Une question, une proposition de partenariat, une demande d'information ? Votre message arrive directement dans la boîte e-mail de l'association PRIDe.
      </PageHero>
      <section className="mx-auto grid max-w-6xl items-start gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_320px]">
        <ContactForm />
        <div className="flex flex-col gap-5">
          <Card className="flex flex-col px-6 py-3 text-[15px]">
            {infos.map(({ Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3.5 border-b border-line py-3.5 last:border-0">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-800">
                  <Icon size={20} aria-hidden />
                </span>
                <div className="min-w-0 break-words">
                  <div className="font-bold">{label}</div>
                  {value}
                </div>
              </div>
            ))}
          </Card>
          <Card className="flex flex-col gap-2.5 border-brand-800 bg-brand-800 text-brand-100">
            <h3 className="text-xl font-bold text-white">Vous voulez nous rejoindre ?</h3>
            <p className="text-[15px]">La candidature se fait directement en ligne, avec les pièces du dossier.</p>
            <ButtonLink href="/adhesion#candidature" variant="white" size="sm" className="self-start">Déposer ma candidature</ButtonLink>
          </Card>
        </div>
      </section>
    </>
  );
}
