import {
  LayoutDashboard,
  Calendar,
  Heart,
  CheckSquare,
  Clock,
  Palette,
  Users,
  Handshake,
  Package,
  Image,
  Wallet,
  Receipt,
  TrendingUp,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const navSections: NavSection[] = [
  {
    title: "Main",
    items: [
      { id: "dashboard", label: "Dashboard", href: "/", icon: LayoutDashboard },
      { id: "calendar", label: "Calendar", href: "/calendar", icon: Calendar },
      { id: "clients", label: "Clients", href: "/clients", icon: Heart },
    ],
  },
  {
    title: "Operations",
    items: [
      { id: "checklist", label: "Checklist", href: "/checklist", icon: CheckSquare },
      { id: "rundown", label: "Rundown", href: "/rundown", icon: Clock },
      { id: "design", label: "Design Upload", href: "/design", icon: Palette },
      { id: "crew", label: "Crew", href: "/crew", icon: Users },
    ],
  },
  {
    title: "Resources",
    items: [
      { id: "vendors", label: "Vendors", href: "/vendors", icon: Handshake },
      { id: "inventory", label: "Inventory", href: "/inventory", icon: Package },
      { id: "gallery", label: "Gallery", href: "/gallery", icon: Image },
    ],
  },
  {
    title: "Business",
    items: [
      { id: "finance", label: "Finance", href: "/finance", icon: Wallet },
      { id: "invoices", label: "Invoices", href: "/invoices", icon: Receipt },
      { id: "reports", label: "Reports", href: "/reports", icon: TrendingUp },
      { id: "settings", label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];
