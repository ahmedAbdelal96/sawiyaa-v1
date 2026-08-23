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
  Text,
} from "../../../src/components/ui";
import {
  usePractitionerLedgerEntries,
  usePractitionerSettlementItems,
  usePractitionerWalletSummary,
} from "../../../src/features/practitioner/finance/hooks";
import {
  formatDateShort,
  formatMoney,
  formatSignedMoney,
  ledgerBucketLabel,
  ledgerEntryTypeLabel,
  safeFinanceText,
} from "../../../src/features/practitioner/finance/utils";
import type { PractitionerLedgerEntry } from "../../../src/features/practitioner/finance/types";
import { resolvePractitionerTone } from "../../../src/features/practitioner/ui/compact";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { useAppDirection } from "../../../src/i18n/direction";

const PREVIEW_LIMIT = 5;
type TranslateFn = ReturnType<typeof useTranslation>["t"];

export default function PractitionerFinanceOverviewScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { theme } = useTheme();
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";

  const walletQuery = usePractitionerWalletSummary();
  const ledgerQuery = usePractitionerLedgerEntries({ page: 1, limit: PREVIEW_LIMIT });
  const settlementsQuery = usePractitionerSettlementItems({ page: 1, limit: 1 });
  const wallet = walletQuery.data?.item ?? null;
  const recentLedgerItems = ledgerQuery.data?.items.slice(0, PREVIEW_LIMIT) ?? [];
  const financeTone = resolvePractitionerTone(theme, "finance");

  const refetchAll = () => {
    void walletQuery.refetch();
    void ledgerQuery.refetch();
    void settlementsQuery.refetch();
  };

  const isInitialLoading =
    walletQuery.isLoading && ledgerQuery.isLoading && settlementsQuery.isLoading;

  if (isInitialLoading) {
    return (
      <Screen bg="background">
        <Header title={t("practitioner.finance.product.title")} />
        <LoadingState fullScreen message={t("practitioner.finance.common.loading")} />
      </Screen>
    );
  }

  if (walletQuery.isError) {
    return (
      <Screen bg="background">
        <Header title={t("practitioner.finance.product.title")} />
        <ErrorState
          fullScreen
          title={t("practitioner.finance.wallet.errorTitle")}
          message={t("practitioner.finance.wallet.errorBody")}
          onRetry={refetchAll}
        />
      </Screen>
    );
  }

  return (
    <Screen bg="background">
      <Header
        title={t("practitioner.finance.product.title")}
        rightElement={
          <TouchableOpacity
            accessibilityLabel={t("practitioner.finance.common.refresh")}
            onPress={refetchAll}
            style={styles.headerAction}
          >
            <Ionicons name="refresh-outline" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Card variant="outlined" padding="sm" style={styles.balanceCard}>
          <Text color={theme.colors.textMuted} style={styles.eyebrow}>
            {t("practitioner.finance.product.available")}
          </Text>
          <Text weight="700" style={[styles.balanceValue, { color: financeTone.accent }]}>
            {formatMoneyOrUnavailable(
              wallet?.availableBalance,
              wallet?.currency,
              locale,
              t,
            )}
          </Text>
          <Text color={theme.colors.textSecondary} style={styles.balanceNote}>
            {t("practitioner.finance.product.availableHint")}
          </Text>

          <View style={[styles.summaryList, { borderColor: theme.colors.borderLight }]}>
            {[
              [t("practitioner.finance.product.underReview"), wallet?.pendingBalance],
              [t("practitioner.finance.product.earnings"), wallet?.totalEarned],
              [t("practitioner.finance.product.transferred"), wallet?.lifetimePaidOut],
            ]
              .filter(([, amount]) => hasMeaningfulAmount(amount))
              .map(([label, amount]) => (
                <SummaryLine
                  key={label}
                  label={label}
                  value={formatMoneyOrUnavailable(amount, wallet?.currency, locale, t)}
                />
              ))}
          </View>
        </Card>

        <View style={styles.section}>
          <FinanceDestination
            icon="trending-up-outline"
            label={t("practitioner.finance.product.earnings")}
            hint={t("practitioner.finance.product.earningsHint")}
            onPress={() => router.push("/(practitioner)/finance/wallet")}
          />
          <FinanceDestination
            icon="arrow-up-circle-outline"
            label={t("practitioner.finance.product.transfers")}
            hint={t("practitioner.finance.product.transfersHint")}
            onPress={() => router.push("/(practitioner)/finance/settlements")}
          />
          <FinanceDestination
            icon="list-outline"
            label={t("practitioner.finance.product.transactions")}
            hint={t("practitioner.finance.product.transactionsHint")}
            onPress={() => router.push("/(practitioner)/finance/ledger")}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text weight="600" style={styles.sectionTitle}>
              {t("practitioner.finance.product.recentActivity")}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t("practitioner.finance.product.viewAllTransactions")}
              onPress={() => router.push("/(practitioner)/finance/ledger")}
            >
              <Text weight="600" style={[styles.actionLink, { color: theme.colors.primary }]}>
                {t("practitioner.finance.common.viewAll")}
              </Text>
            </TouchableOpacity>
          </View>

          {ledgerQuery.isLoading ? (
            <LoadingState message={t("practitioner.finance.common.loading")} />
          ) : ledgerQuery.isError ? (
            <ErrorState
              title={t("practitioner.finance.ledger.errorTitle")}
              message={t("practitioner.finance.ledger.errorBody")}
              onRetry={ledgerQuery.refetch}
            />
          ) : recentLedgerItems.length ? (
            <View style={[styles.activityList, { borderTopColor: theme.colors.borderLight }]}>
              {recentLedgerItems.map((item) => (
                <ActivityRow
                  key={item.id}
                  item={item}
                  locale={locale}
                  t={t}
                  currencyFallback={t("practitioner.finance.common.currencyUnavailable")}
                  onPress={() => router.push("/(practitioner)/finance/ledger")}
                />
              ))}
            </View>
          ) : (
            <Text color={theme.colors.textSecondary} style={styles.emptyText}>
              {t("practitioner.finance.product.noTransactions")}
            </Text>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

function formatMoneyOrUnavailable(
  amount: string | number | null | undefined,
  currency: string | null | undefined,
  locale: string,
  t: TranslateFn,
) {
  return formatMoneyValue(
    amount,
    currency,
    locale,
    t("practitioner.finance.common.currencyUnavailable"),
  );
}

function formatMoneyValue(
  amount: string | number | null | undefined,
  currency: string | null | undefined,
  locale: string,
  fallback: string,
) {
  if (amount == null) return fallback;
  return formatMoney(amount, currency, locale, fallback);
}

function hasMeaningfulAmount(amount: string | null | undefined) {
  return amount != null && Number(amount) !== 0;
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

function FinanceDestination({
  icon,
  label,
  hint,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const { chevronForward } = useAppDirection();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${hint}`}
      onPress={onPress}
      style={[styles.destinationRow, { borderBottomColor: theme.colors.borderLight }]}
    >
      <View style={[styles.destinationIcon, { backgroundColor: theme.colors.primaryLight }]}>
        <Ionicons name={icon} size={18} color={theme.colors.primary} />
      </View>
      <View style={styles.destinationCopy}>
        <Text weight="600" style={styles.destinationLabel}>
          {label}
        </Text>
        <Text color={theme.colors.textMuted} style={styles.destinationHint}>
          {hint}
        </Text>
      </View>
      <Ionicons name={chevronForward} size={18} color={theme.colors.textMuted} />
    </TouchableOpacity>
  );
}

function ActivityRow({
  item,
  locale,
  t,
  currencyFallback,
  onPress,
}: {
  item: PractitionerLedgerEntry;
  locale: string;
  t: TranslateFn;
  currencyFallback: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const title = safeFinanceText(item.description, ledgerEntryTypeLabel(item.entryType, t));
  const amount = formatSignedMoney(item.amount, item.currency, locale, currencyFallback);
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${amount}. ${formatDateShort(item.effectiveAt, locale)}. ${ledgerBucketLabel(item.balanceBucket, t)}`}
      onPress={onPress}
      style={[styles.activityRow, { borderBottomColor: theme.colors.borderLight }]}
    >
      <View style={styles.activityCopy}>
        <Text weight="600" style={styles.activityTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text color={theme.colors.textMuted} style={styles.activityMeta} numberOfLines={1}>
          {formatDateShort(item.effectiveAt, locale)} · {ledgerBucketLabel(item.balanceBucket, t)}
        </Text>
      </View>
      <Text weight="600" style={styles.activityAmount} numberOfLines={1}>
        {amount}
      </Text>
    </TouchableOpacity>
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
  balanceCard: {
    gap: 7,
  },
  eyebrow: {
    fontSize: 11,
  },
  balanceValue: {
    fontSize: 25,
    lineHeight: 32,
  },
  balanceNote: {
    fontSize: 10,
    lineHeight: 14,
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
  destinationRow: {
    minHeight: 60,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  destinationIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  destinationCopy: {
    flex: 1,
    gap: 1,
  },
  destinationLabel: {
    fontSize: 12,
  },
  destinationHint: {
    fontSize: 10,
    lineHeight: 14,
  },
  activityList: {
    borderTopWidth: 1,
  },
  activityRow: {
    minHeight: 58,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  activityCopy: {
    flex: 1,
    gap: 2,
  },
  activityTitle: {
    fontSize: 11,
  },
  activityMeta: {
    fontSize: 9,
    lineHeight: 13,
  },
  activityAmount: {
    fontSize: 11,
    maxWidth: "40%",
    textAlign: "left",
  },
  emptyText: {
    fontSize: 12,
    paddingVertical: 14,
  },
});
