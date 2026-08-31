import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Bricolage_Grotesque, Instrument_Sans, IBM_Plex_Mono } from "next/font/google";
import { Header } from "@/components/layout/Header";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});
const body = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://selvoro.vercel.app"),
  title: "Selvoro — ¿Vale la pena testear ese producto en Argentina?",
  description:
    "Tu analista de inteligencia de mercado para e-commerce. Selvoro junta señales públicas reales, arma un score explicable y te da un veredicto — testear, investigar o descartar. Nunca métricas de ventas inventadas.",
  openGraph: {
    title: "Selvoro — Inteligencia de producto para vender en Argentina",
    description:
      "Junta señales públicas reales, arma un score explicable y te da un veredicto: testear, investigar o descartar.",
    images: ["/logo-selv.png"],
    locale: "es_AR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Selvoro — Inteligencia de producto para e-commerce",
    images: ["/logo-selv.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#12795a",
          borderRadius: "10px",
          fontFamily: "var(--font-instrument), system-ui, sans-serif",
        },
        elements: {
          card: {
            boxShadow: "var(--shadow-md)",
            border: "1px solid var(--border)",
          },
          headerTitle: { fontFamily: "var(--font-bricolage), sans-serif" },
          formButtonPrimary: { textTransform: "none", fontWeight: 600 },
          footerActionLink: { color: "#12795a" },
        },
      }}
    >
      <html lang="es" className={`${display.variable} ${body.variable} ${mono.variable}`}>
        <body>
          <Header />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
