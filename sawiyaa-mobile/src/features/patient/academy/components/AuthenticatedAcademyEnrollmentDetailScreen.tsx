import React from "react";
import { StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { Card, ListPageScaffold, Text } from "../../../../components/ui";
import { useTheme } from "../../../../providers/ThemeProvider";
import { useAppDirection } from "../../../../i18n/direction";
import { getAuthenticatedAcademyProgramEnrollment } from "../api";

export default function AuthenticatedAcademyEnrollmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { textAlign } = useAppDirection();
  const query = useQuery({ queryKey: ["academy", "my-enrollment", id], queryFn: () => getAuthenticatedAcademyProgramEnrollment(String(id)), enabled: Boolean(id) });
  const item = query.data?.item;
  const attendance = (query.data?.attendance as { sessions?: Array<{ sessionId: string; status: string; startsAt?: string }> } | undefined)?.sessions ?? [];
  return (
    <ListPageScaffold title={item?.program.title ?? t("academyMobile.myTrainings", { defaultValue: "Training" })} showBack loading={query.isLoading} error={query.isError} onRetry={() => query.refetch()} retryText={t("retry")} empty={!item} emptyTitle={t("academyMobile.emptyTitle")} emptyDescription={t("academyMobile.emptyDescription")}>
      {item ? <View style={styles.stack}>
        <Card variant="outlined" padding="md"><Text weight="700" style={[styles.heading, { color: theme.colors.primary, textAlign }]}>{item.status}</Text><Text color={theme.colors.textSecondary} style={{ textAlign }}>Attendance: {item.attendanceSummary?.attendancePercentage ?? 0}%</Text><Text color={theme.colors.textSecondary} style={{ textAlign }}>{item.certificate?.downloadAvailable ? "Certificate uploaded" : "Certificate not uploaded"}</Text></Card>
        <Card variant="outlined" padding="md"><Text weight="700" style={[styles.heading, { color: theme.colors.primary, textAlign }]}>Attendance</Text>{attendance.length === 0 ? <Text color={theme.colors.textSecondary} style={{ textAlign }}>No attendance recorded yet.</Text> : attendance.map((row) => <View key={row.sessionId} style={styles.row}><Text style={{ textAlign }}>{row.startsAt ?? "Lecture"}</Text><Text color={row.status === "PRESENT" ? theme.colors.success : theme.colors.textSecondary} weight="700">{row.status}</Text></View>)}</Card>
      </View> : null}
    </ListPageScaffold>
  );
}

const styles = StyleSheet.create({ stack: { gap: 12 }, heading: { fontSize: 18, marginBottom: 8 }, row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E5E7EB" } });
