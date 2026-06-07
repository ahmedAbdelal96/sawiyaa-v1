import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Header,
  LoadingState,
  Screen,
  StatusBadge,
  Text,
} from "../../src/components/ui";
import { useTheme } from "../../src/providers/ThemeProvider";
import {
  MOBILE_HORIZONTAL_PADDING,
  MOBILE_SECTION_GAP,
} from "../../src/components/mobile-shell";
import {
  usePatientPayments,
  usePatientWalletEntries,
  usePatientWalletSummary,
} from "../../src/features/patient/payments/hooks";
import { resolveSupportedCurrencyCode } from "../../src/lib/currency";
import type {
  CustomerWalletEntryItem,
  CustomerWalletEntryType,
  PaymentItem,
  PaymentStatus,
} from "../../src/features/patient/payments/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Money formatter — outputs "1,350 EGP" (EN) or "1,350 ج.م" (AR).
 * Uses simple digit grouping without Intl.NumberFormat (unreliable in Hermes).
 * locale can be "en", "ar", "ar-SA", etc.
 */
function formatMoney(amount: string, currencyCode: string, locale = "en"): string {
  const num = Number(amount);
  if (!Number.isFinite(num)) return `${amount} ${currencyCode.toUpperCase()}`;
  const rounded = parseFloat(num.toFixed(2));
  const fixed = rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(2);
  const isArabic = locale.startsWith("ar");
  const withCommas = fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const currencyLabel = isArabic
    ? currencyCode === "EGP" ? "ج.م" : currencyCode.toUpperCase()
    : currencyCode.toUpperCase();
  return `${withCommas} ${currencyLabel}`;
}

function formatDate(isoString: string, locale: string): string {
  return new Date(isoString).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function resolveRelevantDate(payment: PaymentItem): {
  labelKey: string;
  iso: string;
} {
  if (payment.paidAt) return { labelKey: "dateLabels.paidOn", iso: payment.paidAt };
  if (payment.refundedAt) return { labelKey: "dateLabels.refundedOn", iso: payment.refundedAt };
  if (payment.failedAt) return { labelKey: "dateLabels.failedOn", iso: payment.failedAt };
  if (payment.expiredAt) return { labelKey: "dateLabels.expiredOn", iso: payment.expiredAt };
  return { labelKey: "dateLabels.initiatedOn", iso: payment.createdAt };
}

const STATUS_BADGE_MAP: Record<PaymentStatus, "success" | "warning" | "error" | "info" | "default"> = {
  CREATED: "default",
  PENDING: "warning",
  REQUIRES_ACTION: "warning",
  AUTHORIZED: "info",
  CAPTURED: "success",
  FAILED: "error",
  CANCELLED: "default",
  EXPIRED: "default",
  REFUND_PENDING: "warning",
  PARTIALLY_REFUNDED: "warning",
  REFUNDED: "default",
};

/**
 * Payment action descriptor — the single source of truth for what CTA to show.
 * Uses the backend-computed `paymentAction` field from PaymentItem.
 *
 * NOTE: The backend's paymentAction.canPay is the authoritative signal.
 * Session state (expired, expiredAt, status) is already factored in by the backend.
 * Mobile must NOT infer payable state from status alone.
 */
type PaymentAction =
  | { kind: "payable"; payment: PaymentItem }
  | { kind: "processing"; payment: PaymentItem }
  | { kind: "failed"; payment: PaymentItem }
  | { kind: "expired"; payment: PaymentItem }
  | { kind: "completed"; payment: PaymentItem }
  | { kind: "calm" };

function resolvePaymentAction(payments: PaymentItem[]): PaymentAction {
  if (payments.length === 0) return { kind: "calm" };

  // Use backend-computed paymentAction as the single source of truth
  for (const p of payments) {
    if (p.paymentAction.canPay) return { kind: "payable", payment: p };
  }
  for (const p of payments) {
    if (p.paymentAction.reason === "PROCESSING") return { kind: "processing", payment: p };
  }
  for (const p of payments) {
    if (p.paymentAction.reason === "FAILED") return { kind: "failed", payment: p };
  }
  for (const p of payments) {
    if (p.paymentAction.reason === "SESSION_EXPIRED") return { kind: "expired", payment: p };
  }
  for (const p of payments) {
    if (
      p.paymentAction.reason === "COMPLETED" ||
      p.paymentAction.reason === "REFUNDED" ||
      p.paymentAction.reason === "CANCELLED"
    ) {
      return { kind: "completed", payment: p };
    }
  }

  return { kind: "calm" };
}

function entryTypeLabel(entryType: CustomerWalletEntryType, t: (k: string) => string): string {
  return t(`patientPaymentsFlow.transactions.entryTypes.${entryType}` as Parameters<typeof t>[0]);
}

// ---------------------------------------------------------------------------
// WalletBalanceCard
// ---------------------------------------------------------------------------

function WalletBalanceCard({
  wallet,
  isLoading,
  isError,
  onRetry,
  locale,
}: {
  wallet: { availableBalance: string; reservedBalance: string; currencyCode: string; updatedAt: string } | null;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  locale: string;
}) {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language?.startsWith("ar") ?? false;

  if (isLoading) {
    return (
      <Card variant="elevated" padding="md" style={ss.balanceCard}>
        <LoadingState />
      </Card>
    );
  }

  if (isError || !wallet) {
    return (
      <Card variant="elevated" padding="md" style={ss.balanceCard}>
        <TouchableOpacity onPress={onRetry} style={ss.balanceCardError}>
          <Ionicons name="alert-circle-outline" size={20} color={theme.colors.textMuted} />
          <Text color={theme.colors.textMuted} style={ss.errorText}>
            {t("patientPaymentsFlow.wallet.errorNote")}
          </Text>
          <Text color={theme.colors.primary} weight="600" style={ss.retryText}>
            {t("patientPaymentsFlow.wallet.retry")}
          </Text>
        </TouchableOpacity>
      </Card>
    );
  }

  return (
    <Card variant="elevated" padding="md" style={ss.balanceCard}>
      {/* Icon + label row */}
      <View style={[ss.balanceTopRow, isRtl && ss.rowRtl]}>
        <View style={[ss.balanceIconWrap, { backgroundColor: theme.colors.primaryLight }]}>
          <Ionicons name="wallet-outline" size={15} color={theme.colors.primary} />
        </View>
        <Text color={theme.colors.textSecondary} style={ss.balanceLabel}>
          {t("patientPaymentsFlow.wallet.balanceLabel")}
        </Text>
      </View>

      {/* Main amount */}
      <Text weight="700" style={ss.balanceAmount}>
        {formatMoney(wallet.availableBalance, wallet.currencyCode, locale)}
      </Text>

      {/* Hint */}
      <Text color={theme.colors.textMuted} style={ss.balanceHint}>
        {t("patientPaymentsFlow.wallet.availableHint")}
      </Text>

      {/* Stats: reserved + last updated */}
      <View style={[ss.balanceStatsRow, isRtl && ss.rowRtl]}>
        <View style={[ss.balanceStatChip, { backgroundColor: theme.colors.surfaceSecondary }]}>
          <Text color={theme.colors.textMuted} style={ss.statChipLabel}>
            {t("patientPaymentsFlow.wallet.reservedLabel")}
          </Text>
          <Text weight="600" style={ss.statChipValue}>
            {formatMoney(wallet.reservedBalance, wallet.currencyCode, locale)}
          </Text>
        </View>
        <View style={[ss.balanceStatChip, { backgroundColor: theme.colors.primaryLight }]}>
          <Text color={theme.colors.primary} style={ss.statChipLabel}>
            {t("patientPaymentsFlow.wallet.lastUpdatedLabel")}
          </Text>
          <Text weight="600" style={[ss.statChipValue, { color: theme.colors.primary }]}>
            {formatDate(wallet.updatedAt, locale)}
          </Text>
        </View>
      </View>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// PaymentStatusCard
// ---------------------------------------------------------------------------

function PaymentStatusCard({
  payments,
  isLoading,
  isError,
  onRetry,
  locale,
}: {
  payments: PaymentItem[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  locale: string;
}) {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isRtl = i18n.language?.startsWith("ar") ?? false;

  const action = resolvePaymentAction(payments);

  if (isLoading) {
    return (
      <Card variant="elevated" padding="md" style={ss.statusCard}>
        <LoadingState />
      </Card>
    );
  }

  if (isError) {
    return (
      <Card variant="elevated" padding="md" style={ss.statusCard}>
        <TouchableOpacity onPress={onRetry}>
          <Text color={theme.colors.primary}>{t("patientPaymentsFlow.wallet.retry")}</Text>
        </TouchableOpacity>
      </Card>
    );
  }

  return (
    <Card variant="elevated" padding="md" style={ss.statusCard}>
      {/* Header — title + primary badge always visible */}
      <View style={[ss.statusHeader, isRtl && ss.rowRtl]}>
        <Text weight="600" style={ss.sectionTitle}>
          {t("patientPaymentsFlow.wallet.statusTitle")}
        </Text>
        <StatusBadge
          label={
            action.kind === "payable"
              ? t("patientPaymentsFlow.wallet.statusNeedsAttention")
              : action.kind === "processing"
              ? t("patientPaymentsFlow.paymentCard.status.PENDING")
              : action.kind === "failed"
              ? t("patientPaymentsFlow.paymentCard.status.FAILED")
              : action.kind === "expired"
              ? t("patientPaymentsFlow.paymentCard.status.EXPIRED")
              : t("patientPaymentsFlow.wallet.statusAllGood")
          }
          status={
            action.kind === "payable" || action.kind === "processing" || action.kind === "failed"
              ? "warning"
              : action.kind === "expired"
              ? "default"
              : "success"
          }
        />
      </View>

      {/* Body — varies by action kind */}
      {action.kind === "payable" && (
        <View style={ss.statusBody}>
          {/* Amount summary */}
          <View style={[ss.txRow, isRtl && ss.rowReverse]}>
            <View style={ss.txContent}>
              <Text weight="700" style={ss.actionableAmount}>
                {formatMoney(action.payment.amountTotal, action.payment.currency, locale)}
              </Text>
              <Text color={theme.colors.textMuted} style={ss.txDate}>
                {t(`patientPaymentsFlow.paymentCard.provider.${action.payment.provider}` as Parameters<typeof t>[0])}
              </Text>
            </View>
            <StatusBadge
              label={t(`patientPaymentsFlow.paymentCard.status.${action.payment.status}` as Parameters<typeof t>[0])}
              status={STATUS_BADGE_MAP[action.payment.status]}
            />
          </View>

          {/* Date */}
          <Text color={theme.colors.textMuted} style={ss.statusDate}>
            {t("patientPaymentsFlow.wallet.statusPaymentDate")}{" "}
            {formatDate(action.payment.createdAt, locale)}
          </Text>

          {/* Primary CTA — full width, stacked below */}
          <View style={ss.statusActionBlock}>
            <Button
              title={t("patientPaymentsFlow.paymentCard.payNow")}
              onPress={() => router.push(`/(patient)/sessions/${action.payment.sessionId}/pay`)}
              style={ss.statusPrimaryBtn}
            />
          </View>

          {/* Secondary: view session */}
          <TouchableOpacity
            onPress={() => router.push(`/(patient)/sessions/${action.payment.sessionId}`)}
            style={ss.statusSecondaryAction}
          >
            <Text color={theme.colors.primary} weight="600" style={ss.statusSecondaryLink}>
              {t("patientPaymentsFlow.paymentCard.viewSession")}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {action.kind === "failed" && (
        <View style={ss.statusBody}>
          {/* Amount + failed badge */}
          <View style={[ss.txRow, isRtl && ss.rowReverse]}>
            <View style={ss.txContent}>
              <Text weight="700" style={ss.actionableAmount}>
                {formatMoney(action.payment.amountTotal, action.payment.currency, locale)}
              </Text>
              <Text color={theme.colors.textMuted} style={ss.txDate}>
                {t(`patientPaymentsFlow.paymentCard.provider.${action.payment.provider}` as Parameters<typeof t>[0])}
              </Text>
            </View>
            <StatusBadge
              label={t("patientPaymentsFlow.paymentCard.status.FAILED")}
              status="error"
            />
          </View>

          <Text color={theme.colors.textMuted} style={ss.statusDate}>
            {t("patientPaymentsFlow.wallet.statusPaymentDate")}{" "}
            {formatDate(action.payment.failedAt ?? action.payment.createdAt, locale)}
          </Text>

          {/* No retry CTA — session eligibility unknown. Session pay screen is source of truth. */}
          {action.payment.sessionId && (
            <TouchableOpacity
              onPress={() => router.push(`/(patient)/sessions/${action.payment.sessionId}`)}
              style={ss.statusSecondaryAction}
            >
              <Text color={theme.colors.primary} weight="600" style={ss.statusSecondaryLink}>
                {t("patientPaymentsFlow.paymentCard.viewSession")}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {action.kind === "processing" && (
        <View style={ss.statusBody}>
          {/* Amount + processing badge */}
          <View style={[ss.txRow, isRtl && ss.rowReverse]}>
            <View style={ss.txContent}>
              <Text weight="700" style={ss.actionableAmount}>
                {formatMoney(action.payment.amountTotal, action.payment.currency, locale)}
              </Text>
              <Text color={theme.colors.textMuted} style={ss.txDate}>
                {t(`patientPaymentsFlow.paymentCard.provider.${action.payment.provider}` as Parameters<typeof t>[0])}
              </Text>
            </View>
            <StatusBadge
              label={t("patientPaymentsFlow.paymentCard.status.PENDING")}
              status="warning"
            />
          </View>

          <Text color={theme.colors.textMuted} style={ss.statusDate}>
            {t("patientPaymentsFlow.wallet.statusPaymentDate")}{" "}
            {formatDate(action.payment.createdAt, locale)}
          </Text>

          {/* No CTA — processing, user cannot act. Session is source of truth. */}
          <Text color={theme.colors.textMuted} style={ss.statusProcessingNote}>
            {t("patientPaymentsFlow.wallet.statusClearBody")}
          </Text>
        </View>
      )}

      {action.kind === "expired" && (
        <View style={ss.statusBody}>
          <View style={[ss.txRow, isRtl && ss.rowReverse]}>
            <View style={ss.txContent}>
              <Text weight="700" style={ss.actionableAmount}>
                {formatMoney(action.payment.amountTotal, action.payment.currency, locale)}
              </Text>
            </View>
            <StatusBadge
              label={t("patientPaymentsFlow.paymentCard.status.EXPIRED")}
              status="default"
            />
          </View>

          <Text color={theme.colors.textMuted} style={ss.statusDate}>
            {formatDate(action.payment.expiredAt ?? action.payment.createdAt, locale)}
          </Text>

          <Text color={theme.colors.textMuted} style={ss.statusProcessingNote}>
            {t("patientPaymentsFlow.wallet.statusClearBody")}
          </Text>

          {/* Session link only — pay CTA never shown for expired */}
          {action.payment.sessionId && (
            <TouchableOpacity
              onPress={() => router.push(`/(patient)/sessions/${action.payment.sessionId}`)}
              style={ss.statusSecondaryAction}
            >
              <Text color={theme.colors.primary} weight="600" style={ss.statusSecondaryLink}>
                {t("patientPaymentsFlow.paymentCard.viewSession")}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {(action.kind === "completed" || action.kind === "calm") && (
        <View style={ss.statusBody}>
          <Text color={theme.colors.textMuted} style={ss.statusClearText}>
            {t("patientPaymentsFlow.wallet.statusClearBody")}
          </Text>
        </View>
      )}

      {/* Footer notes */}
      <View style={[ss.statusFooter, isRtl && ss.alignEnd]}>
        <View style={ss.footerNote}>
          <Ionicons name="card-outline" size={12} color={theme.colors.textMuted} />
          <Text color={theme.colors.textMuted} style={ss.footerNoteText}>
            {t("patientPaymentsFlow.wallet.paymentMethodsUnavailable")}
          </Text>
        </View>
        <Text color={theme.colors.textMuted} style={ss.footerNoteText}>
          {t("patientPaymentsFlow.wallet.addFundsUnavailable")}
        </Text>
      </View>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// TransactionRow
// ---------------------------------------------------------------------------

function TransactionRow({ entry }: { entry: CustomerWalletEntryItem }) {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const isRtl = i18n.language?.startsWith("ar") ?? false;
  const isCredit = entry.direction === "CREDIT";

  return (
    <View style={ss.txRow}>
      {/* Direction icon */}
      <View
        style={[
          ss.txIcon,
          {
            backgroundColor: isCredit
              ? theme.colors.primaryLight
              : theme.colors.surfaceSecondary,
          },
        ]}
      >
        <Ionicons
          name={isRtl ? "arrow-up" : "arrow-up"}
          size={13}
          color={isCredit ? theme.colors.primary : theme.colors.textSecondary}
        />
      </View>

      {/* Content — in RTL, this naturally flows right */}
      <View style={ss.txContent}>
        <Text
          weight="600"
          style={[ss.txTitle, isRtl && ss.textRight]}
          numberOfLines={1}
        >
          {entryTypeLabel(entry.entryType, t)}
        </Text>
        <Text
          color={theme.colors.textMuted}
          style={[ss.txDate, isRtl && ss.textRight]}
        >
          {formatDate(entry.effectiveAt, locale)}
        </Text>
      </View>

      {/* Amount — always on the left side */}
      <Text
        weight="700"
        style={[
          ss.txAmount,
          { color: isCredit ? theme.colors.primary : theme.colors.textPrimary },
        ]}
      >
        {isCredit ? "+" : "-"}
        {formatMoney(entry.amount, entry.currencyCode, locale)}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// TransactionsCard
// ---------------------------------------------------------------------------

function TransactionsCard({
  entries,
  isLoading,
  isError,
  onRetry,
  hasMore,
  onViewAll,
  locale,
}: {
  entries: CustomerWalletEntryItem[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  hasMore: boolean;
  onViewAll: () => void;
  locale: string;
}) {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language?.startsWith("ar") ?? false;

  return (
    <Card variant="elevated" padding="md" style={ss.sectionCard}>
      {/* Header */}
      <View style={[ss.sectionHeader, isRtl && ss.rowRtl]}>
        <Text weight="600" style={ss.sectionTitle}>
          {t("patientPaymentsFlow.wallet.recentTitle")}
        </Text>
        {hasMore && (
          <TouchableOpacity onPress={onViewAll}>
            <Text color={theme.colors.primary} weight="600" style={ss.viewAllLink}>
              {t("patientPaymentsFlow.wallet.viewAll")}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <TouchableOpacity onPress={onRetry}>
          <Text color={theme.colors.primary}>{t("patientPaymentsFlow.wallet.retry")}</Text>
        </TouchableOpacity>
      ) : entries.length > 0 ? (
        <View style={ss.txList}>
          {entries.slice(0, 4).map((entry) => (
            <TransactionRow key={entry.id} entry={entry} />
          ))}
        </View>
      ) : (
        <Text color={theme.colors.textMuted} style={ss.emptyNote}>
          {t("patientPaymentsFlow.wallet.activityEmpty")}
        </Text>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// PaymentHistoryCard
// ---------------------------------------------------------------------------

function PaymentHistoryCard({
  payments,
  isLoading,
  isError,
  onRetry,
  locale,
}: {
  payments: PaymentItem[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  locale: string;
}) {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const isRtl = i18n.language?.startsWith("ar") ?? false;

  return (
    <Card variant="elevated" padding="md" style={ss.sectionCard}>
      {/* Collapsible header */}
      <TouchableOpacity
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.8}
        style={[ss.historyToggle, isRtl && ss.rowReverse]}
      >
        <View style={ss.historyToggleLeft}>
          <Text weight="600" style={ss.sectionTitle}>
            {t("patientPaymentsFlow.payments.sectionTitle")}
          </Text>
          <Text color={theme.colors.textMuted} style={ss.historyHint}>
            {t("patientPaymentsFlow.wallet.historyHint")}
          </Text>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={theme.colors.textMuted}
        />
      </TouchableOpacity>

      {/* Expanded body */}
      {expanded && (
        <View style={ss.historyBody}>
          {isLoading ? (
            <LoadingState />
          ) : isError ? (
            <ErrorState onRetry={onRetry} />
          ) : payments.length > 0 ? (
            <View style={ss.historyPaymentList}>
              {payments.slice(0, 3).map((p) => (
                <HistoryPaymentRow key={p.id} payment={p} locale={locale} isRtl={isRtl} />
              ))}
            </View>
          ) : (
            <View style={ss.historyEmpty}>
              <Ionicons name="card-outline" size={28} color={theme.colors.textMuted} />
              <Text color={theme.colors.textMuted} style={ss.historyEmptyText}>
                {t("patientPaymentsFlow.payments.emptyNote")}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Collapsed note */}
      {!expanded && (
        <Text color={theme.colors.textMuted} style={ss.historyCollapsedNote}>
          {t("patientPaymentsFlow.wallet.historyCollapsed")}
        </Text>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// HistoryPaymentRow
// ---------------------------------------------------------------------------

function HistoryPaymentRow({
  payment,
  locale,
  isRtl,
}: {
  payment: PaymentItem;
  locale: string;
  isRtl: boolean;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { iso, labelKey } = resolveRelevantDate(payment);

  return (
    <View style={[ss.paymentRow, isRtl && ss.rowReverse]}>
      <View style={ss.paymentRowLeft}>
        <Text weight="600" style={ss.paymentRowAmount}>
          {formatMoney(payment.amountTotal, payment.currency, locale)}
        </Text>
        <Text color={theme.colors.textMuted} style={ss.paymentRowDate}>
          {t(`patientPaymentsFlow.paymentCard.${labelKey}` as Parameters<typeof t>[0])}{" "}
          {formatDate(iso, locale)}
        </Text>
      </View>
      <StatusBadge
        label={t(`patientPaymentsFlow.paymentCard.status.${payment.status}` as Parameters<typeof t>[0])}
        status={STATUS_BADGE_MAP[payment.status]}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function PatientPaymentsScreen() {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const isRtl = i18n.language?.startsWith("ar") ?? false;

  const walletQuery = usePatientWalletSummary();
  const paymentsQuery = usePatientPayments({ limit: 6 });
  const entriesQuery = usePatientWalletEntries({ limit: 5 });

  const wallet = walletQuery.data?.item ?? null;
  const payments = paymentsQuery.data?.items ?? [];
  const entries = entriesQuery.data?.items ?? [];
  const recentEntries = entries.slice(0, 4);
  const hasMoreEntries = (entriesQuery.data?.pagination.totalItems ?? 0) > recentEntries.length;

  const fallbackCurrency = resolveSupportedCurrencyCode({
    currencyCode: wallet?.currencyCode ?? entries[0]?.currencyCode ?? payments[0]?.currency ?? null,
  });

  const isLoading =
    walletQuery.isLoading && paymentsQuery.isLoading && entriesQuery.isLoading;

  if (isLoading) {
    return (
      <Screen bg="background">
        <Header showBack />
        <LoadingState fullScreen />
      </Screen>
    );
  }

  return (
    <Screen bg="background">
      <Header showBack />

      <ScrollView
        contentContainerStyle={ss.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Page heading */}
        <View style={ss.pageHeading}>
          <Text
            variant="h2"
            weight="600"
            style={[ss.pageTitle, isRtl ? ss.textRight : ss.textLeft]}
          >
            {t("patientPaymentsFlow.wallet.title")}
          </Text>
          <Text
            color={theme.colors.textSecondary}
            style={[ss.pageSubtitle, isRtl ? ss.textRight : ss.textLeft]}
          >
            {t("patientPaymentsFlow.wallet.subtitle")}
          </Text>
        </View>

        {/* Balance summary */}
        <WalletBalanceCard
          wallet={wallet}
          isLoading={walletQuery.isLoading}
          isError={walletQuery.isError ?? false}
          onRetry={() => walletQuery.refetch()}
          locale={locale}
        />

        {/* Payment status */}
        <PaymentStatusCard
          payments={payments}
          isLoading={paymentsQuery.isLoading}
          isError={paymentsQuery.isError ?? false}
          onRetry={() => paymentsQuery.refetch()}
          locale={locale}
        />

        {/* Recent transactions */}
        <TransactionsCard
          entries={recentEntries}
          isLoading={entriesQuery.isLoading}
          isError={entriesQuery.isError ?? false}
          onRetry={() => entriesQuery.refetch()}
          hasMore={hasMoreEntries}
          onViewAll={() => router.push("/(patient)/payments/transactions")}
          locale={locale}
        />

        {/* Payment history */}
        <PaymentHistoryCard
          payments={payments}
          isLoading={paymentsQuery.isLoading}
          isError={paymentsQuery.isError ?? false}
          onRetry={() => paymentsQuery.refetch()}
          locale={locale}
        />

        {/* Trust footer */}
        <View style={ss.trustFooter}>
          <Ionicons name="shield-checkmark-outline" size={13} color={theme.colors.textMuted} />
          <Text color={theme.colors.textMuted} style={ss.trustText}>
            {t("patientPaymentsFlow.wallet.secureHint")}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Styles — static, no runtime theme references
// ---------------------------------------------------------------------------

const ss = StyleSheet.create({
  // ── Scroll container ──
  scrollContent: {
    paddingHorizontal: MOBILE_HORIZONTAL_PADDING,
    paddingTop: MOBILE_SECTION_GAP,
    paddingBottom: 32,
    gap: MOBILE_SECTION_GAP,
  },

  // ── Page heading ──
  pageHeading: { gap: 4, marginBottom: 2 },
  pageTitle: { fontSize: 22, lineHeight: 28, fontWeight: "600" },
  pageSubtitle: { fontSize: 13, lineHeight: 19 },

  // ── Balance card ──
  balanceCard: {},
  balanceCardError: { alignItems: "center", gap: 6, paddingVertical: 8 },
  errorText: { fontSize: 13 },
  retryText: { fontSize: 13 },
  balanceTopRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  balanceIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  balanceLabel: { fontSize: 13 },
  balanceAmount: { fontSize: 28, lineHeight: 34, fontWeight: "700", marginBottom: 2 },
  balanceHint: { fontSize: 12, marginBottom: 10 },
  balanceStatsRow: { flexDirection: "row", gap: 8 },
  balanceStatChip: {
    flexGrow: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 2,
  },
  statChipLabel: { fontSize: 11 },
  statChipValue: { fontSize: 13, lineHeight: 18 },

  // ── Status card ──
  statusCard: {},
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  statusBody: { gap: 8 },
  actionableRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  actionableAmountWrap: { flex: 1 },
  actionableAmount: { fontSize: 20, lineHeight: 26, fontWeight: "700" },
  actionableProvider: { fontSize: 12, marginTop: 2 },
  statusDate: { fontSize: 12, lineHeight: 17 },
  statusActions: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 4 },
  statusActionBtn: { flexGrow: 1 },
  viewSessionLink: { fontSize: 13, lineHeight: 19 },
  statusActionBlock: { marginTop: 8 },
  statusPrimaryBtn: { width: "100%" },
  statusSecondaryAction: { alignSelf: "flex-start", marginTop: 6 },
  statusSecondaryLink: { fontSize: 13, lineHeight: 19 },
  statusProcessingNote: { fontSize: 12, lineHeight: 17, marginTop: 4 },
  statusClearText: { fontSize: 13, lineHeight: 19 },
  statusFooter: { gap: 4, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#f0f0f0" },
  footerNote: { flexDirection: "row", alignItems: "center", gap: 5 },
  footerNoteText: { fontSize: 12, lineHeight: 17 },

  // ── Shared section ──
  sectionCard: {},
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 15, lineHeight: 21, fontWeight: "600" },
  viewAllLink: { fontSize: 13, lineHeight: 19 },
  emptyNote: { fontSize: 13, lineHeight: 19, marginTop: 4 },

  // ── Transaction rows ──
  txList: { gap: 12 },
  txRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  txIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  txContent: { flex: 1 },
  txTitle: { fontSize: 13, lineHeight: 18, fontWeight: "600" },
  txDate: { fontSize: 12, lineHeight: 17, marginTop: 1 },
  txAmount: { fontSize: 13, lineHeight: 18, fontWeight: "700" },
  txAmountRtl: { textAlign: "left" },

  // ── Payment history ──
  historyToggle: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  historyToggleLeft: { flex: 1, gap: 3 },
  historyHint: { fontSize: 12, lineHeight: 17 },
  historyBody: { marginTop: 12, gap: 10 },
  historyEmpty: { alignItems: "center", gap: 8, paddingVertical: 16 },
  historyEmptyText: { fontSize: 13, textAlign: "center" },
  historyPaymentList: { gap: 2 },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  paymentRowLeft: { flex: 1 },
  paymentRowAmount: { fontSize: 14, fontWeight: "600" },
  paymentRowDate: { fontSize: 12, marginTop: 2 },
  historyCollapsedNote: { fontSize: 12, lineHeight: 17, marginTop: 8 },

  // ── Trust footer ──
  trustFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingTop: 4,
  },
  trustText: { fontSize: 12, lineHeight: 17 },

  // ── Layout helpers ──
  rowRtl: { flexDirection: "row-reverse" },
  rowReverse: { flexDirection: "row-reverse" },
  alignEnd: { alignItems: "flex-end" },
  textRight: { textAlign: "right" },
  textLeft: { textAlign: "left" },
});
