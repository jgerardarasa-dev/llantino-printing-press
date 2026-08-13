import { redirect } from "next/navigation";
import { Bell } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { listNotifications } from "@/lib/data/notifications";
import { NotificationsList } from "@/components/layout/notifications-list";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const notifications = await listNotifications(user, 100);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="size-5 text-muted-foreground" />
        <h1 className="text-lg font-semibold">Notifications</h1>
      </div>
      <NotificationsList notifications={notifications} />
    </div>
  );
}
