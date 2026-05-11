import React from "react";
import { Linking, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  DetailPageScaffold,
  EmptyState,
  SectionHeader,
  StatusChip,
  SummaryRow,
  Text,
  formatDateTime,
} from "../../../../components/ui";
import { useTheme } from "../../../../providers/ThemeProvider";
import { useMyPackagePurchase } from "../hooks";
import {
  canContinuePackagePurchasePayment,
  formatMoney,
  getNextUpcomingPackageSession,
  getPackagePurchaseCompletionCount,
  getPackagePurchaseLiveCount,
  getPackagePurchasePendingCount,
  getPackagePurchaseTerminalCount,
  groupPackagePurchaseSessions,
  isPackagePurchasePaymentExpired,
} from "../lib";
import { resolveSupportedCurrencyCode } from "../../../../lib/currency";

function getStatusTone(status: string | null | undefined) {
  switch (status) {
    case "ACTIVE":
      return "success" as const;
    case "COMPLETED":
      return "default" as const;
    case "PENDING_PAYMENT":
      return "warning" as const;
    case "REFUNDED":
      return "default" as const;
    default:
      return "default" as const;
  }
}

function SessionItem({
  session,
  purchaseSessionCount,
  locale,
}: {
  session: {
    id: string;
    sessionCode: string;
    status: string;
    scheduledStartAt: string | null;
    scheduledEndAt: string | null;
    durationMinutes: number;
    sessionMode: string;
    packageSessionIndex: number;
  };
  purchaseSessionCount: number;
  locale: string;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const canOpen = ["CONFIRMED", "UPCOMING", "READY_TO_JOIN", "IN_PROGRESS"].includes(
    session.status,
  );

  return (
    <Card variant="outlined" padding="md" style={styles.sessionCard}>
      <View style={styles.sessionTopRow}>
        <View style={styles.sessionMetaCol}>
          <Text weight="600" style={styles.sessionCode}>
            {session.sessionCode}
          </Text>
          <Text color="#64748b" style={styles.sessionIndex}>
            {t("packagePurchases.detail.sessionIndex", {
              current: session.packageSessionIndex,
              total: purchaseSessionCount,
              defaultValue: `Session ${session.packageSessionIndex}/${purchaseSessionCount}`,
            })}
          </Text>
        </View>
        <StatusChip label={session.status} tone={canOpen ? "success" : "default"} showDot={false} />
      </View>

      <SummaryRow
        label={t("packagePurchases.detail.startAt", "Start")}
        value={session.scheduledStartAt ? formatDateTime(session.scheduledStartAt, locale) : "-"}
      />
      <SummaryRow
        label={t("packagePurchases.detail.endAt", "End")}
        value={session.scheduledEndAt ? formatDateTime(session.scheduledEndAt, locale) : "-"}
      />
      <SummaryRow
        label={t("packagePurchases.detail.duration", "Duration")}
        value={t("packagePurchases.detail.minutes", {
          count: session.durationMinutes,
          defaultValue: `${session.durationMinutes} minutes`,
        })}
      />
      <View style={styles.sessionActionRow}>
        <Button
          title={canOpen ? t("packagePurchases.detail.openSession", "Open session") : t("packagePurchases.detail.viewSession", "View session")}
          variant="secondary"
          onPress={() => router.push(`/(patient)/sessions/${session.id}` as never)}
        />
      </View>
    </Card>
  );
}

export default function PackagePurchaseDetailScreen({
  purchaseId,
}: {
  purchaseId: string;
}) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const purchaseQuery = useMyPackagePurchase(purchaseId);
  const purchase = purchaseQuery.data?.item ?? null;

  if (purchaseQuery.isSuccess && !purchase) {
    return (
      <DetailPageScaffold
        title={t("packagePurchases.detail.title", "Package purchase")}
        showBack
      >
        <EmptyState
          title={t("packagePurchases.detail.notFoundTitle", "Purchase not found")}
          description={t(
            "packagePurchases.detail.notFoundDescription",
            "The package purchase link is invalid or the record is no longer available.",
          )}
          actionLabel={t("packagePurchases.detail.back", "Back")}
          onAction={() => router.replace("/(patient)/package-purchases" as never)}
        />
      </DetailPageScaffold>
    );
  }

  if (purchaseQuery.isLoading) {
    return (
      <DetailPageScaffold
        title={t("packagePurchases.detail.title", "Package purchase")}
        showBack
        loading
        loadingMessage={t("packagePurchases.detail.loading", "Loading purchase...")}
      >
        <View />
      </DetailPageScaffold>
    );
  }

  if (purchaseQuery.isError || !purchase) {
    return (
      <DetailPageScaffold
        title={t("packagePurchases.detail.title", "Package purchase")}
        showBack
        error={purchaseQuery.isError}
        errorTitle={t("packagePurchases.detail.errorTitle", "We could not load the purchase")}
        errorMessage={t("packagePurchases.detail.errorMessage", "Please try again in a moment.")}
        onRetry={() => purchaseQuery.refetch()}
        retryText={t("packagePurchases.detail.retry", "Try again")}
      >
        <View />
      </DetailPageScaffold>
    );
  }

  const completedCount = getPackagePurchaseCompletionCount(purchase);
  const pendingCount = getPackagePurchasePendingCount(purchase);
  const liveCount = getPackagePurchaseLiveCount(purchase);
  const terminalCount = getPackagePurchaseTerminalCount(purchase);
  const nextUpcomingSession = getNextUpcomingPackageSession(purchase);
  const paymentExpired = isPackagePurchasePaymentExpired(purchase);
  const canContinuePayment = canContinuePackagePurchasePayment(purchase);
  const sessions = groupPackagePurchaseSessions(purchase);
  const currency = resolveSupportedCurrencyCode({
    currencyCode: purchase.selectedCurrencyCode,
    regionalPricingMode: purchase.regionalPricingMode,
    resolvedCountryIsoCode: purchase.resolvedCountryIsoCode,
  });

  return (
    <DetailPageScaffold
      title={t("packagePurchases.detail.title", "Package purchase")}
      showBack
      contentContainerStyle={styles.scaffold}
    >
      <View style={styles.stack}>
        <Card variant="elevated" padding="lg" style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroMeta}>
              <Text weight="bold" style={styles.heroTitle}>
                {purchase.planCode}
              </Text>
              <Text color={theme.colors.textSecondary} style={styles.heroSubtitle}>
                {t("packagePurchases.detail.subtitle", "Your package progress at a glance")}
              </Text>
            </View>
            <StatusChip label={purchase.status} tone={getStatusTone(purchase.status)} showDot={false} />
          </View>

          <View style={styles.heroStats}>
            <SummaryRow
              label={t("packagePurchases.detail.progress", "Progress")}
              value={`${completedCount}/${purchase.sessionCount}`}
            />
            <SummaryRow
              label={t("packagePurchases.detail.currency", "Currency")}
              value={currency}
            />
            <SummaryRow
              label={t("packagePurchases.detail.total", "Total")}
              value={formatMoney(purchase.patientPayableTotal, currency, locale)}
            />
            <SummaryRow
              label={t("packagePurchases.detail.paymentExpiry", "Payment expiry")}
              value={purchase.paymentExpiresAt ? formatDateTime(purchase.paymentExpiresAt, locale) : "-"}
            />
          </View>
        </Card>

        {purchase.status === "PENDING_PAYMENT" ? (
          <Card variant="elevated" padding="lg" style={styles.sectionCard}>
            <SectionHeader
              title={t("packagePurchases.detail.paymentTitle", "Payment")}
              subtitle={t(
                "packagePurchases.detail.paymentSubtitle",
                "Complete payment to activate the package sessions.",
              )}
            />
            <Text color={theme.colors.textSecondary} style={styles.paymentNote}>
              {paymentExpired
                ? t("packagePurchases.detail.paymentExpired", "The payment window has expired.")
                : t(
                    "packagePurchases.detail.paymentActive",
                    "Your payment window is still active and ready to continue.",
                  )}
            </Text>
            {canContinuePayment ? (
              <Button
                title={t("packagePurchases.detail.continuePayment", "Continue payment")}
                onPress={() => router.push(`/(patient)/package-purchases/${purchase.id}/pay` as never)}
                style={styles.button}
              />
            ) : null}
          </Card>
        ) : null}

        <Card variant="elevated" padding="lg" style={styles.sectionCard}>
          <SectionHeader
            title={t("packagePurchases.detail.sessionsTitle", "Sessions")}
            subtitle={t(
              "packagePurchases.detail.sessionsSubtitle",
              "Follow the linked sessions and open each one when it becomes available.",
            )}
          />
          <View style={styles.metricRow}>
            <StatusChip label={t("packagePurchases.detail.completed", { count: completedCount, defaultValue: `${completedCount} completed` })} tone="success" showDot={false} />
            <StatusChip label={t("packagePurchases.detail.pending", { count: pendingCount, defaultValue: `${pendingCount} pending` })} tone="warning" showDot={false} />
            <StatusChip label={t("packagePurchases.detail.live", { count: liveCount, defaultValue: `${liveCount} live` })} tone="info" showDot={false} />
            <StatusChip label={t("packagePurchases.detail.terminal", { count: terminalCount, defaultValue: `${terminalCount} ended` })} tone="default" showDot={false} />
          </View>

          {nextUpcomingSession ? (
            <Card variant="outlined" padding="md" style={styles.nextCard}>
              <Text color="#0f766e" style={styles.nextLabel}>
                {t("packagePurchases.detail.nextSession", "Next session")}
              </Text>
              <Text weight="600" style={styles.nextTitle}>
                {t("packagePurchases.detail.sessionIndex", {
                  current: nextUpcomingSession.packageSessionIndex,
                  total: purchase.sessionCount,
                  defaultValue: `Session ${nextUpcomingSession.packageSessionIndex}/${purchase.sessionCount}`,
                })}
              </Text>
              <Text color="#64748b" style={styles.nextMeta}>
                {formatDateTime(nextUpcomingSession.scheduledStartAt, locale)}
              </Text>
            </Card>
          ) : null}

          <View style={styles.groupStack}>
            {sessions.live.length > 0 ? (
              <View style={styles.group}>
                <Text weight="600" style={styles.groupTitle}>
                  {t("packagePurchases.detail.groups.live", "Live")}
                </Text>
                <View style={styles.groupList}>
                  {sessions.live.map((session) => (
                    <SessionItem
                      key={session.id}
                      session={session}
                      purchaseSessionCount={purchase.sessionCount}
                      locale={locale}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {sessions.pending.length > 0 ? (
              <View style={styles.group}>
                <Text weight="600" style={styles.groupTitle}>
                  {t("packagePurchases.detail.groups.pending", "Pending")}
                </Text>
                <View style={styles.groupList}>
                  {sessions.pending.map((session) => (
                    <SessionItem
                      key={session.id}
                      session={session}
                      purchaseSessionCount={purchase.sessionCount}
                      locale={locale}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {sessions.completed.length > 0 ? (
              <View style={styles.group}>
                <Text weight="600" style={styles.groupTitle}>
                  {t("packagePurchases.detail.groups.completed", "Completed")}
                </Text>
                <View style={styles.groupList}>
                  {sessions.completed.map((session) => (
                    <SessionItem
                      key={session.id}
                      session={session}
                      purchaseSessionCount={purchase.sessionCount}
                      locale={locale}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {sessions.terminal.length > 0 ? (
              <View style={styles.group}>
                <Text weight="600" style={styles.groupTitle}>
                  {t("packagePurchases.detail.groups.terminal", "Ended")}
                </Text>
                <View style={styles.groupList}>
                  {sessions.terminal.map((session) => (
                    <SessionItem
                      key={session.id}
                      session={session}
                      purchaseSessionCount={purchase.sessionCount}
                      locale={locale}
                    />
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        </Card>
      </View>
    </DetailPageScaffold>
  );
}

const styles = StyleSheet.create({
  scaffold: {
    paddingBottom: 32,
  },
  stack: {
    gap: 14,
  },
  heroCard: {
    marginHorizontal: 0,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  heroMeta: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 22,
    lineHeight: 30,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: 6,
  },
  heroStats: {
    marginTop: 12,
  },
  sectionCard: {
    marginHorizontal: 0,
  },
  paymentNote: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: 12,
  },
  button: {
    marginTop: 12,
  },
  metricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
    marginBottom: 12,
  },
  nextCard: {
    marginHorizontal: 0,
    marginBottom: 12,
  },
  nextLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.16,
  },
  nextTitle: {
    fontSize: 16,
    marginTop: 4,
  },
  nextMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  groupStack: {
    gap: 14,
    marginTop: 8,
  },
  group: {
    gap: 10,
  },
  groupTitle: {
    fontSize: 16,
  },
  groupList: {
    gap: 10,
  },
  sessionCard: {
    marginHorizontal: 0,
    gap: 8,
  },
  sessionTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  sessionMetaCol: {
    flex: 1,
  },
  sessionCode: {
    fontSize: 14,
  },
  sessionIndex: {
    fontSize: 12,
    marginTop: 4,
  },
  sessionActionRow: {
    marginTop: 8,
  },
});

