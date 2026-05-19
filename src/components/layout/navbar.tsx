"use client";

import { Bell, Menu, Search, Settings } from "lucide-react";

type NavbarProps = {
  onMobileMenuToggle: () => void;
};

export function Navbar({ onMobileMenuToggle }: NavbarProps) {
  return (
    <header
      className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-line bg-card/90 px-8 backdrop-blur"
      style={{ background: "rgba(255, 255, 255, 0.9)" }}
    >
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onMobileMenuToggle}
          className="-ml-2 rounded-sm p-2 text-ink hover:bg-beige md:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden min-w-[300px] items-center gap-2 rounded-md border border-line bg-cream px-4 py-2.5 md:flex">
          <Search className="h-4 w-4 text-ink-light" />
          <input
            type="text"
            placeholder="Search events, clients, vendors..."
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-light"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-sm border border-line bg-card transition-colors hover:border-gold hover:bg-beige"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 text-ink" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-card bg-danger" />
        </button>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-sm border border-line bg-card transition-colors hover:border-gold hover:bg-beige"
          aria-label="Settings"
        >
          <Settings className="h-5 w-5 text-ink" />
        </button>

        <div className="flex cursor-pointer items-center gap-3 rounded-md border border-line py-1.5 pl-3 pr-1.5 transition-colors hover:border-gold hover:bg-beige">
          <div className="hidden flex-col items-end md:flex">
            <span className="text-sm font-semibold text-ink">Sarah Chen</span>
            <span className="text-xs text-ink-light">Admin</span>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-gold-light text-sm font-semibold text-gold-dark">
            SC
          </div>
        </div>
      </div>
    </header>
  );
}
