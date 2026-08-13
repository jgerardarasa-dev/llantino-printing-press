/**
 * Milestone 1 seed data: 15 clients, 12 materials, 20 process rates,
 * 10 box specs, PH holidays, 25 job orders spread across every stage.
 *
 * Idempotent-ish: safe to re-run against a fresh database. Re-running
 * against a database that already has this data will create duplicates
 * for tables without a natural unique key (clients, box_specs, job
 * orders use generated jo_number/names that collide-check first).
 *
 * Usage:
 *   DATABASE_URL=... pnpm seed:data
 * (run `pnpm seed:users` first — job orders need real sales/production
 * owner ids)
 */
import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import {
  boxSpecs,
  clients,
  holidays,
  jobOrders,
  materials,
  processRates,
  users,
} from "../src/db/schema";

function pesos(amount: number) {
  return Math.round(amount * 100);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("Missing DATABASE_URL. See .env.example.");

  const sqlClient = postgres(databaseUrl, { max: 1 });
  const db = drizzle(sqlClient);

  const allUsers = await db.select().from(users);
  const byRole = (role: string) => allUsers.filter((u) => u.role === role);
  const admin = byRole("admin")[0];
  const salesUsers = byRole("sales");
  const productionUsers = byRole("production");

  if (!admin || salesUsers.length === 0 || productionUsers.length === 0) {
    throw new Error(
      "No admin/sales/production users found. Run `pnpm seed:users` before `pnpm seed:data`."
    );
  }
  const createdBy = admin.id;

  // -----------------------------------------------------------------------
  // 12 materials
  // -----------------------------------------------------------------------
  console.log("Seeding materials...");
  const materialRows = await db
    .insert(materials)
    .values([
      { name: "Greyback Duplex 300gsm", type: "duplex_greyback", gsm: 300, sheetWidthIn: "25.00", sheetLengthIn: "38.00", costPerSheetCentavos: pesos(9.5), supplier: "Alliance Pulp & Paper", isFoodGrade: false, minOrderSheets: 500, createdBy },
      { name: "Greyback Duplex 350gsm", type: "duplex_greyback", gsm: 350, sheetWidthIn: "25.00", sheetLengthIn: "38.00", costPerSheetCentavos: pesos(11.25), supplier: "Alliance Pulp & Paper", isFoodGrade: false, minOrderSheets: 500, createdBy },
      { name: "Whiteback Duplex 300gsm", type: "duplex_whiteback", gsm: 300, sheetWidthIn: "25.00", sheetLengthIn: "38.00", costPerSheetCentavos: pesos(11.8), supplier: "Metro Boardmills", isFoodGrade: false, minOrderSheets: 500, createdBy },
      { name: "Whiteback Duplex 350gsm", type: "duplex_whiteback", gsm: 350, sheetWidthIn: "25.00", sheetLengthIn: "38.00", costPerSheetCentavos: pesos(13.6), supplier: "Metro Boardmills", isFoodGrade: false, minOrderSheets: 500, createdBy },
      { name: "Whiteback Duplex 400gsm Food-Grade", type: "duplex_whiteback", gsm: 400, sheetWidthIn: "31.00", sheetLengthIn: "43.00", costPerSheetCentavos: pesos(22.4), supplier: "Metro Boardmills", isFoodGrade: true, minOrderSheets: 300, createdBy },
      { name: "C1S 250gsm", type: "c1s", gsm: 250, sheetWidthIn: "25.00", sheetLengthIn: "38.00", costPerSheetCentavos: pesos(9.0), supplier: "EPI Paper Trading", isFoodGrade: false, minOrderSheets: 500, createdBy },
      { name: "C1S 300gsm", type: "c1s", gsm: 300, sheetWidthIn: "25.00", sheetLengthIn: "38.00", costPerSheetCentavos: pesos(10.75), supplier: "EPI Paper Trading", isFoodGrade: false, minOrderSheets: 500, createdBy },
      { name: "C2S 300gsm", type: "c2s", gsm: 300, sheetWidthIn: "25.00", sheetLengthIn: "38.00", costPerSheetCentavos: pesos(12.3), supplier: "EPI Paper Trading", isFoodGrade: false, minOrderSheets: 300, createdBy },
      { name: "SBS/Ivory 300gsm Food-Grade", type: "sbs", gsm: 300, sheetWidthIn: "25.00", sheetLengthIn: "38.00", costPerSheetCentavos: pesos(18.9), supplier: "San Roque Boardmill", isFoodGrade: true, minOrderSheets: 300, createdBy },
      { name: "SBS/Ivory 350gsm Food-Grade", type: "sbs", gsm: 350, sheetWidthIn: "25.00", sheetLengthIn: "38.00", costPerSheetCentavos: pesos(21.5), supplier: "San Roque Boardmill", isFoodGrade: true, minOrderSheets: 300, createdBy },
      { name: "Kraft 275gsm", type: "kraft", gsm: 275, sheetWidthIn: "31.00", sheetLengthIn: "43.00", costPerSheetCentavos: pesos(14.2), supplier: "Bataan Kraft Mills", isFoodGrade: true, minOrderSheets: 500, createdBy },
      { name: "Corrugated E-flute 350gsm", type: "corrugated_e", gsm: 350, sheetWidthIn: "31.00", sheetLengthIn: "43.00", costPerSheetCentavos: pesos(16.75), supplier: "Bataan Kraft Mills", isFoodGrade: false, minOrderSheets: 200, createdBy },
    ])
    .onConflictDoNothing()
    .returning();
  const materialsList = materialRows.length > 0 ? materialRows : await db.select().from(materials);

  // -----------------------------------------------------------------------
  // 20 process rates
  // -----------------------------------------------------------------------
  console.log("Seeding process rates...");
  await db
    .insert(processRates)
    .values([
      { key: "offset_printing", label: "Offset Printing", unit: "per_sheet", rateCentavos: pesos(1.5), setupFeeCentavos: pesos(500), setupSheets: 150, createdBy },
      { key: "digital_printing", label: "Digital Printing", unit: "per_sheet", rateCentavos: pesos(6.0), setupFeeCentavos: 0, setupSheets: 50, createdBy },
      { key: "plate", label: "Printing Plate", unit: "per_plate", rateCentavos: pesos(350), setupFeeCentavos: 0, setupSheets: 0, createdBy },
      { key: "lamination_gloss", label: "Gloss Lamination", unit: "per_sheet", rateCentavos: pesos(1.2), setupFeeCentavos: pesos(300), setupSheets: 0, createdBy },
      { key: "lamination_matte", label: "Matte Lamination", unit: "per_sheet", rateCentavos: pesos(1.3), setupFeeCentavos: pesos(300), setupSheets: 0, createdBy },
      { key: "spot_uv", label: "Spot UV", unit: "per_sheet", rateCentavos: pesos(2.5), setupFeeCentavos: pesos(800), setupSheets: 0, createdBy },
      { key: "foil_stamp", label: "Foil Stamping", unit: "per_sheet", rateCentavos: pesos(3.5), setupFeeCentavos: pesos(1200), setupSheets: 0, createdBy },
      { key: "emboss", label: "Embossing / Debossing", unit: "per_sheet", rateCentavos: pesos(3.0), setupFeeCentavos: pesos(1000), setupSheets: 0, createdBy },
      { key: "die_cut", label: "Die-Cutting", unit: "per_sheet", rateCentavos: pesos(0.8), setupFeeCentavos: pesos(500), setupSheets: 0, createdBy },
      { key: "die_making", label: "Die Making (new design)", unit: "per_job", rateCentavos: pesos(3500), setupFeeCentavos: 0, setupSheets: 0, createdBy },
      { key: "stripping", label: "Stripping", unit: "per_sheet", rateCentavos: pesos(0.3), setupFeeCentavos: 0, setupSheets: 0, createdBy },
      { key: "gluing", label: "Gluing", unit: "per_piece", rateCentavos: pesos(0.35), setupFeeCentavos: pesos(200), setupSheets: 0, createdBy },
      { key: "manual_assembly", label: "Manual Assembly", unit: "per_piece", rateCentavos: pesos(0.5), setupFeeCentavos: 0, setupSheets: 0, createdBy },
      { key: "packing", label: "Packing", unit: "per_piece", rateCentavos: pesos(0.2), setupFeeCentavos: 0, setupSheets: 0, createdBy },
      { key: "varnish", label: "Varnish Coating", unit: "per_sheet", rateCentavos: pesos(1.0), setupFeeCentavos: pesos(300), setupSheets: 0, createdBy },
      { key: "window_patching", label: "Window Patching", unit: "per_piece", rateCentavos: pesos(0.6), setupFeeCentavos: pesos(150), setupSheets: 0, createdBy },
      { key: "corner_pasting", label: "Corner Pasting", unit: "per_piece", rateCentavos: pesos(0.4), setupFeeCentavos: 0, setupSheets: 0, createdBy },
      { key: "drilling", label: "Drilling / Hole Punch", unit: "per_sheet", rateCentavos: pesos(0.25), setupFeeCentavos: pesos(100), setupSheets: 0, createdBy },
      { key: "shrink_wrap", label: "Shrink Wrapping", unit: "per_piece", rateCentavos: pesos(0.3), setupFeeCentavos: pesos(150), setupSheets: 0, createdBy },
      { key: "quality_inspection", label: "Quality Inspection", unit: "per_job", rateCentavos: pesos(500), setupFeeCentavos: 0, setupSheets: 0, createdBy },
    ])
    .onConflictDoNothing();

  // -----------------------------------------------------------------------
  // 15 clients
  // -----------------------------------------------------------------------
  console.log("Seeding clients...");
  const clientSeed: {
    companyName: string;
    industry: string;
    city: string;
    region: string;
    priceTier: "standard" | "preferred" | "wholesale";
    source: "walk_in" | "referral" | "meta_ads" | "website" | "facebook" | "other";
    status?: "lead" | "prospect" | "active" | "dormant" | "lost";
  }[] = [
    { companyName: "Manila Bay Bakeshop Inc.", industry: "Bakery & Confectionery", city: "Manila", region: "NCR", priceTier: "preferred" as const, source: "referral" as const },
    { companyName: "Crispy Cravings Food Corp.", industry: "QSR / Food Service", city: "Quezon City", region: "NCR", priceTier: "standard" as const, source: "walk_in" as const },
    { companyName: "Luntian Organics", industry: "Health & Wellness", city: "Makati", region: "NCR", priceTier: "standard" as const, source: "website" as const },
    { companyName: "Sierra Cosmetics PH", industry: "Cosmetics", city: "Pasig", region: "NCR", priceTier: "preferred" as const, source: "meta_ads" as const },
    { companyName: "QuickBite Foods", industry: "QSR / Food Service", city: "Mandaluyong", region: "NCR", priceTier: "standard" as const, source: "referral" as const },
    { companyName: "Golden Harvest Snacks", industry: "Snacks & Confectionery", city: "Cebu City", region: "Region VII", priceTier: "wholesale" as const, source: "walk_in" as const },
    { companyName: "Bayanihan Pharma Supplies", industry: "Pharmaceutical", city: "Taguig", region: "NCR", priceTier: "preferred" as const, source: "referral" as const },
    { companyName: "Cebu Sweets Co.", industry: "Confectionery", city: "Cebu City", region: "Region VII", priceTier: "standard" as const, source: "facebook" as const },
    { companyName: "Iloilo Delicacies Trading", industry: "Food Export", city: "Iloilo City", region: "Region VI", priceTier: "wholesale" as const, source: "other" as const },
    { companyName: "Metro Electronics Packaging", industry: "Electronics", city: "Valenzuela", region: "NCR", priceTier: "standard" as const, source: "website" as const },
    { companyName: "Verde Coffee Roasters", industry: "Beverage", city: "Baguio City", region: "CAR", priceTier: "preferred" as const, source: "meta_ads" as const },
    { companyName: "Isla Footwear Co.", industry: "Apparel & Footwear", city: "Marikina", region: "NCR", priceTier: "standard" as const, source: "referral" as const },
    { companyName: "Davao Fruit Exports", industry: "Agriculture / Export", city: "Davao City", region: "Region XI", priceTier: "wholesale" as const, source: "other" as const },
    { companyName: "Prime Health Supplements", industry: "Pharmaceutical", city: "Parañaque", region: "NCR", priceTier: "preferred" as const, source: "facebook" as const },
    { companyName: "Fiesta Party Essentials", industry: "Retail / Events", city: "Las Piñas", region: "NCR", priceTier: "standard" as const, source: "walk_in" as const, status: "prospect" as const },
  ];

  const clientRows = await db
    .insert(clients)
    .values(
      clientSeed.map((c, i) => ({
        companyName: c.companyName,
        industry: c.industry,
        tin: `00${(i + 1).toString().padStart(3, "0")}-${(100 + i).toString()}-${(200 + i).toString()}-000`,
        addressLine1: `${12 + i} Industrial Ave.`,
        city: c.city,
        region: c.region,
        isVatRegistered: c.priceTier !== "wholesale",
        paymentTermsDays: c.priceTier === "wholesale" ? 45 : 30,
        creditLimitCentavos: pesos(c.priceTier === "wholesale" ? 500000 : c.priceTier === "preferred" ? 300000 : 150000),
        priceTier: c.priceTier,
        ownerUserId: salesUsers[i % salesUsers.length].id,
        source: c.source,
        status: c.status ?? "active",
        notes: null,
        createdBy,
      }))
    )
    .onConflictDoNothing()
    .returning();
  const clientsList = clientRows.length > 0 ? clientRows : await db.select().from(clients);

  // -----------------------------------------------------------------------
  // 10 box specs
  // -----------------------------------------------------------------------
  console.log("Seeding box specs...");
  const byMaterial = (name: string) => materialsList.find((m) => m.name === name)!;

  const boxSpecSeed = [
    { name: "Pizza Box 12in Kraft", style: "pizza" as const, l: 305, w: 305, h: 40, material: "Kraft 275gsm", colours: 2, finishing: ["die_cut"], food: true, ups: 4 },
    { name: "Bakery Box Small Reverse Tuck", style: "reverse_tuck" as const, l: 150, w: 100, h: 60, material: "Whiteback Duplex 300gsm", colours: 4, finishing: ["lamination_gloss", "die_cut", "gluing"], food: true, ups: 8 },
    { name: "Cosmetic Tuck Box", style: "straight_tuck" as const, l: 90, w: 55, h: 130, material: "C1S 300gsm", colours: 4, finishing: ["spot_uv", "foil_stamp", "die_cut", "gluing"], food: false, ups: 10 },
    { name: "Pharma Carton Auto-Lock Bottom", style: "auto_lock_bottom" as const, l: 120, w: 70, h: 40, material: "SBS/Ivory 300gsm Food-Grade", colours: 4, finishing: ["lamination_matte", "die_cut", "gluing"], food: true, ups: 12 },
    { name: "E-commerce Mailer Box", style: "mailer" as const, l: 300, w: 220, h: 100, material: "Corrugated E-flute 350gsm", colours: 1, finishing: ["die_cut", "gluing"], food: false, ups: 2 },
    { name: "Snack Box Straight Tuck", style: "straight_tuck" as const, l: 180, w: 90, h: 60, material: "Whiteback Duplex 300gsm", colours: 4, finishing: ["lamination_gloss", "die_cut", "gluing"], food: true, ups: 8 },
    { name: "Shoe Box Tray & Lid", style: "tray_lid" as const, l: 330, w: 200, h: 120, material: "Greyback Duplex 350gsm", colours: 2, finishing: ["die_cut", "gluing", "corner_pasting"], food: false, ups: 2 },
    { name: "Coffee Bag Carton Sleeve", style: "sleeve" as const, l: 100, w: 60, h: 150, material: "Kraft 275gsm", colours: 2, finishing: ["die_cut"], food: true, ups: 10 },
    { name: "Supplement Bottle Carton", style: "auto_lock_bottom" as const, l: 80, w: 80, h: 130, material: "SBS/Ivory 350gsm Food-Grade", colours: 4, finishing: ["lamination_gloss", "spot_uv", "die_cut", "gluing"], food: true, ups: 10 },
    { name: "Fruit Export Tray", style: "tray_lid" as const, l: 400, w: 300, h: 90, material: "Corrugated E-flute 350gsm", colours: 1, finishing: ["die_cut"], food: true, ups: 1 },
  ];

  const boxSpecRows = await db
    .insert(boxSpecs)
    .values(
      boxSpecSeed.map((b) => ({
        name: b.name,
        style: b.style,
        lengthMm: b.l.toFixed(2),
        widthMm: b.w.toFixed(2),
        heightMm: b.h.toFixed(2),
        materialId: byMaterial(b.material).id,
        gsm: byMaterial(b.material).gsm,
        printColoursFront: b.colours,
        printColoursBack: 0,
        hasSpotColour: b.finishing.includes("spot_uv") || b.finishing.includes("foil_stamp"),
        finishing: b.finishing,
        isFoodGrade: b.food,
        upsPerSheet: b.ups,
        notes: null,
        createdBy,
      }))
    )
    .onConflictDoNothing()
    .returning();
  const boxSpecsList = boxSpecRows.length > 0 ? boxSpecRows : await db.select().from(boxSpecs);

  // -----------------------------------------------------------------------
  // PH holidays 2026
  // -----------------------------------------------------------------------
  console.log("Seeding PH holidays 2026...");
  await db
    .insert(holidays)
    .values(
      [
        { date: "2026-01-01", name: "New Year's Day", type: "regular" as const },
        { date: "2026-02-25", name: "EDSA People Power Anniversary", type: "special_non_working" as const },
        { date: "2026-04-02", name: "Maundy Thursday", type: "regular" as const },
        { date: "2026-04-03", name: "Good Friday", type: "regular" as const },
        { date: "2026-04-04", name: "Black Saturday", type: "special_non_working" as const },
        { date: "2026-04-09", name: "Araw ng Kagitingan", type: "regular" as const },
        { date: "2026-05-01", name: "Labor Day", type: "regular" as const },
        { date: "2026-06-12", name: "Independence Day", type: "regular" as const },
        { date: "2026-08-21", name: "Ninoy Aquino Day", type: "special_non_working" as const },
        { date: "2026-08-31", name: "National Heroes Day", type: "regular" as const },
        { date: "2026-11-01", name: "All Saints' Day", type: "special_non_working" as const },
        { date: "2026-11-30", name: "Bonifacio Day", type: "regular" as const },
        { date: "2026-12-08", name: "Feast of the Immaculate Conception", type: "special_non_working" as const },
        { date: "2026-12-24", name: "Christmas Eve", type: "special_non_working" as const },
        { date: "2026-12-25", name: "Christmas Day", type: "regular" as const },
        { date: "2026-12-30", name: "Rizal Day", type: "regular" as const },
        { date: "2026-12-31", name: "Last Day of the Year", type: "special_non_working" as const },
      ].map((h) => ({ ...h, createdBy }))
    )
    .onConflictDoNothing();

  // -----------------------------------------------------------------------
  // 25 job orders spread across every stage
  // -----------------------------------------------------------------------
  console.log("Seeding job orders...");
  const stages = [
    "draft",
    "for_artwork",
    "artwork_approval",
    "prepress",
    "materials_ready",
    "printing",
    "printing",
    "finishing",
    "finishing",
    "die_cutting",
    "gluing_assembly",
    "gluing_assembly",
    "quality_check",
    "quality_check",
    "packing",
    "ready_for_delivery",
    "ready_for_delivery",
    "delivered",
    "delivered",
    "invoiced",
    "invoiced",
    "paid",
    "paid",
    "closed",
    "cancelled",
  ] as const;

  const today = new Date("2026-08-13T00:00:00Z");
  function addDays(base: Date, days: number) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }

  const deliveredStages = new Set(["delivered", "invoiced", "paid", "closed"]);
  const producedStages = new Set([
    "printing",
    "finishing",
    "die_cutting",
    "gluing_assembly",
    "quality_check",
    "packing",
    "ready_for_delivery",
    "delivered",
    "invoiced",
    "paid",
    "closed",
  ]);

  const joValues = stages.map((stage, i) => {
    const client = clientsList[i % clientsList.length];
    const boxSpec = boxSpecsList[i % boxSpecsList.length];
    const quantity = [1000, 2000, 3000, 5000, 8000][i % 5];
    const unitPrice = pesos(6 + (i % 7)); // ₱6–12/pc, illustrative
    const orderDate = addDays(today, -(45 - i * 2));
    const targetDate = addDays(today, i % 5 === 0 ? -2 : 3 + (i % 10)); // some overdue → "at risk"
    const isDelivered = deliveredStages.has(stage);
    const isProduced = producedStages.has(stage);
    const salesOwner = salesUsers[i % salesUsers.length];
    const productionOwner = productionUsers[i % productionUsers.length];

    return {
      joNumber: `JO-2026-${(i + 1).toString().padStart(4, "0")}`,
      clientId: client.id,
      clientPoNumber: `PO-${client.companyName.slice(0, 3).toUpperCase()}-${1000 + i}`,
      boxSpecId: boxSpec.id,
      quantityOrdered: quantity,
      quantityProduced: isProduced ? quantity : Math.floor(quantity * (i % 3 === 0 ? 0.5 : 0)),
      quantityDelivered: isDelivered ? quantity : 0,
      unitPriceCentavos: unitPrice,
      totalCentavos: unitPrice * quantity,
      stage,
      priority: (["normal", "normal", "rush", "critical"] as const)[i % 4],
      orderDate,
      targetDeliveryDate: targetDate,
      actualDeliveryDate: isDelivered ? addDays(today, -(i % 10)) : null,
      isRepeatOrder: i % 4 === 0,
      salesOwnerId: salesOwner.id,
      productionOwnerId: stage === "draft" || stage === "for_artwork" ? null : productionOwner.id,
      isOnHold: i === 6,
      holdReason: i === 6 ? "Awaiting client artwork approval — client on leave until next week." : null,
      cancelledReason: stage === "cancelled" ? "Client cancelled order after budget cut." : null,
      notes: null,
      createdBy,
    };
  });

  await db.insert(jobOrders).values(joValues).onConflictDoNothing();

  console.log(`\nSeed complete: ${materialsList.length} materials, ${clientsList.length} clients, ${boxSpecsList.length} box specs, ${joValues.length} job orders.`);
  await sqlClient.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
