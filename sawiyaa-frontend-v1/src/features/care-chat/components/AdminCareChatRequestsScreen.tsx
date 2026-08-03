"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  CheckCircle2,
  XCircle,
  Eye,
  Search,
  User,
  Calendar,
  Clock,
} from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@/components/ui/data-table";
import AdminOperationalListShell, { AdminSummaryCard } from "@/components/shared/admin/AdminOperationalListShell";
import FilterClearButton from "@/components/ui/filters/FilterClearButton";
import ActionIconButton from "@/components/ui/action-icon-button/ActionIconButton";
import Button from "@/components/ui/button/Button";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { DEFAULT_PAGE_LIMIT } from "@/constants/pagination";
import {
  useAdminCareChatRequests,
  useDecideAdminCareChatRequest,
} from "../hooks/use-care-chat";
import type {
  AdminCareChatRequestItem,
  CareChatDecision,
  CareChatRequestStatus,
} from "../types/care-chat.types";
import { getCareChatErrorKey } from "../lib/care-chat-ui";

type FilterStatus = CareChatRequestStatus | "ALL";

const STATUS_COLOURS: Record<CareChatRequestStatus, { bg: string; text: string; labelAr: string; labelEn: string }> = {
  PENDING: { bg: "bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/30", text: "text-amber-700 dark:text-amber-300", labelAr: "بانتظار الموافقة", labelEn: "Pending" },
  APPROVED: { bg: "bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/30", text: "text-emerald-700 dark:text-emerald-300", labelAr: "مقبول", labelEn: "Approved" },
  REJECTED: { bg: "bg-rose-50 dark:bg-rose-500/15 border-rose-200 dark:border-rose-500/30", text: "text-rose-700 dark:text-rose-300", labelAr: "مرفوض", labelEn: "Rejected" },
  EXPIRED: { bg: "bg-surface-tertiary dark:bg-white/10 border-border-light", text: "text-text-muted", labelAr: "منتهي", labelEn: "Expired" },
  REVOKED: { bg: "bg-surface-tertiary dark:bg-white/10 border-border-light", text: "text-text-muted", labelAr: "ملغي", labelEn: "Revoked" },
  CANCELLED: { bg: "bg-surface-tertiary dark:bg-white/10 border-border-light", text: "text-text-muted", labelAr: "ملغي من المريض", labelEn: "Cancelled" },
};

export default function AdminCareChatRequestsScreen() {
  const t = useTranslations("care-chat");
  const locale = useLocale();
  const isAr = locale === "ar";
  const router = useRouter();

  const [statusFilter, setStatusFilter] = useState<FilterStatus>("PENDING");
  const [searchQuery, setSearchQuery] = useState("");

  // Decision Modal state
  const [activeDecisionModal, setActiveDecisionModal] = useState<{
    request: AdminCareChatRequestItem;
    decision: CareChatDecision;
  } | null>(null);
  const [decisionNote, setDecisionNote] = useState("");

  const params = useMemo(
    () => ({
      page: 1,
      limit: DEFAULT_PAGE_LIMIT,
      status: statusFilter === "ALL" ? undefined : statusFilter,
    }),
    [statusFilter],
  );

  const requestsQuery = useAdminCareChatRequests(params);
  const rawItems: AdminCareChatRequestItem[] = (requestsQuery.data?.items as AdminCareChatRequestItem[]) ?? [];

  // Client-side search filter
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return rawItems;
    const term = searchQuery.toLowerCase().trim();
    return rawItems.filter(
      (item) =>
        item.patient.displayName?.toLowerCase().includes(term) ||
        item.practitioner.displayName?.toLowerCase().includes(term) ||
        item.reason?.toLowerCase().includes(term) ||
        item.relatedSessionId?.toLowerCase().includes(term),
    );
  }, [rawItems, searchQuery]);

  // Decision Hook
  const decideMutation = useDecideAdminCareChatRequest(
    activeDecisionModal?.request.id ?? "",
  );

  const handleExecuteDecision = async () => {
    if (!activeDecisionModal) return;
    try {
      await decideMutation.mutateAsync({
        decision: activeDecisionModal.decision,
        note: decisionNote.trim() || undefined,
      });
      setActiveDecisionModal(null);
      setDecisionNote("");
    } catch {
      // Error handled in UI state
    }
  };

  // Metric counts
  const pendingCount = rawItems.filter((i) => i.status === "PENDING").length;
  const approvedCount = rawItems.filter((i) => i.status === "APPROVED").length;
  const rejectedCount = rawItems.filter((i) => i.status === "REJECTED").length;

  const columns = useMemo<Array<ColumnDef<AdminCareChatRequestItem>>>(
    () => [
      {
        id: "patient",
        header: isAr ? "المريض" : "Patient",
        cell: (row) => (
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary font-bold text-xs dark:bg-primary/20">
              {row.patient.displayName?.charAt(0) || "U"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-text-primary dark:text-white truncate">
                {row.patient.displayName || "مريض"}
              </p>
            </div>
          </div>
        ),
      },
      {
        id: "practitioner",
        header: isAr ? "المختص المستهدف" : "Target Practitioner",
        cell: (row) => (
          <div className="flex items-center gap-2">
            <User size={15} className="text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary dark:text-white truncate">
                {row.practitioner.displayName || "أخصائي"}
              </p>
            </div>
          </div>
        ),
      },
      {
        id: "reason",
        header: isAr ? "سبب الطلب" : "Reason",
        cell: (row) => (
          <div className="max-w-xs">
            <p className="text-xs text-text-secondary leading-relaxed line-clamp-2" title={row.reason ?? ""}>
              {row.reason || (isAr ? "لم يذكر سبب" : "No reason provided")}
            </p>
          </div>
        ),
      },
      {
        id: "relatedSession",
        header: isAr ? "الجلسة المرتبطة" : "Session",
        cell: (row) =>
          row.relatedSessionId ? (
            <span className="inline-flex items-center gap-1 rounded-lg bg-surface-secondary border border-border-light/60 px-2.5 py-1 text-xs font-semibold text-text-secondary dark:bg-white/5">
              <Calendar size={12} className="text-primary" />
              <span>{row.relatedSessionId.slice(0, 8)}...</span>
            </span>
          ) : (
            <span className="text-xs text-text-muted">-</span>
          ),
      },
      {
        id: "requestedAt",
        header: isAr ? "تاريخ الطلب" : "Date",
        cell: (row) => {
          const formatted = new Date(row.requestedAt).toLocaleDateString(isAr ? "ar-EG" : "en-US", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
          return (
            <div className="flex items-center gap-1 text-xs text-text-muted">
              <Clock size={13} />
              <span>{formatted}</span>
            </div>
          );
        },
      },
      {
        id: "status",
        header: isAr ? "الحالة" : "Status",
        cell: (row) => {
          const cfg = STATUS_COLOURS[row.status] || STATUS_COLOURS.PENDING;
          return (
            <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${cfg.bg} ${cfg.text}`}>
              <span>{isAr ? cfg.labelAr : cfg.labelEn}</span>
            </span>
          );
        },
      },
      {
        id: "actions",
        header: isAr ? "الإجراءات" : "Actions",
        cell: (row) => (
          <div className="flex items-center gap-1.5">
            {row.status === "PENDING" ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 font-bold border-emerald-200"
                  onClick={() => setActiveDecisionModal({ request: row, decision: "APPROVE" })}
                >
                  <CheckCircle2 size={14} className="me-1 text-emerald-600" />
                  {isAr ? "موافقة" : "Approve"}
                </Button>

                <Button
                  size="sm"
                  variant="danger"
                  className="font-bold"
                  onClick={() => setActiveDecisionModal({ request: row, decision: "REJECT" })}
                >
                  <XCircle size={14} className="me-1" />
                  {isAr ? "رفض" : "Reject"}
                </Button>
              </>
            ) : null}

            <ActionIconButton
              icon={<Eye size={15} />}
              label={isAr ? "عرض التفاصيل" : "View Details"}
              onClick={() => router.push(`/admin/care-chat/${row.id}` as never)}
            />
          </div>
        ),
      },
    ],
    [isAr, router],
  );

  return (
    <AdminOperationalListShell
      eyebrow={isAr ? "مسار الموافقات الطبية" : "Medical Approvals"}
      title={isAr ? "طلبات وموافقات محادثة الرعاية" : "Care Chat Approvals"}
      description={isAr ? "مراجعة والبت في طلبات فتح قنوات التراسل المباشر بين المرضى والمعالجين" : "Review and decide patient-practitioner care chat requests"}
      summaryCards={
        <>
          <AdminSummaryCard
            label={isAr ? "طلبات بانتظار الموافقة" : "Pending Requests"}
            value={pendingCount}
            hint={isAr ? "طلبات جديدة تتطلب اتخاذ قرار" : "Requires decision"}
            tone="warning"
          />
          <AdminSummaryCard
            label={isAr ? "طلبات تم قبولها" : "Approved Requests"}
            value={approvedCount}
            hint={isAr ? "قنوات محادثة مفتوحة" : "Active chat channels"}
            tone="success"
          />
          <AdminSummaryCard
            label={isAr ? "طلبات مرفوضة" : "Rejected Requests"}
            value={rejectedCount}
            hint={isAr ? "طلبات تم رفضها مسبقاً" : "Rejected requests"}
            tone="danger"
          />
        </>
      }
      filters={
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {(["PENDING", "APPROVED", "REJECTED", "ALL"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                  statusFilter === st
                    ? "bg-primary text-white shadow-xs"
                    : "bg-surface-secondary text-text-secondary hover:bg-primary-light/50 hover:text-primary dark:bg-white/5"
                }`}
              >
                {st === "ALL"
                  ? (isAr ? "الكل" : "All")
                  : isAr
                  ? STATUS_COLOURS[st].labelAr
                  : STATUS_COLOURS[st].labelEn}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? "بحث باسم المريض أو المختص..." : "Search patient or practitioner..."}
                className="w-64 rounded-xl border border-border-light bg-surface-secondary ps-9 pe-3 py-1.5 text-xs text-text-primary outline-none focus:border-primary focus:bg-white dark:bg-white/5 dark:text-white"
              />
            </div>
            {statusFilter !== "PENDING" || searchQuery ? (
              <FilterClearButton
                disabled={false}
                onClick={() => {
                  setStatusFilter("PENDING");
                  setSearchQuery("");
                }}
              />
            ) : null}
          </div>
        </div>
      }
    >
      <DataTable
        data={filteredItems}
        columns={columns}
        getRowId={(row) => row.id}
        loading={requestsQuery.isLoading}
        emptyState={{
          title: isAr ? "لا توجد طلبات محادثة رعاية" : "No Care Chat Requests",
          description: isAr ? "لم يتم العثور على طلبات تتماشى مع الفلاتر المحددة." : "No requests found matching search filters.",
        }}
      />

      {/* Decision Modal */}
      {activeDecisionModal ? (
        <Modal
          isOpen={Boolean(activeDecisionModal)}
          onClose={() => setActiveDecisionModal(null)}
          size="md"
        >
          <ModalHeader
            title={
              activeDecisionModal.decision === "APPROVE"
                ? (isAr ? "قبول طلب محادثة الرعاية 🟢" : "Approve Care Chat Request")
                : (isAr ? "رفض طلب محادثة الرعاية 🔴" : "Reject Care Chat Request")
            }
            description={
              isAr
                ? "سيتم تحديث حالة الطلب وإرسال إشعار للمريض والمعالج."
                : "Request status will be updated and notification sent to patient & practitioner."
            }
          />

          <ModalBody>
            <div className="space-y-4">
              {/* Summary Card */}
              <div className="rounded-2xl border border-border-light/60 bg-surface-secondary p-4 space-y-2 dark:bg-white/5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">{isAr ? "المريض:" : "Patient:"}</span>
                  <span className="font-bold text-text-primary dark:text-white">
                    {activeDecisionModal.request.patient.displayName || "مريض"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">{isAr ? "المختص:" : "Practitioner:"}</span>
                  <span className="font-bold text-text-primary dark:text-white">
                    {activeDecisionModal.request.practitioner.displayName || "أخصائي"}
                  </span>
                </div>
                <div className="border-t border-border-light/50 pt-2 text-xs">
                  <span className="text-text-muted block mb-1">{isAr ? "سبب الطلب:" : "Reason:"}</span>
                  <p className="text-text-secondary italic leading-relaxed">
                    "{activeDecisionModal.request.reason || (isAr ? "لم يذكر سبب" : "No reason")}"
                  </p>
                </div>
              </div>

              {/* Notes Input */}
              <div>
                <label className="block text-xs font-bold text-text-primary dark:text-white mb-1.5">
                  {activeDecisionModal.decision === "REJECT"
                    ? (isAr ? "سبب الرفض وملاحظات الإدارة *" : "Rejection Reason & Notes *")
                    : (isAr ? "ملاحظات الإدارة (اختياري)" : "Admin Notes (Optional)")}
                </label>
                <textarea
                  rows={3}
                  value={decisionNote}
                  onChange={(e) => setDecisionNote(e.target.value)}
                  placeholder={
                    activeDecisionModal.decision === "REJECT"
                      ? (isAr ? "اكتب سبب رفض الطلب ليتم إرساله للمريض..." : "State rejection reason...")
                      : (isAr ? "ملاحظات تنظيمية إن وجدت..." : "Optional admin notes...")
                  }
                  className="w-full rounded-xl border border-border-light bg-white p-3 text-xs text-text-primary outline-none focus:border-primary dark:bg-white/5 dark:text-white"
                />
              </div>

              {decideMutation.isError ? (
                <p className="text-xs text-rose-600 font-semibold">
                  {t(getCareChatErrorKey(decideMutation.error) as Parameters<typeof t>[0])}
                </p>
              ) : null}
            </div>
          </ModalBody>

          <ModalFooter>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveDecisionModal(null)}
              >
                {isAr ? "إلغاء" : "Cancel"}
              </Button>

              <Button
                variant={activeDecisionModal.decision === "REJECT" ? "danger" : "primary"}
                size="sm"
                disabled={
                  decideMutation.isPending ||
                  (activeDecisionModal.decision === "REJECT" && decisionNote.trim().length < 3)
                }
                onClick={handleExecuteDecision}
              >
                {decideMutation.isPending
                  ? (isAr ? "جاري التحديث..." : "Updating...")
                  : activeDecisionModal.decision === "APPROVE"
                  ? (isAr ? "تأكيد الموافقة 🟢" : "Confirm Approval")
                  : (isAr ? "تأكيد الرفض 🔴" : "Confirm Rejection")}
              </Button>
            </div>
          </ModalFooter>
        </Modal>
      ) : null}
    </AdminOperationalListShell>
  );
}
