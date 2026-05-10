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
  formatDate,
} from "../../../../components/ui";
import { useTheme } from "../../../../providers/ThemeProvider";
import { normalizeAllowedExternalUrl } from "../../../../lib/external-url";
import { usePublicAcademyEnrollment } from "../hooks";

function resolveEnrollmentTone(status: string | null | undefined) {
  switch (status) {
    case "CONFIRMED":
    case "PAID":
      return "success" as const;
    case "PENDING_PAYMENT":
      return "warning" as const;
    case "PAYMENT_FAILED":
      return "error" as const;
    case "CANCELLED":
    case "REFUNDED":
      return "default" as const;
    default:
      return "info" as const;
  }
}

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
  const { t, i18n } = useTranslation();
  const enrollmentQuery = usePublicAcademyEnrollment(enrollmentId, token);
  const enrollment = enrollmentQuery.data ?? null;
  const isMissingAccessLink = !enrollmentId || !token;

  const payment = enrollment?.payment ?? null;
  const isNotFound = isMissingAccessLink || (enrollmentQuery.isSuccess && !enrollment);

  return (
    <DetailPageScaffold
      title={t("academy.enrollment.title", "Enrollment")}
      showBack
      onBack={() => router.back()}
      loading={enrollmentQuery.isLoading}
      loadingMessage={t("academy.enrollment.loading", "Loading enrollment...")}
      error={enrollmentQuery.isError}
      errorTitle={t("academy.enrollment.errorTitle", "We could not load the enrollment")}
      errorMessage={t("academy.enrollment.errorMessage", "Please try again in a moment.")}
      onRetry={() => enrollmentQuery.refetch()}
      retryText={t("academy.enrollment.retry", "Try again")}
      contentContainerStyle={styles.scaffold}
    >
      {isNotFound ? (
        <EmptyState
          title={t("academy.enrollment.notFoundTitle", "Enrollment not found")}
          description={t(
            "academy.enrollment.notFoundDescription",
            "The enrollment link is invalid or the record is no longer available.",
          )}
          actionLabel={t("academy.enrollment.back", "Back")}
          onAction={() => router.replace("/(patient)/academy" as never)}
        />
      ) : enrollment ? (
        <View style={styles.stack}>
          <Card variant="elevated" padding="lg" style={styles.heroCard}>
            <SectionHeader
              title={enrollment.courseTitle}
              subtitle={t("academy.enrollment.course", "Program enrollment")}
            />
            <View style={styles.statusRow}>
              <StatusChip
                label={enrollment.enrollmentStatus}
                tone={resolveEnrollmentTone(enrollment.enrollmentStatus)}
              />
              {enrollment.paymentStatus ? (
                <StatusChip
                  label={enrollment.paymentStatus}
                  tone={enrollment.paymentStatus === "CAPTURED" ? "success" : "default"}
                  showDot={false}
                />
              ) : null}
            </View>
            <View style={styles.summary}>
              <SummaryRow
                label={t("academy.enrollment.registeredAt", "Registered")}
                value={formatDate(enrollment.registeredAt, locale)}
              />
              <SummaryRow
                label={t("academy.enrollment.learner", "Learner")}
                value={enrollment.learner.fullName}
              />
              <SummaryRow
                label={t("academy.enrollment.phone", "Phone")}
                value={enrollment.learner.phoneNumber}
              />
              <SummaryRow
                label={t("academy.enrollment.reference", "Reference")}
                value={enrollment.publicAccessToken}
              />
            </View>
          </Card>

          {payment ? (
            <Card variant="elevated" padding="lg" style={styles.sectionCard}>
              <SectionHeader
                title={t("academy.enrollment.paymentTitle", "Payment")}
                subtitle={t(
                  "academy.enrollment.paymentSubtitle",
                  "Continue securely when the checkout is ready.",
                )}
              />
              <View style={styles.summary}>
                <SummaryRow
                  label={t("academy.enrollment.paymentStatus", "Payment status")}
                  value={payment.status}
                />
                <SummaryRow
                  label={t("academy.enrollment.amount", "Amount")}
                  value={`${payment.amount} ${payment.currency}`}
                />
              </View>
              {payment.checkoutUrl ? (
                <Button
                  title={t("academy.enrollment.payNow", "Pay now")}
                  onPress={async () => {
                    const safe = normalizeAllowedExternalUrl(payment.checkoutUrl ?? "");
                    if (!safe) {
                      return;
                    }

                    await Linking.openURL(safe);
                  }}
                  style={styles.button}
                />
              ) : payment.clientSecret ? (
                <Text color={theme.colors.textSecondary}>
                  {t(
                    "academy.enrollment.paymentUnsupported",
                    "This payment method requires a native card flow that is not enabled yet.",
                  )}
                </Text>
              ) : null}
            </Card>
          ) : null}

          {(enrollment.joinAccess.meetingUrl || enrollment.joinAccess.whatsappGroupUrl) ? (
            <Card variant="elevated" padding="lg" style={styles.sectionCard}>
              <SectionHeader
                title={t("academy.enrollment.joinTitle", "Join access")}
                subtitle={t(
                  "academy.enrollment.joinSubtitle",
                  "Open the available classroom or group link when it becomes visible.",
                )}
              />
              <View style={styles.joinStack}>
                {enrollment.joinAccess.meetingUrl ? (
                  <Button
                    title={t("academy.enrollment.openMeeting", "Open meeting")}
                    variant="secondary"
                    onPress={async () => {
                      const safe = normalizeAllowedExternalUrl(enrollment.joinAccess.meetingUrl ?? "");
                      if (!safe) {
                        return;
                      }

                      await Linking.openURL(safe);
                    }}
                  />
                ) : null}
                {enrollment.joinAccess.whatsappGroupUrl ? (
                  <Button
                    title={t("academy.enrollment.openGroup", "Open group")}
                    variant="secondary"
                    onPress={async () => {
                      const safe = normalizeAllowedExternalUrl(enrollment.joinAccess.whatsappGroupUrl ?? "");
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
    gap: 14,
  },
  heroCard: {
    marginHorizontal: 0,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  summary: {
    marginTop: 14,
  },
  sectionCard: {
    marginHorizontal: 0,
  },
  button: {
    marginTop: 14,
  },
  joinStack: {
    gap: 10,
    marginTop: 12,
  },
});
