import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import {
  Button,
  Card,
  DetailPageScaffold,
  EmptyState,
  Input,
  SectionHeader,
  Text,
} from "../../../../components/ui";
import { useTheme } from "../../../../providers/ThemeProvider";
import { useAppDirection } from "../../../../i18n/direction";
import { resolveSupportedCurrencyCode } from "../../../../lib/currency";
import { extractApiErrorMessage } from "../../../../lib/api";
import { useAuth } from "../../../../providers/AuthProvider";
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
  const { rowDirection, textAlign } = useAppDirection();
  const { user, role, isLoading: isAuthLoading } = useAuth();
  const authScopeKey = useMemo(() => {
    if (isAuthLoading) {
      return "bootstrapping";
    }
    if (!user) {
      return "guest";
    }
    return `auth:${user.id}:${role ?? "unknown"}`;
  }, [isAuthLoading, role, user]);
  const courseQuery = usePublicAcademyCourse(slug, { cacheScopeKey: authScopeKey });
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

  useEffect(() => {
    if (!user) {
      return;
    }

    setForm((current) => ({
      ...current,
      fullName: current.fullName.trim()
        ? current.fullName
        : user.displayName?.trim() ?? current.fullName,
      phoneNumber: current.phoneNumber.trim()
        ? current.phoneNumber
        : user.primaryPhone?.trim() ?? current.phoneNumber,
      email: current.email?.trim()
        ? current.email
        : user.primaryEmail?.trim() ?? current.email,
    }));
  }, [user]);

  const course = courseQuery.data ?? null;
  const displayCurrency = resolveSupportedCurrencyCode({
    currencyCode: course?.currencyCode,
    regionalPricingMode: course?.regionalPricingMode,
    resolvedCountryIsoCode: course?.resolvedCountryIsoCode,
  });
  const hasPrice = course?.priceAmount !== null && course?.priceAmount !== undefined;
  const isFreeCourse = hasPrice && isAcademyCourseFree(course);
  const priceLabel = hasPrice
    ? (isFreeCourse
      ? t("academy.detail.free")
      : formatAcademyMoney(course?.priceAmount ?? null, displayCurrency, i18n.language))
    : null;
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
                { flexDirection: rowDirection },
              ]}
            >
              {priceLabel ? (
                <View style={[styles.priceTag, { backgroundColor: theme.colors.primaryLight }]}>
                  <Text color={theme.colors.primary} weight="700" style={styles.price}>
                    {priceLabel}
                  </Text>
                </View>
              ) : <View />}
            </View>
            <View
              style={[
                styles.summaryMetaRow,
                { flexDirection: rowDirection },
              ]}
            >
              {lectureLabel ? (
                <View style={[styles.metaBadge, { backgroundColor: theme.colors.surfaceMuted }]}>
                  <Ionicons name="book-outline" size={13} color={theme.colors.textSecondary} />
                  <Text color={theme.colors.textSecondary} style={styles.summaryMetaText}>
                    {lectureLabel}
                  </Text>
                </View>
              ) : null}
              {durationLabel ? (
                <View style={[styles.metaBadge, { backgroundColor: theme.colors.surfaceMuted }]}>
                  <Ionicons name="time-outline" size={13} color={theme.colors.textSecondary} />
                  <Text color={theme.colors.textSecondary} style={styles.summaryMetaText}>
                    {durationLabel}
                  </Text>
                </View>
              ) : null}
            </View>
          </Card>

          <Card variant="outlined" padding="sm" style={styles.formCard}>
            <SectionHeader
              title={t("academy.detail.enrollTitle")}
              subtitle={t("academy.detail.enrollSubtitle")}
            />
            {user ? (
              <Card
                variant="outlined"
                padding="sm"
                style={[
                  styles.noticeCard,
                  { backgroundColor: theme.colors.primaryLight, borderColor: theme.colors.border },
                ]}
              >
                <Text color={theme.colors.textSecondary} style={styles.noticeText}>
                  {t("academy.detail.form.accountPrefillNote")}
                </Text>
              </Card>
            ) : null}
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
                <Card
                  variant="outlined"
                  padding="sm"
                  style={[
                    styles.noticeCard,
                    {
                      backgroundColor: theme.colors.statusErrorBg,
                      borderColor: theme.colors.error,
                    },
                  ]}
                >
                  <View style={[{ flexDirection: rowDirection, alignItems: "center", gap: 8 }]}>
                    <Ionicons name="alert-circle" size={16} color={theme.colors.error} />
                    <Text color={theme.colors.error} style={{ textAlign, flex: 1 }}>
                      {errorMessage}
                    </Text>
                  </View>
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
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 10,
  },
  price: {
    fontSize: 13,
  },
  priceTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  summaryMetaRow: {
    marginTop: 12,
    flexWrap: "wrap",
    gap: 8,
  },
  summaryMetaText: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  formCard: {
    marginHorizontal: 0,
    gap: 8,
  },
  noticeCard: {
    marginHorizontal: 0,
    marginBottom: 8,
  },
  noticeText: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  formStack: {
    gap: 12,
  },
});
