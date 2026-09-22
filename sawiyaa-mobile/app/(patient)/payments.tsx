import React, { useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Card,
  ErrorState,
  Header,
  LoadingState,
  Screen,
  StatusChip,
  Text,
} from "../../src/components/ui";
import { useTheme } from "../../src/providers/ThemeProvider";
import { useAppDirection } from "../../src/i18n/direction";
import { usePatientPayments, usePatientWalletEntries, usePatientWalletSummary } from "../../src/features/patient/payments/hooks";
import { formatMoney, parseMoney } from "../../src/lib/money";
import { formatViewerDate } from "../../src/lib/time-formatting";
import {
  activityStatusKey,
  activityTitleKey,
  buildFinancialActivity,
} from "../../src/features/patient/payments/wallet-view-model";
import type { WalletActivityItem } from "../../src/features/patient/payments/wallet-view-model";

export default function PatientPaymentsScreen() {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { isRtl, rowDirection, textAlign, chevronForward } = useAppDirection();
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";

  const walletQuery = usePatientWalletSummary();
  const paymentsQuery = usePatientPayments({ limit: 6 });
  const entriesQuery = usePatientWalletEntries({ limit: 8 });
  const wallet = walletQuery.data?.item ?? null;

  const activity = useMemo(() => {
    return buildFinancialActivity(entriesQuery.data?.items ?? [], paymentsQuery.data?.items ?? []).slice(0, 6);
  }, [entriesQuery.data?.items, paymentsQuery.data?.items]);

  const activityLoading = entriesQuery.isLoading || paymentsQuery.isLoading;
  const activityError = entriesQuery.isError || paymentsQuery.isError;

  const retryAll = () => {
    void walletQuery.refetch();
    void entriesQuery.refetch();
    void paymentsQuery.refetch();
  };

  if (walletQuery.isLoading && !wallet) {
    return (
      <Screen bg="background" testID="patient-wallet-screen">
        <Header showBack title={t("patientPaymentsFlow.wallet.title")} />
        <LoadingState fullScreen message={t("patientPaymentsFlow.wallet.loading")} />
      </Screen>
    );
  }

  if (walletQuery.isError && !wallet) {
    return (
      <Screen bg="background" testID="patient-wallet-screen">
        <Header showBack title={t("patientPaymentsFlow.wallet.title")} />
        <ErrorState
          fullScreen
          title={t("patientPaymentsFlow.wallet.errorTitle")}
          message={t("patientPaymentsFlow.wallet.errorNote")}
          retryText={t("patientPaymentsFlow.wallet.retry")}
          onRetry={retryAll}
        />
      </Screen>
    );
  }

  if (!wallet) {
    return (
      <Screen bg="background" testID="patient-wallet-screen">
        <Header showBack title={t("patientPaymentsFlow.wallet.title")} />
        <View style={styles.noWalletState}>
          <Ionicons name="wallet-outline" size={28} color={theme.colors.primary} />
          <Text variant="title" weight="700" style={styles.centerText}>
            {t("patientPaymentsFlow.wallet.noWallet")}
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen bg="background" testID="patient-wallet-screen">
      <Header showBack title={t("patientPaymentsFlow.wallet.title")} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Card variant="outlined" padding="lg" style={styles.balanceCard}>
          <View style={[styles.balanceHeader, { flexDirection: rowDirection }]}>
            <View style={[styles.balanceIcon, { backgroundColor: theme.colors.primaryLight }]}>
              <Ionicons name="wallet-outline" size={18} color={theme.colors.primary} />
            </View>
            <Text color={theme.colors.textSecondary} style={[styles.balanceLabel, { textAlign }]}>
              {t("patientPaymentsFlow.wallet.balanceLabel")}
            </Text>
          </View>
          <Text
            variant="display"
            weight="700"
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.balanceAmount, { textAlign }]}
            testID="patient-wallet-balance"
          >
            {formatWalletMoney(wallet.availableBalance, wallet.currencyCode, locale)}
          </Text>
          {wallet.lastEntryAt ? (
            <Text color={theme.colors.textMuted} style={[styles.updatedText, { textAlign }]}>
              {t("patientPaymentsFlow.wallet.lastUpdatedLabel")} {formatViewerDate(wallet.lastEntryAt, { locale })}
            </Text>
          ) : null}
        </Card>

        <SectionHeading
          title={t("patientPaymentsFlow.activity.title")}
          actionLabel={t("patientPaymentsFlow.activity.viewAll")}
          onAction={() => router.push("/(patient)/payments/transactions")}
          direction={rowDirection}
          textAlign={textAlign}
          theme={theme}
        />

        <ActivitySection
          items={activity}
          loading={activityLoading}
          error={activityError}
          locale={locale}
          isRtl={isRtl}
          rowDirection={rowDirection}
          textAlign={textAlign}
          theme={theme}
          onRetry={() => {
            void entriesQuery.refetch();
            void paymentsQuery.refetch();
          }}
          onOpenSession={(sessionId) => router.push(`/(patient)/sessions/${sessionId}`)}
        />

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t("patientPaymentsFlow.transactions.title")}
          onPress={() => router.push("/(patient)/payments/transactions")}
          style={[styles.transactionsLink, { flexDirection: rowDirection, borderColor: theme.colors.border }]}
        >
          <View style={[styles.transactionsIcon, { backgroundColor: theme.colors.primaryLight }]}>
            <Ionicons name="receipt-outline" size={18} color={theme.colors.primary} />
          </View>
          <View style={styles.transactionsCopy}>
            <Text weight="700" style={{ textAlign }}>
              {t("patientPaymentsFlow.transactions.title")}
            </Text>
            <Text color={theme.colors.textSecondary} style={{ textAlign }}>
              {t("patientPaymentsFlow.activity.historyHint")}
            </Text>
          </View>
          <Ionicons name={chevronForward} size={18} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}

function SectionHeading({
  title,
  actionLabel,
  onAction,
  direction,
  textAlign,
  theme,
}: {
  title: string;
  actionLabel: string;
  onAction: () => void;
  direction: "row" | "row-reverse";
  textAlign: "left" | "right";
  theme: ReturnType<typeof useTheme>["theme"];
}) {
  return (
    <View style={[styles.sectionHeading, { flexDirection: direction }]}>
      <Text variant="title" weight="700" style={{ textAlign }}>
        {title}
      </Text>
      <TouchableOpacity onPress={onAction} accessibilityRole="button">
        <Text color={theme.colors.primary} weight="700">
          {actionLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function ActivitySection({
  items,
  loading,
  error,
  locale,
  isRtl,
  rowDirection,
  textAlign,
  theme,
  onRetry,
  onOpenSession,
}: {
  items: WalletActivityItem[];
  loading: boolean;
  error: boolean;
  locale: string;
  isRtl: boolean;
  rowDirection: "row" | "row-reverse";
  textAlign: "left" | "right";
  theme: ReturnType<typeof useTheme>["theme"];
  onRetry: () => void;
  onOpenSession: (sessionId: string) => void;
}) {
  const { t } = useTranslation();

  if (loading) {
    return <LoadingState message={t("patientPaymentsFlow.activity.loading")} />;
  }

  if (error) {
    return (
      <Card variant="outlined" padding="md">
        <Text weight="700" style={{ textAlign }}>
          {t("patientPaymentsFlow.activity.errorTitle")}
        </Text>
        <Text color={theme.colors.textSecondary} style={[styles.errorBody, { textAlign }]}>
          {t("patientPaymentsFlow.activity.errorNote")}
        </Text>
        <TouchableOpacity onPress={onRetry} accessibilityRole="button">
          <Text color={theme.colors.primary} weight="700" style={{ textAlign }}>
            {t("patientPaymentsFlow.activity.retry")}
          </Text>
        </TouchableOpacity>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.emptyActivity} testID="patient-wallet-empty-activity">
        <Ionicons name="receipt-outline" size={24} color={theme.colors.textMuted} />
        <Text weight="700" style={{ textAlign }}>
          {t("patientPaymentsFlow.activity.emptyTitle")}
        </Text>
        <Text color={theme.colors.textSecondary} style={[styles.centerText, { textAlign }]}>
          {t("patientPaymentsFlow.activity.emptyNote")}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.activityList, { borderColor: theme.colors.border }]}>
      {items.map((item, index) => (
        <ActivityRow
          key={item.id}
          item={item}
          locale={locale}
          isRtl={isRtl}
          rowDirection={rowDirection}
          textAlign={textAlign}
          theme={theme}
          showDivider={index < items.length - 1}
          onOpenSession={onOpenSession}
        />
      ))}
    </View>
  );
}

function ActivityRow({
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
  const title = t(activityTitleKey(item) as Parameters<typeof t>[0]);
  const statusKey = activityStatusKey(item);
  const amount = `${isCredit ? "+" : "−"}${formatWalletMoney(item.amount, item.currencyCode, locale)}`;
  const content = (
    <View style={[styles.activityRow, { flexDirection: rowDirection, borderBottomColor: theme.colors.divider, borderBottomWidth: showDivider ? StyleSheet.hairlineWidth : 0 }]}>
      <View style={[styles.activityIcon, { backgroundColor: isCredit ? theme.colors.successLight : theme.colors.surfaceMuted }]}>
        <Ionicons
          name={isCredit ? "arrow-down-outline" : "arrow-up-outline"}
          size={16}
          color={isCredit ? theme.colors.success : theme.colors.textSecondary}
        />
      </View>
      <View style={styles.activityCopy}>
        <Text weight="700" numberOfLines={1} style={{ textAlign }}>
          {title}
        </Text>
        <Text color={theme.colors.textSecondary} style={{ textAlign }}>
          {formatViewerDate(item.occurredAt, { locale })}
        </Text>
        {statusKey ? (
          <StatusChip
            label={t(statusKey as Parameters<typeof t>[0])}
            tone={item.statusKey === "completed" || item.statusKey === "refunded" ? "success" : "warning"}
            showDot={false}
          />
        ) : null}
      </View>
      <Text weight="700" color={isCredit ? theme.colors.success : theme.colors.textPrimary} style={[styles.activityAmount, { textAlign: isRtl ? "left" : "right" }]}>
        {amount}
      </Text>
    </View>
  );

  return (
    <>
      {item.sessionId ? (
        <TouchableOpacity onPress={() => onOpenSession(item.sessionId!)} accessibilityRole="button">
          {content}
        </TouchableOpacity>
      ) : content}
    </>
  );
}

function formatWalletMoney(amount: string, currencyCode: string, locale: string) {
  const money = parseMoney(amount, currencyCode);
  return money ? formatMoney(money, locale) : "—";
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32, gap: 16 },
  balanceCard: { borderRadius: 20, gap: 10 },
  balanceHeader: { alignItems: "center", gap: 10 },
  balanceIcon: { alignItems: "center", borderRadius: 12, height: 38, justifyContent: "center", width: 38 },
  balanceLabel: { flex: 1, fontSize: 15 },
  balanceAmount: { fontSize: 30, lineHeight: 38 },
  balanceHint: { fontSize: 13 },
  updatedText: { fontSize: 12 },
  sectionHeading: { alignItems: "center", justifyContent: "space-between", gap: 12 },
  activityList: { backgroundColor: "transparent", borderBottomWidth: StyleSheet.hairlineWidth, borderTopWidth: StyleSheet.hairlineWidth },
  activityRow: { alignItems: "center", gap: 10, minHeight: 76, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  activityIcon: { alignItems: "center", borderRadius: 12, height: 36, justifyContent: "center", width: 36 },
  activityCopy: { flex: 1, gap: 3 },
  activityAmount: { maxWidth: 120 },
  transactionsLink: { alignItems: "center", borderRadius: 14, borderWidth: 1, gap: 10, padding: 14 },
  transactionsIcon: { alignItems: "center", borderRadius: 10, height: 34, justifyContent: "center", width: 34 },
  transactionsCopy: { flex: 1, gap: 2 },
  emptyActivity: { alignItems: "center", gap: 8, paddingVertical: 24 },
  noWalletState: { alignItems: "center", flex: 1, gap: 12, justifyContent: "center", padding: 24 },
  centerText: { textAlign: "center" },
  errorBody: { marginVertical: 8 },
});
