import fs from "node:fs";
import path from "node:path";
import {
  resolveInitialRoute,
} from "../../src/app-startup/resolve-initial-destination";

const root = path.resolve(__dirname, "../..");
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");

describe("persistent role navigation ownership", () => {
  test("Guest navigation is mounted once by the public layout", () => {
    const layout = read("app/(public)/_layout.tsx");
    const publicHome = read("src/features/public/components/PublicPageContainer.tsx");

    expect(layout).toContain("<Slot />");
    expect(layout).toContain("<PublicBottomNav />");
    expect(publicHome).not.toContain("PublicBottomNav");
    expect(layout).not.toContain("<Tabs");
  });

  test.each([
    ["app/(patient)/_layout.tsx", ["name=\"index\"", "name=\"sessions\"", "name=\"messages/index\""]],
    ["app/(practitioner)/_layout.tsx", ["name=\"index\"", "name=\"availability/index\"", "name=\"sessions/index\""]],
  ])("keeps %s as a layout-owned native tab shell", (relative, requiredScreens) => {
    const layout = read(relative);

    expect(layout).toContain("<Tabs");
    for (const screen of requiredScreens) {
      expect(layout).toContain(screen);
    }
    expect(layout).not.toContain('tabBarStyle: { display: "none" }');
  });

  test("root auth coordination routes through the owning group", () => {
    const rootEntry = read("app/index.tsx");

    expect(rootEntry).not.toContain("PublicHomeScreen");
    expect(rootEntry).toContain("router.replace(targetRoute as any)");
  });

  test("auth role resolution preserves Guest, Patient, and Practitioner destinations", () => {
    const baseUser = {
      id: "u_1",
      displayName: "Test User",
      status: "ACTIVE" as const,
      roles: [],
      primaryEmail: "test@example.com",
      isEmailVerified: true,
      primaryPhone: null,
      isPhoneVerified: false,
      practitionerProfileId: null,
      practitionerStatus: null,
    };

    expect(resolveInitialRoute({
      authReady: true,
      user: null,
      role: null,
      onboardingState: { status: "completed" },
    })).toEqual({ type: "navigate", route: "/(public)" });

    expect(resolveInitialRoute({
      authReady: true,
      user: { ...baseUser, roles: ["PATIENT"] as any },
      role: "patient",
      onboardingState: { status: "completed" },
    })).toEqual({ type: "navigate", route: "/(patient)" });

    expect(resolveInitialRoute({
      authReady: true,
      user: { ...baseUser, roles: ["PRACTITIONER"] as any },
      role: "practitioner",
      onboardingState: { status: "completed" },
    })).toEqual({ type: "navigate", route: "/(practitioner)" });
  });
});
