import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const arPath = path.join(root, "src/i18n/locales/ar.json");
const enPath = path.join(root, "src/i18n/locales/en.json");

const academyFiles = [
  "src/features/patient/academy/components/AcademyBrowseScreen.tsx",
  "src/features/patient/academy/components/AcademyDetailScreen.tsx",
  "src/features/patient/academy/components/AcademyEnrollmentCreateScreen.tsx",
  "src/features/patient/academy/components/AcademyEnrollmentDetailScreen.tsx",
  "src/features/patient/academy/components/AcademyEnrollmentPaymentReturnScreen.tsx",
  "src/features/patient/academy/display.ts",
  "src/features/patient/academy/navigation.ts",
  "app/(patient)/academy/index.tsx",
  "app/(patient)/academy/[slug].tsx",
  "app/(patient)/academy/enroll/[slug].tsx",
  "app/(patient)/academy/enrollments/[id].tsx",
  "app/(patient)/academy/enrollments/[id]/payment-return.tsx",
];

const pluralSuffixes = ["zero", "one", "two", "few", "many", "other"];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function fail(message) {
  throw new Error(message);
}

function getNodeByPath(obj, segments) {
  let current = obj;
  for (const segment of segments) {
    if (!current || typeof current !== "object" || !(segment in current)) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

function hasTranslationPath(obj, pathSegments) {
  const exact = getNodeByPath(obj, pathSegments);
  if (typeof exact === "string") {
    return true;
  }

  const parent = getNodeByPath(obj, pathSegments.slice(0, -1));
  if (!parent || typeof parent !== "object") {
    return false;
  }

  const leaf = pathSegments[pathSegments.length - 1];
  return pluralSuffixes.some(
    (suffix) => typeof parent[`${leaf}_${suffix}`] === "string",
  );
}

function collectLeafValues(node, values = []) {
  if (!node || typeof node !== "object") {
    return values;
  }

  for (const value of Object.values(node)) {
    if (typeof value === "string") {
      values.push(value);
      continue;
    }

    collectLeafValues(value, values);
  }

  return values;
}

function collectAcademyKeys() {
  const keys = new Set();
  const patterns = [
    /academyMobile\.[A-Za-z0-9_${}.:-]+/g,
    /academy\.[A-Za-z0-9_${}.:-]+/g,
  ];

  for (const relativeFile of academyFiles) {
    const filePath = path.join(root, relativeFile);
    const text = fs.readFileSync(filePath, "utf8");
    for (const pattern of patterns) {
      for (const match of text.matchAll(pattern)) {
        keys.add(match[0]);
      }
    }
  }

  return [...keys].sort();
}

const ar = readJson(arPath);
const en = readJson(enPath);
const arAcademyMobile = ar.academyMobile;
const enAcademyMobile = en.academyMobile;
const arAcademy = ar.academy;
const enAcademy = en.academy;

if (!arAcademyMobile || !enAcademyMobile || !arAcademy || !enAcademy) {
  fail("Missing academy or academyMobile root in ar/en translations.");
}

const requiredPaths = [
  "academyMobile.title",
  "academyMobile.loading",
  "academyMobile.errorTitle",
  "academyMobile.errorMessage",
  "academyMobile.emptyTitle",
  "academyMobile.emptyDescription",
  "academyMobile.sectionTitle",
  "academyMobile.sectionSubtitle",
  "academyMobile.resultsCount",
  "academyMobile.loadingMore",
  "academyMobile.endOfList",
  "academyMobile.loadMoreErrorTitle",
  "academyMobile.loadMoreErrorSubtitle",
  "academyMobile.free",
  "academyMobile.durationDays",
  "academyMobile.lectureCount",
  "academyMobile.viewDetails",
  "academyMobile.paid",
  "academyMobile.available",
  "academyMobile.card.accessibilityLabel",
  "academy.detail.title",
  "academy.detail.loading",
  "academy.detail.errorTitle",
  "academy.detail.errorMessage",
  "academy.detail.retry",
  "academy.detail.notFoundTitle",
  "academy.detail.notFoundDescription",
  "academy.detail.backToAcademy",
  "academy.detail.free",
  "academy.detail.paid",
  "academy.detail.available",
  "academy.detail.lectures",
  "academy.detail.durationDays",
  "academy.detail.descriptionTitle",
  "academy.detail.descriptionSubtitle",
  "academy.detail.scheduleTitle",
  "academy.detail.scheduleSubtitle",
  "academy.detail.unnamedLesson",
  "academy.detail.enrollTitle",
  "academy.detail.enrollSubtitle",
  "academy.detail.form.fullName",
  "academy.detail.form.fullNamePlaceholder",
  "academy.detail.form.phone",
  "academy.detail.form.phonePlaceholder",
  "academy.detail.form.whatsapp",
  "academy.detail.form.whatsappPlaceholder",
  "academy.detail.form.whatsappHelp",
  "academy.detail.form.email",
  "academy.detail.form.emailPlaceholder",
  "academy.detail.submitting",
  "academy.detail.registerFree",
  "academy.detail.subscribeNow",
  "academy.detail.formValidation",
  "academy.detail.minutes",
  "academy.enrollment.title",
  "academy.enrollment.loading",
  "academy.enrollment.errorTitle",
  "academy.enrollment.errorMessage",
  "academy.enrollment.retry",
  "academy.enrollment.notFoundTitle",
  "academy.enrollment.notFoundDescription",
  "academy.enrollment.back",
  "academy.enrollment.course",
  "academy.enrollment.registeredAt",
  "academy.enrollment.learner",
  "academy.enrollment.phone",
  "academy.enrollment.reference",
  "academy.enrollment.paymentTitle",
  "academy.enrollment.paymentSubtitle",
  "academy.enrollment.pendingPaymentTitle",
  "academy.enrollment.pendingPaymentSubtitle",
  "academy.enrollment.pendingPaymentHelp",
  "academy.enrollment.amount",
  "academy.enrollment.paymentStatusLabel",
  "academy.enrollment.payNow",
  "academy.enrollment.paymentUnsupported",
  "academy.enrollment.paymentReturnTitle",
  "academy.enrollment.paymentReturnPendingTitle",
  "academy.enrollment.paymentReturnPendingSubtitle",
  "academy.enrollment.paymentReturnProcessingSubtitle",
  "academy.enrollment.paymentReturnProcessingNote",
  "academy.enrollment.paymentReturnVerifyingTitle",
  "academy.enrollment.paymentReturnVerifyingSubtitle",
  "academy.enrollment.paymentReturnSuccessTitle",
  "academy.enrollment.paymentReturnSuccessSubtitle",
  "academy.enrollment.paymentReturnSuccessActionsTitle",
  "academy.enrollment.paymentReturnSuccessActionsSubtitle",
  "academy.enrollment.paymentReturnFailedTitle",
  "academy.enrollment.paymentReturnFailedSubtitle",
  "academy.enrollment.paymentReturnExpiredTitle",
  "academy.enrollment.paymentReturnExpiredSubtitle",
  "academy.enrollment.paymentReturnUnavailableTitle",
  "academy.enrollment.paymentReturnUnavailableSubtitle",
  "academy.enrollment.paymentReturnOpenFailedTitle",
  "academy.enrollment.paymentReturnOpenFailedSubtitle",
  "academy.enrollment.paymentReturnCancelledTitle",
  "academy.enrollment.paymentReturnCancelledSubtitle",
  "academy.enrollment.paymentReturnSupportNote",
  "academy.enrollment.paymentReturnCompletePayment",
  "academy.enrollment.paymentReturnCheckAgain",
  "academy.enrollment.paymentReturnOpenProgram",
  "academy.enrollment.paymentReturnViewEnrollment",
  "academy.enrollment.joinTitle",
  "academy.enrollment.joinSubtitle",
  "academy.enrollment.openMeeting",
  "academy.enrollment.openGroup",
  "academy.enrollment.paymentStatuses.CREATED",
  "academy.enrollment.paymentStatuses.PENDING",
  "academy.enrollment.paymentStatuses.REQUIRES_ACTION",
  "academy.enrollment.paymentStatuses.AUTHORIZED",
  "academy.enrollment.paymentStatuses.CAPTURED",
  "academy.enrollment.paymentStatuses.FAILED",
  "academy.enrollment.paymentStatuses.CANCELLED",
  "academy.enrollment.paymentStatuses.EXPIRED",
  "academy.enrollment.paymentStatuses.UNKNOWN",
  "academy.enrollment.accessLockedReasons.PAYMENT_PENDING",
  "academy.enrollment.accessLockedReasons.PAYMENT_FAILED",
  "academy.enrollment.accessLockedReasons.ENROLLMENT_CANCELLED",
  "academy.enrollment.accessLockedReasons.ENROLLMENT_REFUNDED",
  "academy.enrollment.accessLockedReasons.ACCESS_NOT_AVAILABLE",
  "academy.enrollment.accessLockedReasons.DEFAULT",
];

for (const pathKey of requiredPaths) {
  if (!hasTranslationPath(ar, pathKey.split("."))) {
    fail(`Missing ar translation key: ${pathKey}`);
  }
  if (!hasTranslationPath(en, pathKey.split("."))) {
    fail(`Missing en translation key: ${pathKey}`);
  }
}

const arAcademyValues = collectLeafValues(arAcademyMobile).concat(
  collectLeafValues(arAcademy),
);
const bannedLiteralPatterns = [
  /Published/i,
  /Draft/i,
  /Visibility/i,
  /Â·/,
  /Ã‚Â·/,
  /linked sessions/i,
  /payment window/i,
  /mismatch/i,
  /أكملي/,
  /\?\?\?\?/,
];

const bannedValue = arAcademyValues.find((value) =>
  bannedLiteralPatterns.some((pattern) => pattern.test(value)),
);

if (bannedValue) {
  fail(
    `Found a banned academy translation value in Arabic copy: ${bannedValue}`,
  );
}

if (
  typeof arAcademyMobile.published === "string" ||
  typeof arAcademyMobile.draft === "string"
) {
  fail(
    "academyMobile should not expose raw Published/Draft labels to patients.",
  );
}

if (
  typeof enAcademyMobile.published === "string" ||
  typeof enAcademyMobile.draft === "string"
) {
  fail(
    "academyMobile should not expose raw Published/Draft labels to patients.",
  );
}

const sourceValues = academyFiles.map((relativeFile) =>
  fs.readFileSync(path.join(root, relativeFile), "utf8"),
);
const sourceText = sourceValues.join("\n");

const bannedSourcePatterns = [
  't("retry", "Try again")',
  't("retry", "Retry")',
  "Published",
  "Draft",
  "Visibility",
  "Â·",
];

for (const pattern of bannedSourcePatterns) {
  if (sourceText.includes(pattern)) {
    fail(`Found a banned academy source fallback or raw label: ${pattern}`);
  }
}

if (sourceText.includes("Found. Redirecting to")) {
  fail("Found a banned academy redirect body text in source code.");
}

const navigationSource = fs.readFileSync(
  path.join(
    root,
    "src/features/patient/academy/navigation.ts",
  ),
  "utf8",
);

if (!navigationSource.includes("window.location.origin")) {
  fail(
    "Academy payment return base must use the current web window.location.origin.",
  );
}

if (navigationSource.includes("http://localhost:3000")) {
  fail("Academy payment navigation must not hardcode localhost:3000.");
}

const browseSource = fs.readFileSync(
  path.join(
    root,
    "src/features/patient/academy/components/AcademyBrowseScreen.tsx",
  ),
  "utf8",
);
const detailSource = fs.readFileSync(
  path.join(
    root,
    "src/features/patient/academy/components/AcademyDetailScreen.tsx",
  ),
  "utf8",
);
const enrollmentCreateSource = fs.readFileSync(
  path.join(
    root,
    "src/features/patient/academy/components/AcademyEnrollmentCreateScreen.tsx",
  ),
  "utf8",
);
const paymentReturnSource = fs.readFileSync(
  path.join(
    root,
    "src/features/patient/academy/components/AcademyEnrollmentPaymentReturnScreen.tsx",
  ),
  "utf8",
);
const enrollmentDetailSource = fs.readFileSync(
  path.join(
    root,
    "src/features/patient/academy/components/AcademyEnrollmentDetailScreen.tsx",
  ),
  "utf8",
);

for (const [name, source] of [
  ["browse", browseSource],
  ["detail", detailSource],
  ["enrollment-create", enrollmentCreateSource],
]) {
  if (
    source.includes("height: 140") ||
    source.includes("height: 88") ||
    source.includes("coverPlaceholder")
  ) {
    fail(`Found a legacy oversized academy cover block in ${name} screen.`);
  }
}

if (
  detailSource.includes("Input") ||
  detailSource.includes("useCreatePublicAcademyEnrollment")
) {
  fail("Academy detail screen should not include the enrollment form anymore.");
}

if (
  !enrollmentCreateSource.includes("Input") ||
  !enrollmentCreateSource.includes("useCreatePublicAcademyEnrollment")
) {
  fail("Academy enrollment create screen is missing the enrollment form flow.");
}

if (!enrollmentCreateSource.includes("payment-return")) {
  fail(
    "Academy enrollment create screen must route paid enrollments to the payment-return flow.",
  );
}

if (
  enrollmentCreateSource.includes("payment?.checkoutUrl") ||
  enrollmentCreateSource.includes("payment.checkoutUrl")
) {
  fail(
    "Academy enrollment create screen must not depend on cached checkout URLs for navigation.",
  );
}

if (enrollmentCreateSource.includes('launch: "1"')) {
  fail(
    "Academy enrollment create screen must not auto-open checkout from the initial navigation.",
  );
}

if (enrollmentDetailSource.includes("publicAccessToken")) {
  fail(
    "Academy enrollment detail should not expose the public access token in patient UI.",
  );
}

if (
  enrollmentDetailSource.includes(
    "joinAccess.meetingUrl || enrollment.joinAccess.whatsappGroupUrl",
  ) ||
  enrollmentDetailSource.includes("enrollment.joinAccess.meetingUrl") ||
  enrollmentDetailSource.includes("enrollment.joinAccess.whatsappGroupUrl")
) {
  fail(
    "Academy enrollment detail should not render join actions from raw URLs without backend access flags.",
  );
}

if (
  !enrollmentDetailSource.includes("joinAccess?.canAccessSession") ||
  !enrollmentDetailSource.includes("joinAccess?.canAccessGroup")
) {
  fail(
    "Academy enrollment detail must respect backend access flags before rendering access actions.",
  );
}

if (
  enrollmentDetailSource.includes("payment?.checkoutUrl") ||
  enrollmentDetailSource.includes("payment.checkoutUrl")
) {
  fail(
    "Academy enrollment detail must not open cached payment checkout URLs directly.",
  );
}

if (!paymentReturnSource.includes("window.location.assign(")) {
  fail(
    "Academy payment-return screen should use same-tab web navigation instead of popup checkout.",
  );
}

if (
  !paymentReturnSource.includes("buildAcademyEnrollmentPaymentRedirectUrl") ||
  paymentReturnSource.includes("payment?.checkoutUrl") ||
  paymentReturnSource.includes("payment.checkoutUrl")
) {
  fail(
    "Academy payment-return screen must open the backend redirect endpoint instead of a cached checkout URL.",
  );
}

if (
  paymentReturnSource.includes("window.open(") ||
  paymentReturnSource.includes("Popup window was blocked") ||
  paymentReturnSource.includes("launchRequested")
) {
  fail(
    "Academy payment-return screen must not expose popup-based checkout behavior or raw browser popup errors.",
  );
}

if (
  paymentReturnSource.includes("useEffect(() => {\n    void handleCompletePayment()") ||
  paymentReturnSource.includes("useEffect(() => {\n      void handleCompletePayment()") ||
  paymentReturnSource.includes("useEffect(() => {\n    handleCompletePayment()") ||
  paymentReturnSource.includes("useEffect(() => {\n      handleCompletePayment()")
) {
  fail(
    "Academy payment-return screen must not auto-open checkout from an effect or polling callback.",
  );
}

const usedKeys = collectAcademyKeys();
const missing = [];

for (const key of usedKeys) {
  if (!hasTranslationPath(ar, key.split("."))) {
    missing.push(`ar:${key}`);
  }
  if (!hasTranslationPath(en, key.split("."))) {
    missing.push(`en:${key}`);
  }
}

if (missing.length > 0) {
  fail(`Missing academy translation keys: ${missing.join(", ")}`);
}

console.log(
  `[validate-academy-translations] ok, ${usedKeys.length} keys checked.`,
);
