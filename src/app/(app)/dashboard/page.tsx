import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { ROLE_LABELS } from "@/lib/constants/roles";
import { navSectionsForRole } from "@/components/layout/nav-items";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const firstName = user?.fullName.split(" ")[0] ?? "there";
  const sections = user ? navSectionsForRole(user.role) : [];
  const quickLinks = sections.flatMap((s) => s.items).filter((i) => i.href !== "/dashboard");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Hi {firstName} 👋</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{user ? ROLE_LABELS[user.role] : ""}</span>.
          The role-specific dashboard — active JOs, deliveries this week, at-risk jobs,
          cash position — arrives in Milestone 9. For now, here&rsquo;s where to go.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="transition-colors hover:border-primary/40 hover:bg-accent/40">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-sm font-medium">
                    <span className="flex items-center gap-2">
                      <Icon className="size-4 text-muted-foreground" />
                      {item.label}
                    </span>
                    <ArrowRight className="size-3.5 text-muted-foreground" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Open {item.label.toLowerCase()}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
