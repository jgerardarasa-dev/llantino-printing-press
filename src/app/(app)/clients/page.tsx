import { Users } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";

export default function ClientsPage() {
  return (
    <ComingSoon
      icon={Users}
      title="Clients"
      description="Client list, contacts, and the 360° view (quotes, JOs, invoices on one page) land with the CRM module."
      milestone="Milestone 2 — CRM"
    />
  );
}
