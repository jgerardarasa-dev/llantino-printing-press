"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

import { logout } from "@/lib/actions/auth-actions";
import { ROLE_LABELS, type UserRole } from "@/lib/constants/roles";
import type { NavSection } from "@/components/layout/nav-items";
import type { NotificationRow } from "@/lib/data/notifications";
import { GlobalSearch } from "@/components/search/global-search";
import { NotificationsBell } from "@/components/layout/notifications-bell";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { BreadcrumbNav } from "@/components/layout/breadcrumb-nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Topbar({
  navSections,
  user,
  notifications,
  unreadCount,
}: {
  navSections: NavSection[];
  user: { fullName: string; role: UserRole };
  notifications: NotificationRow[];
  unreadCount: number;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background px-3 sm:px-4">
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open navigation"
        >
          <Menu className="size-5" />
        </Button>
        <SheetContent side="left" className="w-72 p-0">
          <VisuallyHidden>
            <SheetTitle>Navigation</SheetTitle>
          </VisuallyHidden>
          <SidebarNav sections={navSections} onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="min-w-0 flex-1">
        <BreadcrumbNav />
      </div>

      <GlobalSearch />
      <NotificationsBell initialNotifications={notifications} initialUnreadCount={unreadCount} />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-md p-1 pr-2 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar className="size-7">
              <AvatarFallback className="bg-primary/10 text-xs text-primary">
                {initials(user.fullName)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium sm:inline">{user.fullName}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex flex-col gap-1">
            <span className="font-medium">{user.fullName}</span>
            <Badge variant="secondary" className="w-fit">
              {ROLE_LABELS[user.role]}
            </Badge>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => logout()}>Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
