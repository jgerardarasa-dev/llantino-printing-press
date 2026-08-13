"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { approveLeaveRequest, cancelLeaveRequest, rejectLeaveRequest } from "@/lib/actions/leave-actions";
import { formatDate } from "@/lib/format";
import type { LeaveRequestRow } from "@/lib/data/hr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_VARIANT: Record<string, "outline" | "warning" | "success" | "destructive" | "secondary"> = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
  cancelled: "outline",
};

export function LeaveRequestsList({
  requests,
  canApprove,
  ownEmployeeId,
}: {
  requests: LeaveRequestRow[];
  canApprove: boolean;
  ownEmployeeId: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (requests.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No leave requests yet.</p>;
  }

  function run(fn: () => Promise<{ error?: string; success?: boolean }>, message: string) {
    startTransition(async () => {
      const result = await fn();
      if (result.error) toast.error(result.error);
      else {
        toast.success(message);
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded-lg border border-border">
      <Table className="text-[13px]">
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead className="text-right">Days</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.employeeName ?? "—"}</TableCell>
              <TableCell className="capitalize">{r.leaveType.replace("_", " ")}</TableCell>
              <TableCell className="tabular-nums text-muted-foreground">
                {formatDate(r.startDate)} – {formatDate(r.endDate)}
              </TableCell>
              <TableCell className="text-right tabular-nums">{r.days}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[r.status] ?? "outline"} className="capitalize">{r.status}</Badge>
              </TableCell>
              <TableCell>
                {isPending ? (
                  <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                ) : (
                  <div className="flex justify-end gap-1">
                    {canApprove && r.status === "pending" && (
                      <>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => run(() => approveLeaveRequest(r.id), "Approved")}>
                          Approve
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => run(() => rejectLeaveRequest(r.id), "Rejected")}>
                          Reject
                        </Button>
                      </>
                    )}
                    {!canApprove && r.status === "pending" && r.employeeId === ownEmployeeId && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => run(() => cancelLeaveRequest(r.id), "Cancelled")}>
                        Cancel
                      </Button>
                    )}
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
