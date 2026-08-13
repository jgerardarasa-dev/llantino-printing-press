"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCheck } from "lucide-react";

import { markAllNotificationsRead, markNotificationRead } from "@/lib/actions/notification-actions";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { NotificationRow } from "@/lib/data/notifications";

export function NotificationsList({ notifications }: { notifications: NotificationRow[] }) {
  const [items, setItems] = useState(notifications);
  const [, startTransition] = useTransition();

  const unreadCount = items.filter((n) => !n.readAt).length;

  function handleItemClick(id: string, alreadyRead: boolean) {
    if (alreadyRead) return;
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date() } : n)));
    startTransition(() => {
      markNotificationRead(id);
    });
  }

  function handleMarkAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date() })));
    startTransition(() => {
      markAllNotificationsRead();
    });
  }

  return (
    <div className="space-y-3">
      {unreadCount > 0 && (
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={handleMarkAllRead}>
            <CheckCheck className="size-3.5" />
            Mark all {unreadCount} as read
          </Button>
        </div>
      )}

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No notifications yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {items.map((n) => (
            <Link key={n.id} href={n.linkUrl || "/notifications"} onClick={() => handleItemClick(n.id, n.readAt !== null)}>
              <Card className={cn("transition-colors hover:border-primary/40", !n.readAt && "border-primary/30 bg-accent/20")}>
                <CardContent className="flex items-start gap-2 py-3">
                  {!n.readAt && <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />}
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm", !n.readAt && "font-medium")}>{n.title}</p>
                    {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                    <p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(n.createdAt)}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
