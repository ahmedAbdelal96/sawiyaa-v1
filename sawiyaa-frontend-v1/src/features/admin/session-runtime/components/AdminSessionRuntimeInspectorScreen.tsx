"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Activity, ArrowLeft, Database, MonitorPlay } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  ListStateSkeleton,
  StateCard,
} from "@/components/shared/ContentStates";
import { resolveEffectiveViewerTimeZone } from "@/lib/time-formatting";
import { PermissionKey } from "@/lib/auth/permissions";
import {
  useCurrentUser,
  useCurrentUserPermissions,
} from "@/features/users/hooks/use-users";
import { getAdminSessionAttendanceErrorKey } from "../lib/admin-session-runtime-errors";
import {
  canWriteRuntimeInspector,
  normalizeRuntimeInspectorTab,
  RUNTIME_INSPECTOR_TABS,
  type RuntimeInspectorTab,
} from "../lib/runtime-inspector-state";
import { RuntimeViewerTimeZoneProvider } from "../lib/runtime-time";
import {
  useAdminSessionAttendance,
  useAdminSessionRuntimeInspection,
} from "../hooks/use-admin-session-runtime";
import { useAdminSessionManualDecisions } from "../hooks/use-admin-session-manual-decisions";
import AdminSessionInspectorEvidenceFlagsPanel from "./AdminSessionInspectorEvidenceFlagsPanel";
import AdminSessionInspectorOverlapCard from "./AdminSessionInspectorOverlapCard";
import AdminSessionInspectorRawEvidence from "./AdminSessionInspectorRawEvidence";
import AdminSessionInspectorRoleCard from "./AdminSessionInspectorRoleCard";
import AdminSessionRoomCloseEvidencePanel from "./AdminSessionRoomCloseEvidencePanel";
import AdminSessionInspectorTimeline from "./AdminSessionInspectorTimeline";
import AdminSessionManualDecisionHistory from "./AdminSessionManualDecisionHistory";
import AdminSessionPackageEntitlementPanel from "./AdminSessionPackageEntitlementPanel";
import AdminSessionManualDecisionPanel from "./AdminSessionManualDecisionPanel";
import AdminSessionRuntimeSummary from "./AdminSessionRuntimeSummary";
import AdminSessionEvidenceSummary from "./AdminSessionEvidenceSummary";
import AdminSessionReference from "@/components/shared/admin/AdminSessionReference";

export default function AdminSessionRuntimeInspectorScreen({
  initialSessionId,
}: {
  initialSessionId?: string;
}) {
  const t = useTranslations("admin-session-runtime");
  const searchParams = useSearchParams();
  const submittedId = initialSessionId?.trim() ?? "";
  const [activeTab, setActiveTab] = useState<RuntimeInspectorTab>(() =>
    normalizeRuntimeInspectorTab(searchParams.get("tab")),
  );

  const inspection = useAdminSessionRuntimeInspection(submittedId);
  const attendance = useAdminSessionAttendance(submittedId);
  const decisions = useAdminSessionManualDecisions(submittedId);
  const currentUser = useCurrentUser(true);
  const permissions = useCurrentUserPermissions(true);
  const viewerTimeZone = resolveEffectiveViewerTimeZone(
    currentUser.data?.timezone,
  );
  const hasWritePermission = canWriteRuntimeInspector(
    permissions.data?.permissions,
    permissions.isLoading || permissions.isError,
  );
  const decisionItems = decisions.data?.items ?? [];
  const latestFinal =
    decisionItems.find((decision: { isFinal: boolean }) => decision.isFinal) ??
    null;
  const item = inspection.data?.item;
  const extended = attendance.data?.extendedSummary ?? null;
  const timeline = attendance.data?.timeline ?? [];
  const evidenceTimeline = attendance.data?.evidenceTimeline ?? [];
  const participants =
    item?.participants ?? attendance.data?.participants ?? null;
  const patientName = participants?.patient.displayName ?? null;
  const practitionerName = participants?.practitioner.displayName ?? null;
  const relatedSupportTickets = item?.relatedSupportTickets ?? [];

  const changeTab = (tab: RuntimeInspectorTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    if (tab === "overview") params.delete("tab");
    else params.set("tab", tab);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${params.toString() ? `?${params}` : ""}`,
    );
  };

  const handleTabKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    const direction =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!direction && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? RUNTIME_INSPECTOR_TABS.length - 1
          : (index + direction + RUNTIME_INSPECTOR_TABS.length) %
            RUNTIME_INSPECTOR_TABS.length;
    changeTab(RUNTIME_INSPECTOR_TABS[nextIndex]);
    document
      .getElementById(`runtime-tab-${RUNTIME_INSPECTOR_TABS[nextIndex]}`)
      ?.focus();
  };

  const isLoading = inspection.isLoading || attendance.isLoading;
  const isError = inspection.isError || attendance.isError;
  const content = !submittedId ? (
    <div className="space-y-3">
      <StateCard
        icon={<MonitorPlay className="text-primary h-5 w-5" />}
        title={t("states.empty.heading")}
        note={t("states.empty.note")}
        className="rounded-[28px] p-8"
      />
      <Link
        href="/admin/sessions"
        className="border-border-light text-text-secondary hover:border-primary/30 hover:text-primary mx-auto inline-flex rounded-full border px-4 py-2 text-xs font-semibold transition"
      >
        {t("inspector.header.backToSessions")}
      </Link>
    </div>
  ) : isLoading ? (
    <ListStateSkeleton items={3} heightClass="h-28" />
  ) : isError ? (
    <StateCard
      icon={<Activity className="text-primary h-5 w-5" />}
      title={t("states.error.heading")}
      note={t(
        getAdminSessionAttendanceErrorKey(
          attendance.error ?? inspection.error,
        ) as Parameters<typeof t>[0],
      )}
      action={{
        label: t("states.error.retry"),
        onClick: () => {
          inspection.refetch();
          attendance.refetch();
        },
      }}
      className="rounded-[28px]"
    />
  ) : !item ? (
    <StateCard
      icon={<MonitorPlay className="text-primary h-5 w-5" />}
      title={t("states.notFound.heading")}
      note={t("states.notFound.note")}
      className="rounded-[28px] p-8"
    />
  ) : (
    <div className="space-y-5">
      <AdminSessionRuntimeSummary
        item={item}
        extended={extended}
        patientName={patientName}
        practitionerName={practitionerName}
      />
      <nav
        className="app-panel rounded-[24px] p-2"
        aria-label={t("inspector.tabs.label")}
        role="tablist"
      >
        <div className="flex flex-wrap gap-1">
          {RUNTIME_INSPECTOR_TABS.map((tab, index) => (
            <button
              key={tab}
              id={`runtime-tab-${tab}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={`runtime-panel-${tab}`}
              tabIndex={activeTab === tab ? 0 : -1}
              onClick={() => changeTab(tab)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              className={`rounded-2xl px-3 py-2 text-xs font-semibold transition ${activeTab === tab ? "bg-primary text-white" : "text-text-secondary hover:bg-surface-tertiary dark:hover:bg-white/10"}`}
            >
              {t(`inspector.tabs.${tab}` as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>
      </nav>
      {extended && activeTab === "overview" ? (
        <div id="runtime-panel-overview" role="tabpanel" className="space-y-5">
          <AdminSessionEvidenceSummary item={item} extended={extended} />
        </div>
      ) : null}
      {extended && activeTab === "attendance" ? (
        <div
          id="runtime-panel-attendance"
          role="tabpanel"
          className="space-y-5"
        >
          <AdminSessionInspectorEvidenceFlagsPanel
            evidence={extended.evidence}
          />
          <AdminSessionInspectorTimeline
            events={timeline}
            evidenceTimeline={evidenceTimeline}
            hasEvidenceTimeline={evidenceTimeline.length > 0}
          />
          <div className="grid gap-5 md:grid-cols-2">
            <AdminSessionInspectorRoleCard
              role="patient"
              summary={extended.patient}
            />
            <AdminSessionInspectorRoleCard
              role="practitioner"
              summary={extended.practitioner}
            />
          </div>
          <AdminSessionInspectorOverlapCard
            overlap={extended.overlap}
            meeting={extended.meeting}
          />
        </div>
      ) : null}
      {activeTab === "package" ? (
        <div id="runtime-panel-package" role="tabpanel" className="space-y-5">
          {item.packagePurchase ? (
            <AdminSessionPackageEntitlementPanel
              item={item}
              hasWritePermission={hasWritePermission}
            />
          ) : (
            <StateCard
              icon={<Database className="text-primary h-5 w-5" />}
              title={t("inspector.summary.noPackage")}
              note={t("inspector.summary.noPackageNote")}
              className="rounded-[28px]"
            />
          )}
        </div>
      ) : null}
      {activeTab === "decisions" ? (
        <div id="runtime-panel-decisions" role="tabpanel" className="space-y-5">
          <AdminSessionEvidenceSummary item={item} extended={extended} />
          <AdminSessionManualDecisionPanel
            sessionId={item.id}
            hasWritePermission={hasWritePermission}
            hasExistingFinal={latestFinal !== null}
            latestFinalDecision={latestFinal}
          />
          <AdminSessionManualDecisionHistory sessionId={item.id} />
        </div>
      ) : null}
      {activeTab === "support" ? (
        <div id="runtime-panel-support" role="tabpanel">
          <AdminSessionRoomCloseEvidencePanel
            videoRoomClose={
              attendance.data?.videoRoomClose ?? item.videoRoomClose
            }
            relatedSupportTickets={
              attendance.data?.relatedSupportTickets ?? relatedSupportTickets
            }
          />
        </div>
      ) : null}
      {activeTab === "diagnostics" ? (
        <div
          id="runtime-panel-diagnostics"
          role="tabpanel"
          className="space-y-5"
        >
          <section className="app-panel rounded-[28px] p-5 sm:p-6">
            <h2 className="text-text-primary text-base font-semibold dark:text-white/95">
              {t("inspector.diagnostics.title")}
            </h2>
            <p className="text-text-secondary mt-1 text-sm">
              {t("inspector.diagnostics.subtitle")}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Diagnostic
                label={t("inspector.diagnostics.internalId")}
                value={item.id}
              />
              <Diagnostic
                label={t("fields.providerRoomId")}
                value={item.providerRoomId ?? t("inspector.notAvailable")}
              />
              <Diagnostic
                label={t("fields.providerSessionRef")}
                value={item.providerSessionRef ?? t("inspector.notAvailable")}
              />
              <Diagnostic
                label={t("inspector.diagnostics.blockedReason")}
                value={
                  item.blockedReason
                    ? t(
                        `blockedReasons.${item.blockedReason}` as Parameters<
                          typeof t
                        >[0],
                      )
                    : t("inspector.notAvailable")
                }
              />
            </div>
          </section>
          {attendance.data ? (
            <AdminSessionInspectorRawEvidence data={attendance.data} />
          ) : null}
        </div>
      ) : null}
    </div>
  );

  return (
    <RuntimeViewerTimeZoneProvider timeZone={viewerTimeZone}>
      <div className="space-y-6">
        <section className="app-panel rounded-[24px] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-text-primary text-2xl font-semibold tracking-tight sm:text-3xl dark:text-white/95">
                {t("inspector.page.title")}
              </h1>
              <p className="text-text-secondary mt-1 max-w-2xl text-sm leading-6">
                {t("inspector.page.subtitle")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {item ? (
                <AdminSessionReference
                  sessionId={item.id}
                  sessionCode={item.sessionCode}
                  copyable
                  variant="detail"
                />
              ) : null}
              <Link
                href="/admin/sessions"
                className="border-border-light text-text-secondary hover:border-primary/30 hover:text-primary inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition"
                aria-label={t("inspector.header.backToSessions")}
              >
                <ArrowLeft
                  className="h-3.5 w-3.5 rtl:rotate-180"
                  aria-hidden="true"
                />
                {t("inspector.header.backToSessions")}
              </Link>
            </div>
          </div>
        </section>
        {content}
      </div>
    </RuntimeViewerTimeZoneProvider>
  );
}

function Diagnostic({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border-light rounded-2xl border p-3 dark:border-white/8">
      <p className="text-text-muted text-[11px] font-semibold tracking-[0.14em] uppercase">
        {label}
      </p>
      <p className="text-text-primary mt-1 font-mono text-xs break-all dark:text-white/90">
        {value}
      </p>
    </div>
  );
}
