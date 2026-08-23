import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Card,
  ErrorState,
  Header,
  LoadingState,
  Screen,
  StatusBadge,
  Text,
} from "../../../src/components/ui";
import {
  usePractitionerSettlementItems,
  usePractitionerWalletSummary,
} from "../../../src/features/practitioner/finance/hooks";
import {
  formatDateShort,
  formatMoney,
  settlementStatusLabel,
  settlementStatusTone,
} from "../../../src/features/practitioner/finance/utils";
import type { PractitionerSettlementItem } from "../../../src/features/practitioner/finance/types";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { resolvePractitionerTone } from "../../../src/features/practitioner/ui/compact";

const PREVIEW_LIMIT = 3;
type TranslateFn = ReturnType<typeof useTranslation>["t"];

export default function PractitionerEarningsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { theme } = useTheme();
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const walletQuery = usePractitionerWalletSummary();
  const transfersQuery = usePractitionerSettlementItems({ page: 1, limit: PREVIEW_LIMIT });
  const wallet = walletQuery.data?.item ?? null;

  if (walletQuery.isLoading) {
    return (
      <Screen bg="background" testID="practitioner-earnings-screen">
        <Header title={t("practitioner.finance.product.earnings")} showBack />
        <LoadingState fullScreen message={t("practitioner.finance.common.loading")} />
      </Screen>
    );
  }

  if (walletQuery.isError) {
    return (
      <Screen bg="background" testID="practitioner-earnings-screen">
        <Header title={t("practitioner.finance.product.earnings")} showBack />
        <ErrorState
          fullScreen
          title={t("practitioner.finance.wallet.errorTitle")}
          message={t("practitioner.finance.wallet.errorBody")}
          onRetry={walletQuery.refetch}
        />
      </Screen>
    );
  }

  return (
    <Screen bg="background" testID="practitioner-earnings-screen">
      <Header
        title={t("practitioner.finance.product.earnings")}
        showBack
        rightElement={
          <TouchableOpacity
            accessibilityLabel={t("practitioner.finance.common.refresh")}
            onPress={() => void walletQuery.refetch()}
            style={styles.headerAction}
          >
            <Ionicons name="refresh-outline" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Card variant="outlined" padding="sm" style={styles.summaryCard}>
          <Text color={theme.colors.textMuted} style={styles.eyebrow}>
            {t("practitioner.finance.product.available")}
          </Text>
          <Text weight="700" style={styles.balanceValue}>
            {formatMoney(
              wallet?.availableBalance ?? "0",
              wallet?.currency,
              locale,
              t("practitioner.finance.common.currencyUnavailable"),
            )}
          </Text>
          <View style={[styles.summaryList, { borderColor: theme.colors.borderLight }]}>
            <SummaryLine
              label={t("practitioner.finance.product.underReview")}
              value={formatMoney(
                wallet?.pendingBalance ?? "0",
                wallet?.currency,
                locale,
                t("practitioner.finance.common.currencyUnavailable"),
              )}
            />
            <SummaryLine
              label={t("practitioner.finance.product.earnings")}
              value={formatMoney(
                wallet?.totalEarned ?? "0",
                wallet?.currency,
                locale,
                t("practitioner.finance.common.currencyUnavailable"),
              )}
            />
            <SummaryLine
              label={t("practitioner.finance.product.transferred")}
              value={formatMoney(
                wallet?.lifetimePaidOut ?? "0",
                wallet?.currency,
                locale,
                t("practitioner.finance.common.currencyUnavailable"),
              )}
            />
          </View>
        </Card>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text weight="600" style={styles.sectionTitle}>
              {t("practitioner.finance.product.recentTransfers")}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t("practitioner.finance.product.viewAllTransfers")}
              onPress={() => router.push("/(practitioner)/finance/settlements")}
            >
              <Text weight="600" style={[styles.actionLink, { color: theme.colors.primary }]}>
                {t("practitioner.finance.common.viewAll")}
              </Text>
            </TouchableOpacity>
          </View>

          {transfersQuery.isLoading ? (
            <LoadingState message={t("practitioner.finance.common.loading")} />
          ) : transfersQuery.isError ? (
            <ErrorState
              title={t("practitioner.finance.settlements.errorTitle")}
              message={t("practitioner.finance.settlements.errorBody")}
              onRetry={transfersQuery.refetch}
            />
          ) : transfersQuery.data?.items.length ? (
            <View style={[styles.transferList, { borderTopColor: theme.colors.borderLight }]}>
              {transfersQuery.data.items.map((item) => (
                <TransferRow key={item.id} item={item} locale={locale} t={t} />
              ))}
            </View>
          ) : (
            <Text color={theme.colors.textSecondary} style={styles.emptyText}>
              {t("practitioner.finance.product.noTransfers")}
            </Text>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.summaryLine, { borderBottomColor: theme.colors.borderLight }]}>
      <Text color={theme.colors.textSecondary} style={styles.summaryLabel}>
        {label}
      </Text>
      <Text weight="600" style={styles.summaryValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function TransferRow({
  item,
  locale,
  t,
}: {
  item: PractitionerSettlementItem;
  locale: string;
  t: TranslateFn;
}) {
  const { theme } = useTheme();
  const palette = resolvePractitionerTone(
    theme,
    item.status === "PAID"
      ? "success"
      : item.status === "FAILED" || item.status === "CANCELLED"
        ? "danger"
        : "warning",
  );
  const amount = formatMoney(
    item.amountNet,
    item.currency,
    locale,
    t("practitioner.finance.common.currencyUnavailable"),
  );

  return (
    <View
      accessible
      accessibilityLabel={`${t("practitioner.finance.product.transfers")}. ${amount}. ${settlementStatusLabel(item.status, t)}. ${formatDateShort(item.paidAt ?? item.failedAt ?? item.createdAt, locale)}`}
      style={[styles.transferRow, { borderBottomColor: theme.colors.borderLight }]}
    >
      <View style={styles.transferCopy}>
        <Text weight="600" style={styles.transferTitle} numberOfLines={1}>
          {t("practitioner.finance.product.transfer")}
        </Text>
        <Text color={theme.colors.textMuted} style={styles.transferMeta} numberOfLines={1}>
          {formatDateShort(item.paidAt ?? item.failedAt ?? item.createdAt, locale)}
        </Text>
      </View>
      <View style={styles.transferAmountWrap}>
        <Text weight="600" style={[styles.transferAmount, { color: palette.accent }]} numberOfLines={1}>
          {amount}
        </Text>
        <StatusBadge label={settlementStatusLabel(item.status, t)} status={settlementStatusTone(item.status)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 18,
  },
  headerAction: {
    padding: 8,
  },
  summaryCard: {
    gap: 7,
  },
  eyebrow: {
    fontSize: 11,
  },
  balanceValue: {
    fontSize: 25,
    lineHeight: 32,
  },
  summaryList: {
    borderTopWidth: 1,
    marginTop: 5,
  },
  summaryLine: {
    minHeight: 34,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  summaryLabel: {
    fontSize: 10,
    flex: 1,
  },
  summaryValue: {
    fontSize: 11,
    maxWidth: "58%",
    textAlign: "left",
  },
  section: {
    gap: 0,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 5,
  },
  sectionTitle: {
    fontSize: 15,
  },
  actionLink: {
    fontSize: 11,
  },
  transferList: {
    borderTopWidth: 1,
  },
  transferRow: {
    minHeight: 62,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  transferCopy: {
    flex: 1,
    gap: 2,
  },
  transferTitle: {
    fontSize: 11,
  },
  transferMeta: {
    fontSize: 9,
  },
  transferAmountWrap: {
    alignItems: "flex-end",
    gap: 3,
    maxWidth: "53%",
  },
  transferAmount: {
    fontSize: 11,
  },
  emptyText: {
    fontSize: 12,
    paddingVertical: 14,
  },
});
