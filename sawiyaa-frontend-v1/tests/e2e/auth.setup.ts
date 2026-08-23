import { expect, test as setup } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const authFile = path.resolve("test-artifacts/auth/practitioner.json");
const captureFile = path.resolve(process.env.E2E_OTP_CAPTURE_PATH ?? "../sawiyaa-backend-v1/.tmp/practitioner-otp-e2e.log");

async function readLatestCode(email: string): Promise<string | null> {
  try {
    const contents = await fs.readFile(captureFile, "utf8");
    const lines = contents.trim().split(/\r?\n/).reverse();
    const line = lines.find((entry) => entry.includes(`target=${email.toLowerCase()}`));
    return line?.match(/\bcode=(\d{4,8})\b/)?.[1] ?? null;
  } catch {
    return null;
  }
}

setup("authenticate practitioner with local OTP sink", async ({ page }) => {
  const email = process.env.E2E_PRACTITIONER_EMAIL;
  const password = process.env.E2E_PRACTITIONER_PASSWORD;
  if (!email || !password) {
    throw new Error("Set E2E_PRACTITIONER_EMAIL and E2E_PRACTITIONER_PASSWORD for local E2E");
  }

  await page.goto("/en/signin/practitioner");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  // The page also renders a Sign In mode tab; target the actual form submit button.
  await page.getByRole("button", { name: /^sign in$/i }).last().click();

  await expect(page.getByRole("group", { name: /verification code/i })).toBeVisible();
  await expect.poll(() => readLatestCode(email), { timeout: 20_000, intervals: [100, 250, 500] }).not.toBeNull();
  const code = await readLatestCode(email);
  if (!code) throw new Error(`No OTP was captured for ${email} in ${captureFile}`);
  const digits = page.getByRole("group", { name: /verification code/i }).locator("input");
  for (const [index, digit] of [...code].entries()) await digits.nth(index).fill(digit);
  await page.getByRole("button", { name: /verify|confirm/i }).click();
  await expect(page).toHaveURL(/\/practitioner\/(availability|dashboard)/, { timeout: 20_000 });
  await page.context().storageState({ path: authFile });
});
