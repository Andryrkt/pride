"use client";
import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

/** Bouton « Revenir en haut », sur toutes les pages : apparaît après avoir fait défiler d'un écran environ. */
export function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!show) return null;
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
      title="Revenir en haut"
      className="fixed right-4 bottom-4 z-20 flex size-12 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg hover:bg-brand-700 print:hidden sm:right-6 sm:bottom-6"
    >
      <ArrowUp aria-hidden />
      <span className="sr-only">Revenir en haut de la page</span>
    </button>
  );
}
