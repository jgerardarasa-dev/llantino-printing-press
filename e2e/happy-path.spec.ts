import { expect, test } from "@playwright/test";

import { advanceStage, DEMO_USERS, login, logout } from "./helpers";

/**
 * SPEC §10: "Playwright happy path: lead → quote → approve → JO →
 * produce → deliver → invoice → paid."
 *
 * IMPORTANT — this suite has never been run. There is no live Supabase
 * project connected in the environment this was written in (true for
 * every milestone in this repo — see README), and the app hard-requires
 * one for auth and every single query. The steps below were written by
 * reading the actual page/component source (login form, lead kanban,
 * quotation builder, JO stage stepper + advance dialog, QC checklist,
 * deliveries panel, invoice generation, payment recording) rather than
 * by driving a real browser against a real app, so some selectors will
 * likely need small adjustments the first time this actually runs
 * against a seeded database (`pnpm seed:users && pnpm seed:data`).
 */

test.describe.configure({ mode: "serial" });

// Unique per run so re-running the suite against the same DB doesn't collide with a previous run's data.
const RUN_ID = Date.now();
const LEAD_NAME = `E2E Contact ${RUN_ID}`;
const COMPANY_NAME = `E2E Test Co ${RUN_ID}`;

test("lead → quote → approve → JO → produce → deliver → invoice → paid", async ({ page }) => {
  // ---------------------------------------------------------------------
  // 1. Lead: sales creates a lead and moves it through to "won".
  // ---------------------------------------------------------------------
  await login(page, DEMO_USERS.sales);

  await test.step("create a lead", async () => {
    await page.goto("/leads");
    await page.getByRole("button", { name: "New lead" }).click();
    await page.getByLabel("Name *").fill(LEAD_NAME);
    await page.getByLabel("Company").fill(COMPANY_NAME);
    await page.getByLabel("Inquiry summary").fill("Wants 5,000 mailer boxes, food-grade.");
    await page.getByRole("button", { name: "Add lead" }).click();
    await expect(page.getByText(LEAD_NAME)).toBeVisible();
  });

  let clientUrl = "";
  await test.step("move the lead to Quoted and convert to a client", async () => {
    const card = page.locator("div", { hasText: LEAD_NAME }).filter({ has: page.locator('[role="combobox"]') }).last();
    await card.locator('[role="combobox"]').click();
    await page.getByRole("option", { name: "Quoted" }).click();

    await expect(card.getByRole("button", { name: "Convert to client" })).toBeVisible();
    await card.getByRole("button", { name: "Convert to client" }).click();
    await expect(card.getByRole("link", { name: "View client" })).toBeVisible();
    clientUrl = (await card.getByRole("link", { name: "View client" }).getAttribute("href")) ?? "";
    expect(clientUrl).toContain("/clients/");
  });

  // ---------------------------------------------------------------------
  // 2. Quotation: build a quote for the new client, save as draft, submit.
  // ---------------------------------------------------------------------
  let quotationUrl = "";
  await test.step("build and submit a quotation", async () => {
    await page.goto("/quotations/new");

    await page.getByLabel("Client *").click();
    await page.getByRole("option", { name: COMPANY_NAME }).click();

    await page.getByLabel("Box spec *").click();
    await page.getByRole("option").first().click();

    await page.getByLabel("Quantity (primary)").fill("2000");

    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page).toHaveURL(/\/quotations\/[0-9a-f-]+$/);
    quotationUrl = page.url();

    // Routes itself to "pending_approval" or straight to "sent" depending
    // on whether the computed breakdown requires management approval —
    // see sendOrSubmitQuotation in lib/actions/quotation-actions.ts.
    await page.getByRole("button", { name: /Submit for approval|Send to client/ }).click();
  });

  // ---------------------------------------------------------------------
  // 3. Approve: management approves the quotation if it needs approval.
  // ---------------------------------------------------------------------
  await logout(page);
  await login(page, DEMO_USERS.management);

  await test.step("approve the quotation if it's pending approval", async () => {
    await page.goto(quotationUrl);
    const approveButton = page.getByRole("button", { name: "Approve" });
    if (await approveButton.isVisible().catch(() => false)) {
      await approveButton.click();
      await expect(page.getByText(/approved/i)).toBeVisible();
    }
  });

  // ---------------------------------------------------------------------
  // 4. Job order: create it from the (sent or approved) quotation.
  // ---------------------------------------------------------------------
  let jobOrderUrl = "";
  await test.step("create the job order from the quotation", async () => {
    await page.goto(quotationUrl);
    await page.getByRole("button", { name: "Create job order" }).click();
    await page.getByLabel("Client PO number").fill(`PO-${RUN_ID}`);
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page).toHaveURL(/\/job-orders\/[0-9a-f-]+$/);
    jobOrderUrl = page.url();
  });

  // ---------------------------------------------------------------------
  // 5. Produce: walk the JO through every stage up to ready_for_delivery.
  //    (delivered → invoiced happens automatically on invoice generation,
  //    invoiced → paid happens automatically on a fully-settling payment
  //    — see the README's Milestone 8 note on this.)
  // ---------------------------------------------------------------------
  await logout(page);
  await login(page, DEMO_USERS.production);

  await test.step("advance for_artwork → artwork_approval → prepress", async () => {
    await page.goto(jobOrderUrl);
    await advanceStage(page); // draft -> for_artwork
    await advanceStage(page); // for_artwork -> artwork_approval

    // artwork_approval -> prepress requires a recorded client approval.
    await page.getByTestId("stage-advance-trigger").click();
    await page.getByLabel("Approved by (client) *").fill("Client Contact");
    await page.getByLabel("Approval date *").fill(new Date().toISOString().slice(0, 10));
    await page.getByTestId("advance-stage-submit").click();
  });

  await test.step("advance through the production stages", async () => {
    const remainingStages = ["materials_ready", "printing", "finishing", "die_cutting", "gluing_assembly"];
    for (let i = 0; i < remainingStages.length; i++) {
      await advanceStage(page);
    }
  });

  await test.step("check off the QC checklist, then advance to packing", async () => {
    // quality_check is entered by the last advanceStage() call above —
    // its checklist is seeded automatically (see QC_CHECKLIST_TEMPLATE).
    const checkboxes = page.getByRole("checkbox");
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      await checkboxes.nth(i).check();
    }
    await advanceStage(page); // quality_check -> packing (server re-checks every item is done)
  });

  await test.step("advance to ready_for_delivery", async () => {
    await advanceStage(page); // packing -> ready_for_delivery
  });

  // ---------------------------------------------------------------------
  // 6. Deliver: schedule a delivery and mark it delivered.
  // ---------------------------------------------------------------------
  await test.step("schedule and mark a delivery, then advance to delivered", async () => {
    await page.getByLabel("Quantity", { exact: true }).fill("2000");
    await page.getByRole("button", { name: "Schedule" }).click();

    await page.getByRole("button", { name: "Mark delivered" }).click();
    await page.getByLabel("Received by *").fill("Client Warehouse");
    await page.getByRole("button", { name: "Mark delivered" }).last().click();

    await advanceStage(page); // ready_for_delivery -> delivered
  });

  // ---------------------------------------------------------------------
  // 7. Invoice: accounting generates the invoice (advances delivered -> invoiced).
  // ---------------------------------------------------------------------
  let invoiceUrl = "";
  await logout(page);
  await login(page, DEMO_USERS.accounting);

  await test.step("generate the invoice", async () => {
    await page.goto("/accounting/invoices");
    await page.getByRole("button", { name: "Generate invoice" }).click();
    await page.getByLabel("Delivered job order *").click();
    await page.getByRole("option", { name: new RegExp(RUN_ID.toString()) }).or(page.getByRole("option")).first().click();
    await page.getByRole("button", { name: "Generate", exact: true }).click();
    await expect(page).toHaveURL(/\/accounting\/invoices\/[0-9a-f-]+$/);
    invoiceUrl = page.url();
  });

  // ---------------------------------------------------------------------
  // 8. Paid: record a payment that fully settles the invoice (advances invoiced -> paid).
  // ---------------------------------------------------------------------
  await test.step("record a full payment", async () => {
    await page.goto(invoiceUrl);
    await page.getByRole("button", { name: "Record payment" }).click();
    // Amount defaults to the full outstanding balance — settling it in one payment.
    await page.getByRole("button", { name: "Record payment" }).last().click();
    await expect(page.getByText(/paid/i).first()).toBeVisible();
  });
});
