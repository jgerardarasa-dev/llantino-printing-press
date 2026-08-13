import { Truck } from "lucide-react";

import { ComingSoon } from "@/components/shared/coming-soon";

export default function DeliveriesPage() {
  return (
    <ComingSoon
      icon={Truck}
      title="Deliveries"
      description="Delivery scheduling and Delivery Receipt (DR) generation land with Job Orders."
      milestone="Milestone 5 — Job Orders"
    />
  );
}
