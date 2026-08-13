import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getUnreadNotificationCount, listNotifications } from "@/lib/data/notifications";
import { navSectionsForRole } from "@/components/layout/nav-items";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Topbar } from "@/components/layout/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const navSections = navSectionsForRole(user.role);
  const [notifications, unreadCount] = await Promise.all([
    listNotifications(user, 10),
    getUnreadNotificationCount(user),
  ]);

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border lg:block">
        <div className="fixed h-screen w-64">
          <SidebarNav sections={navSections} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar navSections={navSections} user={user} notifications={notifications} unreadCount={unreadCount} />
        <main className="min-w-0 flex-1 p-3 sm:p-5">{children}</main>
      </div>
    </div>
  );
}
