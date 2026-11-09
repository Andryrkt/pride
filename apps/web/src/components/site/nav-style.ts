// Constantes du menu latéral, partagées entre composants serveur et client (un fichier « use client » ne peut pas exporter de valeurs vers le serveur).

/** Texte d'une entrée : masqué (mais lu par les lecteurs d'écran) quand le menu est replié sur grand écran. */
export const NAV_LABEL = "flex-1 group-data-[closed=true]:lg:sr-only";
/** Cookie lu par le serveur (AppShell) pour afficher directement le bon état, sans clignotement. */
export const MENU_COOKIE = "pride-menu-ferme";
