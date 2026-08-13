import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/** Kept in sync with scripts/seed-users.ts — the 8 demo accounts, all sharing one password. */
export const DEMO_PASSWORD = "Llantino2026!";
export const DEMO_USERS = {
  admin: "admin@llantino.ph",
  management: "management@llantino.ph",
  sales: "sales1@llantino.ph",
  production: "production@llantino.ph",
  accounting: "accounting@llantino.ph",
} as const;

export async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

export async function logout(page: Page) {
  // The topbar's user menu — see components/layout/topbar.tsx.
  await page.locator("header").getByRole("button").last().click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
}

/** Opens the current stage's advance dialog and submits it (see stage-stepper.tsx / advance-stage-dialog.tsx). */
export async function advanceStage(page: Page) {
  await page.getByTestId("stage-advance-trigger").click();
  await page.getByTestId("advance-stage-submit").click();
}
