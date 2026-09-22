"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { ListStateSkeleton, StateCard } from "@/components/shared/ContentStates";
import { DEFAULT_PAGE_LIMIT } from "@/constants/pagination";
import { getCareChatErrorKey } from "../lib/care-chat-ui";
import {
  useCreatePatientCareChatRequest,
  usePatientCareChatRequests,
} from "../hooks/use-care-chat";
import type {
  CareChatRequestStatus,
  CreateCareChatRequestInput,
} from "../types/care-chat.types";
import CareChatRequestCard from "./CareChatRequestCard";
import {
  ArrowRight,
  BadgeCheck,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Info,
  MessageSquarePlus,
  Send,
  ShieldCheck,
  User,
  Sparkles
} from "lucide-react";

type Props = {
  prefill?: {
    practitionerSlug?: string;
    relatedSessionId?: string;
  };
};

const PATIENT_FILTERS: Array<CareChatRequestStatus | "ALL"> = [
  "ALL",
  "PENDING",
  "APPROVED",
  "REJECTED",
];

function humanizePractitionerSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function PatientCareChatHomeScreen({ prefill }: Props) {
  const t = useTranslations("care-chat");
  const router = useRouter();
  const practitionerSlug = prefill?.practitionerSlug?.trim() ?? "";
  const relatedSessionId = prefill?.relatedSessionId?.trim() ?? "";
  const hasPrefilledPractitioner = practitionerSlug.length > 0;
  const practitionerDisplayName = hasPrefilledPractitioner
    ? humanizePractitionerSlug(practitionerSlug)
    : "";

  const [statusFilter, setStatusFilter] = useState<CareChatRequestStatus | "ALL">("ALL");
  const [form, setForm] = useState<CreateCareChatRequestInput>({
    practitionerSlug,
    relatedSessionId,
    reason: "",
  });

  const params = useMemo(
    () => ({
      page: 1,
      limit: DEFAULT_PAGE_LIMIT,
      status: statusFilter === "ALL" ? undefined : statusFilter,
    }),
    [statusFilter],
  );
  const requests = usePatientCareChatRequests(params);
  const createRequest = useCreatePatientCareChatRequest();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const created = await createRequest.mutateAsync({
      practitionerSlug: form.practitionerSlug.trim(),
      relatedSessionId: form.relatedSessionId?.trim() || undefined,
      reason: form.reason?.trim() || undefined,
    });
    router.push(`/patient/care-chat/${created.item.id}` as never);
  };

  /* ─── Compact view when no practitioner prefilled ─── */
  if (!hasPrefilledPractitioner) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        {/* Page header */}
        <div className="rounded-[28px] border border-border-light/60 bg-gradient-to-br from-primary-light/40 via-white to-surface p-6 shadow-sm dark:from-primary/10 dark:via-surface dark:to-surface">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-md">
              <MessageSquarePlus size={24} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                {t("patient.home.eyebrow")}
              </p>
              <h1 className="text-2xl font-extrabold text-text-primary dark:text-white sm:text-3xl">
                {t("patient.home.title")}
              </h1>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-sm text-text-secondary">
            {t("patient.home.note")}
          </p>
        </div>

        {/* No practitioner selected prompt */}
        <div className="rounded-[28px] border border-border-light bg-white p-6 shadow-sm dark:bg-surface">
          <StateCard
            title={t("patient.create.heading")}
            note={t("patient.home.note")}
            action={{
              label: t("patient.list.states.empty.cta"),
              href: (
                <div className="flex flex-wrap gap-3 pt-2">
                  <Link
                    href="/patient/practitioners"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-primary-hover"
                  >
                    <User size={16} />
                    <span>{t("patientPresentation.chooseSpecialist")}</span>
                  </Link>
                  <Link
                    href="/patient/sessions"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-border-light bg-white px-5 py-3 text-sm font-semibold text-text-primary hover:border-primary/30 dark:bg-white/5 dark:text-white"
                  >
                    <Calendar size={16} strokeWidth={1.75} />
                    <span>{t("patientPresentation.reviewSessions")}</span>
                  </Link>
                </div>
              ),
            }}
            centered={false}
            className="p-0"
          />
        </div>

        {/* Requests History */}
        <RequestsHistorySection
          t={t}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          requests={requests}
        />
      </div>
    );
  }

  /* ─── Main 2-Column Redesigned Layout ─── */
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      {/* Top Header Banner */}
      <div className="rounded-[28px] border border-border-light/60 bg-gradient-to-br from-primary-light/50 via-white to-surface p-6 shadow-sm dark:from-primary/10 dark:via-surface dark:to-surface">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-md">
              <MessageSquarePlus size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                  {t("patientPresentation.eyebrow")}
                </span>
              </div>
              <h1 className="text-xl font-extrabold text-text-primary dark:text-white sm:text-2xl mt-0.5">
                {t("patientPresentation.requestTitle")}
              </h1>
            </div>
          </div>

          <Link
            href={`/patient/practitioners/${practitionerSlug}` as never}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border-light bg-white px-4 py-2.5 text-sm font-semibold text-text-primary shadow-xs transition hover:border-primary/40 hover:text-primary dark:border-white/15 dark:bg-white/5 dark:text-white"
          >
            <ArrowRight size={16} className="rtl:rotate-180" />
            <span>{t("patientPresentation.backToProfile")}</span>
          </Link>
        </div>
      </div>

      {/* 2-Column Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] lg:items-start">
        {/* ── Left Column: Form & Practitioner Card ── */}
        <div className="space-y-6">
          {/* Target Practitioner Info Card */}
          <div className="rounded-[28px] border border-primary/20 bg-white p-5 shadow-sm dark:bg-surface">
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary mb-3">
              {t("patientPresentation.targetLabel")}
            </p>

            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary font-bold text-lg dark:bg-primary/20">
                <User size={28} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-text-primary dark:text-white">
                    {practitionerDisplayName}
                  </h3>
                  <BadgeCheck size={18} className="text-primary shrink-0" />
                </div>
                <p className="text-xs text-text-secondary mt-0.5">
                  {t("patientPresentation.specialistType")}
                </p>
                {relatedSessionId ? (
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-surface-secondary px-2.5 py-1 text-xs font-semibold text-text-secondary border border-border-light/60 dark:bg-white/5">
                    <Calendar size={13} className="text-primary" />
                  <span>{t("patientPresentation.relatedSession", { id: relatedSessionId })}</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Form Card */}
          <div className="rounded-[28px] border border-border-light bg-white p-6 shadow-sm dark:bg-surface space-y-5">
            <div className="border-b border-border-light/50 pb-4 dark:border-white/10">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-primary" />
                <h2 className="text-base font-bold text-text-primary dark:text-white">
                  {t("patientPresentation.reasonHeading")}
                </h2>
              </div>
              <p className="mt-1 text-xs text-text-secondary leading-relaxed">
                {t("patientPresentation.reasonHelp")}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-text-primary dark:text-white/90 mb-2">
                  {t("patientPresentation.reasonLabel")} <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={form.reason ?? ""}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reason: event.target.value,
                    }))
                  }
                  placeholder={t("patientPresentation.reasonPlaceholder")}
                  className="w-full rounded-2xl border border-border-light bg-surface-secondary/50 p-4 text-sm text-text-primary outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 dark:bg-white/5 dark:text-white dark:focus:border-primary"
                />
              </div>

              {/* Steps Info Callout */}
              <div className="rounded-2xl border border-primary/15 bg-primary-light/30 p-4 dark:bg-primary/10 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-primary">
                  <Sparkles size={15} />
                  <span>{t("patientPresentation.stepsHeading")}</span>
                </div>
                <ul className="text-xs text-text-secondary space-y-1.5 list-disc list-inside">
                  <li>{t("patientPresentation.stepOne")}</li>
                  <li>{t("patientPresentation.stepTwo")}</li>
                </ul>
              </div>

              {createRequest.isError ? (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300">
                  {t(getCareChatErrorKey(createRequest.error) as Parameters<typeof t>[0])}
                </div>
              ) : null}

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border-light/50 dark:border-white/10">
                <Link
                  href="/patient/sessions"
                  className="text-xs font-semibold text-text-muted hover:text-primary transition"
                >
                  {t("patientPresentation.reviewPrevious")} 📅
                </Link>

                <button
                  type="submit"
                  disabled={createRequest.isPending || (form.reason?.trim().length ?? 0) < 3}
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3 text-sm font-bold text-white shadow-md transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send size={16} />
                  <span>
                    {createRequest.isPending
                      ? t("patientPresentation.submitting")
                      : t("patientPresentation.submit")}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ── Right Column: Requests History ── */}
        <RequestsHistorySection
          t={t}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          requests={requests}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Requests History Section
───────────────────────────────────────────── */
function RequestsHistorySection({
  t,
  statusFilter,
  setStatusFilter,
  requests,
}: {
  t: any;
  statusFilter: CareChatRequestStatus | "ALL";
  setStatusFilter: (v: CareChatRequestStatus | "ALL") => void;
  requests: any;
}) {
  return (
    <div className="rounded-[28px] border border-border-light bg-white p-5 shadow-sm dark:bg-surface space-y-4">
      <div className="flex items-center justify-between border-b border-border-light/50 pb-3 dark:border-white/10">
        <div>
          <h2 className="text-base font-bold text-text-primary dark:text-white">
            {t("patientPresentation.historyHeading")}
          </h2>
          <p className="text-xs text-text-muted mt-0.5">{t("patientPresentation.historyNote")}</p>
        </div>
        <span className="rounded-full bg-surface-secondary border border-border-light/60 px-3 py-1 text-xs font-bold text-primary dark:bg-white/5">
          {requests.data ? t("patientPresentation.requestCount", { count: requests.data.pagination.totalItems }) : "..."}
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {PATIENT_FILTERS.map((status) => {
          const isActive = statusFilter === status;
          return (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                isActive
                  ? "bg-primary text-white shadow-xs"
                  : "bg-surface-secondary text-text-secondary hover:bg-primary-light/50 hover:text-primary dark:bg-white/5"
              }`}
            >
              {status === "ALL"
                ? t("patientPresentation.filters.all")
                : status === "PENDING"
                ? t("patientPresentation.filters.pending")
                : status === "APPROVED"
                ? t("patientPresentation.filters.approved")
                : t("patientPresentation.filters.rejected")}
            </button>
          );
        })}
      </div>

      {/* Results */}
      {requests.isLoading ? (
        <div className="py-4">
          <ListStateSkeleton items={2} heightClass="h-20" />
        </div>
      ) : requests.isError ? (
        <div className="py-4 text-center">
          <StateCard
            title={t("patientPresentation.historyErrorTitle")}
            note={t("patientPresentation.historyErrorNote")}
            action={{
              label: t("patientPresentation.retry"),
              onClick: () => requests.refetch(),
            }}
          />
        </div>
      ) : requests.data && requests.data.items.length > 0 ? (
        <div className="space-y-3 pt-1">
          {requests.data.items.map((item: Parameters<typeof CareChatRequestCard>[0]["item"]) => (
            <CareChatRequestCard
              key={item.id}
              item={item}
              href={`/patient/care-chat/${item.id}`}
              viewer="patient"
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border-light/70 p-6 text-center text-xs text-text-muted">
          {t("patientPresentation.noPrevious")}
        </div>
      )}
    </div>
  );
}
