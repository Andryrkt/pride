import Image from "next/image";
import Link from "next/link";

export function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-wrap">
      <div className="flex flex-[1_1_420px] flex-col justify-between gap-10 bg-brand-800 p-10 text-brand-100">
        <Link href="/" aria-label="PRIDe, site public">
          <Image src="/images/logo-blanc.png" alt="PRIDe" width={67} height={96} className="h-24 w-auto" />
        </Link>
        <div className="flex max-w-md flex-col gap-4">
          <h1 className="text-4xl font-extrabold text-white">Bienvenue dans votre espace</h1>
          <p className="text-lg">Cotisations, formations, actualités, assemblées générales : tout PRIDe au même endroit, sur ordinateur comme sur téléphone.</p>
        </div>
        <Link href="/" className="text-brand-100 hover:text-white">← Retour au site public</Link>
      </div>
      <div className="flex flex-[1_1_480px] items-center justify-center px-6 py-12">
        <div className="flex w-full max-w-md flex-col gap-5">
          <h2 className="text-3xl font-extrabold">{title}</h2>
          {children}
        </div>
      </div>
    </div>
  );
}
