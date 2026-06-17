import React from "react";
import { Linking, Platform, StyleSheet, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
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
} from "../../../../components/ui";
import { useTheme } from "../../../../providers/ThemeProvider";
import { formatViewerDateTime } from "../../../../lib/time-formatting";
import { usePublicAcademyEnrollment } from "../hooks";
import {
  buildAcademyEnrollmentPaymentRedirectUrl,
  buildAcademyEnrollmentPaymentReturnUrl,
} from "../navigation";
import { normalizeAllowedExternalUrl } from "../../../../lib/external-url";
import {
  formatAcademyMoney,
  getAcademyAccessLockedReasonTranslationKey,
  getAcademyEnrollmentStatusTone,
  getAcademyEnrollmentStatusTranslationKey,
  getAcademyPaymentStatusTranslationKey,
} from "../display";

export default function AcademyEnrollmentDetailScreen({
  enrollmentId,
  token,
  locale,
}: {
  enrollmentId: string;
  token: string;
  locale: string;
}) {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const enrollmentQuery = usePublicAcademyEnrollment(enrollmentId, token);
  const enrollment = enrollmentQuery.data ?? null;
  const isMissingAccessLink = !enrollmentId || !token;

  const payment = enrollment?.payment ?? null;
  const isNotFound =
    isMissingAccessLink || (enrollmentQuery.isSuccess && !enrollment);
  const paymentAmountLabel =
    payment && formatAcademyMoney(payment.amount, payment.currency, locale);
  const isPendingPaymentFlow =
    enrollment?.enrollmentStatus === "PENDING_PAYMENT" ||
    enrollment?.enrollmentStatus === "PAYMENT_FAILED";
  const joinAccess = enrollment?.joinAccess ?? null;
  const showJoinSection = Boolean(
    joinAccess && (joinAccess.canAccessSession || joinAccess.canAccessGroup),
  );
  const showPaymentSection = Boolean(payment) || isPendingPaymentFlow;
  const paymentStatusLabel = enrollment?.paymentStatus
    ? t(getAcademyPaymentStatusTranslationKey(enrollment.paymentStatus))
    : t("academy.enrollment.paymentStatuses.UNKNOWN");
  const accessLockedCopy =
    joinAccess?.accessLockedReason && !showJoinSection && isPendingPaymentFlow
      ? t(
          getAcademyAccessLockedReasonTranslationKey(
            joinAccess.accessLockedReason,
          ),
        )
      : null;

  const openPaymentRedirect = async () => {
    const returnUrl = buildAcademyEnrollmentPaymentReturnUrl({
      enrollmentId,
      token,
    });
    const redirectUrl = buildAcademyEnrollmentPaymentRedirectUrl({
      enrollmentId,
      token,
      returnUrl,
    });

    if (Platform.OS === "web") {
      window.location.assign(redirectUrl);
      return;
    }

    await WebBrowser.openAuthSessionAsync(redirectUrl, returnUrl);
  };

  return (
    <DetailPageScaffold
      title={t("academy.enrollment.title")}
      showBack
      loading={enrollmentQuery.isLoading}
      loadingMessage={t("academy.enrollment.loading")}
      error={enrollmentQuery.isError}
      errorTitle={t("academy.enrollment.errorTitle")}
      errorMessage={t("academy.enrollment.errorMessage")}
      onRetry={() => enrollmentQuery.refetch()}
      retryText={t("academy.enrollment.retry")}
      contentContainerStyle={styles.scaffold}
    >
      {isNotFound ? (
        <EmptyState
          title={t("academy.enrollment.notFoundTitle")}
          description={t("academy.enrollment.notFoundDescription")}
          actionLabel={t("academy.enrollment.back")}
          onAction={() => router.replace("/(patient)/academy" as never)}
        />
      ) : enrollment ? (
        <View style={styles.stack}>
          <Card variant="elevated" padding="sm" style={styles.heroCard}>
            <SectionHeader
              title={enrollment.courseTitle}
              subtitle={t("academy.enrollment.course")}
            />
            <View style={styles.statusRow}>
              <StatusChip
                label={t(
                  getAcademyEnrollmentStatusTranslationKey(
                    enrollment.enrollmentStatus,
                  ),
                )}
                tone={getAcademyEnrollmentStatusTone(
                  enrollment.enrollmentStatus,
                )}
                showDot={false}
              />
            </View>
            <View style={styles.summary}>
              <SummaryRow
                label={t("academy.enrollment.registeredAt")}
                value={formatViewerDateTime(enrollment.registeredAt, { locale })}
              />
              {!isPendingPaymentFlow ? (
                <>
                  <SummaryRow
                    label={t("academy.enrollment.learner")}
                    value={enrollment.learner.fullName}
                  />
                  <SummaryRow
                    label={t("academy.enrollment.phone")}
                    value={enrollment.learner.phoneNumber}
                  />
                </>
              ) : null}
            </View>
          </Card>

          {showPaymentSection ? (
            <Card variant="outlined" padding="sm" style={styles.sectionCard}>
              <SectionHeader
                title={
                  isPendingPaymentFlow
                    ? t("academy.enrollment.pendingPaymentTitle")
                    : t("academy.enrollment.paymentTitle")
                }
                subtitle={
                  isPendingPaymentFlow
                    ? t("academy.enrollment.pendingPaymentSubtitle")
                    : t("academy.enrollment.paymentSubtitle")
                }
              />
              <View style={styles.summary}>
                {payment ? (
                  <SummaryRow
                    label={t("academy.enrollment.amount")}
                    value={
                      paymentAmountLabel ??
                      `${payment.amount} ${payment.currency}`
                    }
                  />
                ) : null}
                <SummaryRow
                  label={t("academy.enrollment.paymentStatusLabel")}
                  value={paymentStatusLabel}
                />
              </View>
              {isPendingPaymentFlow && accessLockedCopy ? (
                <Text
                  color={theme.colors.textSecondary}
                  style={styles.helperText}
                >
                  {accessLockedCopy}
                </Text>
              ) : null}
              {isPendingPaymentFlow ? (
                <Button
                  title={t("academy.enrollment.payNow")}
                  onPress={() => void openPaymentRedirect()}
                  style={styles.button}
                />
              ) : null}
            </Card>
          ) : null}

          {showJoinSection ? (
            <Card variant="outlined" padding="sm" style={styles.sectionCard}>
              <SectionHeader
                title={t("academy.enrollment.joinTitle")}
                subtitle={t("academy.enrollment.joinSubtitle")}
              />
              <View style={styles.joinStack}>
                {joinAccess?.canAccessSession && joinAccess.meetingUrl ? (
                  <Button
                    title={t("academy.enrollment.openMeeting")}
                    variant="secondary"
                    onPress={async () => {
                      const safe = normalizeAllowedExternalUrl(
                        joinAccess.meetingUrl ?? "",
                      );
                      if (!safe) {
                        return;
                      }

                      await Linking.openURL(safe);
                    }}
                  />
                ) : null}
                {joinAccess?.canAccessGroup && joinAccess.whatsappGroupUrl ? (
                  <Button
                    title={t("academy.enrollment.openGroup")}
                    variant="secondary"
                    onPress={async () => {
                      const safe = normalizeAllowedExternalUrl(
                        joinAccess.whatsappGroupUrl ?? "",
                      );
                      if (!safe) {
                        return;
                      }

                      await Linking.openURL(safe);
                    }}
                  />
                ) : null}
              </View>
            </Card>
          ) : null}
        </View>
      ) : null}
    </DetailPageScaffold>
  );
}

const styles = StyleSheet.create({
  scaffold: {
    paddingBottom: 32,
  },
  stack: {
    gap: 12,
  },
  heroCard: {
    marginHorizontal: 0,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  summary: {
    marginTop: 12,
  },
  sectionCard: {
    marginHorizontal: 0,
    gap: 8,
  },
  button: {
    marginTop: 12,
  },
  helperText: {
    fontSize: 13,
    lineHeight: 19,
  },
  joinStack: {
    gap: 10,
    marginTop: 12,
  },
});
