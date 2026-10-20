import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "PRIDe — Partage Responsabilité Intégrité pour le Développement", template: "%s · PRIDe" },
  description: "Association malgache qui développe les compétences et crée des opportunités pour l'avenir des jeunes.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#146b47", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
