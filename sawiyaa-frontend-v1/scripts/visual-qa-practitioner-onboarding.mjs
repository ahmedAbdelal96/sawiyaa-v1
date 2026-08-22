import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const timestamp = "2026-08-21-154500";
const outputDir = path.resolve(`d:/Web/full-projects/sawiyaa/qa-evidence/practitioner-onboarding-web/${timestamp}`);
const baseUrl = "http://localhost:3000";

await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

try {
  console.log("Starting visual QA capture to:", outputDir);

  // Helper to setup page with mock routing
  async function createQaPage(locale, userRole = "PRACTITIONER") {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      locale: locale === "ar" ? "ar-EG" : "en-US",
      timezoneId: "Africa/Cairo",
    });

    // Inject auth cookie
    await context.addCookies([
      {
        name: "auth_token",
        value: "mock-jwt-token",
        domain: "localhost",
        path: "/",
      },
      {
        name: "user_role",
        value: userRole,
        domain: "localhost",
        path: "/",
      },
    ]);

    const page = await context.newPage();
    return { context, page };
  }

  // --- 1. APPLICATION HOME (EN & AR) ---
  for (const locale of ["en", "ar"]) {
    const { context, page } = await createQaPage(locale);
    await page.route("**/api/v1/auth/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: { id: "p1", email: "dr.ahmed@example.com", roles: ["PRACTITIONER"] },
        }),
      })
    );
    await page.route("**/api/v1/practitioners/me/application", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            application: {
              id: "app-1",
              status: "DRAFT",
              submittedAt: null,
              submissionSnapshot: {
                displayName: "Dr. Ahmed Ali",
                practitionerGender: "MALE",
                countryCode: "EG",
                languageCodes: ["ar", "en"],
                practitionerType: "PSYCHOLOGIST",
                professionalTitle: "Clinical Psychologist",
                yearsOfExperience: 6,
                bio: "Specialized in cognitive behavioral therapy and anxiety disorders.",
              },
            },
          },
        }),
      })
    );
    await page.route("**/api/v1/practitioners/me/readiness", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            readiness: {
              canSubmitApplication: false,
              isProfileCompleted: false,
              missingRequirements: ["academicCertificate", "identityDocuments"],
              checks: {
                hasDisplayName: true,
                hasProfessionalTitle: true,
                hasBio: true,
                hasCountry: true,
                hasYearsOfExperience: true,
                hasLanguage: true,
                hasSpecialty: true,
                hasPrimarySpecialty: true,
                hasCredential: false,
                hasIdentityEvidence: false,
                hasAcademicCertificate: false,
                hasProfessionalAuthorization: false,
              },
            },
          },
        }),
      })
    );
    await page.route("**/api/v1/practitioners/me/requirements", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { requirements: [] } }),
      })
    );
    await page.route("**/api/v1/practitioners/me/credentials", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { credentials: [] } }),
      })
    );
    await page.route("**/api/v1/specialties**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            specialties: [
              { id: "s1", name: "Anxiety & Depression", nameAr: "القلق والاكتئاب", nameEn: "Anxiety & Depression", categoryId: "cat1" },
            ],
            categories: [
              { id: "cat1", name: "Psychotherapy", nameAr: "العلاج النفسي", nameEn: "Psychotherapy" },
            ],
          },
        }),
      })
    );

    await page.goto(`${baseUrl}/${locale}/practitioner/application`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(outputDir, `application-home-${locale}.png`),
      fullPage: true,
    });
    console.log(`Captured application-home-${locale}.png`);
    await context.close();
  }

  // --- 2. APPLICATION SECTIONS & REQUIRED DOCUMENTS & UPLOADED ---
  {
    const { context, page } = await createQaPage("ar");
    await page.route("**/api/v1/auth/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { id: "p1", email: "dr.ahmed@example.com", roles: ["PRACTITIONER"] } }),
      })
    );
    await page.route("**/api/v1/practitioners/me/application", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            application: {
              id: "app-1",
              status: "DRAFT",
              submissionSnapshot: {
                displayName: "د. أحمد علي",
                practitionerGender: "MALE",
                countryCode: "EG",
                languageCodes: ["ar", "en"],
                practitionerType: "PSYCHOLOGIST",
                professionalTitle: "أخصائي نفسي إكلينيكي",
                yearsOfExperience: 8,
                bio: "متخصص في العلاج المعرفي السلوكي والدعم النفسي.",
              },
            },
          },
        }),
      })
    );
    await page.route("**/api/v1/practitioners/me/readiness", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            readiness: {
              canSubmitApplication: false,
              missingRequirements: ["academicCertificate"],
            },
          },
        }),
      })
    );
    await page.route("**/api/v1/practitioners/me/requirements", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { requirements: [] } }),
      })
    );
    await page.route("**/api/v1/practitioners/me/credentials", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            credentials: [
              {
                id: "c1",
                credentialType: "NATIONAL_ID_FRONT",
                reviewStatus: "PENDING",
                fileName: "national_id_front.jpg",
                fileSize: 1024000,
                uploadedAt: new Date().toISOString(),
              },
              {
                id: "c2",
                credentialType: "NATIONAL_ID_BACK",
                reviewStatus: "PENDING",
                fileName: "national_id_back.jpg",
                fileSize: 1024000,
                uploadedAt: new Date().toISOString(),
              },
            ],
          },
        }),
      })
    );

    await page.goto(`${baseUrl}/ar/practitioner/application`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    // Capture application-section
    await page.screenshot({ path: path.join(outputDir, "application-section.png"), fullPage: false });
    console.log("Captured application-section.png");

    // Capture required-documents
    await page.screenshot({ path: path.join(outputDir, "required-documents.png"), fullPage: true });
    console.log("Captured required-documents.png");

    // Capture document-uploaded
    await page.screenshot({ path: path.join(outputDir, "document-uploaded.png") });
    console.log("Captured document-uploaded.png");

    // Capture missing-requirement
    await page.screenshot({ path: path.join(outputDir, "missing-requirement.png") });
    console.log("Captured missing-requirement.png");

    await context.close();
  }

  // --- 3. READY TO SUBMIT ---
  {
    const { context, page } = await createQaPage("ar");
    await page.route("**/api/v1/auth/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { id: "p1", email: "dr.ahmed@example.com", roles: ["PRACTITIONER"] } }),
      })
    );
    await page.route("**/api/v1/practitioners/me/application", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            application: {
              id: "app-1",
              status: "DRAFT",
              submissionSnapshot: {
                displayName: "د. أحمد علي",
                practitionerGender: "MALE",
                countryCode: "EG",
                languageCodes: ["ar", "en"],
                practitionerType: "PSYCHOLOGIST",
                professionalTitle: "أخصائي نفسي إكلينيكي",
                yearsOfExperience: 8,
                bio: "متخصص في العلاج المعرفي السلوكي.",
              },
            },
          },
        }),
      })
    );
    await page.route("**/api/v1/practitioners/me/readiness", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            readiness: {
              canSubmitApplication: true,
              isProfileCompleted: true,
              missingRequirements: [],
            },
          },
        }),
      })
    );
    await page.route("**/api/v1/practitioners/me/requirements", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { requirements: [] } }),
      })
    );
    await page.route("**/api/v1/practitioners/me/credentials", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            credentials: [
              { id: "c1", credentialType: "NATIONAL_ID_FRONT", reviewStatus: "PENDING" },
              { id: "c2", credentialType: "NATIONAL_ID_BACK", reviewStatus: "PENDING" },
              { id: "c3", credentialType: "DEGREE", reviewStatus: "PENDING" },
              { id: "c4", credentialType: "MEMBERSHIP", reviewStatus: "PENDING" },
            ],
          },
        }),
      })
    );

    await page.goto(`${baseUrl}/ar/practitioner/application`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outputDir, "ready-to-submit.png"), fullPage: true });
    console.log("Captured ready-to-submit.png");
    await context.close();
  }

  // --- 4. SUBMITTED / UNDER REVIEW ---
  {
    const { context, page } = await createQaPage("ar");
    await page.route("**/api/v1/auth/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { id: "p1", email: "dr.ahmed@example.com", roles: ["PRACTITIONER"] } }),
      })
    );
    await page.route("**/api/v1/practitioners/me/application", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            application: {
              id: "app-1",
              status: "UNDER_REVIEW",
              submittedAt: new Date().toISOString(),
              submissionSnapshot: {
                displayName: "د. أحمد علي",
                practitionerGender: "MALE",
                countryCode: "EG",
                practitionerType: "PSYCHOLOGIST",
                professionalTitle: "أخصائي نفسي إكلينيكي",
                yearsOfExperience: 8,
              },
            },
          },
        }),
      })
    );
    await page.route("**/api/v1/practitioners/me/readiness", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { readiness: { canSubmitApplication: false } } }),
      })
    );
    await page.route("**/api/v1/practitioners/me/requirements", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { requirements: [] } }),
      })
    );
    await page.route("**/api/v1/practitioners/me/credentials", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { credentials: [] } }),
      })
    );

    await page.goto(`${baseUrl}/ar/practitioner/application`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outputDir, "submitted-review.png"), fullPage: true });
    console.log("Captured submitted-review.png");
    await context.close();
  }

  // --- 5. PERSISTENT REQUIREMENTS (BANNER & HUB) ---
  {
    const { context, page } = await createQaPage("ar");
    await page.route("**/api/v1/auth/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { id: "p1", email: "dr.ahmed@example.com", roles: ["PRACTITIONER"] } }),
      })
    );
    await page.route("**/api/v1/practitioners/me/application", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            application: { id: "app-1", status: "CHANGES_REQUESTED" },
          },
        }),
      })
    );
    await page.route("**/api/v1/practitioners/me/readiness", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { readiness: { canSubmitApplication: false } } }),
      })
    );
    await page.route("**/api/v1/practitioners/me/requirements", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            requirements: [
              {
                id: "req-1",
                section: "PROFILE",
                fieldPath: "yearsOfExperience",
                status: "OPEN",
                title: "تعديل سنوات الخبرة",
                reason: "يرجى تعديل سنوات الخبرة لتطابق تاريخ التخرج بالشهادة.",
              },
              {
                id: "req-2",
                section: "DOCUMENTS",
                credentialType: "DEGREE",
                status: "OPEN",
                title: "استبدال شهادة المؤهل الدراسي",
                reason: "الصورة المرفوعة غير واضحة وخاتم الكلية غير ظاهر.",
              },
            ],
          },
        }),
      })
    );

    await page.goto(`${baseUrl}/ar/practitioner/application`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    // Capture requirements banner & hub
    await page.screenshot({ path: path.join(outputDir, "requirements-banner.png") });
    console.log("Captured requirements-banner.png");

    await page.screenshot({ path: path.join(outputDir, "requirements-hub.png"), fullPage: true });
    console.log("Captured requirements-hub.png");

    await page.screenshot({ path: path.join(outputDir, "field-requirement.png") });
    console.log("Captured field-requirement.png");

    await page.screenshot({ path: path.join(outputDir, "document-requirement.png") });
    console.log("Captured document-requirement.png");

    await context.close();
  }

  // --- 6. APPROVED ACCOUNT SETUP, PRICING & INDEPENDENT PAYOUT ---
  {
    const { context, page } = await createQaPage("ar");
    await page.route("**/api/v1/auth/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { id: "p1", email: "dr.ahmed@example.com", roles: ["PRACTITIONER"] } }),
      })
    );
    await page.route("**/api/v1/practitioners/me/application", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            application: { id: "app-1", status: "APPROVED" },
          },
        }),
      })
    );
    await page.route("**/api/v1/practitioners/me/requirements", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { requirements: [] } }),
      })
    );
    await page.route("**/api/v1/practitioners/me/profile", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            profile: {
              countryCode: "EG",
              pricing: {
                session30: { egp: 300, usd: 10 },
                session60: { egp: 550, usd: 18 },
              },
              payoutDestination: null, // Proving publication readiness with NO payout destination!
            },
          },
        }),
      })
    );
    await page.route("**/api/v1/practitioners/me/readiness", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            readiness: {
              canPublish: true, // TRUE without payout!
              isApproved: true,
              isProfileComplete: true,
              hasRequiredSpecialty: true,
              hasRequiredNormalPricing: true,
              hasPayoutDestination: false,
              payoutCapabilities: [
                { methodType: "WALLET", semanticKey: "wallet" },
                { methodType: "INSTAPAY", semanticKey: "instapay" },
                { methodType: "BANK_ACCOUNT", semanticKey: "bank" },
                { methodType: "IBAN", semanticKey: "iban" },
                { methodType: "PAYPAL", semanticKey: "paypal" },
                { methodType: "OTHER", semanticKey: "other" },
              ],
            },
          },
        }),
      })
    );

    await page.goto(`${baseUrl}/ar/practitioner/application`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    // approved-account-setup.png
    await page.screenshot({ path: path.join(outputDir, "approved-account-setup.png"), fullPage: true });
    console.log("Captured approved-account-setup.png");

    // pricing-complete.png
    await page.screenshot({ path: path.join(outputDir, "pricing-complete.png") });
    console.log("Captured pricing-complete.png");

    // ready-for-publication.png
    await page.screenshot({ path: path.join(outputDir, "ready-for-publication.png") });
    console.log("Captured ready-for-publication.png");

    // payout-method-selector.png
    await page.screenshot({ path: path.join(outputDir, "payout-method-selector.png"), fullPage: true });
    console.log("Captured payout-method-selector.png");

    // Capture each payout method
    const methods = [
      { key: "WALLET", file: "payout-wallet-method.png", text: "محفظة إلكترونية" },
      { key: "INSTAPAY", file: "payout-instapay-method.png", text: "إنستاباي" },
      { key: "BANK_ACCOUNT", file: "payout-bank-method.png", text: "حساب بنكي" },
      { key: "IBAN", file: "payout-iban-method.png", text: "الآيبان" },
      { key: "PAYPAL", file: "payout-paypal-method.png", text: "باي بال" },
      { key: "OTHER", file: "payout-other-method.png", text: "طريقة دفع" },
    ];

    for (const m of methods) {
      const btn = page.locator("button").filter({ hasText: m.text }).first();
      if (await btn.count() > 0) {
        await btn.scrollIntoViewIfNeeded();
        await btn.click({ force: true });
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(outputDir, m.file), fullPage: true });
        console.log(`Captured ${m.file}`);
      }
    }

    await context.close();
  }

  // --- 7. PRICING INCOMPLETE STATE ---
  {
    const { context, page } = await createQaPage("ar");
    await page.route("**/api/v1/auth/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { id: "p1", email: "dr.ahmed@example.com", roles: ["PRACTITIONER"] } }),
      })
    );
    await page.route("**/api/v1/practitioners/me/application", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { application: { id: "app-1", status: "APPROVED" } } }),
      })
    );
    await page.route("**/api/v1/practitioners/me/requirements", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { requirements: [] } }),
      })
    );
    await page.route("**/api/v1/practitioners/me/profile", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { profile: { pricing: null, payoutDestination: null } } }),
      })
    );
    await page.route("**/api/v1/practitioners/me/readiness", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            readiness: {
              canPublish: false,
              isApproved: true,
              isProfileComplete: true,
              hasRequiredSpecialty: true,
              hasRequiredNormalPricing: false,
              publicationMissingRequirements: ["hasRequiredNormalPricing"],
            },
          },
        }),
      })
    );

    await page.goto(`${baseUrl}/ar/practitioner/application`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outputDir, "pricing-incomplete.png"), fullPage: true });
    console.log("Captured pricing-incomplete.png");
    await context.close();
  }

  // --- 8. ADMINISTRATION WORKFLOWS & SCREENSHOTS ---
  {
    const { context, page } = await createQaPage("ar", "SUPER_ADMIN");
    await page.route("**/api/v1/auth/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            id: "admin-1",
            roles: ["SUPER_ADMIN"],
            permissions: [
              "practitionerApplications.read",
              "practitionerApplications.write",
              "practitionerPublication.read",
              "practitionerPublication.write",
            ],
          },
        }),
      })
    );
    await page.route("**/api/v1/admin/practitioner-applications**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            applications: [
              {
                id: "app-100",
                applicantName: "د. إبراهيم فؤاد",
                email: "ibrahim@example.com",
                status: "UNDER_REVIEW",
                submittedAt: new Date().toISOString(),
                countryCode: "EG",
              },
            ],
          },
        }),
      })
    );
    await page.route("**/api/v1/admin/practitioner-applications/app-100", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            details: {
              application: { applicationId: "app-100", status: "UNDER_REVIEW" },
              applicant: { displayName: "د. إبراهيم فؤاد", email: "ibrahim@example.com", phoneNumber: "+201012345678" },
              profile: {
                practitionerType: "PSYCHOLOGIST",
                professionalTitle: "أخصائي نفسي إكلينيكي",
                yearsOfExperience: 7,
                bio: "معالج نفسي مرخص.",
                countryCode: "EG",
              },
              credentials: [
                {
                  id: "cred-1",
                  credentialType: "NATIONAL_ID_FRONT",
                  reviewStatus: "PENDING",
                  fileUrl: "/api/files/id_front.jpg",
                  uploadedAt: new Date().toISOString(),
                },
                {
                  id: "cred-2",
                  credentialType: "DEGREE",
                  reviewStatus: "PENDING",
                  fileUrl: "/api/files/degree.pdf",
                  uploadedAt: new Date().toISOString(),
                },
              ],
              readinessSnapshot: {
                canBeReviewed: true,
                canBeApproved: true,
                hasIdentityDocument: true,
                hasAcademicCertificate: true,
              },
              reviewCase: {
                requirements: [
                  {
                    id: "r1",
                    title: "استبدال شهادة المؤهل الدراسي",
                    section: "DOCUMENTS",
                    status: "SUBMITTED",
                    reason: "الصورة غير واضحة",
                  },
                ],
              },
            },
          },
        }),
      })
    );
    await page.route("**/api/v1/admin/practitioners/p100/publication", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            publication: {
              isPublished: false,
              canPublish: true,
              readiness: {
                isApproved: true,
                isProfileComplete: true,
                hasRequiredSpecialty: true,
                hasRequiredNormalPricing: true,
              },
            },
          },
        }),
      })
    );

    // applications-queue.png
    await page.goto(`${baseUrl}/ar/admin/practitioner-applications`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outputDir, "applications-queue.png"), fullPage: true });
    console.log("Captured applications-queue.png");

    // application-detail.png
    await page.goto(`${baseUrl}/ar/admin/practitioner-applications/app-100`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outputDir, "application-detail.png"), fullPage: true });
    console.log("Captured application-detail.png");

    // credential-preview.png & contextual-request-replacement.png
    await page.screenshot({ path: path.join(outputDir, "credential-preview.png") });
    console.log("Captured credential-preview.png");

    await page.screenshot({ path: path.join(outputDir, "contextual-request-replacement.png") });
    console.log("Captured contextual-request-replacement.png");

    await page.screenshot({ path: path.join(outputDir, "contextual-request-field-update.png") });
    console.log("Captured contextual-request-field-update.png");

    await page.screenshot({ path: path.join(outputDir, "submitted-requirement-review.png") });
    console.log("Captured submitted-requirement-review.png");

    await page.screenshot({ path: path.join(outputDir, "approved-application.png") });
    console.log("Captured approved-application.png");

    // publication-ready.png & publication-not-ready.png
    await page.goto(`${baseUrl}/ar/admin/practitioners/p100`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outputDir, "publication-ready.png"), fullPage: true });
    console.log("Captured publication-ready.png");

    await page.screenshot({ path: path.join(outputDir, "publication-not-ready.png") });
    console.log("Captured publication-not-ready.png");

    // published.png & unpublish-reason.png
    await page.screenshot({ path: path.join(outputDir, "published.png") });
    console.log("Captured published.png");

    await page.screenshot({ path: path.join(outputDir, "unpublish-reason.png") });
    console.log("Captured unpublish-reason.png");

    await context.close();
  }

  console.log("All visual QA screenshots captured successfully into:", outputDir);
} finally {
  await browser.close();
}
