import React from "react";
import { StyleSheet, View, SafeAreaView } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../../../providers/ThemeProvider";
import { Text } from "../../../../components/ui";
import { Button } from "../../../../components/ui/Button";

interface AvailabilityActionBarProps {
  status: "NOT_SET" | "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isDirty: boolean;
  hasSlots: boolean;
  selectedWeekKey: "current" | "next";
  nextWeekStatus?: "NOT_SET" | "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isLoading: boolean;
  onCreateDraft: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  onCopyToNext: () => void;
}

export function AvailabilityActionBar({
  status,
  isDirty,
  hasSlots,
  selectedWeekKey,
  nextWeekStatus,
  isLoading,
  onCreateDraft,
  onSaveDraft,
  onPublish,
  onCopyToNext,
}: AvailabilityActionBarProps) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const isRtl = i18n.dir() === "rtl";

  const renderContent = () => {
    const canCopy =
      selectedWeekKey === "current" &&
      (nextWeekStatus === "NOT_SET" || nextWeekStatus === "DRAFT");

    if (status === "NOT_SET") {
      return (
        <View style={styles.buttonRow}>
          <Button
            title={t("practitioner.availability.weeks.editor.createDraft", "Create Draft")}
            variant="primary"
            loading={isLoading}
            onPress={onCreateDraft}
            style={styles.actionButton}
          />
        </View>
      );
    }

    if (status === "ARCHIVED") {
      return null;
    }

    if (isDirty) {
      const bannerText =
        status === "DRAFT"
          ? t("practitioner.availability.weeks.editor.saveBeforePublish")
          : t("practitioner.availability.weeks.editor.publishedEditNotice");

      return (
        <View style={styles.draftContainer}>
          <View style={styles.warningBanner}>
            <Text
              style={[
                theme.typography.caption,
                {
                  color: status === "DRAFT" ? theme.colors.error : theme.colors.primary,
                  fontWeight: "600",
                  textAlign: "center",
                },
              ]}
            >
              {bannerText}
            </Text>
          </View>
          <View style={styles.buttonRow}>
            <Button
              title={t("practitioner.availability.weeks.editor.saveDraft")}
              variant="primary"
              loading={isLoading}
              onPress={onSaveDraft}
              style={styles.actionButton}
            />
          </View>
        </View>
      );
    }

    if (status === "DRAFT") {
      const hasNoSlots = !hasSlots;

      if (hasNoSlots) {
        return (
          <View style={styles.draftContainer}>
            <View style={styles.warningBanner}>
              <Text
                style={[
                  theme.typography.caption,
                  {
                    color: theme.colors.warning || "#B87F00",
                    fontWeight: "600",
                    textAlign: "center",
                  },
                ]}
              >
                {t("practitioner.availability.weeks.editor.addSlotBeforePublish")}
              </Text>
            </View>
            <View style={styles.buttonRow}>
              <Button
                title={t("practitioner.availability.weeks.editor.publishWeek")}
                variant="primary"
                disabled={true}
                style={styles.actionButton}
              />
            </View>
          </View>
        );
      }

      return (
        <View
          style={[
            styles.buttonRow,
            { flexDirection: isRtl ? "row-reverse" : "row" },
          ]}
        >
          <View style={styles.buttonWrapper}>
            <Button
              title={t("practitioner.availability.weeks.editor.publishWeek")}
              variant="primary"
              loading={isLoading}
              onPress={onPublish}
              style={styles.actionButton}
            />
          </View>
          {canCopy && (
            <View style={styles.buttonWrapper}>
              <Button
                title={t("practitioner.availability.weeks.editor.copyToNext")}
                variant="secondary"
                loading={isLoading}
                onPress={onCopyToNext}
                style={styles.actionButton}
              />
            </View>
          )}
        </View>
      );
    }

    if (status === "PUBLISHED" && canCopy) {
      return (
        <View style={styles.buttonRow}>
          <Button
            title={t("practitioner.availability.weeks.editor.copyToNext")}
            variant="primary"
            loading={isLoading}
            onPress={onCopyToNext}
            style={styles.actionButton}
          />
        </View>
      );
    }

    return null;
  };

  const content = renderContent();
  if (!content) return null;

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.container}>{content}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    borderTopWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 8,
  },
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  draftContainer: {
    width: "100%",
  },
  warningBanner: {
    marginBottom: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonRow: {
    width: "100%",
    gap: 8,
  },
  buttonWrapper: {
    flex: 1,
  },
  actionButton: {
    minHeight: 48,
    paddingVertical: 10,
  },
});
