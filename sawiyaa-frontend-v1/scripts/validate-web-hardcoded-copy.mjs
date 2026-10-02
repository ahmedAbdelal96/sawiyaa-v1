import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targets = [
  "src/features/care-chat/components/PatientCareChatHomeScreen.tsx",
  "src/features/care-chat/components/PatientCareChatRequestScreen.tsx",
  "src/components/shared/chat/messages-workspace/NewSupportRequestModal.tsx",
  "src/features/moderation/components/ChatModerationReportAction.tsx",
  "src/features/practitioners/components/PractitionerProfileForm.tsx",
  "src/features/sessions/components/PatientSessionReviewCard.tsx",
  "src/features/package-plans/components/PackagePurchaseFlowModal.tsx",
  "src/components/ui/data-table/DataTable.tsx",
  "src/components/ui/data-table/DataTableExport.tsx",
  "src/components/ui/data-table/DataTablePagination.tsx",
  "src/app/[locale]/(auth)/_components/AuthAppHeader.tsx",
  "src/app/[locale]/(auth)/_components/AuthThemeToggle.tsx",
  "src/features/practitioners-discovery/components/PractitionerCard.tsx",
  "src/features/practitioners-discovery/components/FilterControls.tsx",
  "src/features/practitioner-profile/components/ProfileBookingPanel.tsx",
  "src/features/practitioner-profile/components/ProfileHeader.tsx",
  "src/features/practitioner-profile/components/ProfileInstantActionCard.tsx",
  "src/features/practitioner-profile/components/PublicAvailabilityViewer.tsx",
  "src/features/articles-public/components/PatientArticlesIndexScreen.tsx",
  "src/features/assessments/components/PatientAssessmentDefinitionScreen.tsx",
  "src/features/assessments/components/PatientAssessmentResultScreen.tsx",
  "src/features/notifications/lib/notification-visual-mapper.tsx",
  "src/features/instant-booking/components/InstantBookingModal.tsx",
  "src/features/instant-booking/components/InstantBookingRequestCard.tsx",
  "src/features/instant-booking/components/PractitionerInstantBookingRequestsScreen.tsx",
  "src/features/instant-booking/components/PractitionerPendingRequestsPanel.tsx",
  "src/features/sessions/components/PatientSessionsPanel.tsx",
  "src/features/sessions/components/PatientSessionDetailPanel.tsx",
  "src/features/sessions/components/PractitionerSessionDetailPanel.tsx",
  "src/features/sessions/components/UpcomingSessionCard.tsx",
  "src/features/chat/components/SessionChatPanel.tsx",
  "src/features/support/components/PatientSupportHomeScreen.tsx",
  "src/features/support/components/PatientSupportTicketScreen.tsx",
  "src/features/support/components/PractitionerSupportHomeScreen.tsx",
  "src/features/support/components/PractitionerSupportTicketScreen.tsx",
  "src/features/financial-operations/components/PractitionerWalletSummaryScreen.tsx",
  "src/features/financial-operations/components/PractitionerSettlementsListScreen.tsx",
  "src/features/financial-operations/components/PractitionerLedgerListScreen.tsx",
];
const forbidden = [
  /Price unavailable/,
  /aria-label=["']Pagination["']/,
  /aria-label=["']Toggle theme["']/,
  /Rate \$\{val\} stars/,
  /<span>اختر مختصاً لتقديم طلب<\/span>/,
  /<span>مراجعة الجلسات<\/span>/,
  /<span>العودة لملف المختص<\/span>/,
  /<span>العودة لطلبات محادثة الرعاية<\/span>/,
  /Waiting for Dr\./,
  /(?:^|["'])Dr\.\s*\$\{/,
  /(?:^|["'])د\.\s*\$\{/,
  /Ledger filters|Settlement ID|Search settlement|Transactions Log/,
  /Session Communication & Operations|Internal Admin Notes/,
  /تم إنشاء الجلسة/,
];
const failures = [];
for (const relative of targets) {
  const content = fs.readFileSync(path.join(root, relative), "utf8");
  for (const pattern of forbidden) if (pattern.test(content)) failures.push(`${relative}: ${pattern}`);
}
if (failures.length) {
  console.error("Reachable Web hardcoded-copy validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("Reachable Web hardcoded-copy validation passed.");
