"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { addComment } from "@/lib/actions/comment-actions";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";

export type CommentRow = {
  comment: { id: string; body: string; createdAt: string | Date };
  authorName: string | null;
};

export function CommentsPanel({ entityType, entityId, comments }: { entityType: string; entityId: string; comments: CommentRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [body, setBody] = useState("");

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="Add a comment..."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button
          size="icon"
          className="size-9 shrink-0 self-end"
          disabled={!body.trim() || isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await addComment(entityType, entityId, body);
              if (result.error) toast.error(result.error);
              else {
                setBody("");
                router.refresh();
              }
            })
          }
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </div>

      <ul className="space-y-2.5">
        {comments.map(({ comment, authorName }) => (
          <li key={comment.id} className="rounded-md border border-border p-2.5 text-sm">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{authorName ?? "—"}</span>
              <span>{formatDateTime(comment.createdAt)}</span>
            </div>
            <p className="mt-1 whitespace-pre-wrap">{comment.body}</p>
          </li>
        ))}
        {comments.length === 0 && <p className="py-2 text-center text-xs text-muted-foreground">No comments yet.</p>}
      </ul>
    </div>
  );
}
