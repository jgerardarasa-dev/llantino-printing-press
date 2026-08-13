"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  approveQuotation,
  createRevision,
  rejectQuotation,
  sendOrSubmitQuotation,
} from "@/lib/actions/quotation-actions";
import { emailQuotation } from "@/lib/actions/quotation-email-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export function QuotationActions({
  quotationId,
  status,
  requiresApproval,
  canEdit,
  canApprove,
  hasContactEmail,
}: {
  quotationId: string;
  status: string;
  requiresApproval: boolean;
  canEdit: boolean;
  canApprove: boolean;
  hasContactEmail: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  function run(fn: () => Promise<{ error?: string; success?: boolean }>, successMessage: string) {
    startTransition(async () => {
      const result = await fn();
      if (result.error) toast.error(result.error);
      else {
        toast.success(successMessage);
        router.refresh();
      }
    });
  }

  const canSend = canEdit && (status === "draft" || status === "approved");
  const canCreateRevision = canEdit && ["sent", "approved", "rejected", "expired"].includes(status);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canEdit && (status === "draft" || status === "rejected") && (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/quotations/${quotationId}/edit`}>Edit</Link>
        </Button>
      )}

      {canSend && (
        <Button
          size="sm"
          disabled={isPending}
          onClick={() =>
            run(
              () => sendOrSubmitQuotation(quotationId),
              status === "draft" && requiresApproval ? "Submitted for approval" : "Sent to client"
            )
          }
        >
          {isPending && <Loader2 className="size-3.5 animate-spin" />}
          {status === "draft" && requiresApproval ? "Submit for approval" : "Send to client"}
        </Button>
      )}

      {canApprove && status === "pending_approval" && (
        <>
          <Button size="sm" disabled={isPending} onClick={() => run(() => approveQuotation(quotationId), "Approved")}>
            Approve
          </Button>
          <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={isPending}>Reject</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reject quotation</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="rejectReason">Reason *</Label>
                <textarea
                  id="rejectReason"
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
                <Button
                  variant="destructive"
                  disabled={!rejectReason.trim() || isPending}
                  onClick={() => {
                    run(() => rejectQuotation(quotationId, rejectReason), "Rejected");
                    setRejectOpen(false);
                  }}
                >
                  Reject
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}

      <Button variant="outline" size="sm" asChild>
        <a href={`/quotations/${quotationId}/pdf`} target="_blank" rel="noreferrer">
          Download PDF
        </a>
      </Button>

      {hasContactEmail && (
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => run(() => emailQuotation(quotationId), "Emailed to client")}
        >
          Email to client
        </Button>
      )}

      {canCreateRevision && (
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await createRevision(quotationId);
              if (result.error) toast.error(result.error);
              else if (result.quotationId) {
                toast.success("Revision created");
                router.push(`/quotations/${result.quotationId}`);
              }
            })
          }
        >
          Create revision
        </Button>
      )}
    </div>
  );
}
