import { UserCog } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";

export default function EmployeesPage() {
  return (
    <ComingSoon
      icon={UserCog}
      title="Employees"
      description="Employee records, employment type, and rates land with the HR module."
      milestone="Milestone 7 — HR"
    />
  );
}
