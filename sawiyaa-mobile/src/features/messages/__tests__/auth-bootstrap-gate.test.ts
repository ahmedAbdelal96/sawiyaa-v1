import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../../../..");

describe("unified messages auth bootstrap gate", () => {
  it("does not fetch or join a protected conversation before auth is ready", () => {
    const source = readFileSync(resolve(root, "src/features/messages/hooks.ts"), "utf8");

    expect(source).toContain("const authEnabled = useAuthenticatedQueryEnabled(role);");
    expect(source).toContain("enabled: authEnabled && Boolean(conversationId)");
    expect(source).toContain("if (!authEnabled || !conversationId) return;");
  });
});
