import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
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
  usePatientPayments,
  usePatientWalletEntries,
  usePatientWalletSummary,
} from "../../src/features/patient/payments/hooks";
import type {
  CustomerWalletEntryItem,
  CustomerWalletEntryType,
  PaymentItem,
  PaymentProvider,
  PaymentStatus,
} from "../../src/features/patient/payments/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Product-grade money formatter — avoids Intl.NumberFormat currency style
 * which is unreliable in React Native Hermes.
 * Output: "350.50 SAR" / "1,250 EGP" — matches approved Arabic design.
 */
function formatMoney(amount: string, currencyCode: string): string {
  const num = Number(amount);
  if (!Number.isFinite(num)) return `${amount} ${currencyCode.toUpperCase()}`;
  const rounded = parseFloat(num.toFixed(2));
  const str = rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(2);
  const withCommas = str.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${withCommas} ${currencyCode.toUpperCase()}`;
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
  if (payment.paidAt)
    return { labelKey: "dateLabels.paidOn", iso: payment.paidAt };
  if (payment.refundedAt)
    return { labelKey: "dateLabels.refundedOn", iso: payment.refundedAt };
  if (payment.failedAt)
    return { labelKey: "dateLabels.failedOn", iso: payment.failedAt };
  if (payment.expiredAt)
    return { labelKey: "dateLabels.expiredOn", iso: payment.expiredAt };
  return { labelKey: "dateLabels.initiatedOn", iso: payment.createdAt };
}

const STATUS_BADGE_MAP: Record<
  PaymentStatus,
  "success" | "warning" | "error" | "info" | "default"
> = {
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

function canContinueOrRetryPayment(status: PaymentStatus): boolean {
  return (
    status === "CREATED" ||
    status === "PENDING" ||
    status === "REQUIRES_ACTION" ||
    status === "FAILED"
  );
}

// ---------------------------------------------------------------------------
// PaymentCard
// ---------------------------------------------------------------------------

function PaymentCard({ payment }: { payment: PaymentItem }) {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";

  const { labelKey, iso } = resolveRelevantDate(payment);
  const providerKey =
    `patientPaymentsFlow.paymentCard.provider.${payment.provider}` as const;
  const statusKey =
    `patientPaymentsFlow.paymentCard.status.${payment.status}` as const;
  const dateLabelKey = `patientPaymentsFlow.paymentCard.${labelKey}` as const;

  const walletApplied = Number(payment.amountFromWallet) > 0;
  const gatewayApplied = Number(payment.amountFromGateway) > 0;
  const canAct = canContinueOrRetryPayment(payment.status);
  const actionKey =
    payment.status === "FAILED"
      ? "patientPaymentsFlow.paymentCard.retryPayment"
      : "patientPaymentsFlow.paymentCard.payNow";

  return (
    <Card variant="elevated" padding="md" style={styles.paymentCard}>
      <View style={styles.paymentCardHeader}>
        <View>
          <Text weight="bold" style={styles.paymentAmount}>
            {formatMoney(payment.amountTotal, payment.currency)}
          </Text>
          <Text color={theme.colors.textMuted} style={styles.paymentProvider}>
            {t(providerKey)}
          </Text>
        </View>
        <StatusBadge
          label={t(statusKey)}
          status={STATUS_BADGE_MAP[payment.status] ?? "default"}
        />
      </View>

      <View
        style={[styles.divider, { backgroundColor: theme.colors.borderLight }]}
      />

      <Text color={theme.colors.textSecondary} style={styles.paymentDate}>
        {t(dateLabelKey)} {formatDate(iso, locale)}
      </Text>

      {(walletApplied || gatewayApplied) && (
        <View style={styles.splitRow}>
          {walletApplied && (
            <View
              style={[
                styles.splitChip,
                { backgroundColor: theme.colors.primaryLight },
              ]}
            >
              <Ionicons
                name="wallet-outline"
                size={11}
                color={theme.colors.primary}
              />
              <Text color={theme.colors.primary} style={styles.splitChipText}>
                {t("patientPaymentsFlow.paymentCard.walletUsed")}{" "}
                {formatMoney(payment.amountFromWallet, payment.currency)}
              </Text>
            </View>
          )}
          {gatewayApplied && (
            <View
              style={[
                styles.splitChip,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <Ionicons
                name="card-outline"
                size={11}
                color={theme.colors.textSecondary}
              />
              <Text
                color={theme.colors.textSecondary}
                style={styles.splitChipText}
              >
                {t("patientPaymentsFlow.paymentCard.gatewayUsed")}{" "}
                {formatMoney(payment.amountFromGateway, payment.currency)}
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.paymentActions}>
        {canAct && payment.sessionId && (
          <TouchableOpacity
            style={[
              styles.payActionBtn,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => router.push(`/sessions/${payment.sessionId}/pay`)}
          >
            <Text color="#fff" weight="600" style={styles.payActionText}>
              {t(actionKey as Parameters<typeof t>[0])}
            </Text>
          </TouchableOpacity>
        )}
        {payment.sessionId && (
          <TouchableOpacity
            onPress={() => router.push(`/sessions/${payment.sessionId}`)}
          >
            <Text
              color={theme.colors.primary}
              weight="500"
              style={styles.viewSessionLink}
            >
              {t("patientPaymentsFlow.paymentCard.viewSession")}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// WalletEntryRow
// ---------------------------------------------------------------------------

function WalletEntryRow({ entry }: { entry: CustomerWalletEntryItem }) {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const isCredit = entry.direction === "CREDIT";
  const typeKey =
    `patientPaymentsFlow.transactions.entryTypes.${entry.entryType}` as const;

  return (
    <View style={styles.entryRow}>
      <View
        style={[
          styles.entryIcon,
          {
            backgroundColor: isCredit
              ? theme.colors.primaryLight
              : theme.colors.surfaceSecondary,
          },
        ]}
      >
        <Ionicons
          name={isCredit ? "arrow-down" : "arrow-up"}
          size={14}
          color={isCredit ? theme.colors.primary : theme.colors.textSecondary}
        />
      </View>
      <View style={styles.entryTextWrap}>
        <Text weight="600" style={styles.entryTypeText}>
          {t(typeKey)}
        </Text>
        <Text color={theme.colors.textMuted} style={styles.entryDate}>
          {formatDate(entry.effectiveAt, locale)}
        </Text>
        {entry.description ? (
          <Text
            color={theme.colors.textSecondary}
            style={styles.entryDescription}
          >
            {entry.description}
          </Text>
        ) : null}
      </View>
      <Text
        weight="bold"
        color={isCredit ? theme.colors.primary : theme.colors.textPrimary}
        style={styles.entryAmount}
      >
        {isCredit ? "+" : "-"}
        {formatMoney(entry.amount, entry.currencyCode)}
      </Text>
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
  const paymentsQuery = usePatientPayments({ limit: 10 });
  const entriesQuery = usePatientWalletEntries({ limit: 5 });

  const wallet = walletQuery.data?.item ?? null;
  const payments = paymentsQuery.data?.items ?? [];
  const entries = entriesQuery.data?.items ?? [];
  const fallbackCurrency =
    wallet?.currencyCode ??
    entries[0]?.currencyCode ??
    payments[0]?.currency ??
    "SAR";

  const isLoading =
    walletQuery.isLoading && paymentsQuery.isLoading && entriesQuery.isLoading;

  if (isLoading) {
    return (
      <Screen bg="background">
        <Header title={t("patientPaymentsFlow.wallet.title")} />
        <LoadingState fullScreen />
      </Screen>
    );
  }

  return (
    <Screen bg="background">
      <Header title={t("patientPaymentsFlow.wallet.title")} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Balance hero ── */}
        <Card
          variant="elevated"
          padding="lg"
          style={[
            styles.heroCard,
            isRtl
              ? {
                  borderLeftWidth: 3,
                  borderLeftColor: theme.colors.primary,
                  borderRightWidth: 0,
                }
              : { borderRightWidth: 3, borderRightColor: theme.colors.primary },
          ]}
        >
          <View style={styles.heroTopRow}>
            <Ionicons
              name="wallet-outline"
              size={20}
              color={theme.colors.primary}
            />
            <Text
              color={theme.colors.textSecondary}
              style={styles.heroBalanceLabel}
            >
              {t("patientPaymentsFlow.wallet.balanceLabel")}
            </Text>
          </View>

          {walletQuery.isLoading ? (
            <LoadingState />
          ) : walletQuery.isError ? (
            <TouchableOpacity onPress={() => walletQuery.refetch()}>
              <Text color={theme.colors.primary} style={styles.retryText}>
                {t("patientPaymentsFlow.wallet.retry")}
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              <Text weight="bold" style={styles.heroAmount}>
                {formatMoney(wallet?.availableBalance ?? "0", fallbackCurrency)}
              </Text>
              <Text color={theme.colors.textMuted} style={styles.heroHint}>
                {t("patientPaymentsFlow.wallet.availableHint")}
              </Text>
              {wallet && Number(wallet.reservedBalance) > 0 && (
                <Text
                  color={theme.colors.textMuted}
                  style={styles.reservedText}
                >
                  {t("patientPaymentsFlow.wallet.reservedLabel")}:{" "}
                  {formatMoney(wallet.reservedBalance, wallet.currencyCode)}
                </Text>
              )}
            </>
          )}

          {/* Add Funds — honest blocker notice */}
          <View
            style={[
              styles.addFundsBtn,
              { backgroundColor: theme.colors.primaryLight },
            ]}
          >
            <Ionicons name="add" size={16} color={theme.colors.primary} />
            <Text
              color={theme.colors.primary}
              weight="600"
              style={styles.addFundsBtnText}
            >
              {t("patientPaymentsFlow.wallet.addFundsUnavailable")}
            </Text>
          </View>
        </Card>

        {/* ── Payment methods — honest blocker ── */}
        <Card variant="flat" padding="md" style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text weight="600" style={styles.sectionTitle}>
              {t("patientPaymentsFlow.wallet.paymentMethodsTitle")}
            </Text>
            <Ionicons
              name="add-circle-outline"
              size={22}
              color={theme.colors.textMuted}
            />
          </View>
          <Text color={theme.colors.textMuted} style={styles.blockerNote}>
            {t("patientPaymentsFlow.wallet.paymentMethodsUnavailable")}
          </Text>
        </Card>

        {/* ── Recent transactions (wallet entries) ── */}
        <Card variant="elevated" padding="md" style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text weight="600" style={styles.sectionTitle}>
              {t("patientPaymentsFlow.wallet.recentTitle")}
            </Text>
            {entriesQuery.data &&
              entriesQuery.data.pagination.totalItems > 5 && (
                <TouchableOpacity
                  onPress={() => router.push("/payments/transactions")}
                >
                  <Text
                    color={theme.colors.primary}
                    weight="600"
                    style={styles.viewAllText}
                  >
                    {t("patientPaymentsFlow.wallet.viewAll")}
                  </Text>
                </TouchableOpacity>
              )}
          </View>

          {entriesQuery.isLoading ? (
            <LoadingState />
          ) : entriesQuery.isError ? (
            <TouchableOpacity onPress={() => entriesQuery.refetch()}>
              <Text color={theme.colors.primary} style={styles.retryText}>
                {t("patientPaymentsFlow.wallet.retry")}
              </Text>
            </TouchableOpacity>
          ) : entries.length > 0 ? (
            <View style={styles.entryList}>
              {entries.map((entry) => (
                <WalletEntryRow key={entry.id} entry={entry} />
              ))}
            </View>
          ) : (
            <Text color={theme.colors.textMuted} style={styles.emptyNote}>
              {t("patientPaymentsFlow.wallet.activityEmpty")}
            </Text>
          )}
        </Card>

        {/* ── Payment history ── */}
        <View style={styles.section}>
          <Text weight="600" style={styles.paymentsTitle}>
            {t("patientPaymentsFlow.payments.sectionTitle")}
          </Text>

          {paymentsQuery.isLoading ? (
            <LoadingState />
          ) : paymentsQuery.isError ? (
            <ErrorState onRetry={() => paymentsQuery.refetch()} />
          ) : payments.length > 0 ? (
            <View style={styles.paymentList}>
              {payments.map((p) => (
                <PaymentCard key={p.id} payment={p} />
              ))}
            </View>
          ) : (
            <EmptyState
              title={t("patientPaymentsFlow.payments.emptyTitle")}
              description={t("patientPaymentsFlow.payments.emptyNote")}
              icon={
                <Ionicons
                  name="card-outline"
                  size={44}
                  color={theme.colors.textMuted}
                />
              }
              onAction={() => router.push("/sessions")}
              actionLabel={t("patientPaymentsFlow.payments.emptyAction")}
            />
          )}
        </View>

        {/* ── Secure badge ── */}
        <View style={styles.secureRow}>
          <Ionicons
            name="shield-checkmark-outline"
            size={14}
            color={theme.colors.textMuted}
          />
          <Text color={theme.colors.textMuted} style={styles.secureText}>
            {t("patientPaymentsFlow.wallet.secureHint")}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 16, paddingBottom: 32, gap: 16 },
  heroCard: { marginBottom: 0 },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  heroBalanceLabel: { fontSize: 14 },
  heroAmount: { fontSize: 40, letterSpacing: -1, marginBottom: 4 },
  heroHint: { fontSize: 12, marginBottom: 8 },
  reservedText: { fontSize: 12, marginBottom: 8 },
  addFundsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  addFundsBtnText: { fontSize: 14 },
  section: { marginBottom: 0 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 15 },
  blockerNote: { fontSize: 13 },
  viewAllText: { fontSize: 13 },
  entryList: { gap: 12 },
  entryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  entryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  entryTextWrap: { flex: 1 },
  entryTypeText: { fontSize: 14 },
  entryDate: { fontSize: 12, marginTop: 2 },
  entryDescription: { fontSize: 12, marginTop: 2 },
  entryAmount: { fontSize: 14, textAlign: "right" },
  emptyNote: { fontSize: 13, marginTop: 4 },
  paymentsTitle: { fontSize: 15, marginBottom: 10 },
  paymentList: { gap: 12 },
  paymentCard: { marginBottom: 0 },
  paymentCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  paymentAmount: { fontSize: 18 },
  paymentProvider: { fontSize: 12, marginTop: 2 },
  divider: { height: 1, marginBottom: 8 },
  paymentDate: { fontSize: 12, marginBottom: 6 },
  splitRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 8 },
  splitChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  splitChipText: { fontSize: 11 },
  paymentActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  payActionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  payActionText: { fontSize: 13 },
  viewSessionLink: { fontSize: 13 },
  secureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
  },
  secureText: { fontSize: 12 },
  retryText: { fontSize: 13, marginTop: 4 },
});
