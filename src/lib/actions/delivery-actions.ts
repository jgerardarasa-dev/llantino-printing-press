"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { withUserContext } from "@/db/client";
import { deliveries, jobOrders } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { assertRole } from "@/lib/auth/permissions";
import { generateDrNumber } from "@/lib/data/job-orders";
import type { UserRole } from "@/lib/constants/roles";
import { deliveryInsertSchema } from "@/lib/validation/entities";

export type ActionState = { error?: string; success?: boolean; deliveryId?: string };

const DELIVERY_ROLES: UserRole[] = ["admin", "management", "production", "sales"];

export async function createDelivery(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  try {
    assertRole(user, DELIVERY_ROLES);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }

  const raw = Object.fromEntries(formData.entries());
  const jobOrderId = raw.jobOrderId as string;

  try {
    const deliveryId = await withUserContext(user.id, async (tx) => {
      const drNumber = await generateDrNumber(tx);

      const parsed = deliveryInsertSchema.safeParse({
        jobOrderId,
        drNumber,
        scheduledDate: raw.scheduledDate || undefined,
        quantity: raw.quantity,
        driverName: raw.driverName || undefined,
        vehicle: raw.vehicle || undefined,
        status: "scheduled",
      });
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");

      const [created] = await tx.insert(deliveries).values({ ...parsed.data, createdBy: user.id }).returning({ id: deliveries.id });
      return created.id;
    });

    revalidatePath(`/job-orders/${jobOrderId}`);
    return { success: true, deliveryId };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't schedule the delivery." };
  }
}

export async function markDelivered(
  deliveryId: string,
  jobOrderId: string,
  data: { receivedByName: string; deliveredAt: string }
): Promise<ActionState> {
  const user = await getCurrentUser();
  try {
    assertRole(user, DELIVERY_ROLES);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Forbidden" };
  }
  if (!data.receivedByName.trim()) return { error: "Who received the delivery is required." };

  try {
    await withUserContext(user.id, async (tx) => {
      await tx
        .update(deliveries)
        .set({
          status: "delivered",
          deliveredAt: new Date(data.deliveredAt),
          receivedByName: data.receivedByName,
          updatedAt: new Date(),
        })
        .where(eq(deliveries.id, deliveryId));

      const [delivery] = await tx.select().from(deliveries).where(eq(deliveries.id, deliveryId)).limit(1);
      if (delivery) {
        const [jo] = await tx.select().from(jobOrders).where(eq(jobOrders.id, jobOrderId)).limit(1);
        if (jo) {
          await tx
            .update(jobOrders)
            .set({
              quantityDelivered: jo.quantityDelivered + delivery.quantity,
              actualDeliveryDate: data.deliveredAt.slice(0, 10),
              updatedAt: new Date(),
            })
            .where(eq(jobOrders.id, jobOrderId));
        }
      }
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't mark the delivery as delivered." };
  }

  revalidatePath(`/job-orders/${jobOrderId}`);
  return { success: true };
}
