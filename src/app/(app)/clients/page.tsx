import { redirect } from "next/navigation";
import { Users } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { COMMERCIAL_ROLES, CRM_OWNER_ROLES } from "@/lib/auth/permissions";
import { listClients } from "@/lib/data/clients";
import { listAssignableOwners } from "@/lib/data/users";
import { ClientsTable } from "./columns";
import { ClientFormSheet } from "./client-form-sheet";

export default async function ClientsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!COMMERCIAL_ROLES.includes(user.role)) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <Users className="mb-3 size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Clients are visible to Sales, Accounting, and Management only.
        </p>
      </div>
    );
  }

  const [clientRows, owners] = await Promise.all([listClients(user), listAssignableOwners(user)]);
  const canEdit = CRM_OWNER_ROLES.includes(user.role);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Clients</h1>
          <p className="text-sm text-muted-foreground">{clientRows.length} total</p>
        </div>
        {canEdit && <ClientFormSheet owners={owners} />}
      </div>

      <ClientsTable
        data={clientRows}
        searchPlaceholder="Search clients..."
        emptyState={
          <div className="flex flex-col items-center gap-1 py-6">
            <Users className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No clients yet.</p>
            {canEdit && <p className="text-xs text-muted-foreground">Add your first client to get started.</p>}
          </div>
        }
      />
    </div>
  );
}
