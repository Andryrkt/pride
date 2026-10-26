import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="bg-brand-900 text-brand-100 print:hidden">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-14 pb-8 sm:px-6 md:grid-cols-3">
        <div className="flex flex-col gap-3">
          <Image src="/images/logo-blanc.png" alt="PRIDe" width={63} height={90} className="h-22.5 w-auto self-start" />
          <p className="text-sm">
            Partage Responsabilité Intégrité pour le Développement. Association apolitique et non confessionnelle, régie par l'Ordonnance 60-133 du 3 octobre 1960.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <strong className="text-white">Nous contacter</strong>
          <Link href="/contact" className="hover:text-white">Formulaire de contact</Link>
          <span>Siège : CLT Tsiadana, Antananarivo</span>
          <a href="tel:+261326728862" className="hover:text-white">032 67 288 62</a>
          <a href="mailto:association4pride@gmail.com" className="hover:text-white">association4pride@gmail.com</a>
          <span>Facebook : Association PRIDe</span>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <strong className="text-white">Liens</strong>
          <Link href="/actualites" className="hover:text-white">Actualités et événements</Link>
          <Link href="/realisations" className="hover:text-white">Nos réalisations</Link>
          <Link href="/adhesion" className="hover:text-white">Devenir membre</Link>
          <Link href="/membre" className="hover:text-white">Espace membres</Link>
          <Link href="/aide" className="hover:text-white">Aide et questions fréquentes</Link>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-8 text-[13px] text-[#9fbfae] sm:px-6">© PRIDe {new Date().getFullYear()}</div>
    </footer>
  );
}
