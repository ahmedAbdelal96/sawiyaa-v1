import React, { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ErrorState,
  Header,
  LoadingState,
  Screen,
  StatusChip,
  Text,
} from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { useAppDirection } from "../../../src/i18n/direction";
import {
  usePatientPayments,
  usePatientWalletEntries,
  usePatientWalletSummary,
} from "../../../src/features/patient/payments/hooks";
import { formatMoney, parseMoney } from "../../../src/lib/money";
import { formatViewerDate } from "../../../src/lib/time-formatting";
import {
  activityStatusKey,
  activityTitleKey,
  buildFinancialActivity,
} from "../../../src/features/patient/payments/wallet-view-model";
import type { WalletActivityItem } from "../../../src/features/patient/payments/wallet-view-model";

type FilterTab = "all" | "payments" | "credits" | "refunds";

export default function TransactionHistoryScreen() {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { isRtl, rowDirection, textAlign } = useAppDirection();
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  const walletQuery = usePatientWalletSummary();
  const entriesQuery = usePatientWalletEntries({ limit: 50 });
  const paymentsQuery = usePatientPayments({ limit: 50 });
  const wallet = walletQuery.data?.item ?? null;

  const allActivity = useMemo(
    () =>
      buildFinancialActivity(entriesQuery.data?.items ?? [], paymentsQuery.data?.items ?? []),
    [entriesQuery.data?.items, paymentsQuery.data?.items],
  );

  const filteredActivity = useMemo(
    () => allActivity.filter((item) => matchesFilter(item, activeFilter)),
    [activeFilter, allActivity],
  );

  const isLoading = walletQuery.isLoading || entriesQuery.isLoading || paymentsQuery.isLoading;
  const isError = walletQuery.isError || entriesQuery.isError || paymentsQuery.isError;

  if (isLoading && !wallet) {
    return (
      <Screen bg="background" testID="patient-transactions-screen">
        <Header showBack title={t("patientPaymentsFlow.transactions.title")} />
        <LoadingState fullScreen message={t("patientPaymentsFlow.transactions.loading")} />
      </Screen>
    );
  }

  if (isError && !wallet && allActivity.length === 0) {
    return (
      <Screen bg="background" testID="patient-transactions-screen">
        <Header showBack title={t("patientPaymentsFlow.transactions.title")} />
        <ErrorState
          fullScreen
          title={t("patientPaymentsFlow.transactions.errorTitle")}
          message={t("patientPaymentsFlow.transactions.errorNote")}
          retryText={t("patientPaymentsFlow.transactions.retry")}
          onRetry={() => {
            void walletQuery.refetch();
            void entriesQuery.refetch();
            void paymentsQuery.refetch();
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen bg="background" testID="patient-transactions-screen">
      <Header showBack title={t("patientPaymentsFlow.transactions.title")} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {wallet ? (
          <View style={[styles.balanceSummary, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
            <Text color={theme.colors.textSecondary} style={{ textAlign }}>
              {t("patientPaymentsFlow.wallet.balanceLabel")}
            </Text>
            <Text variant="title" weight="700" style={{ textAlign }} testID="patient-transactions-balance">
              {formatWalletMoney(wallet.availableBalance, wallet.currencyCode, locale)}
            </Text>
          </View>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeFilter === filter }}
              onPress={() => setActiveFilter(filter)}
              style={[
                styles.filter,
                {
                  backgroundColor: activeFilter === filter ? theme.colors.primary : theme.colors.background,
                  borderColor: activeFilter === filter ? theme.colors.primary : theme.colors.border,
                },
              ]}
            >
              <Text color={activeFilter === filter ? theme.colors.inverseOnSurface : theme.colors.textSecondary} weight="700">
                {t(`patientPaymentsFlow.transactions.filters.${filter}` as Parameters<typeof t>[0])}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {isError ? (
          <View style={[styles.inlineError, { borderColor: theme.colors.border }]}>
            <Text weight="700" style={{ textAlign }}>
              {t("patientPaymentsFlow.transactions.errorTitle")}
            </Text>
            <Text color={theme.colors.textSecondary} style={{ textAlign }}>
              {t("patientPaymentsFlow.transactions.errorNote")}
            </Text>
            <TouchableOpacity onPress={() => {
              void entriesQuery.refetch();
              void paymentsQuery.refetch();
            }}>
              <Text color={theme.colors.primary} weight="700">
                {t("patientPaymentsFlow.transactions.retry")}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {filteredActivity.length === 0 ? (
          <View style={styles.emptyState} testID="patient-transactions-empty-state">
            <Ionicons name="receipt-outline" size={26} color={theme.colors.textMuted} />
            <Text variant="title" weight="700" style={{ textAlign }}>
              {t("patientPaymentsFlow.transactions.emptyTitle")}
            </Text>
            <Text color={theme.colors.textSecondary} style={[styles.centerText, { textAlign }]}>
              {t("patientPaymentsFlow.transactions.emptyNote")}
            </Text>
          </View>
        ) : (
          <View style={[styles.activityList, { borderColor: theme.colors.border }]}>
            {groupActivityByDay(filteredActivity).map((group) => (
              <View key={group.key}>
                <Text color={theme.colors.textMuted} weight="700" style={[styles.dayLabel, { textAlign }]}>
                  {formatViewerDate(group.date, { locale })}
                </Text>
                {group.items.map((item, index) => (
                  <TransactionRow
                    key={item.id}
                    item={item}
                    locale={locale}
                    isRtl={isRtl}
                    rowDirection={rowDirection}
                    textAlign={textAlign}
                    theme={theme}
                    showDivider={index < group.items.length - 1 || group.key !== lastGroupKey(filteredActivity)}
                    onOpenSession={(sessionId) => router.push(`/(patient)/sessions/${sessionId}`)}
                  />
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const FILTERS: FilterTab[] = ["all", "payments", "credits", "refunds"];

function matchesFilter(item: WalletActivityItem, filter: FilterTab) {
  if (filter === "all") return true;
  if (filter === "payments") return item.source === "payment" || item.titleKey === "sessionPayment";
  if (filter === "refunds") return item.titleKey === "refund" || item.statusKey === "refundProcessing" || item.statusKey === "refunded";
  return item.direction === "CREDIT" && item.source === "wallet" && item.titleKey !== "refund";
}

function groupActivityByDay(items: WalletActivityItem[]) {
  const groups = new Map<string, { key: string; date: string; items: WalletActivityItem[] }>();
  for (const item of items) {
    const date = new Date(item.occurredAt);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const group = groups.get(key) ?? { key, date: item.occurredAt, items: [] };
    group.items.push(item);
    groups.set(key, group);
  }
  return Array.from(groups.values());
}

function lastGroupKey(items: WalletActivityItem[]) {
  const groups = groupActivityByDay(items);
  return groups.at(-1)?.key;
}

function TransactionRow({
  item,
  locale,
  isRtl,
  rowDirection,
  textAlign,
  theme,
  showDivider,
  onOpenSession,
}: {
  item: WalletActivityItem;
  locale: string;
  isRtl: boolean;
  rowDirection: "row" | "row-reverse";
  textAlign: "left" | "right";
  theme: ReturnType<typeof useTheme>["theme"];
  showDivider: boolean;
  onOpenSession: (sessionId: string) => void;
}) {
  const { t } = useTranslation();
  const isCredit = item.direction === "CREDIT";
  const statusKey = activityStatusKey(item);
  const row = (
    <View style={[styles.transactionRow, { flexDirection: rowDirection, borderBottomColor: theme.colors.divider, borderBottomWidth: showDivider ? StyleSheet.hairlineWidth : 0 }]}>
      <View style={[styles.entryIcon, { backgroundColor: isCredit ? theme.colors.successLight : theme.colors.surfaceMuted }]}>
        <Ionicons name={isCredit ? "arrow-down-outline" : "arrow-up-outline"} size={16} color={isCredit ? theme.colors.success : theme.colors.textSecondary} />
      </View>
      <View style={styles.transactionCopy}>
        <Text weight="700" style={{ textAlign }} numberOfLines={1}>
          {t(activityTitleKey(item) as Parameters<typeof t>[0])}
        </Text>
        {statusKey ? (
          <StatusChip
            label={t(statusKey as Parameters<typeof t>[0])}
            tone={item.statusKey === "completed" || item.statusKey === "refunded" ? "success" : "warning"}
            showDot={false}
          />
        ) : null}
      </View>
      <Text weight="700" color={isCredit ? theme.colors.success : theme.colors.textPrimary} style={[styles.amount, { textAlign: isRtl ? "left" : "right" }]}>
        {isCredit ? "+" : "−"}{formatWalletMoney(item.amount, item.currencyCode, locale)}
      </Text>
    </View>
  );

  return (
    <>
      {item.sessionId ? (
        <TouchableOpacity onPress={() => onOpenSession(item.sessionId!)} accessibilityRole="button">
          {row}
        </TouchableOpacity>
      ) : row}
    </>
  );
}

function formatWalletMoney(amount: string, currencyCode: string, locale: string) {
  const money = parseMoney(amount, currencyCode);
  return money ? formatMoney(money, locale) : "—";
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32, gap: 16 },
  balanceSummary: { borderRadius: 16, borderWidth: 1, gap: 4, padding: 16 },
  filterRow: { gap: 8, paddingVertical: 2 },
  filter: { borderRadius: 18, borderWidth: 1, minHeight: 38, justifyContent: "center", paddingHorizontal: 14 },
  inlineError: { borderRadius: 14, borderWidth: 1, gap: 8, padding: 14 },
  activityList: { borderBottomWidth: StyleSheet.hairlineWidth, borderTopWidth: StyleSheet.hairlineWidth },
  dayLabel: { fontSize: 13, paddingBottom: 6, paddingTop: 14 },
  transactionRow: { alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, gap: 10, minHeight: 68, paddingVertical: 12 },
  entryIcon: { alignItems: "center", borderRadius: 12, height: 36, justifyContent: "center", width: 36 },
  transactionCopy: { flex: 1, gap: 3 },
  amount: { maxWidth: 130 },
  emptyState: { alignItems: "center", gap: 8, paddingVertical: 48 },
  centerText: { textAlign: "center" },
});
