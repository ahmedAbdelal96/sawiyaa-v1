import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  DetailPageScaffold,
  EmptyState,
  Input,
  SectionHeader,
  StatusChip,
  Text,
} from "../../../../components/ui";
import { useTheme } from "../../../../providers/ThemeProvider";
import { getAppDirection } from "../../../../i18n/direction";
import { resolveSupportedCurrencyCode } from "../../../../lib/currency";
import { extractApiErrorMessage } from "../../../../lib/api";
import { useCreatePublicAcademyEnrollment, usePublicAcademyCourse } from "../hooks";
import { buildAcademyEnrollmentPaymentReturnBaseUrl } from "../navigation";
import type { CreateAcademyEnrollmentInput } from "../types";
import { formatAcademyMoney, isAcademyCourseFree } from "../display";

export default function AcademyEnrollmentCreateScreen({
  slug,
}: {
  slug: string;
}) {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const direction = getAppDirection(i18n.language);
  const isRtl = direction === "rtl";
  const courseQuery = usePublicAcademyCourse(slug, { cacheScopeKey: "guest" });
  const enrollMutation = useCreatePublicAcademyEnrollment();
  const [form, setForm] = useState<CreateAcademyEnrollmentInput>({
    fullName: "",
    phoneNumber: "",
    whatsappNumber: "",
    email: "",
    sourceLabel: "mobile-academy",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const paymentReturnBaseUrl = buildAcademyEnrollmentPaymentReturnBaseUrl();

  const course = courseQuery.data ?? null;
  const displayCurrency = resolveSupportedCurrencyCode({
    currencyCode: course?.currencyCode,
    regionalPricingMode: course?.regionalPricingMode,
    resolvedCountryIsoCode: course?.resolvedCountryIsoCode,
  });
  const isFreeCourse = isAcademyCourseFree(course);
  const priceLabel =
    isFreeCourse
      ? t("academy.detail.free")
      : formatAcademyMoney(course?.priceAmount ?? null, displayCurrency, i18n.language) ??
        t("academy.detail.paid");
  const isNotFound = courseQuery.isSuccess && !course;

  const lectureLabel = course?.plannedLectureCount
    ? t("academy.detail.lectures", {
        count: course.plannedLectureCount,
      })
    : null;
  const durationLabel = course?.plannedDurationDays
    ? t("academy.detail.durationDays", {
        count: course.plannedDurationDays,
      })
    : null;

  return (
    <DetailPageScaffold
      title={t("academy.detail.enrollTitle")}
      showBack
      loading={courseQuery.isLoading}
      loadingMessage={t("academy.detail.loading")}
      error={courseQuery.isError}
      errorTitle={t("academy.detail.errorTitle")}
      errorMessage={t("academy.detail.errorMessage")}
      onRetry={() => courseQuery.refetch()}
      retryText={t("academy.detail.retry")}
      contentContainerStyle={styles.scaffold}
    >
      {isNotFound ? (
        <EmptyState
          title={t("academy.detail.notFoundTitle")}
          description={t("academy.detail.notFoundDescription")}
          actionLabel={t("academy.detail.backToAcademy")}
          onAction={() => router.replace("/(patient)/academy" as never)}
        />
      ) : course ? (
        <View style={styles.stack}>
          <Card variant="outlined" padding="sm" style={styles.summaryCard}>
            <SectionHeader
              title={course.title}
              subtitle={t("academy.detail.enrollSubtitle")}
            />
            <View
              style={[
                styles.summaryTopRow,
                isRtl ? styles.summaryTopRowRtl : styles.summaryTopRowLtr,
              ]}
            >
              <StatusChip
                label={t("academy.detail.available")}
                tone="success"
                showDot={false}
              />
              <Text color={theme.colors.textMuted} style={styles.price}>
                {priceLabel}
              </Text>
            </View>
            <View
              style={[
                styles.summaryMetaRow,
                isRtl ? styles.summaryMetaRowRtl : styles.summaryMetaRowLtr,
              ]}
            >
              {lectureLabel ? (
                <Text color={theme.colors.textMuted} style={styles.summaryMetaText}>
                  {lectureLabel}
                </Text>
              ) : null}
              {durationLabel ? (
                <Text color={theme.colors.textMuted} style={styles.summaryMetaText}>
                  {durationLabel}
                </Text>
              ) : null}
            </View>
          </Card>

          <Card variant="outlined" padding="sm" style={styles.formCard}>
            <SectionHeader
              title={t("academy.detail.enrollTitle")}
              subtitle={t("academy.detail.enrollSubtitle")}
            />
            <View style={styles.formStack}>
              <Input
                label={t("academy.detail.form.fullName")}
                value={form.fullName}
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, fullName: value }))
                }
                placeholder={t("academy.detail.form.fullNamePlaceholder")}
                autoCapitalize="words"
                textContentType="name"
                autoComplete="name"
              />
              <Input
                label={t("academy.detail.form.phone")}
                value={form.phoneNumber}
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, phoneNumber: value }))
                }
                placeholder={t("academy.detail.form.phonePlaceholder")}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
              />
              <Input
                label={t("academy.detail.form.whatsapp")}
                value={form.whatsappNumber ?? ""}
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, whatsappNumber: value }))
                }
                placeholder={t("academy.detail.form.whatsappPlaceholder")}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                helperText={t("academy.detail.form.whatsappHelp")}
              />
              <Input
                label={t("academy.detail.form.email")}
                value={form.email ?? ""}
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, email: value }))
                }
                placeholder={t("academy.detail.form.emailPlaceholder")}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
              />
              {errorMessage ? (
                <Card variant="flat" padding="sm" style={styles.noticeCard}>
                  <Text color="#ba1a1a">{errorMessage}</Text>
                </Card>
              ) : null}
              <Button
                title={
                  enrollMutation.isPending
                    ? t("academy.detail.submitting")
                    : isFreeCourse
                      ? t("academy.detail.registerFree")
                      : t("academy.detail.subscribeNow")
                }
                disabled={enrollMutation.isPending}
                onPress={async () => {
                  setErrorMessage(null);
                  if (!form.fullName.trim() || !form.phoneNumber.trim()) {
                    setErrorMessage(t("academy.detail.formValidation"));
                    return;
                  }

                  try {
                    const created = await enrollMutation.mutateAsync({
                      slug,
                      input: {
                        fullName: form.fullName.trim(),
                        phoneNumber: form.phoneNumber.trim(),
                        whatsappNumber: form.whatsappNumber?.trim() || undefined,
                        email: form.email?.trim() || undefined,
                        sourceLabel: form.sourceLabel?.trim() || undefined,
                        returnUrlBase: isFreeCourse ? undefined : paymentReturnBaseUrl,
                      },
                    });

                    const shouldShowPaymentFlow =
                      !isFreeCourse &&
                      created.enrollmentStatus !== "PAID" &&
                      created.enrollmentStatus !== "CONFIRMED";

                    router.replace(
                      shouldShowPaymentFlow
                        ? ({
                            pathname:
                              "/(patient)/academy/enrollments/[id]/payment-return",
                            params: {
                              id: created.id,
                              token: created.publicAccessToken,
                            },
                          } as never)
                        : ({
                            pathname: "/(patient)/academy/enrollments/[id]",
                            params: {
                              id: created.id,
                              token: created.publicAccessToken,
                            },
                          } as never),
                    );
                  } catch (error) {
                    setErrorMessage(extractApiErrorMessage(error));
                  }
                }}
              />
            </View>
          </Card>
        </View>
      ) : null}
    </DetailPageScaffold>
  );
}

const styles = StyleSheet.create({
  scaffold: {
    paddingBottom: 24,
  },
  stack: {
    gap: 12,
  },
  summaryCard: {
    marginHorizontal: 0,
  },
  summaryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 10,
  },
  summaryTopRowLtr: {
    flexDirection: "row",
  },
  summaryTopRowRtl: {
    flexDirection: "row-reverse",
  },
  price: {
    fontSize: 13,
  },
  summaryMetaRow: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  summaryMetaRowLtr: {
    flexDirection: "row",
  },
  summaryMetaRowRtl: {
    flexDirection: "row-reverse",
  },
  summaryMetaText: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  formCard: {
    marginHorizontal: 0,
    gap: 8,
  },
  formStack: {
    gap: 12,
  },
  noticeCard: {
    marginHorizontal: 0,
  },
});
