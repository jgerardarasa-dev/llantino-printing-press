import { redirect } from "next/navigation";
import { UsersRound } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { COMMERCIAL_ROLES } from "@/lib/auth/permissions";
import { listLeads } from "@/lib/data/leads";
import { listAssignableOwners } from "@/lib/data/users";
import { LeadFormSheet } from "./lead-form-sheet";
import { LeadsKanban } from "./leads-kanban";

export default async function LeadsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!COMMERCIAL_ROLES.includes(user.role)) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <UsersRound className="mb-3 size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Leads are visible to Sales, Accounting, and Management only.
        </p>
      </div>
    );
  }

  const [leads, owners] = await Promise.all([listLeads(user), listAssignableOwners(user)]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Leads</h1>
          <p className="text-sm text-muted-foreground">{leads.length} in the pipeline</p>
        </div>
        <LeadFormSheet owners={owners} />
      </div>

      {leads.length === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-center">
          <UsersRound className="mb-1 size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No leads yet.</p>
          <p className="text-xs text-muted-foreground">Add your first inquiry to start the pipeline.</p>
        </div>
      ) : (
        <LeadsKanban leads={leads} />
      )}
    </div>
  );
}
