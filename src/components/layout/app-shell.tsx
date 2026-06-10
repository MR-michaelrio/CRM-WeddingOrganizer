"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Navbar } from "./navbar";

// Path yang dirender tanpa shell (tanpa sidebar/navbar).
const BARE_PATHS = ["/login"];
const BARE_PREFIXES = ["/share/"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const pathname = usePathname() ?? "";
  const isBare =
    BARE_PATHS.includes(pathname) ||
    BARE_PREFIXES.some((p) => pathname.startsWith(p));

  if (isBare) return <>{children}</>;

  return (
    <div className="flex min-h-screen">
      <Sidebar
        mobileVisible={mobileMenuVisible}
        onNavigate={() => setMobileMenuVisible(false)}
      />
      <div className="flex min-h-screen flex-1 flex-col md:ml-[280px]">
        <Navbar onMobileMenuToggle={() => setMobileMenuVisible((v) => !v)} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
