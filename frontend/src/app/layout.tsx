import { ScrollToTopOnLoad } from "@/components/scroll-to-top-on-load";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { withBasePath } from "@/lib/base-path";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://pharmaciebeniddirmalik.dz";
const socialImagePath = withBasePath("/younes.png");

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Pharmacie Beniddir Malik | Produits parapharmaceutiques",
    template: "%s | Pharmacie Beniddir Malik",
  },
  description:
    "Pharmacie Beniddir Malik: boutique en ligne de produits parapharmaceutiques, bien-être et matériel de santé pour toute la famille.",
  keywords: [
    "pharmacie",
    "parapharmacie",
    "produits parapharmaceutiques",
    "complément alimentaire",
    "soin visage",
    "écrans solaires",
    "algérie",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "fr_DZ",
    url: "/",
    title: "Pharmacie Beniddir Malik | Produits parapharmaceutiques",
    description:
      "Découvrez nos soins du quotidien, produits d'hygiène, compléments et matériel médical avec conseil personnalisé.",
    siteName: "Pharmacie Beniddir Malik",
    images: [
      {
        url: socialImagePath,
        width: 1200,
        height: 630,
        alt: "Pharmacie Beniddir Malik",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pharmacie Beniddir Malik | Produits parapharmaceutiques",
    description:
      "Produits parapharmaceutiques, bien-être et matériel de santé pour toute la famille.",
    images: [socialImagePath],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Suspense fallback={null}>
          <ScrollToTopOnLoad />
        </Suspense>
        <div className="min-h-screen bg-slate-50 text-slate-900">
          <SiteHeader />
          <Suspense fallback={null}>{children}</Suspense>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
