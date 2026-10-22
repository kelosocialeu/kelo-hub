import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kelo Hub — Espace de contrôle",
  description: "Un espace centralisé pour les organisations, leurs filiales et leurs outils professionnels."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}