import type { Metadata, Viewport } from "next";
import { Anton, Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 2026-09-29 Round 1: Anton — condensed gig-poster display face for headlines.
// Body stays Geist Sans; eyebrows/labels stay Geist Mono.
const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

// 2026-09-29 Round 10: full SEO/share metadata — canonical, Open Graph,
// Twitter card, theme color, robots. Production origin verified live.
const SITE_URL = "https://djservicepacks-sandbox-cxwk.vercel.app";
const SITE_TITLE = "DJ Service Packs — Promotional Delivery for Radio & Club DJs";
const SITE_DESCRIPTION =
  "Standardized, high-quality promo packs: clean/dirty edits, acapellas, intros, EPKs and custom DJ drops — delivered to verified radio, club and digital DJs.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "DJ Service Packs",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/images/studio.jpg",
        width: 2400,
        height: 1601,
        alt: "DJ Service Packs — studio-grade promo delivery for DJs",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description:
      "Promo packs for verified radio, club and digital DJs — every edit, delivered one standard way.",
    images: ["/images/studio.jpg"],
  },
  robots: { index: true, follow: true },
};

// 2026-09-29 Round 10: theme-color lives in the viewport export on Next 15+.
export const viewport: Viewport = {
  themeColor: "#14120e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${anton.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}