"use client";

import { useActionState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { saveMetaAdsSettings, type ActionState } from "@/lib/actions/ad-spend-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ActionState = {};

/** Admin-only — settings_admin_write RLS is admin-only, stricter than AD_SPEND_ROLES. */
export function MetaAdsSettingsForm({ accountId, managerUrl }: { accountId: string; managerUrl: string }) {
  const [state, formAction, isPending] = useActionState(saveMetaAdsSettings, initialState);

  useEffect(() => {
    if (state.success) toast.success("Meta Ads settings saved");
  }, [state.success]);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="metaAdsAccountId" className="text-xs">
          Ad account ID
        </Label>
        <Input
          id="metaAdsAccountId"
          name="metaAdsAccountId"
          defaultValue={accountId}
          placeholder="act_1234567890"
          className="h-8 w-48 text-xs"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="metaAdsManagerUrl" className="text-xs">
          Ads Manager link
        </Label>
        <Input
          id="metaAdsManagerUrl"
          name="metaAdsManagerUrl"
          defaultValue={managerUrl}
          className="h-8 w-64 text-xs"
        />
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={isPending}>
        {isPending && <Loader2 className="size-3.5 animate-spin" />}
        Save
      </Button>
      {state.error && <p className="w-full text-xs text-destructive">{state.error}</p>}
    </form>
  );
}
