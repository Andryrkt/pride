"use client";
import { Button } from "@/components/ui/button";

export function PrintButton({ label = "Imprimer ou enregistrer en PDF" }: { label?: string }) {
  return (
    <Button type="button" variant="outline" size="sm" className="print:hidden" onClick={() => window.print()}>
      {label}
    </Button>
  );
}
