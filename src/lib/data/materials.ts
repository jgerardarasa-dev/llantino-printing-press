import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";

import { withUserContext } from "@/db/client";
import { boxSpecs, materials, processRates } from "@/db/schema";
import type { CurrentUser } from "@/lib/auth/get-current-user";
import { toRatesMap } from "@/lib/pricing/rates-map";

export async function listMaterials(user: CurrentUser) {
  return withUserContext(user.id, async (tx) =>
    tx.select().from(materials).where(isNull(materials.deletedAt)).orderBy(asc(materials.name))
  );
}
export type MaterialRow = Awaited<ReturnType<typeof listMaterials>>[number];

export async function listProcessRates(user: CurrentUser) {
  return withUserContext(user.id, async (tx) =>
    tx.select().from(processRates).where(isNull(processRates.deletedAt)).orderBy(asc(processRates.key))
  );
}
export type ProcessRateRow = Awaited<ReturnType<typeof listProcessRates>>[number];

export async function listBoxSpecs(user: CurrentUser) {
  return withUserContext(user.id, async (tx) =>
    tx
      .select({
        id: boxSpecs.id,
        name: boxSpecs.name,
        style: boxSpecs.style,
        lengthMm: boxSpecs.lengthMm,
        widthMm: boxSpecs.widthMm,
        heightMm: boxSpecs.heightMm,
        materialId: boxSpecs.materialId,
        materialName: materials.name,
        gsm: boxSpecs.gsm,
        printColoursFront: boxSpecs.printColoursFront,
        printColoursBack: boxSpecs.printColoursBack,
        hasSpotColour: boxSpecs.hasSpotColour,
        finishing: boxSpecs.finishing,
        isFoodGrade: boxSpecs.isFoodGrade,
        upsPerSheet: boxSpecs.upsPerSheet,
        clientId: boxSpecs.clientId,
        createdAt: boxSpecs.createdAt,
      })
      .from(boxSpecs)
      .leftJoin(materials, eq(materials.id, boxSpecs.materialId))
      .where(isNull(boxSpecs.deletedAt))
      .orderBy(asc(boxSpecs.name))
  );
}
export type BoxSpecRow = Awaited<ReturnType<typeof listBoxSpecs>>[number];

/** key -> ProcessRate, for computeQuote(). Active rates only. */
export async function getProcessRatesMap(user: CurrentUser) {
  const rows = await listProcessRates(user);
  return toRatesMap(rows);
}

export async function getBoxSpecWithMaterial(user: CurrentUser, boxSpecId: string) {
  return withUserContext(user.id, async (tx) => {
    const [row] = await tx
      .select({ boxSpec: boxSpecs, material: materials })
      .from(boxSpecs)
      .leftJoin(materials, eq(materials.id, boxSpecs.materialId))
      .where(and(eq(boxSpecs.id, boxSpecId), isNull(boxSpecs.deletedAt)))
      .limit(1);
    return row ?? null;
  });
}
