import fs from "fs";
import path from "path";
import { lightTheme, darkTheme } from "../../src/constants/theme";
import { resolveMobileRole } from "../../src/features/auth/roles";

describe("Public Mobile Design System Validation", () => {
  const publicHomePath = path.resolve(__dirname, "../../app/(public)/index.tsx");
  const authGatewayPath = path.resolve(__dirname, "../../src/providers/AuthGatewayProvider.tsx");
  const publicLayoutPath = path.resolve(__dirname, "../../app/(public)/_layout.tsx");
  const publicHeroPath = path.resolve(__dirname, "../../src/features/public/components/PublicHero.tsx");
  const publicHeaderPath = path.resolve(__dirname, "../../src/features/public/components/PublicHeader.tsx");
  const publicTrustPath = path.resolve(__dirname, "../../src/features/public/components/PublicTrustRow.tsx");
  const publicPractitionerPath = path.resolve(__dirname, "../../src/features/public/components/PublicPractitionerSignIn.tsx");
  const arLocalePath = path.resolve(__dirname, "../../src/i18n/locales/ar.json");
  const enLocalePath = path.resolve(__dirname, "../../src/i18n/locales/en.json");

  // 1. Prohibit fake specialist counts and metric strings
  it("prohibits fake specialist count statistics in Public Home", () => {
    const content = fs.readFileSync(publicHomePath, "utf8");
    expect(content).not.toContain("١٠٠ مختص");
    expect(content).not.toContain("100 specialists");
    expect(content).not.toContain("specialists available now");
  });

  // 2. Prohibit remote Stitch asset URLs in Public Home code
  it("prohibits remote Stitch asset URLs in Public Home code", () => {
    const content = fs.readFileSync(publicHomePath, "utf8");
    expect(content).not.toContain("lh3.googleusercontent.com");
    expect(content).not.toContain("screen.png");
    expect(content).not.toContain("code.html");
  });

  // 3. Prohibit API practitioner lists from being called inside Public Home
  it("performs zero practitioner result list API calls on Public Home", () => {
    const content = fs.readFileSync(publicHomePath, "utf8");
    expect(content).not.toContain("listPractitioners");
    expect(content).not.toContain("public/practitioners");
    expect(content).not.toContain("public-practitioners");
    expect(content).not.toContain("useQuery");
  });

  // 4. Verification of routes mapping
  it("verifies exact route paths map to repository evidence", () => {
    const contentGateway = fs.readFileSync(authGatewayPath, "utf8");
    const contentHome = fs.readFileSync(publicHomePath, "utf8");
    const contentHeader = fs.readFileSync(publicHeaderPath, "utf8");
    const contentHero = fs.readFileSync(publicHeroPath, "utf8");
    const contentPractitioner = fs.readFileSync(publicPractitionerPath, "utf8");

    // Header Sign In exact path
    expect(contentHeader).toContain("/(auth)");

    // Patient Sign In exact path
    expect(contentGateway).toContain("/(auth)/signin/patient");
    expect(contentHero).toContain("/(auth)/signin/patient");

    // Patient Sign Up exact path
    expect(contentGateway).toContain("/(auth)/signup/patient");
    expect(contentHero).toContain("/(auth)/signup/patient");

    // Practitioner Sign In exact path (minimum foot links)
    expect(contentPractitioner).toContain("/(auth)/signin/practitioner");

    // Prohibit Practitioner signup references
    expect(contentHome).not.toContain("/(auth)/signup/practitioner");
    expect(contentGateway).not.toContain("/(auth)/signup/practitioner");
  });

  // 5. Auth Gateway constraints
  it("verifies Auth Gateway is patient-only and dismissible", () => {
    const content = fs.readFileSync(authGatewayPath, "utf8");

    expect(content).toContain("handleClose");
    expect(content).toContain("Modal");
    expect(content).toContain("onRequestClose");

    expect(content).toContain("Create Patient Account");
    expect(content).toContain("Patient Sign In");
    expect(content).toContain("Continue Browsing");

    expect(content).toContain("إنشاء حساب مريض");
    expect(content).toContain("تسجيل الدخول كمريض");
    expect(content).toContain("متابعة التصفح");

    expect(content).not.toContain("Practitioner Sign Up");
    expect(content).not.toContain("Join as Practitioner");
  });

  // 6. Tab bar configurations
  it("hides unfinished tabs from the public menu", () => {
    const content = fs.readFileSync(publicLayoutPath, "utf8");

    expect(content).toContain('name="practitioners"');
    expect(content).toContain('name="specialties"');
    expect(content).toContain('name="packages"');
    expect(content).toContain('href: null');
  });

  // 7. Public Semantic theme tokens validity
  it("verifies public semantic token configuration", () => {
    expect(lightTheme.public).toBeDefined();
    expect(darkTheme.public).toBeDefined();

    expect(lightTheme.public.canvas).toBe("#F7F4EE");
    expect(lightTheme.public.raisedSurface).toBe("#FFFCF8");
    expect(lightTheme.public.primaryText).toBe("#053f38");
    expect(lightTheme.public.accentSand).toBe("#F4E0C5");

    expect(lightTheme.colors.background).toBe("#F7F4EE");
    expect(lightTheme.colors.primary).toBe("#24564F");
    expect(lightTheme.colors.surfaceRaised).toBe("#FFFFFF");

    expect(darkTheme.colors.background).toBe("#101716");
    expect(darkTheme.colors.primary).toBe("#6de0d8");
  });

  // 8. Onboarding and Auth Routing Logic
  it("verifies routing resolver priorities", () => {
    const mockPatient = {
      id: "p_1",
      displayName: "Patient",
      status: "ACTIVE" as const,
      roles: ["PATIENT" as any],
      primaryEmail: "p@s.com",
      isEmailVerified: true,
      primaryPhone: null,
      isPhoneVerified: false,
      practitionerProfileId: null,
      practitionerStatus: null,
    };
    expect(resolveMobileRole(mockPatient)).toBe("patient");

    const mockPractitioner = {
      ...mockPatient,
      roles: ["PRACTITIONER" as any],
    };
    expect(resolveMobileRole(mockPractitioner)).toBe("practitioner");
  });

  // 9. Public browsing must never trigger Auth Gateway
  it("prohibits browse actions from triggering or importing Auth Gateway", () => {
    const contentHome = fs.readFileSync(publicHomePath, "utf8");
    const contentHero = fs.readFileSync(publicHeroPath, "utf8");
    const contentTrust = fs.readFileSync(publicTrustPath, "utf8");

    expect(contentHome).not.toContain("useAuthGateway");
    expect(contentHome).not.toContain("requireAuth");

    expect(contentHero).not.toContain("useAuthGateway");
    expect(contentHero).not.toContain("requireAuth");

    expect(contentTrust).not.toContain("useAuthGateway");
    expect(contentTrust).not.toContain("requireAuth");
  });

  // 10. Prohibited wording validations
  it("prohibits inaccurate, guaranteed, or unsupported claims in locale and screen files", () => {
    const contentAr = fs.readFileSync(arLocalePath, "utf8");
    const contentEn = fs.readFileSync(enLocalePath, "utf8");
    const contentHome = fs.readFileSync(publicHomePath, "utf8");

    expect(contentHome).not.toContain("integrated therapy journey");
    expect(contentHome).not.toContain("complete therapy journey");

    expect(contentAr).not.toContain("اتصال مشفر بالكامل");
    expect(contentAr).not.toContain("بسرية تامة");
    expect(contentAr).not.toContain("أعلى مستويات الجودة");
    expect(contentEn).not.toContain("End-to-end encrypted");
    expect(contentEn).not.toContain("Highest levels of quality");
  });

  // 11. Guest route guard validations and signOut targets
  it("verifies unauthenticated route guards and logout targets statically", () => {
    const authProviderContent = fs.readFileSync(path.resolve(__dirname, "../../src/providers/AuthProvider.tsx"), "utf8");
    const headerContent = fs.readFileSync(path.resolve(__dirname, "../../src/features/public/components/PublicHeader.tsx"), "utf8");

    expect(authProviderContent).toContain("!inAuthGroup && !inOnboardingGroup && !inPublicGroup");
    expect(authProviderContent).toContain('router.replace("/(public)")');

    expect(authProviderContent).toContain("signOut");
    expect(authProviderContent).toContain('router.replace("/(public)")');

    expect(headerContent).toContain('router.push("/(auth)")');
  });

  // 12. Public Design, RTL direction helper, and i18n copy rules
  it("enforces i18n copy, direction helper usage, and hidden bottom tab bar", () => {
    const contentAr = fs.readFileSync(arLocalePath, "utf8");
    const contentEn = fs.readFileSync(enLocalePath, "utf8");
    const contentHome = fs.readFileSync(publicHomePath, "utf8");
    const contentHero = fs.readFileSync(publicHeroPath, "utf8");
    const contentHeader = fs.readFileSync(publicHeaderPath, "utf8");
    const contentLayout = fs.readFileSync(publicLayoutPath, "utf8");

    // No mixed-language labels inside locale spaces
    expect(contentAr).not.toContain("Explore specialists across different areas");
    expect(contentAr).not.toContain("How it Works");
    expect(contentAr).not.toContain("Discover");

    expect(contentEn).not.toContain("كيف تبدأ؟");
    expect(contentEn).not.toContain("تصفح مختصين");

    // No unsupported claims
    expect(contentAr).not.toContain("رحلة علاجية متكاملة");
    expect(contentAr).not.toContain("آلاف المستفيدين");
    expect(contentAr).not.toContain("مختصين معتمدين");

    expect(contentEn).not.toContain("certified specialists");
    expect(contentEn).not.toContain("integrated support");
    expect(contentEn).not.toContain("thousands of users");
    expect(contentEn).not.toContain("thousands of beneficiaries");

    // Uses centralized direction helper useAppDirection
    expect(contentHeader).toContain("useAppDirection");
    expect(contentHero).toContain("useAppDirection");

    // Hides the bottom tab bar completely
    expect(contentLayout).toContain('display: "none"');

    // No hardcoded English fallbacks in t() calls inside index.tsx
    const tWithSecondArgRegex = /t\(\s*["'`][^"'`]+["'`]\s*,\s*["'`]/g;
    expect(tWithSecondArgRegex.test(contentHome)).toBe(false);
    expect(tWithSecondArgRegex.test(contentHero)).toBe(false);
  });

  // 13. Single Patient CTA section (No duplicated CTA section)
  it("ensures Public Home has exactly 4 compact sections and no duplicate patient CTA section", () => {
    const contentHome = fs.readFileSync(publicHomePath, "utf8");

    expect(contentHome).toContain("PublicHeader");
    expect(contentHome).toContain("PublicHero");
    expect(contentHome).toContain("PublicTrustRow");
    expect(contentHome).toContain("PublicPractitionerSignIn");

    // Prohibit deprecated/removed component names
    expect(contentHome).not.toContain("PublicPatientCta");
    expect(contentHome).not.toContain("PublicSereneVisual");
    expect(contentHome).not.toContain("PublicFeatureCard");
    expect(contentHome).not.toContain("PublicJourney");
    expect(contentHome).not.toContain("PublicDiscoveryCard");
  });
});
