import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "DJ Service Packs — Promotional Delivery for Radio & Club DJs",
  description:
    "Standardized, high-quality promo packs: clean/dirty edits, acapellas, intros, EPKs and custom DJ drops — delivered to verified radio, club and digital DJs.",
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