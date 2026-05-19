"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Navbar } from "./navbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);

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
