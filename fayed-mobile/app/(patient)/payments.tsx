import React, { useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
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
  ScreenHeading,
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
import { resolveSupportedCurrencyCode } from "../../src/lib/currency";
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
 * Output: "350.50 EGP" / "1,250 USD" — matches approved Arabic design.
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

function resolvePaymentActionLabel(status: PaymentStatus) {
  return status === "FAILED"
    ? "patientPaymentsFlow.paymentCard.retryPayment"
    : "patientPaymentsFlow.paymentCard.payNow";
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
              onPress={() =>
                router.push(`/(patient)/sessions/${payment.sessionId}/pay`)
              }
          >
            <Text color="#fff" weight="600" style={styles.payActionText}>
              {t(actionKey as Parameters<typeof t>[0])}
            </Text>
          </TouchableOpacity>
        )}
        {payment.sessionId && (
          <TouchableOpacity
            onPress={() =>
              router.push(`/(patient)/sessions/${payment.sessionId}`)
            }
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
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const isRtl = i18n.language?.startsWith("ar") ?? false;

  const walletQuery = usePatientWalletSummary();
  const paymentsQuery = usePatientPayments({ limit: 6 });
  const entriesQuery = usePatientWalletEntries({ limit: 5 });

  const wallet = walletQuery.data?.item ?? null;
  const paymentsData = paymentsQuery.data ?? null;
  const payments = paymentsQuery.data?.items ?? [];
  const entries = entriesQuery.data?.items ?? [];
  const recentPayments = payments.slice(0, 3);
  const recentEntries = entries.slice(0, 3);
  const actionablePayment = payments.find((payment) =>
    canContinueOrRetryPayment(payment.status),
  );
  const fallbackCurrency = resolveSupportedCurrencyCode({
    currencyCode:
      wallet?.currencyCode ??
      entries[0]?.currencyCode ??
      payments[0]?.currency ??
      null,
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
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Balance hero ── */}
        <ScreenHeading
          title={t("patientPaymentsFlow.wallet.title")}
          subtitle={t("patientPaymentsFlow.wallet.subtitle")}
          titleVariant="h2"
        />
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
              {wallet ? (
                <View style={styles.heroStatsRow}>
                  <View
                    style={[
                      styles.heroStat,
                      { backgroundColor: theme.colors.surfaceSecondary },
                    ]}
                  >
                    <Text
                      color={theme.colors.textMuted}
                      style={styles.heroStatLabel}
                    >
                      {t("patientPaymentsFlow.wallet.reservedLabel")}
                    </Text>
                    <Text weight="600" style={styles.heroStatValue}>
                      {formatMoney(wallet.reservedBalance, wallet.currencyCode)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.heroStat,
                      { backgroundColor: theme.colors.primaryLight },
                    ]}
                  >
                    <Text
                      color={theme.colors.primary}
                      style={styles.heroStatLabel}
                    >
                      {t("patientPaymentsFlow.wallet.lastUpdatedLabel")}
                    </Text>
                    <Text
                      weight="600"
                      style={[styles.heroStatValue, { color: theme.colors.primary }]}
                    >
                      {formatDate(wallet.updatedAt, locale)}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text color={theme.colors.textMuted} style={styles.noWalletNote}>
                  {t("patientPaymentsFlow.wallet.noWallet")}
                </Text>
              )}
            </>
          )}
        </Card>

        <Card variant="outlined" padding="lg" style={styles.statusCard}>
          <View style={styles.sectionHeader}>
            <Text weight="600" style={styles.sectionTitle}>
              {t("patientPaymentsFlow.wallet.statusTitle")}
            </Text>
            <StatusBadge
              label={
                actionablePayment
                  ? t("patientPaymentsFlow.wallet.statusNeedsAttention")
                  : t("patientPaymentsFlow.wallet.statusAllGood")
              }
              status={actionablePayment ? "warning" : "success"}
            />
          </View>
          <View style={styles.paymentStatusBody}>
            {paymentsQuery.isLoading ? (
              <LoadingState />
            ) : paymentsQuery.isError ? (
              <TouchableOpacity onPress={() => paymentsQuery.refetch()}>
                <Text color={theme.colors.primary} style={styles.retryText}>
                  {t("patientPaymentsFlow.wallet.retry")}
                </Text>
              </TouchableOpacity>
            ) : actionablePayment ? (
              <View style={styles.actionablePaymentCard}>
                <View style={styles.actionablePaymentHeader}>
                  <View style={styles.actionablePaymentCopy}>
                    <Text weight="bold" style={styles.paymentAmount}>
                      {formatMoney(
                        actionablePayment.amountTotal,
                        actionablePayment.currency,
                      )}
                    </Text>
                    <Text color={theme.colors.textMuted} style={styles.paymentProvider}>
                      {t(
                        `patientPaymentsFlow.paymentCard.provider.${actionablePayment.provider}` as Parameters<
                          typeof t
                        >[0],
                      )}
                    </Text>
                  </View>
                  <StatusBadge
                    label={t(
                      `patientPaymentsFlow.paymentCard.status.${actionablePayment.status}` as Parameters<
                        typeof t
                      >[0],
                    )}
                    status="warning"
                  />
                </View>

                <Text color={theme.colors.textSecondary} style={styles.paymentDate}>
                  {t("patientPaymentsFlow.wallet.statusPaymentDate")}{" "}
                  {formatDate(
                    actionablePayment.paidAt ??
                      actionablePayment.failedAt ??
                      actionablePayment.expiredAt ??
                      actionablePayment.createdAt,
                    locale,
                  )}
                </Text>

                <View style={styles.actionButtonsRow}>
                  {actionablePayment.sessionId ? (
                    <Button
                      title={t(
                        resolvePaymentActionLabel(actionablePayment.status) as Parameters<
                          typeof t
                        >[0],
                      )}
                      onPress={() =>
                        router.push(
                          `/(patient)/sessions/${actionablePayment.sessionId}/pay`,
                        )
                      }
                      style={styles.actionButton}
                    />
                  ) : null}
                  {actionablePayment.sessionId ? (
                    <TouchableOpacity
                      onPress={() =>
                        router.push(`/(patient)/sessions/${actionablePayment.sessionId}`)
                      }
                    >
                      <Text
                        color={theme.colors.primary}
                        weight="600"
                        style={styles.viewSessionLink}
                      >
                        {t("patientPaymentsFlow.paymentCard.viewSession")}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ) : (
              <Text color={theme.colors.textMuted} style={styles.emptyNote}>
                {t("patientPaymentsFlow.wallet.statusClearBody")}
              </Text>
            )}

            <View style={styles.methodNote}>
              <Ionicons
                name="card-outline"
                size={14}
                color={theme.colors.textMuted}
              />
              <Text color={theme.colors.textSecondary} style={styles.methodNoteText}>
                {t("patientPaymentsFlow.wallet.paymentMethodsUnavailable")}
              </Text>
            </View>
            <Text color={theme.colors.textMuted} style={styles.methodFootnote}>
              {t("patientPaymentsFlow.wallet.addFundsUnavailable")}
            </Text>
          </View>
        </Card>

        <Card variant="elevated" padding="md" style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text weight="600" style={styles.sectionTitle}>
              {t("patientPaymentsFlow.wallet.recentTitle")}
            </Text>
            {entriesQuery.data &&
              entriesQuery.data.pagination.totalItems > recentEntries.length && (
                <TouchableOpacity
                  onPress={() => router.push("/(patient)/payments/transactions")}
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
          ) : recentEntries.length > 0 ? (
            <View style={styles.entryList}>
              {recentEntries.map((entry) => (
                <WalletEntryRow key={entry.id} entry={entry} />
              ))}
            </View>
          ) : (
            <Text color={theme.colors.textMuted} style={styles.emptyNote}>
              {t("patientPaymentsFlow.wallet.activityEmpty")}
            </Text>
          )}
        </Card>

        <Card variant="outlined" padding="md" style={styles.historyCard}>
          <TouchableOpacity
            onPress={() => setShowPaymentHistory((current) => !current)}
            activeOpacity={0.85}
            style={styles.historyHeader}
          >
            <View style={styles.historyHeaderText}>
              <Text weight="600" style={styles.sectionTitle}>
                {t("patientPaymentsFlow.payments.sectionTitle")}
              </Text>
              <Text color={theme.colors.textSecondary} style={styles.historySubtitle}>
                {t("patientPaymentsFlow.wallet.historyHint")}
              </Text>
            </View>
            <Ionicons
              name={showPaymentHistory ? "chevron-up" : "chevron-down"}
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>

          {showPaymentHistory ? (
            <View style={styles.historyBody}>
              {paymentsQuery.isLoading ? (
                <LoadingState />
              ) : paymentsQuery.isError ? (
                <ErrorState onRetry={() => paymentsQuery.refetch()} />
              ) : recentPayments.length > 0 ? (
                <View style={styles.paymentList}>
                  {recentPayments.map((payment) => (
                    <PaymentCard key={payment.id} payment={payment} />
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
                  onAction={() => router.push("/(patient)/sessions")}
                  actionLabel={t("patientPaymentsFlow.payments.emptyAction")}
                />
              )}

              {paymentsData &&
              paymentsData.pagination.totalItems > recentPayments.length ? (
                <TouchableOpacity
                  onPress={() => router.push("/(patient)/payments/transactions")}
                  style={styles.viewAllHistory}
                >
                  <Text color={theme.colors.primary} weight="600">
                    {t("patientPaymentsFlow.wallet.historyViewAll")}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            <Text color={theme.colors.textMuted} style={styles.emptyNote}>
              {t("patientPaymentsFlow.wallet.historyCollapsed")}
            </Text>
          )}
        </Card>

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
  heroBalanceLabel: { fontSize: 13, lineHeight: 19 },
  heroAmount: { fontSize: 30, lineHeight: 36, letterSpacing: -0.5, marginBottom: 4 },
  heroHint: { fontSize: 12, lineHeight: 17, marginBottom: 8 },
  heroStatsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 6,
  },
  heroStat: {
    flexGrow: 1,
    minWidth: 118,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  heroStatLabel: { fontSize: 11 },
  heroStatValue: { fontSize: 14, lineHeight: 20 },
  noWalletNote: { fontSize: 12, lineHeight: 18, marginTop: 8 },
  reservedText: { fontSize: 12, marginBottom: 8 },
  section: { marginBottom: 0 },
  statusCard: { marginBottom: 0 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, lineHeight: 22 },
  blockerNote: { fontSize: 13, lineHeight: 19 },
  viewAllText: { fontSize: 13, lineHeight: 19 },
  paymentStatusBody: { gap: 12 },
  actionablePaymentCard: {
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  actionablePaymentHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  actionablePaymentCopy: { flex: 1 },
  actionButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  actionButton: {
    flexGrow: 1,
    minWidth: 160,
  },
  methodNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 2,
  },
  methodNoteText: { fontSize: 12, lineHeight: 17, flex: 1 },
  methodFootnote: { fontSize: 12, lineHeight: 17 },
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
  entryTypeText: { fontSize: 13, lineHeight: 19 },
  entryDate: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  entryDescription: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  entryAmount: { fontSize: 13, lineHeight: 19, textAlign: "right" },
  emptyNote: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  paymentsTitle: { fontSize: 15, lineHeight: 21, marginBottom: 10 },
  paymentList: { gap: 12 },
  historyCard: { marginBottom: 0 },
  historyHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  historyHeaderText: { flex: 1, gap: 4 },
  historySubtitle: { fontSize: 12, lineHeight: 17 },
  historyBody: { gap: 12, marginTop: 12 },
  viewAllHistory: { alignSelf: "flex-start" },
  paymentCard: { marginBottom: 0 },
  paymentCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  paymentAmount: { fontSize: 17, lineHeight: 24 },
  paymentProvider: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  divider: { height: 1, marginBottom: 8 },
  paymentDate: { fontSize: 12, lineHeight: 17, marginBottom: 6 },
  splitRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 8 },
  splitChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  splitChipText: { fontSize: 11, lineHeight: 15 },
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
  payActionText: { fontSize: 13, lineHeight: 19 },
  viewSessionLink: { fontSize: 13, lineHeight: 19 },
  secureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
  },
  secureText: { fontSize: 12, lineHeight: 17 },
  retryText: { fontSize: 13, lineHeight: 19, marginTop: 4 },
});
