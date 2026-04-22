"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Drawer, ModalBody, ModalHeader } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { AdminSummaryCard } from "@/components/shared/admin/AdminOperationalListShell";
import { Wallet, UserRound, Mail, Phone, CalendarClock } from "lucide-react";
import type { AdminPatientDetailsItem } from "../types/admin-patients.types";
import {
  useAdminPatientWalletEntries,
  useAdminPatientWalletSummary,
} from "../hooks/use-admin-patient-wallet";
import type { CustomerWalletEntryItem } from "@/features/payments/types/payments.types";

function formatMoney(value: string, currency: string, locale: string) {
  const amount = Number(value ?? 0);
  const safeLocale = locale === "ar" ? "ar-EG" : "en-US";
  return new Intl.NumberFormat(safeLocale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border-light bg-surface-primary px-4 py-3">
      <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-surface-secondary text-text-secondary">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-text-muted">{label}</p>
        <p className="mt-1 truncate text-sm font-medium text-text-primary dark:text-white/95">
          {value}
        </p>
      </div>
    </div>
  );
}

function WalletEntryRow({ entry }: { entry: CustomerWalletEntryItem }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-border-light bg-surface-primary px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-text-primary dark:text-white/95">
          {entry.entryType}
        </p>
        <p className="mt-1 text-xs text-text-muted">{new Date(entry.effectiveAt).toLocaleString()}</p>
      </div>
      <p className="shrink-0 text-sm font-semibold tabular-nums text-text-primary dark:text-white/95">
        {entry.direction === "CREDIT" ? "+" : "-"} {entry.amount} {entry.currencyCode}
      </p>
    </div>
  );
}

export default function AdminPatientDetailsDrawer({
  open,
  onClose,
  patient,
}: {
  open: boolean;
  onClose: () => void;
  patient: AdminPatientDetailsItem | null;
}) {
  const t = useTranslations("admin-patients");
  const locale = useLocale();
  const [walletEntriesPage, setWalletEntriesPage] = useState(1);
  const patientId = patient?.id ?? null;

  const { data: walletSummaryData, isLoading: walletSummaryLoading, isError: walletSummaryError, refetch: refetchWalletSummary } =
    useAdminPatientWalletSummary(patientId, undefined, open);

  const {
    data: walletEntriesData,
    isLoading: walletEntriesLoading,
    isError: walletEntriesError,
    refetch: refetchWalletEntries,
  } = useAdminPatientWalletEntries(
    patientId,
    { page: walletEntriesPage, limit: 6 },
    open,
  );

  const wallet = walletSummaryData?.item ?? null;
  const entries = walletEntriesData?.items ?? [];
  const entriesPagination = walletEntriesData?.pagination;

  const headerTitle = patient?.displayName ?? t("details.unknownName");
  const headerSubtitle = patient?.primaryEmail ?? patient?.primaryPhone ?? patient?.userId ?? "-";

  const walletCards = useMemo(() => {
    if (!wallet) return null;
    const currency = wallet.currencyCode;
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <AdminSummaryCard
          label={t("wallet.available")}
          value={formatMoney(wallet.availableBalance, currency, locale)}
          icon={<Wallet className="h-4 w-4" />}
          tone="primary"
        />
        <AdminSummaryCard
          label={t("wallet.reserved")}
          value={formatMoney(wallet.reservedBalance, currency, locale)}
          icon={<Wallet className="h-4 w-4" />}
          tone="neutral"
        />
      </div>
    );
  }, [locale, t, wallet]);

  return (
    <Drawer
      isOpen={open}
      onClose={onClose}
      side={locale === "ar" ? "left" : "right"}
      ariaLabel={t("details.title")}
      className="w-[420px] sm:w-[520px]"
      inset
      showHandle={false}
    >
      <div className="flex h-full flex-col">
        <ModalHeader
          title={t("details.title")}
          description={t("details.subtitle")}
          eyebrow={t("details.eyebrow")}
        >
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-text-primary dark:text-white/95">
                {headerTitle}
              </p>
              <p className="mt-1 truncate text-xs text-text-muted">{headerSubtitle}</p>
            </div>
            <Button variant="outline" size="sm" onClick={onClose}>
              {t("actions.close")}
            </Button>
          </div>
        </ModalHeader>

        <ModalBody className="space-y-4">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-text-primary dark:text-white/95">
              {t("details.section.profile")}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoRow icon={<UserRound className="h-4 w-4" />} label={t("fields.userId")} value={patient?.userId ?? "-"} />
              <InfoRow icon={<CalendarClock className="h-4 w-4" />} label={t("fields.createdAt")} value={patient?.createdAt ? new Date(patient.createdAt).toLocaleString() : "-"} />
              <InfoRow icon={<Mail className="h-4 w-4" />} label={t("fields.email")} value={patient?.primaryEmail ?? "-"} />
              <InfoRow icon={<Phone className="h-4 w-4" />} label={t("fields.phone")} value={patient?.primaryPhone ?? "-"} />
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-text-primary dark:text-white/95">
                {t("details.section.wallet")}
              </h3>
              {walletSummaryError ? (
                <Button variant="outline" size="sm" onClick={() => refetchWalletSummary()}>
                  {t("actions.retry")}
                </Button>
              ) : null}
            </div>

            {walletSummaryLoading ? (
              <p className="text-sm text-text-muted">{t("states.loading")}</p>
            ) : walletSummaryError ? (
              <p className="text-sm text-text-secondary">{t("states.walletError")}</p>
            ) : wallet ? (
              walletCards
            ) : (
              <p className="text-sm text-text-secondary">{t("states.walletEmpty")}</p>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-text-primary dark:text-white/95">
                {t("details.section.walletActivity")}
              </h3>
              {walletEntriesError ? (
                <Button variant="outline" size="sm" onClick={() => refetchWalletEntries()}>
                  {t("actions.retry")}
                </Button>
              ) : null}
            </div>

            {walletEntriesLoading ? (
              <p className="text-sm text-text-muted">{t("states.loading")}</p>
            ) : walletEntriesError ? (
              <p className="text-sm text-text-secondary">{t("states.walletEntriesError")}</p>
            ) : entries.length > 0 ? (
              <div className="space-y-2">
                {entries.map((entry) => (
                  <WalletEntryRow key={entry.id} entry={entry} />
                ))}
                {entriesPagination && entriesPagination.totalPages > 1 ? (
                  <div className="flex items-center justify-between pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={walletEntriesPage <= 1}
                      onClick={() => setWalletEntriesPage((p) => Math.max(1, p - 1))}
                    >
                      {t("actions.prev")}
                    </Button>
                    <p className="text-xs text-text-muted">
                      {t("wallet.page", {
                        page: entriesPagination.page,
                        total: entriesPagination.totalPages,
                      })}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={walletEntriesPage >= entriesPagination.totalPages}
                      onClick={() =>
                        setWalletEntriesPage((p) => Math.min(entriesPagination.totalPages, p + 1))
                      }
                    >
                      {t("actions.next")}
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-text-secondary">{t("states.walletEntriesEmpty")}</p>
            )}
          </section>
        </ModalBody>
      </div>
    </Drawer>
  );
}
