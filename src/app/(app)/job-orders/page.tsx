import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { listJobOrders } from "@/lib/data/job-orders";
import { JobOrdersTable } from "./columns";

export default async function JobOrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "hr") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Job orders aren&rsquo;t part of HR&rsquo;s workspace.
      </div>
    );
  }

  const jobOrderRows = await listJobOrders(user);
  const atRiskCount = jobOrderRows.filter((r) => r.isAtRisk).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Job Orders</h1>
        <p className="text-sm text-muted-foreground">
          {jobOrderRows.length} total
          {atRiskCount > 0 && <span className="text-destructive"> · {atRiskCount} at risk</span>}
        </p>
      </div>

      <JobOrdersTable
        data={jobOrderRows}
        searchPlaceholder="Search job orders..."
        emptyState={
          <div className="flex flex-col items-center gap-1 py-6">
            <ClipboardList className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No job orders yet. Create one from an approved quotation.
            </p>
          </div>
        }
      />
    </div>
  );
}
