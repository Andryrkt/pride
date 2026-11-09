import { FileText, ImageDown } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Téléchargement de la carte, générée par le serveur à partir de la base : PDF (à imprimer) ou image PNG (téléphone, partage). */
export function CardDownload() {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-center text-sm font-semibold">Télécharger ma carte</span>
      <div className="grid grid-cols-2 gap-2">
        {/* Simples liens (pas next/link) : ce sont des fichiers à télécharger, pas des pages. */}
        <a href="/api/carte" download className={cn(buttonVariants(), "gap-2")}>
          <FileText className="size-5" aria-hidden />
          PDF
        </a>
        <a href="/api/carte?format=png" download className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
          <ImageDown className="size-5" aria-hidden />
          Image
        </a>
      </div>
      <p className="text-center text-[13px] text-muted">PDF : pour imprimer. Image : pour garder sur son téléphone ou partager.</p>
    </div>
  );
}
