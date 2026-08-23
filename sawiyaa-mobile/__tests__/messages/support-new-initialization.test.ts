import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createMobileUuid } from "../../src/lib/mobile-uuid";

jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(() => "00000000-0000-4000-8000-000000000000"),
}));

const root = resolve(__dirname, "../..");

describe("support-new native initialization", () => {
  it("uses the Expo UUID helper for both role-specific screens", () => {
    const screens = [
      "app/(patient)/support/new.tsx",
      "app/(practitioner)/support/new.tsx",
    ].map((file) => readFileSync(resolve(root, file), "utf8"));

    for (const source of screens) {
      expect(source).toContain("useState(createMobileUuid)");
      expect(source).not.toContain("crypto.randomUUID");
      expect(source).not.toContain("globalThis.crypto");
      expect(source).not.toContain("window.crypto");
    }
  });

  it("sends the backend support category contract for both role-specific screens", () => {
    const screens = [
      "app/(patient)/support/new.tsx",
      "app/(practitioner)/support/new.tsx",
    ].map((file) => readFileSync(resolve(root, file), "utf8"));

    for (const source of screens) {
      expect(source).toContain("normalizeSupportTicketCategory");
      expect(source).toContain("category,");
    }

    const api = readFileSync(resolve(root, "src/features/messages/api.ts"), "utf8");
    expect(api).toContain('category: payload.category ?? "GENERAL"');
  });

  it("generates the initialization ID when browser crypto is absent", () => {
    const previousCrypto = (globalThis as { crypto?: unknown }).crypto;
    try {
      delete (globalThis as { crypto?: unknown }).crypto;
      expect(createMobileUuid()).toBe("00000000-0000-4000-8000-000000000000");
    } finally {
      (globalThis as { crypto?: unknown }).crypto = previousCrypto;
    }
  });
});
