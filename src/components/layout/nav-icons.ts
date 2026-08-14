import {
  BarChart3,
  Boxes,
  Calendar,
  CircleDollarSign,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Megaphone,
  Receipt,
  Settings,
  Truck,
  UserCog,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

/**
 * Nav icons keyed by name rather than stored as component references on
 * NavItem. `navSectionsForRole()` runs in a Server Component
 * (app/(app)/layout.tsx) and its result is passed as a prop into
 * "use client" components (SidebarNav, Topbar) — a raw function value
 * (an icon component) can't survive that Server -> Client serialization
 * step ("Functions cannot be passed directly to Client Components").
 * Storing a string key on NavItem and resolving it to a real component
 * only here, inside client code, keeps every crossed prop plain data.
 */
export const NAV_ICONS = {
  BarChart3,
  Boxes,
  Calendar,
  CircleDollarSign,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Megaphone,
  Receipt,
  Settings,
  Truck,
  UserCog,
  Users,
  UsersRound,
} satisfies Record<string, LucideIcon>;

export type NavIconName = keyof typeof NAV_ICONS;
