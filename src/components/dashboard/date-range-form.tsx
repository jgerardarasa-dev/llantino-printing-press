import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * A bare GET <form> — no client JS needed, the browser's own submit
 * does the navigation and the server component re-reads `searchParams`.
 * Used for every date-range filter (SPEC §8: "Every chart has a
 * date-range filter") and the management dashboard's "period selectable"
 * top-clients widget.
 */
export function DateRangeForm({
  action,
  from,
  to,
  extraFields,
}: {
  action: string;
  from: string;
  to: string;
  extraFields?: Record<string, string>;
}) {
  return (
    <form action={action} method="get" className="flex flex-wrap items-end gap-2">
      {extraFields &&
        Object.entries(extraFields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <div className="space-y-1">
        <Label htmlFor="from" className="text-xs text-muted-foreground">
          From
        </Label>
        <Input id="from" name="from" type="date" defaultValue={from} className="h-8 w-36 text-xs" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="to" className="text-xs text-muted-foreground">
          To
        </Label>
        <Input id="to" name="to" type="date" defaultValue={to} className="h-8 w-36 text-xs" />
      </div>
      <Button type="submit" size="sm" variant="outline">
        Apply
      </Button>
    </form>
  );
}
