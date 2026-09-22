import { expect, test as setup } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "../../../sawiyaa-backend-v1/src/generated/prisma/index.js";
import bcrypt from "../../../sawiyaa-backend-v1/node_modules/bcryptjs/index.js";

const authFile = path.resolve("test-artifacts/auth/admin.json");
const prisma = new PrismaClient();
const email = process.env.E2E_ADMIN_EMAIL ?? "phase-c-golden-auth@hesba.local";
const password = process.env.E2E_ADMIN_PASSWORD ?? "PhaseCAdmin@12345";

setup("AUTH-01 real Admin login and storage state", async ({ page }) => {
  const userId = "a0c0f3e1-8d6f-4f43-9e58-4a7f4b9a1d01";
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { id: userId },
    create: {
      id: userId,
      displayName: "Golden E2E Admin",
      status: "ACTIVE",
      emails: { create: { email, isPrimary: true, isVerified: true } },
      roles: { create: { role: "SUPER_ADMIN" } },
      authIdentities: { create: { provider: "PASSWORD", providerSubject: email, passwordHash, isEnabled: true } },
    },
    update: { displayName: "Golden E2E Admin" },
  });
  await prisma.authIdentity.updateMany({ where: { userId, provider: "PASSWORD" }, data: { providerSubject: email, passwordHash, isEnabled: true } });
  await page.goto("/en/signin/admin");
  let loginRequests = 0;
  page.on("request", (request) => { if (request.url().includes("/auth/admin/login")) loginRequests += 1; });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  const response = page.waitForResponse((r) => r.url().includes("/auth/admin/login") && r.request().method() === "POST");
  await page.getByRole("button", { name: /^sign in$/i }).last().click();
  expect((await response).status()).toBe(200);
  await expect(page).not.toHaveURL(/signin\/admin/, { timeout: 15_000 });
  const api = await page.request.get("/api/v1/users/me/permissions");
  expect(api.status()).toBe(200);
  expect(loginRequests).toBe(1);
  await fs.mkdir(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
  await prisma.$disconnect();
});
