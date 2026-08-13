"use client";

import { useTransition } from "react";
import { Mail, Phone, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteContact } from "@/lib/actions/client-actions";
import { Button } from "@/components/ui/button";
import { ContactFormDialog, type ContactRow } from "@/components/crm/contact-form-dialog";

export function ContactsList({
  clientId,
  contacts,
  canEdit,
}: {
  clientId: string;
  contacts: ContactRow[];
  canEdit: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  if (contacts.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No contacts on file.</p>;
  }

  return (
    <ul className="space-y-2">
      {contacts.map((contact) => (
        <li
          key={contact.id}
          className="flex items-start justify-between gap-2 rounded-lg border border-border p-3"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium">{contact.name}</span>
              {contact.isPrimary && <Star className="size-3 fill-warning text-warning" />}
            </div>
            {contact.position && (
              <p className="text-xs text-muted-foreground">{contact.position}</p>
            )}
            <div className="mt-1 flex flex-col gap-0.5 text-xs text-muted-foreground">
              {contact.email && (
                <span className="flex items-center gap-1">
                  <Mail className="size-3" /> {contact.email}
                </span>
              )}
              {contact.mobile && (
                <span className="flex items-center gap-1">
                  <Phone className="size-3" /> {contact.mobile}
                </span>
              )}
            </div>
          </div>
          {canEdit && (
            <div className="flex shrink-0 gap-1">
              <ContactFormDialog
                clientId={clientId}
                contact={contact}
                trigger={
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                    Edit
                  </Button>
                }
              />
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                disabled={isPending}
                onClick={() => {
                  if (!confirm(`Remove ${contact.name}?`)) return;
                  startTransition(async () => {
                    const result = await deleteContact(contact.id, clientId);
                    if (result.error) toast.error(result.error);
                    else toast.success("Contact removed");
                  });
                }}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
