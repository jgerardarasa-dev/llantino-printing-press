import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Paperclip } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getJobOrderDetail } from "@/lib/data/job-orders";
import { listMaterials } from "@/lib/data/materials";
import { formatCentavos, formatDate } from "@/lib/format";
import type { JobOrderStage } from "@/lib/constants/job-order-stages";
import { canCancel as canCancelStage } from "@/lib/job-orders/state-machine";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StageBadge } from "@/components/shared/stage-badge";
import { StageControls } from "@/components/job-orders/stage-controls";
import { HoldCancelControls } from "@/components/job-orders/hold-cancel-controls";
import { ProductionLogsPanel } from "@/components/job-orders/production-logs-panel";
import { MaterialsPanel } from "@/components/job-orders/materials-panel";
import { ChecklistPanel } from "@/components/job-orders/checklist-panel";
import { DeliveriesPanel } from "@/components/job-orders/deliveries-panel";
import { CommentsPanel } from "@/components/job-orders/comments-panel";
import { ActivityTimeline } from "@/components/job-orders/activity-timeline";

const PRIORITY_VARIANT: Record<string, "outline" | "warning" | "destructive"> = {
  normal: "outline",
  rush: "warning",
  critical: "destructive",
};

export default async function JobOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "hr") {
    return <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">Job orders aren&rsquo;t part of HR&rsquo;s workspace.</div>;
  }

  const [detail, materialsList] = await Promise.all([getJobOrderDetail(user, id), listMaterials(user)]);
  if (!detail) notFound();

  const {
    jobOrder,
    client,
    boxSpec,
    material,
    salesOwner,
    productionOwner,
    productionLogs,
    materialsIssued,
    checklist,
    deliveries,
    stageHistory,
    comments,
    hideCommercials,
  } = detail;

  const canAdvance = ["admin", "management", "sales", "production"].includes(user.role);
  const canManage = ["admin", "management", "production"].includes(user.role);
  const canManageMoney = !hideCommercials;

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <Link href="/job-orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Job Orders
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">{jobOrder.joNumber}</h1>
            <StageBadge stage={jobOrder.stage as JobOrderStage} />
            <Badge variant={PRIORITY_VARIANT[jobOrder.priority] ?? "outline"} className="capitalize">{jobOrder.priority}</Badge>
            {jobOrder.isOnHold && (
              <Badge variant="warning">On hold{jobOrder.holdReason ? `: ${jobOrder.holdReason}` : ""}</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {client?.companyName ?? "No client"} · {boxSpec?.name ?? "No box spec"} · {jobOrder.quantityOrdered.toLocaleString()} pcs
            {jobOrder.targetDeliveryDate && ` · target ${formatDate(jobOrder.targetDeliveryDate)}`}
          </p>
        </div>
        <HoldCancelControls
          jobOrderId={jobOrder.id}
          stage={jobOrder.stage as JobOrderStage}
          isOnHold={jobOrder.isOnHold}
          canManage={canManage}
          canCancelOrder={["admin", "management"].includes(user.role) && canCancelStage(jobOrder.stage as JobOrderStage)}
        />
      </div>

      <Card>
        <CardContent className="pt-1">
          <StageControls
            jobOrderId={jobOrder.id}
            currentStage={jobOrder.stage as JobOrderStage}
            isOnHold={jobOrder.isOnHold}
            history={stageHistory.map((h) => ({
              toStage: h.history.toStage,
              changedAt: h.history.changedAt,
              changedByName: h.changedByName,
            }))}
            clientPoNumber={jobOrder.clientPoNumber}
            canAdvance={canAdvance}
          />
        </CardContent>
      </Card>

      <div className={`grid grid-cols-1 gap-4 md:grid-cols-2 ${canManageMoney ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        {/* Specs */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Specs</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <SpecRow label="Style" value={boxSpec?.style?.replace(/_/g, " ") ?? "—"} />
              <SpecRow label="Dimensions" value={boxSpec ? `${boxSpec.lengthMm}×${boxSpec.widthMm}×${boxSpec.heightMm} mm` : "—"} />
              <SpecRow label="Material" value={material ? `${material.name} (${material.gsm} gsm)` : "—"} />
              <SpecRow label="Colours" value={boxSpec ? `${boxSpec.printColoursFront} front / ${boxSpec.printColoursBack} back${boxSpec.hasSpotColour ? " + spot" : ""}` : "—"} />
              <SpecRow label="Finishing" value={((boxSpec?.finishing as string[] | undefined) ?? []).join(", ") || "None"} />
              <SpecRow label="Food-grade" value={boxSpec?.isFoodGrade ? "Yes" : "No"} />
              <SpecRow label="Ups per sheet" value={String(boxSpec?.upsPerSheet ?? "—")} />
              {jobOrder.notes && (
                <div className="pt-2">
                  <p className="text-xs font-medium text-muted-foreground">Notes</p>
                  <p className="mt-0.5 whitespace-pre-wrap">{jobOrder.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Progress */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Production logs</CardTitle></CardHeader>
            <CardContent>
              <ProductionLogsPanel
                jobOrderId={jobOrder.id}
                currentStage={jobOrder.stage as JobOrderStage}
                logs={productionLogs}
                canEdit={canManage}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Materials issued</CardTitle></CardHeader>
            <CardContent>
              <MaterialsPanel
                jobOrderId={jobOrder.id}
                materials={materialsList.map((m) => ({ id: m.id, name: m.name }))}
                issued={materialsIssued}
                canEdit={canManage}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>QC checklist</CardTitle></CardHeader>
            <CardContent>
              <ChecklistPanel
                jobOrderId={jobOrder.id}
                currentStage={jobOrder.stage as JobOrderStage}
                items={checklist}
                canEdit={canManage}
              />
            </CardContent>
          </Card>
        </div>

        {/* Commercial — hidden entirely from production */}
        {canManageMoney && (
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Commercial</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <SpecRow label="Unit price" value={formatCentavos(jobOrder.unitPriceCentavos)} />
                <SpecRow label="Total" value={formatCentavos(jobOrder.totalCentavos)} />
                <SpecRow label="Client PO" value={jobOrder.clientPoNumber ?? "—"} />
                <SpecRow label="Sales owner" value={salesOwner?.fullName ?? "Unassigned"} />
                {jobOrder.quotationId && (
                  <Link href={`/quotations/${jobOrder.quotationId}`} className="inline-block pt-1 text-primary hover:underline">
                    View source quotation →
                  </Link>
                )}
                <div className="pt-2">
                  <p className="text-xs font-medium text-muted-foreground">Invoice status</p>
                  <p className="text-xs text-muted-foreground">Arrives in Milestone 8 — Accounting.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Right rail */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Deliveries</CardTitle></CardHeader>
            <CardContent>
              <DeliveriesPanel jobOrderId={jobOrder.id} deliveries={deliveries} canEdit={canManage || user.role === "sales"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>People</CardTitle></CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              {!hideCommercials && <SpecRow label="Sales owner" value={salesOwner?.fullName ?? "Unassigned"} />}
              <SpecRow label="Production owner" value={productionOwner?.fullName ?? "Unassigned"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Attachments</CardTitle></CardHeader>
            <CardContent>
              {detail.attachments.length === 0 ? (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Paperclip className="size-3.5" /> File upload isn&rsquo;t wired up yet.
                </p>
              ) : (
                <ul className="space-y-1 text-xs">
                  {detail.attachments.map((a) => (
                    <li key={a.id}>{a.fileName}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Comments</CardTitle></CardHeader>
            <CardContent>
              <CommentsPanel entityType="job_orders" entityId={jobOrder.id} comments={comments} />
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Activity</CardTitle></CardHeader>
        <CardContent>
          <ActivityTimeline entries={stageHistory} />
        </CardContent>
      </Card>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right capitalize">{value}</span>
    </div>
  );
}
