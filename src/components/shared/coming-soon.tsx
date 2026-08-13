import { type LucideIcon } from "lucide-react";

export function ComingSoon({
  icon: Icon,
  title,
  description,
  milestone,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  milestone: string;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-lg border border-dashed border-border p-8 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      <p className="mt-4 text-xs font-medium text-muted-foreground/70 uppercase tracking-wide">
        {milestone}
      </p>
    </div>
  );
}
