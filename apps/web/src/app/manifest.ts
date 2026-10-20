import type { MetadataRoute } from "next";

/** Rend le site installable sur l'écran d'accueil des téléphones (PWA). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PRIDe",
    short_name: "PRIDe",
    description: "Espace membres de l'association PRIDe",
    start_url: "/membre",
    display: "standalone",
    background_color: "#f5f6f2",
    theme_color: "#146b47",
    icons: [{ src: "/images/logo.png", sizes: "648x927", type: "image/png" }],
  };
}
