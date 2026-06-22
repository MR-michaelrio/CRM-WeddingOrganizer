"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navSections } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useFetch } from "@/lib/use-fetch";

type SidebarProps = {
  mobileVisible: boolean;
  onNavigate: () => void;
};

export function Sidebar({ mobileVisible, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { data: settings } = useFetch<{ companyName?: string | null }>(
    "/api/settings"
  );
  const companyName = settings?.companyName?.trim() || "WO Premium";
  const logoLetter = companyName.charAt(0).toUpperCase();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <>
      {mobileVisible && (
        <div
          className="fixed inset-0 z-40 bg-ink/30 md:hidden"
          onClick={onNavigate}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-[280px] flex-col border-r border-line bg-card transition-transform duration-300",
          mobileVisible ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="border-b border-line p-6">
          <Link href="/" className="flex items-center gap-3" onClick={onNavigate}>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-md font-serif text-xl font-semibold text-white"
              style={{
                background: "linear-gradient(135deg, var(--accent-gold), var(--accent-gold-dark))",
              }}
            >
              {logoLetter}
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-lg font-semibold text-ink">{companyName}</span>
              <span className="text-[11px] uppercase tracking-wider text-ink-light">
                Management System
              </span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          {navSections.map((section) => (
            <div key={section.title} className="mb-6">
              <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-light">
                {section.title}
              </div>
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "mb-0.5 flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors duration-200",
                      active
                        ? "bg-gold-light text-gold-dark"
                        : "text-ink-medium hover:bg-beige hover:text-ink"
                    )}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-line p-4">
          <div className="rounded-md bg-beige p-4">
            <p className="font-serif text-base font-semibold text-ink">Need help?</p>
            <p className="mt-1 text-xs text-ink-light">
              Check our guide for tips on running events.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
