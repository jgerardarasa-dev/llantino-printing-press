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

import type { UserRole } from "@/lib/constants/roles";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

const ALL_ROLES: UserRole[] = [
  "admin",
  "management",
  "sales",
  "production",
  "accounting",
  "hr",
  "staff",
];

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ALL_ROLES },
    ],
  },
  {
    label: "Sales",
    items: [
      { label: "Clients", href: "/clients", icon: Users, roles: ["admin", "management", "sales"] },
      { label: "Leads", href: "/leads", icon: UsersRound, roles: ["admin", "management", "sales"] },
      {
        label: "Quotations",
        href: "/quotations",
        icon: FileText,
        roles: ["admin", "management", "sales", "accounting"],
      },
    ],
  },
  {
    label: "Production",
    items: [
      {
        label: "Job Orders",
        href: "/job-orders",
        icon: ClipboardList,
        roles: ["admin", "management", "sales", "production", "accounting", "staff"],
      },
      {
        label: "Materials & Pricing",
        href: "/materials",
        icon: Boxes,
        roles: ["admin", "management", "sales", "production"],
      },
      {
        label: "Deliveries",
        href: "/deliveries",
        icon: Truck,
        roles: ["admin", "management", "production", "sales"],
      },
    ],
  },
  {
    label: "Work",
    items: [
      { label: "Tasks", href: "/tasks", icon: ClipboardList, roles: ALL_ROLES },
      { label: "Calendar", href: "/calendar", icon: Calendar, roles: ALL_ROLES },
    ],
  },
  {
    label: "People",
    items: [
      { label: "Employees", href: "/hr/employees", icon: UserCog, roles: ["admin", "management", "hr"] },
      { label: "Attendance", href: "/hr/attendance", icon: ClipboardList, roles: ["admin", "management", "hr"] },
      { label: "Leave", href: "/hr/leave", icon: Calendar, roles: ALL_ROLES },
    ],
  },
  {
    label: "Money",
    items: [
      {
        label: "Invoices",
        href: "/accounting/invoices",
        icon: Receipt,
        roles: ["admin", "management", "accounting"],
      },
      {
        label: "Expenses",
        href: "/accounting/expenses",
        icon: CircleDollarSign,
        roles: ["admin", "management", "accounting"],
      },
      {
        label: "Job Costing",
        href: "/accounting/job-costing",
        icon: BarChart3,
        roles: ["admin", "management", "accounting"],
      },
    ],
  },
  {
    label: "Insights",
    items: [
      { label: "Analytics", href: "/analytics", icon: BarChart3, roles: ["admin", "management"] },
      { label: "Meta Ads", href: "/analytics/ads", icon: Megaphone, roles: ["admin", "management"] },
      { label: "Settings", href: "/settings", icon: Settings, roles: ["admin"] },
    ],
  },
];

export function navSectionsForRole(role: UserRole): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.roles.includes(role)),
  })).filter((section) => section.items.length > 0);
}
