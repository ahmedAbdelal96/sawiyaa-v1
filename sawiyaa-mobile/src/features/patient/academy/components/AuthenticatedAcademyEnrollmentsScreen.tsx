import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Card, ListPageScaffold, Text } from "../../../../components/ui";
import { useTheme } from "../../../../providers/ThemeProvider";
import { useAppDirection } from "../../../../i18n/direction";
import { useAuth } from "../../../../providers/AuthProvider";
import { getAuthenticatedAcademyProgramEnrollments } from "../api";
import type { AcademyProgramEnrollmentItem } from "../types";

export default function AuthenticatedAcademyEnrollmentsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { textAlign } = useAppDirection();
  const { role } = useAuth();
  const routeGroup = role === "trainee" ? "(trainee)" : "(patient)";
  const query = useQuery({ queryKey: ["academy", "my-enrollments"], queryFn: () => getAuthenticatedAcademyProgramEnrollments({ page: 1, limit: 50 }) });
  const items: AcademyProgramEnrollmentItem[] = query.data?.items ?? [];
  return (
    <ListPageScaffold title={t("academyMobile.myTrainings", { defaultValue: "My trainings" })} showBack loading={query.isLoading} error={query.isError} onRetry={() => query.refetch()} retryText={t("retry")} empty={items.length === 0} emptyTitle={t("academyMobile.emptyTitle")} emptyDescription={t("academyMobile.emptyDescription")}>
      <View style={styles.stack}>
        {items.map((item) => (
          <Pressable key={item.id} onPress={() => router.push(`/(${routeGroup})/academy/program-enrollments/${item.id}` as never)} accessibilityRole="button">
            <Card variant="outlined" padding="md" style={styles.card}>
              <Text weight="700" style={[styles.title, { color: theme.colors.primary, textAlign }]}>{item.program.title}</Text>
              <Text color={theme.colors.textSecondary} style={{ textAlign }}>{item.status} · {item.attendanceSummary?.attendancePercentage ?? 0}% attendance</Text>
              <Text color={theme.colors.textSecondary} style={{ textAlign }}>{item.certificate?.downloadAvailable ? "Certificate uploaded" : "Certificate not uploaded"}</Text>
            </Card>
          </Pressable>
        ))}
      </View>
    </ListPageScaffold>
  );
}

const styles = StyleSheet.create({ stack: { gap: 12 }, card: { marginBottom: 2 }, title: { fontSize: 17, marginBottom: 6 } });
