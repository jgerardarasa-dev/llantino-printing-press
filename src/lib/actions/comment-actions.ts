"use server";

import { revalidatePath } from "next/cache";

import { withUserContext } from "@/db/client";
import { comments } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export type ActionState = { error?: string; success?: boolean };

/**
 * Plain-text comments only — no @mention autocomplete/notifications yet
 * (mentions always saved empty). SPEC's "comments with @mentions" is
 * partially covered: the thread exists and is usable, parsing/
 * notifying on @mentions is a follow-up.
 */
export async function addComment(entityType: string, entityId: string, body: string): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." };
  if (!body.trim()) return { error: "Comment can't be empty." };

  try {
    await withUserContext(user.id, async (tx) => {
      await tx.insert(comments).values({
        entityType,
        entityId,
        authorId: user.id,
        body: body.trim(),
      });
    });
  } catch (e) {
    console.error("addComment failed", e);
    return { error: "Couldn't post the comment." };
  }

  revalidatePath(`/job-orders/${entityId}`);
  return { success: true };
}
