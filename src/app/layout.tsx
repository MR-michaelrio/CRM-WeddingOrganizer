import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/prisma";

const inter = localFont({
  src: [
    { path: "./fonts/Inter-latin.woff2", style: "normal" },
    { path: "./fonts/Inter-latin-ext.woff2", style: "normal" },
  ],
  variable: "--font-inter",
  display: "swap",
  fallback: ["-apple-system", "BlinkMacSystemFont", "sans-serif"],
});

const cormorant = localFont({
  src: [
    { path: "./fonts/CormorantGaramond-latin.woff2", style: "normal" },
    { path: "./fonts/CormorantGaramond-latin-ext.woff2", style: "normal" },
  ],
  variable: "--font-cormorant",
  display: "swap",
  fallback: ["serif"],
});

export async function generateMetadata(): Promise<Metadata> {
  let companyName = "WO Premium";
  try {
    const setting = await prisma.setting.findUnique({
      where: { id: 1 },
      select: { companyName: true },
    });
    if (setting?.companyName?.trim()) companyName = setting.companyName.trim();
  } catch {
    /* fallback to default name */
  }
  return {
    title: `${companyName} — Management System`,
    description:
      "Operational hub for Wedding Organizer, Sangjit Organizer, and Decoration teams.",
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${inter.variable} ${cormorant.variable}`}>
      {/* suppressHydrationWarning: silences harmless attribute injections
          from browser extensions (e.g. ColorZilla's `cz-shortcut-listen`,
          Grammarly's `data-gr-*`, password managers) that mutate <body>
          on the client after SSR. */}
      <body suppressHydrationWarning>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
