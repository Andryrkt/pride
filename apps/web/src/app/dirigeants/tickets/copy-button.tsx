"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Copie un texte dans le presse-papiers (ex. ticket à coller dans GitHub). */
export function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 2500);
      }}
    >
      {done ? "Copié ✓" : label}
    </Button>
  );
}
