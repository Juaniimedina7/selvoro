import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Selvoro — Inteligencia de producto para vender en Argentina",
  description:
    "¿Ese producto vale la pena testear en Argentina? Selvoro junta señales de mercado y te da una recomendación explicable.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
