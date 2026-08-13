import { Mail, MapPin, MessageCircle, Phone, Users as UsersIcon } from "lucide-react";

import { formatDate, formatDateTime } from "@/lib/format";

const TYPE_ICON = {
  call: Phone,
  email: Mail,
  meeting: UsersIcon,
  site_visit: MapPin,
  messenger: MessageCircle,
} as const;

export type InteractionRow = {
  id: string;
  type: keyof typeof TYPE_ICON;
  summary: string;
  occurredAt: string | Date;
  nextAction: string | null;
  nextActionDate: string | null;
  userName: string | null;
};

export function InteractionsList({ interactions }: { interactions: InteractionRow[] }) {
  if (interactions.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No interactions logged yet.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {interactions.map((interaction) => {
        const Icon = TYPE_ICON[interaction.type] ?? MessageCircle;
        return (
          <li key={interaction.id} className="flex gap-3 rounded-lg border border-border p-3">
            <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
              <Icon className="size-3.5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground capitalize">
                  {interaction.type.replace("_", " ")} · {interaction.userName ?? "—"}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {formatDateTime(interaction.occurredAt)}
                </span>
              </div>
              <p className="mt-1 text-sm break-words">{interaction.summary}</p>
              {interaction.nextAction && (
                <p className="mt-1.5 text-xs text-primary">
                  Next: {interaction.nextAction}
                  {interaction.nextActionDate && ` · ${formatDate(interaction.nextActionDate)}`}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
