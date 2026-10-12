import React, { useEffect, useState } from "react";
import { Alert, Linking, Platform, StyleSheet, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
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
import { useAppDirection } from "../../../../i18n/direction";
import { formatViewerDateTime } from "../../../../lib/time-formatting";
import { usePublicAcademyProgramEnrollment } from "../hooks";
import { getManualPaymentMethods, listManualPaymentSubmissions, submitManualPaymentProof } from "../api";
import type { ManualPaymentMethod, ManualPaymentSubmission } from "../types";
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
  const { rowDirection, textAlign } = useAppDirection();
  const enrollmentQuery = usePublicAcademyProgramEnrollment(enrollmentId, token);
  const enrollment = enrollmentQuery.data ?? null;
  const isMissingAccessLink = !enrollmentId || !token;

  const payment = enrollment?.payment ?? null;
  const [manualMethods, setManualMethods] = useState<ManualPaymentMethod[]>([]);
  const [manualMethodId, setManualMethodId] = useState("");
  const [senderAccountName, setSenderAccountName] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [manualProof, setManualProof] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [manualSubmissions, setManualSubmissions] = useState<ManualPaymentSubmission[]>([]);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const isManualPayment = payment?.provider === "MANUAL";
  useEffect(() => {
    if (!isManualPayment) return;
    void getManualPaymentMethods().then((methods) => {
      setManualMethods(methods);
      setManualMethodId((current) => current || methods[0]?.id || "");
    }).catch(() => undefined);
    void listManualPaymentSubmissions(enrollmentId, token).then(setManualSubmissions).catch(() => undefined);
  }, [enrollmentId, isManualPayment, token]);
  const isNotFound =
    isMissingAccessLink || (enrollmentQuery.isSuccess && !enrollment);
  const paymentAmountLabel =
    payment && formatAcademyMoney(payment.amountTotal, payment.currencyCode, locale);
  const isPendingPaymentFlow =
    enrollment?.status === "PENDING_PAYMENT";
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

  const chooseManualProof = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85, allowsEditing: false });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const type = asset.mimeType === "image/png" ? "image/png" : asset.mimeType === "image/webp" ? "image/webp" : "image/jpeg";
    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) { Alert.alert(t("academy.enrollment.manual.invalidFile")); return; }
    setManualProof({ uri: asset.uri, name: asset.fileName ?? "manual-payment-proof.jpg", type });
  };

  const submitManualProof = async () => {
    if (!manualProof || !manualMethodId || !senderAccountName.trim()) { Alert.alert(t("academy.enrollment.manual.required")); return; }
    setManualSubmitting(true);
    try {
      await submitManualPaymentProof({ enrollmentId, token, methodId: manualMethodId, senderAccountName: senderAccountName.trim(), notes: manualNotes.trim() || undefined, proof: manualProof });
      Alert.alert(t("academy.enrollment.manual.success"));
      setManualNotes("");
      setManualProof(null);
      setManualSubmissions(await listManualPaymentSubmissions(enrollmentId, token));
      await enrollmentQuery.refetch();
    } catch { Alert.alert(t("academy.enrollment.manual.failed")); }
    finally { setManualSubmitting(false); }
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
              title={enrollment.program.title}
              subtitle={t("academy.enrollment.course")}
            />
            <View style={[styles.statusRow, { flexDirection: rowDirection }]}>
              <StatusChip
                label={t(
                  getAcademyEnrollmentStatusTranslationKey(
                    enrollment.status,
                  ),
                )}
                tone={getAcademyEnrollmentStatusTone(
                  enrollment.status,
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
                      `${payment.amountTotal} ${payment.currencyCode}`
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
                  style={[styles.helperText, { textAlign }]}
                >
                  {accessLockedCopy}
                </Text>
              ) : null}
              {isPendingPaymentFlow && !isManualPayment ? (
                <Button
                  title={t("academy.enrollment.payNow")}
                  onPress={() => void openPaymentRedirect()}
                  style={styles.button}
                />
              ) : null}
              {isPendingPaymentFlow && isManualPayment ? (
                <View style={styles.manualBox}>
                  <SectionHeader title={t("academy.enrollment.manual.title")} subtitle={t("academy.enrollment.manual.note")} />
                  {manualSubmissions[0]?.status === "UNDER_REVIEW" ? <Text color={theme.colors.textSecondary}>{t("academy.enrollment.manual.underReview")}</Text> : null}
                  {manualSubmissions[0]?.status === "REJECTED" ? <Text color={theme.colors.textSecondary}>{t("academy.enrollment.manual.rejected", { reason: manualSubmissions[0].rejectionReason ?? "" })}</Text> : null}
                  {manualSubmissions[0]?.status !== "UNDER_REVIEW" && manualSubmissions[0]?.status !== "APPROVED" ? <>
                  {manualMethods.map((method) => method.id === manualMethodId ? <View key={method.id} style={styles.manualDetails}><Text color={theme.colors.textSecondary}>{locale === "ar" ? method.displayNameAr : method.displayNameEn}</Text><Text color={theme.colors.textSecondary}>{method.accountHolderName}</Text><Text color={theme.colors.textSecondary}>{method.accountIdentifier}</Text><Text color={theme.colors.textSecondary}>{locale === "ar" ? method.instructionsAr : method.instructionsEn}</Text></View> : null)}
                  <TextInput value={senderAccountName} onChangeText={setSenderAccountName} placeholder={t("academy.enrollment.manual.senderName")} style={[styles.manualInput, { textAlign }]} />
                  <TextInput value={manualNotes} onChangeText={setManualNotes} placeholder={t("academy.enrollment.manual.notes")} multiline style={[styles.manualInput, { textAlign, minHeight: 72 }]} />
                  <Button title={manualProof ? manualProof.name : t("academy.enrollment.manual.chooseProof")} variant="secondary" onPress={() => void chooseManualProof()} />
                  <Button title={t("academy.enrollment.manual.submit")} onPress={() => void submitManualProof()} loading={manualSubmitting} disabled={manualSubmitting} style={styles.button} />
                  </> : null}
                </View>
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
                    leftIcon={<Ionicons name="videocam-outline" size={18} color={theme.colors.primary} />}
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
                    leftIcon={<Ionicons name="logo-whatsapp" size={18} color={theme.colors.primary} />}
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
  manualBox: {
    marginTop: 12,
    gap: 10,
  },
  manualDetails: {
    gap: 6,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#F5F7F7",
  },
  manualInput: {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#CBD5D6",
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
  },
});
