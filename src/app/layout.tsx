import type { Metadata } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  weight: ["400", "500", "600", "700"],
  display: "swap",
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
