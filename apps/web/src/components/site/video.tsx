"use client";
import { useState } from "react";
import { Play } from "lucide-react";

/**
 * Vidéo YouTube chargée seulement au clic : rien n'est téléchargé avant (forfaits internet des membres),
 * puis lecture en mode « youtube-nocookie ». `id` vient de youtubeId() : 11 caractères vérifiés.
 */
export function YoutubeVideo({ id, title }: { id: string; title: string }) {
  const [on, setOn] = useState(false);
  if (on) {
    return (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
        title={title}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        className="aspect-video w-full rounded-2xl border-0 bg-black"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setOn(true)}
      className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-2xl bg-brand-900 text-white hover:bg-brand-800"
    >
      <span className="flex size-16 items-center justify-center rounded-full bg-flame-600"><Play className="size-8 fill-white" aria-hidden /></span>
      <span className="font-semibold">Lire la vidéo</span>
      <span className="text-sm text-white/75">Elle se charge seulement si vous cliquez (consomme des données internet).</span>
    </button>
  );
}
