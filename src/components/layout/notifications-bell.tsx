"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";

import { markAllNotificationsRead, markNotificationRead } from "@/lib/actions/notification-actions";
import { formatRelativeDays } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { NotificationRow } from "@/lib/data/notifications";

/** SPEC §10: in-app notifications — a bell with unread count in the topbar, everywhere in the app shell. */
export function NotificationsBell({
  initialNotifications,
  initialUnreadCount,
}: {
  initialNotifications: NotificationRow[];
  initialUnreadCount: number;
}) {
  const [items, setItems] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [, startTransition] = useTransition();

  function handleItemClick(id: string, alreadyRead: boolean) {
    if (alreadyRead) return;
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date() } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    startTransition(() => {
      markNotificationRead(id);
    });
  }

  function handleMarkAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date() })));
    setUnreadCount(0);
    startTransition(() => {
      markAllNotificationsRead();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
          className="relative"
        >
          <Bell className="size-4.5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-medium text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm font-medium">Notifications</span>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="size-3.5" />
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">You&rsquo;re all caught up.</p>
          ) : (
            items.map((n) => (
              <Link
                key={n.id}
                href={n.linkUrl || "/notifications"}
                onClick={() => handleItemClick(n.id, n.readAt !== null)}
                className={cn(
                  "block border-b border-border/60 px-3 py-2.5 text-sm last:border-0 hover:bg-accent/40",
                  !n.readAt && "bg-accent/20"
                )}
              >
                <div className="flex items-start gap-2">
                  {!n.readAt && <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />}
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate", !n.readAt && "font-medium")}>{n.title}</p>
                    {n.body && <p className="truncate text-xs text-muted-foreground">{n.body}</p>}
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{formatRelativeDays(n.createdAt)}</p>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <Link
          href="/notifications"
          className="block px-3 py-2 text-center text-xs font-medium text-primary hover:underline"
        >
          View all
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
