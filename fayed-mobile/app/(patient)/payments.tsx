import React from "react";
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
  ErrorState,
  Header,
  LoadingState,
  Screen,
  StatusBadge,
  Text,
} from "../../src/components/ui";
import { useTheme } from "../../src/providers/ThemeProvider";
import { useAppDirection } from "../../src/i18n/direction";
import {
  MOBILE_HORIZONTAL_PADDING,
  MOBILE_SECTION_GAP,
} from "../../src/components/mobile-shell";
import {
  usePatientPayments,
  usePatientWalletEntries,
  usePatientWalletSummary,
} from "../../src/features/patient/payments/hooks";
import { formatViewerDate } from "../../src/lib/time-formatting";
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
 * Money formatter — outputs formatted amount with currency code from backend.
 * Uses simple digit grouping without Intl.NumberFormat (unreliable in Hermes).
 *
 * NOTE: currencyCode always comes from backend data. Never hardcode a currency
 * symbol or code in screen components.
 * locale param is reserved for future locale-aware digit formatting (e.g. Arabic numerals).
 */
function formatMoney(amount: string, currencyCode: string, _locale = "en"): string {
  const num = Number(amount);
  if (!Number.isFinite(num)) return `${amount} ${currencyCode.toUpperCase()}`;
  const rounded = parseFloat(num.toFixed(2));
  const fixed = rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(2);
  const withCommas = fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${withCommas} ${currencyCode.toUpperCase()}`;
}

function formatDate(isoString: string, locale: string): string {
  return formatViewerDate(isoString, { locale });
}

// resolveRelevantDate was used by the legacy collapsible PaymentHistoryCard
// which has been replaced by TransactionHistoryNavCard. Removed to avoid dead code.

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
  const { t } = useTranslation();
  const { isRtl, rowDirection, textAlign } = useAppDirection();

  if (isLoading) {
    return (
      <View style={[ss.heroCard, { backgroundColor: theme.colors.primary }]}>
        <LoadingState />
      </View>
    );
  }

  if (isError || !wallet) {
    return (
      <View style={[ss.heroCard, { backgroundColor: theme.colors.primary }]}>
        <TouchableOpacity onPress={onRetry} style={ss.heroErrorWrap}>
          <Ionicons name="alert-circle-outline" size={20} color="rgba(255,255,255,0.7)" />
          <Text style={[ss.heroErrorText, { textAlign }]}>
            {t("patientPaymentsFlow.wallet.errorNote")}
          </Text>
          <Text weight="600" style={[ss.heroRetryText, { textAlign }]}>
            {t("patientPaymentsFlow.wallet.retry")}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[ss.heroCard, { backgroundColor: theme.colors.primary }]}>
      {/* Top label row */}
      <View style={[ss.heroTopRow, { flexDirection: rowDirection }]}>
        <View style={ss.heroIconWrap}>
          <Ionicons name="wallet-outline" size={14} color="rgba(255,255,255,0.8)" />
        </View>
        <Text style={[ss.heroLabel, { textAlign }]}>
          {t("patientPaymentsFlow.wallet.balanceLabel")}
        </Text>
      </View>

      {/* Main balance */}
      <Text weight="700" style={[ss.heroAmount, { textAlign }]}>
        {formatMoney(wallet.availableBalance, wallet.currencyCode, locale)}
      </Text>

      {/* Available hint */}
      <Text style={[ss.heroHint, { textAlign }]}>
        {t("patientPaymentsFlow.wallet.availableHint")}
      </Text>

      {/* Thin gold accent divider */}
      <View
        style={[
          ss.heroAccentLine,
          { alignSelf: isRtl ? "flex-end" : "flex-start" },
        ]}
      />

      {/* Secondary stats row */}
      <View style={[ss.heroStatsRow, { flexDirection: rowDirection }]}>
        {/* Reserved */}
        <View style={[ss.heroStat, { alignItems: isRtl ? "flex-end" : "flex-start" }]}>
          <Text style={[ss.heroStatLabel, { textAlign }]}>
            {t("patientPaymentsFlow.wallet.reservedLabel")}
          </Text>
          <Text weight="600" style={[ss.heroStatValue, { textAlign }]}>
            {formatMoney(wallet.reservedBalance, wallet.currencyCode, locale)}
          </Text>
        </View>

        {/* Last updated */}
        <View style={[ss.heroStat, { alignItems: isRtl ? "flex-end" : "flex-start" }]}>
          <Text style={[ss.heroStatLabel, { textAlign }]}>
            {t("patientPaymentsFlow.wallet.lastUpdatedLabel")}
          </Text>
          <Text weight="600" style={[ss.heroStatValueGold, { textAlign }]}>
            {formatDate(wallet.updatedAt, locale)}
          </Text>
        </View>
      </View>
    </View>
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
  const { t } = useTranslation();
  const router = useRouter();
  const { isRtl, rowDirection, textAlign } = useAppDirection();

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
        <ErrorState onRetry={onRetry} />
      </Card>
    );
  }

  // ── Calm / Completed: compact reassurance banner ──
  if (action.kind === "calm" || action.kind === "completed") {
    return (
      <View
        style={[
          ss.reassuranceBanner,
          { backgroundColor: theme.colors.successLight, flexDirection: rowDirection },
        ]}
      >
        <Ionicons
          name="checkmark-circle"
          size={18}
          color={theme.colors.success}
        />
        <Text
          weight="600"
          color={theme.colors.success}
          style={[ss.reassuranceText, { textAlign }]}
        >
          {t("patientPaymentsFlow.wallet.statusAllGood")}
        </Text>
      </View>
    );
  }

  // ── Actionable / Attention states ──
  return (
    <Card variant="elevated" padding="md" style={ss.statusCard}>
      {/* Header row */}
      <View style={[ss.statusHeader, { flexDirection: rowDirection }]}>
        <Text weight="600" style={[ss.sectionTitle, { textAlign }]}>
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
              : t("patientPaymentsFlow.paymentCard.status.EXPIRED")
          }
          status={
            action.kind === "payable"
              ? "warning"
              : action.kind === "processing"
              ? "warning"
              : action.kind === "failed"
              ? "error"
              : "default"
          }
        />
      </View>

      {/* Amount + provider row */}
      <View style={[ss.statusAmountRow, { flexDirection: rowDirection }]}>
        <View style={[ss.statusAmountContent, { alignItems: isRtl ? "flex-end" : "flex-start" }]}>
          <Text weight="700" style={[ss.statusAmount, { textAlign }]}>
            {formatMoney(action.payment.amountTotal, action.payment.currency, locale)}
          </Text>
          <Text color={theme.colors.textMuted} style={[ss.statusProvider, { textAlign }]}>
            {t(`patientPaymentsFlow.paymentCard.provider.${action.payment.provider}` as Parameters<typeof t>[0])}
          </Text>
        </View>
        <StatusBadge
          label={t(`patientPaymentsFlow.paymentCard.status.${action.payment.status}` as Parameters<typeof t>[0])}
          status={STATUS_BADGE_MAP[action.payment.status]}
        />
      </View>

      {/* Date */}
      <Text color={theme.colors.textMuted} style={[ss.statusDate, { textAlign }]}>
        {t("patientPaymentsFlow.wallet.statusPaymentDate")}{" "}
        {formatDate(
          action.kind === "failed"
            ? (action.payment.failedAt ?? action.payment.createdAt)
            : action.kind === "expired"
            ? (action.payment.expiredAt ?? action.payment.createdAt)
            : action.payment.createdAt,
          locale,
        )}
      </Text>

      {/* Processing note */}
      {(action.kind === "processing" || action.kind === "expired") && (
        <Text color={theme.colors.textMuted} style={[ss.statusNote, { textAlign }]}>
          {t("patientPaymentsFlow.wallet.statusClearBody")}
        </Text>
      )}

      {/* Pay now CTA (payable only) */}
      {action.kind === "payable" && (
        <View style={ss.statusCtaBlock}>
          <Button
            title={t("patientPaymentsFlow.paymentCard.payNow")}
            onPress={() => router.push(`/(patient)/sessions/${action.payment.sessionId}/pay`)}
            style={ss.statusPrimaryBtn}
          />
        </View>
      )}

      {/* View session link */}
      {action.payment.sessionId && (
        <TouchableOpacity
          onPress={() => router.push(`/(patient)/sessions/${action.payment.sessionId}`)}
          style={[ss.statusSecondaryLink, { alignSelf: isRtl ? "flex-end" : "flex-start" }]}
        >
          <Text color={theme.colors.primary} weight="600" style={ss.statusLinkText}>
            {t("patientPaymentsFlow.paymentCard.viewSession")}
          </Text>
        </TouchableOpacity>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// TransactionRow
// ---------------------------------------------------------------------------

function TransactionRow({
  entry,
  locale,
  showDivider,
}: {
  entry: CustomerWalletEntryItem;
  locale: string;
  showDivider: boolean;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isRtl, rowDirection, textAlign, oppositeTextAlign } = useAppDirection();
  const isCredit = entry.direction === "CREDIT";

  return (
    <>
      <View style={[ss.txRow, { flexDirection: rowDirection }]}>
        {/* Direction icon */}
        <View
          style={[
            ss.txIcon,
            {
              backgroundColor: isCredit
                ? theme.colors.statusSuccessBg
                : theme.colors.surfaceMuted,
            },
          ]}
        >
          <Ionicons
            name={isCredit ? "arrow-down" : "arrow-up"}
            size={13}
            color={isCredit ? theme.colors.success : theme.colors.textSecondary}
          />
        </View>

        {/* Content */}
        <View style={[ss.txContent, { alignItems: isRtl ? "flex-end" : "flex-start" }]}>
          <Text weight="600" style={[ss.txTitle, { textAlign }]} numberOfLines={1}>
            {entryTypeLabel(entry.entryType, t)}
          </Text>
          <Text color={theme.colors.textMuted} style={[ss.txDate, { textAlign }]}>
            {formatDate(entry.effectiveAt, locale)}
          </Text>
        </View>

        {/* Amount */}
        <Text
          weight="700"
          style={[
            ss.txAmount,
            {
              color: isCredit ? theme.colors.success : theme.colors.textPrimary,
              textAlign: oppositeTextAlign,
            },
          ]}
        >
          {isCredit ? "+" : "−"}
          {formatMoney(entry.amount, entry.currencyCode, locale)}
        </Text>
      </View>

      {showDivider && (
        <View style={[ss.txDivider, { backgroundColor: theme.colors.divider }]} />
      )}
    </>
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
  const { t } = useTranslation();
  const { rowDirection, textAlign, chevronForward } = useAppDirection();

  return (
    <Card variant="elevated" padding="md" style={ss.sectionCard}>
      {/* Header */}
      <View style={[ss.sectionHeader, { flexDirection: rowDirection }]}>
        <Text weight="600" style={[ss.sectionTitle, { textAlign }]}>
          {t("patientPaymentsFlow.wallet.recentTitle")}
        </Text>
        {hasMore && (
          <TouchableOpacity
            onPress={onViewAll}
            style={[ss.viewAllBtn, { flexDirection: rowDirection }]}
          >
            <Text color={theme.colors.primary} weight="600" style={ss.viewAllText}>
              {t("patientPaymentsFlow.wallet.viewAll")}
            </Text>
            <Ionicons name={chevronForward} size={14} color={theme.colors.primary} />
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
          {entries.slice(0, 4).map((entry, idx) => (
            <TransactionRow
              key={entry.id}
              entry={entry}
              locale={locale}
              showDivider={idx < Math.min(entries.length, 4) - 1}
            />
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
// TransactionHistoryNavCard
// Replaces the legacy collapsible PaymentHistoryCard.
// The collapsible only showed payments[].slice(0,3) with amount + status badge —
// no hidden data. Navigation to the dedicated history screen is clearer UX.
// ---------------------------------------------------------------------------

function TransactionHistoryNavCard({ onPress }: { onPress: () => void }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { rowDirection, textAlign, chevronForward, isRtl } = useAppDirection();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        ss.historyNavCard,
        {
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={[ss.historyNavRow, { flexDirection: rowDirection }]}>
        {/* Icon */}
        <View style={[ss.historyNavIconWrap, { backgroundColor: theme.colors.primaryLight }]}>
          <Ionicons name="receipt-outline" size={18} color={theme.colors.primary} />
        </View>

        {/* Text */}
        <View style={[ss.historyNavText, { alignItems: isRtl ? "flex-end" : "flex-start" }]}>
          <Text weight="600" style={[ss.historyNavTitle, { textAlign }]}>
            {t("patientPaymentsFlow.payments.sectionTitle")}
          </Text>
          <Text color={theme.colors.textMuted} style={[ss.historyNavSubtitle, { textAlign }]}>
            {t("patientPaymentsFlow.wallet.historyViewAll")}
          </Text>
        </View>

        {/* Chevron */}
        <Ionicons name={chevronForward} size={18} color={theme.colors.textMuted} />
      </View>
    </TouchableOpacity>
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
  const { isRtl, rowDirection, textAlign } = useAppDirection();

  const walletQuery = usePatientWalletSummary();
  const paymentsQuery = usePatientPayments({ limit: 6 });
  const entriesQuery = usePatientWalletEntries({ limit: 5 });

  const wallet = walletQuery.data?.item ?? null;
  const payments = paymentsQuery.data?.items ?? [];
  const entries = entriesQuery.data?.items ?? [];
  const recentEntries = entries.slice(0, 4);
  const hasMoreEntries = (entriesQuery.data?.pagination.totalItems ?? 0) > recentEntries.length;

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
        <View style={[ss.pageHeading, { alignItems: isRtl ? "flex-end" : "flex-start" }]}>
          <Text
            variant="h2"
            weight="600"
            style={[ss.pageTitle, { textAlign }]}
          >
            {t("patientPaymentsFlow.wallet.title")}
          </Text>
          <Text
            color={theme.colors.textSecondary}
            style={[ss.pageSubtitle, { textAlign }]}
          >
            {t("patientPaymentsFlow.wallet.subtitle")}
          </Text>
        </View>

        {/* Balance hero */}
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

        {/* Transaction history navigation card */}
        <TransactionHistoryNavCard
          onPress={() => router.push("/(patient)/payments/transactions")}
        />

        {/* Trust footer */}
        <View style={[ss.trustFooter, { flexDirection: rowDirection }]}>
          <Ionicons name="shield-checkmark-outline" size={13} color={theme.colors.textMuted} />
          <Text color={theme.colors.textMuted} style={[ss.trustText, { textAlign }]}>
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
    paddingBottom: 40,
    gap: MOBILE_SECTION_GAP,
  },

  // ── Page heading ──
  pageHeading: { gap: 4 },
  pageTitle: { fontSize: 22, lineHeight: 28, fontWeight: "600" },
  pageSubtitle: { fontSize: 13, lineHeight: 19 },

  // ── Hero card (teal background) ──
  heroCard: {
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 22,
    overflow: "hidden",
  },
  heroErrorWrap: { alignItems: "center", gap: 8, paddingVertical: 12 },
  heroErrorText: { fontSize: 13, lineHeight: 18, color: "rgba(255,255,255,0.7)" },
  heroRetryText: { fontSize: 13, lineHeight: 18, color: "#FFFFFF" },
  heroTopRow: { alignItems: "center", gap: 8, marginBottom: 12 },
  heroIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroLabel: { fontSize: 12, lineHeight: 17, color: "rgba(255,255,255,0.75)" },
  heroAmount: {
    fontSize: 34,
    lineHeight: 42,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  heroHint: { fontSize: 12, lineHeight: 17, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  heroAccentLine: {
    width: 28,
    height: 2,
    borderRadius: 1,
    backgroundColor: "#C8A979", // Warm Gold — used only as a thin accent detail
    marginTop: 14,
    marginBottom: 14,
  },
  heroStatsRow: { gap: 16 },
  heroStat: { gap: 2 },
  heroStatLabel: { fontSize: 11, lineHeight: 16, color: "rgba(255,255,255,0.6)" },
  heroStatValue: { fontSize: 13, lineHeight: 18, color: "rgba(255,255,255,0.9)" },
  heroStatValueGold: {
    fontSize: 13,
    lineHeight: 18,
    color: "#C8A979", // Warm Gold for the last updated value only — restrained accent
  },

  // ── Reassurance banner ──
  reassuranceBanner: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center",
    gap: 8,
  },
  reassuranceText: { fontSize: 14, lineHeight: 20, flex: 1 },

  // ── Status card ──
  statusCard: {},
  statusHeader: {
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statusAmountRow: {
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 6,
  },
  statusAmountContent: { flex: 1, gap: 2 },
  statusAmount: { fontSize: 20, lineHeight: 26, fontWeight: "700" },
  statusProvider: { fontSize: 12, lineHeight: 17 },
  statusDate: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  statusNote: { fontSize: 12, lineHeight: 17, marginTop: 6 },
  statusCtaBlock: { marginTop: 12 },
  statusPrimaryBtn: { width: "100%" },
  statusSecondaryLink: { marginTop: 10 },
  statusLinkText: { fontSize: 13, lineHeight: 19 },

  // ── Shared section ──
  sectionCard: {},
  sectionHeader: {
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, lineHeight: 21, fontWeight: "600" },
  viewAllBtn: { alignItems: "center", gap: 4 },
  viewAllText: { fontSize: 13, lineHeight: 19 },
  emptyNote: { fontSize: 13, lineHeight: 19, marginTop: 4 },

  // ── Transaction rows ──
  txList: { gap: 0 },
  txRow: { alignItems: "center", gap: 10, paddingVertical: 11 },
  txIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  txContent: { flex: 1, gap: 2 },
  txTitle: { fontSize: 13, lineHeight: 18, fontWeight: "600" },
  txDate: { fontSize: 12, lineHeight: 17 },
  txAmount: { fontSize: 13, lineHeight: 18, fontWeight: "700", minWidth: 76 },
  txDivider: { height: 1, opacity: 0.6 },

  // ── History nav card ──
  historyNavCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  historyNavRow: { alignItems: "center", gap: 12 },
  historyNavIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  historyNavText: { flex: 1, gap: 2 },
  historyNavTitle: { fontSize: 14, lineHeight: 20, fontWeight: "600" },
  historyNavSubtitle: { fontSize: 12, lineHeight: 17 },

  // ── Trust footer ──
  trustFooter: {
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingTop: 4,
  },
  trustText: { fontSize: 12, lineHeight: 17 },
});
