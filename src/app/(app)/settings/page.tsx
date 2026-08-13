import { Settings } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";

export default function SettingsPage() {
  return (
    <ComingSoon
      icon={Settings}
      title="Settings"
      description="Company info, VAT rate, default markups, JO numbering, and approval thresholds — configured module by module as each one is built."
      milestone="Rolls out alongside each module"
    />
  );
}
