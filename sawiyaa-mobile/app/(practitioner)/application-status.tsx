import React, { useEffect, useMemo } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  ErrorState,
  Header,
  LoadingState,
  Screen,
  StatusChip,
  Text,
} from "../../src/components/ui";
import { useAuth } from "../../src/providers/AuthProvider";
import {
  usePractitionerApplicationStatus,
  usePractitionerProfile,
} from "../../src/features/practitioner/profile/hooks";
import { useTheme } from "../../src/providers/ThemeProvider";
import type { ThemeShape } from "../../src/constants/theme";
import { getAppDirection } from "../../src/i18n/direction";

function normalizeBaseUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export default function PractitionerApprovalStatusScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme() as { theme: ThemeShape };
  const router = useRouter();
  const { user, signOut } = useAuth();
  const profileQuery = usePractitionerProfile();
  const applicationQuery = usePractitionerApplicationStatus();
  const direction = getAppDirection(i18n.language);
  const isRtl = direction === "rtl";

  const profileStatus = profileQuery.data?.profile?.profileStatus;
  const applicationStatus = applicationQuery.data?.application?.status;
  const isApproved = (profileStatus ?? user?.practitionerStatus) === "APPROVED";

  const statusKey = useMemo(() => {
    if (profileStatus === "REJECTED" || applicationStatus === "REJECTED") {
      return "rejected";
    }

    if (profileStatus === "SUSPENDED" || profileStatus === "INACTIVE") {
      return "suspended";
    }

    if (applicationStatus === "DRAFT" || applicationStatus === "CHANGES_REQUESTED") {
      return "incomplete";
    }

    return "pending";
  }, [applicationStatus, profileStatus]);
  const rejectionReason =
    cleanReasonText(
      applicationQuery.data?.application?.reviewDecisionReason?.trim() ||
        applicationQuery.data?.application?.reviewNotes?.trim() ||
        null,
    );

  const webBaseUrl = normalizeBaseUrl(
    process.env.EXPO_PUBLIC_WEB_APP_URL ?? "http://localhost:3000",
  );
  const locale = i18n.language?.startsWith("ar") ? "ar" : "en";
  const webApplicationUrl = `${webBaseUrl}/${locale}/practitioner/application`;
  const supportUrl = `${webBaseUrl}/${locale}/support`;

  useEffect(() => {
    if (isApproved) {
      router.replace("/(practitioner)");
    }
  }, [isApproved, router]);

  if (isApproved) return null;

  if (profileQuery.isLoading || applicationQuery.isLoading) {
    return (
      <Screen bg="background">
        <Header title={t("auth.practitionerApprovalStatus.header")} />
        <LoadingState fullScreen />
      </Screen>
    );
  }

  if (profileQuery.isError || applicationQuery.isError) {
    return (
      <Screen bg="background">
        <Header title={t("auth.practitionerApprovalStatus.header")} />
        <ErrorState
          fullScreen
          title={t("auth.practitionerApprovalStatus.errorTitle")}
          message={t("auth.practitionerApprovalStatus.errorBody")}
          onRetry={() => {
            profileQuery.refetch();
            applicationQuery.refetch();
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen bg="background">
      <Header title={t("auth.practitionerApprovalStatus.header")} />
      <View style={styles.content}>
        <Card variant="elevated" padding="sm" style={styles.card}>
          <View style={styles.statusChipWrap}>
            <StatusChip
              label={t(`auth.practitionerApprovalStatus.states.${statusKey}.chip`)}
              tone={statusKey === "rejected" || statusKey === "suspended" ? "error" : "warning"}
              showDot={false}
            />
          </View>
          <Text
            weight="700"
            style={[styles.title, { textAlign: isRtl ? "right" : "left" }]}
          >
            {t(`auth.practitionerApprovalStatus.states.${statusKey}.title`)}
          </Text>
          <Text
            color={theme.colors.textSecondary}
            style={[styles.body, { textAlign: isRtl ? "right" : "left" }]}
          >
            {t(`auth.practitionerApprovalStatus.states.${statusKey}.body`)}
          </Text>

          {statusKey === "rejected" && rejectionReason ? (
            <View
              style={[
                styles.reasonBox,
              {
                  borderColor: theme.colors.errorLight ?? theme.colors.border,
                  backgroundColor: theme.colors.surfaceRaised,
              },
            ]}
            >
              <Text weight="600" style={{ textAlign: isRtl ? "right" : "left" }}>
                {t("auth.practitionerApprovalStatus.rejectionReason")}
              </Text>
              <Text
                color={theme.colors.textSecondary}
                style={{ textAlign: isRtl ? "right" : "left" }}
              >
                {rejectionReason}
              </Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <Button
              title={t("auth.practitionerApprovalStatus.openWeb")}
              onPress={() => void Linking.openURL(webApplicationUrl)}
              style={styles.compactButton}
            />
            <Button
              title={t("auth.practitionerApprovalStatus.contactSupport")}
              variant="secondary"
              onPress={() => void Linking.openURL(supportUrl)}
              style={styles.compactButton}
            />
            <Button
              title={t("auth.practitionerApprovalStatus.logout")}
              variant="secondary"
              onPress={() => void signOut()}
              style={styles.compactButton}
            />
          </View>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
  },
  card: {
    gap: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
  },
  body: {
    fontSize: 12,
    lineHeight: 18,
  },
  reasonBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 9,
    gap: 4,
  },
  actions: {
    gap: 6,
    marginTop: 2,
  },
  statusChipWrap: {
    alignSelf: "flex-start",
  },
  compactButton: {
    minHeight: 46,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
});

function cleanReasonText(value: string | null) {
  if (!value) {
    return null;
  }

  return value.replace(/^(Reason|سبب الرفض)\s*:\s*/i, "").trim() || null;
}
