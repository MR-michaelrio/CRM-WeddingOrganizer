import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";

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

export const metadata: Metadata = {
  title: "WO Premium — Wedding Organizer Management System",
  description:
    "Premium operational hub for Wedding Organizer, Sangjit Organizer, and Decoration teams.",
};

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
