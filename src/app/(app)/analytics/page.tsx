import { BarChart3 } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";

export default function AnalyticsPage() {
  return (
    <ComingSoon
      icon={BarChart3}
      title="Analytics"
      description="Job costing (quoted vs actual), conversion rates, waste rate, and the Meta Ads cost-per-lead page land here."
      milestone="Milestone 9 — Dashboards + Analytics"
    />
  );
}
