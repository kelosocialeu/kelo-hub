import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kelo Hub — Votre organisation, un seul espace",
  description: "Kelo Hub est conçu pour centraliser les comptes AT Protocol, les publications et les interactions de votre organisation dans un espace clair et sécurisé.",
  applicationName: "Kelo Hub"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
