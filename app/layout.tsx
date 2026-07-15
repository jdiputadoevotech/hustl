import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Navbar } from "@/components/navbar";
import { AdminNav } from "@/components/admin-nav";
import { FlaggedBanner } from "@/components/flagged-banner";
import { Footer } from "@/components/footer";
import { SiteShell } from "@/components/site-shell";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Hustl — USC Student Gig Marketplace",
  description:
    "Hire and offer services from fellow University of San Carlos students.",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.className} antialiased`}>
        <SiteShell
          navbar={<Navbar />}
          adminNav={<AdminNav />}
          banner={<FlaggedBanner />}
          footer={<Footer />}
        >
          {children}
        </SiteShell>
      </body>
    </html>
  );
}
