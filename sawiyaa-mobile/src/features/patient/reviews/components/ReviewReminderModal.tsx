import React, { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Button, Card, Input, Text } from "../../../../components/ui";
import { useTheme } from "../../../../providers/ThemeProvider";
import { useAppDirection } from "../../../../i18n/direction";
import { formatViewerDateTime } from "../../../../lib/time-formatting";
import { usePendingPatientReviews, useSubmitPatientSessionReview } from "../hooks";
import type { PendingPatientReviewItem } from "../types";

const REMINDER_READY_DELAY_MS = 0;

function StarButton({
  value,
  active,
  onPress,
}: {
  value: number;
  active: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.starButton,
        {
          borderColor: active ? theme.colors.primary : theme.colors.borderStrong,
          backgroundColor: active ? theme.colors.primarySoft : theme.colors.surface,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Ionicons
        name={active ? "star" : "star-outline"}
        size={18}
        color={active ? theme.colors.primary : theme.colors.textMuted}
      />
    </Pressable>
  );
}

type ReminderFormProps = {
  pendingReview: PendingPatientReviewItem;
  locale: string;
  onSubmitted: () => void;
  onLater: () => void;
};

function ReminderForm({ pendingReview, locale, onSubmitted, onLater }: ReminderFormProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { rowDirection, textAlign } = useAppDirection();
  const submitMutation = useSubmitPatientSessionReview(pendingReview.sessionId);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const completedAtLabel = useMemo(() => {
    if (!pendingReview.completedAt) {
      return t("reviews.patient.reminder.completedAtFallback");
    }

    return formatViewerDateTime(pendingReview.completedAt, {
      locale,
      fallbackText: t("reviews.patient.reminder.completedAtFallback"),
    });
  }, [locale, pendingReview.completedAt, t]);

  return (
    <View style={styles.formStack}>
      <View style={[styles.contextGrid, { flexDirection: rowDirection }]}>
        <View style={[styles.contextCard, { backgroundColor: theme.colors.surfaceRaised }]}>
          <Text variant="bodySmall" color={theme.colors.textMuted}>
            {t("reviews.patient.reminder.practitionerLabel")}
          </Text>
          <Text variant="body" weight="700" style={{ textAlign, marginTop: 6 }}>
            {pendingReview.practitioner.displayName ?? pendingReview.practitioner.slug}
          </Text>
        </View>
        <View style={[styles.contextCard, { backgroundColor: theme.colors.surfaceRaised }]}>
          <Text variant="bodySmall" color={theme.colors.textMuted}>
            {t("reviews.patient.reminder.completedAtLabel")}
          </Text>
          <Text variant="body" weight="700" style={{ textAlign, marginTop: 6 }}>
            {completedAtLabel}
          </Text>
        </View>
      </View>

      <View>
        <Text variant="body" weight="700" style={{ textAlign, marginBottom: 10 }}>
          {t("reviews.patient.reminder.ratingLabel")}
        </Text>
        <View style={[styles.starRow, { flexDirection: rowDirection }]}>
          {[1, 2, 3, 4, 5].map((value) => (
            <StarButton
              key={value}
              value={value}
              active={value <= rating}
              onPress={() => setRating(value)}
            />
          ))}
        </View>
        <Text
          variant="caption"
          color={theme.colors.textMuted}
          style={{ textAlign, marginTop: 8 }}
        >
          {rating > 0
            ? t("reviews.patient.reminder.ratingPicked", { value: rating })
            : t("reviews.patient.reminder.ratingHelp")}
        </Text>
      </View>

      <Input
        label={t("reviews.patient.reminder.titleLabel")}
        value={title}
        onChangeText={(value) => setTitle(value.slice(0, 191))}
        placeholder={t("reviews.patient.reminder.titlePlaceholder")}
        maxLength={191}
      />

      <View style={{ marginBottom: 16 }}>
        <Text
          weight="500"
          style={{ textAlign, marginBottom: 8 }}
          color={theme.colors.textSecondary}
        >
          {t("reviews.patient.reminder.noteLabel")}
        </Text>
        <View
          style={[
            styles.textAreaShell,
            {
              borderColor: theme.colors.borderStrong,
              backgroundColor: theme.colors.surface,
            },
          ]}
        >
          <ScrollView>
            <TextInputField
              value={note}
              onChangeText={(value) => setNote(value.slice(0, 4000))}
              placeholder={t("reviews.patient.reminder.notePlaceholder")}
              placeholderTextColor={theme.colors.textMuted}
              textAlign={textAlign}
              textDirection={rowDirection === "row-reverse" ? "rtl" : "ltr"}
              color={theme.colors.textPrimary}
            />
          </ScrollView>
        </View>
        <Text
          variant="caption"
          color={theme.colors.textMuted}
          style={{ textAlign, marginTop: 8 }}
        >
          {t("reviews.patient.reminder.noteHint")}
        </Text>
      </View>

      {errorKey ? (
        <View style={[styles.errorBox, { borderColor: theme.colors.errorLight, backgroundColor: theme.colors.errorLight }]}>
          <Text variant="bodySmall" color={theme.colors.error}>
            {t(errorKey)}
          </Text>
        </View>
      ) : null}

      <View style={styles.actionRow}>
        <Button
          title={submitMutation.isPending ? t("reviews.patient.reminder.submitting") : t("reviews.patient.reminder.submit")}
          loading={submitMutation.isPending}
          onPress={async () => {
            if (rating < 1) {
              setErrorKey("reviews.patient.reminder.errors.ratingRequired");
              return;
            }

            setErrorKey(null);

            try {
              await submitMutation.mutateAsync({
                overallRating: rating,
                title: title.trim() || undefined,
                textReview: note.trim() || undefined,
              });
              onSubmitted();
            } catch {
              setErrorKey("reviews.patient.reminder.errors.generic");
            }
          }}
        />
        <Button
          title={t("reviews.patient.reminder.later")}
          variant="secondary"
          onPress={onLater}
        />
      </View>
    </View>
  );
}

function TextInputField({
  value,
  onChangeText,
  placeholder,
  placeholderTextColor,
  textAlign,
  textDirection,
  color,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  placeholderTextColor: string;
  textAlign: "left" | "right";
  textDirection: "ltr" | "rtl";
  color: string;
}) {
  return (
    <View style={{ minHeight: 140 }}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        multiline
        style={[
          styles.textArea,
          {
            color,
            textAlign,
            writingDirection: textDirection,
          },
        ]}
      />
    </View>
  );
}

export default function ReviewReminderModal() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const pendingReviewsQuery = usePendingPatientReviews(3, ready && !dismissed);
  const pendingReview = pendingReviewsQuery.data?.items[0] ?? null;

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), REMINDER_READY_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const locale = i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
  const isOpen = ready && !dismissed && Boolean(pendingReview);

  const closeForSession = () => {
    setDismissed(true);
  };

  if (!isOpen || !pendingReview) {
    return null;
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={closeForSession}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.backdrop}
      >
        <Pressable style={styles.overlay} onPress={closeForSession} />
        <View style={[styles.sheet, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.handle} />
          <ScrollView
            contentContainerStyle={styles.sheetContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <Text variant="caption" color={theme.colors.textMuted} style={styles.eyebrow}>
                {t("reviews.patient.reminder.eyebrow")}
              </Text>
              <Text variant="h2" weight="700" style={styles.title}>
                {t("reviews.patient.reminder.modalTitle")}
              </Text>
              <Text variant="body" color={theme.colors.textSecondary} style={styles.description}>
                {t("reviews.patient.reminder.modalDescription")}
              </Text>
            </View>

            <Card variant="outlined" padding="sm">
              <ReminderForm
                pendingReview={pendingReview}
                locale={locale}
                onSubmitted={closeForSession}
                onLater={closeForSession}
              />
            </Card>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(17, 24, 39, 0.45)",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 16,
    maxHeight: "92%",
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(148, 163, 184, 0.55)",
    marginBottom: 12,
  },
  sheetContent: {
    paddingBottom: 24,
    gap: 16,
  },
  header: {
    gap: 8,
  },
  eyebrow: {
    textTransform: "uppercase",
    letterSpacing: 1.6,
  },
  title: {
    lineHeight: 30,
  },
  description: {
    lineHeight: 22,
  },
  contextGrid: {
    gap: 10,
  },
  contextCard: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
  },
  formStack: {
    gap: 16,
  },
  starRow: {
    gap: 8,
    flexWrap: "wrap",
  },
  starButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  textAreaShell: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    minHeight: 140,
  },
  textArea: {
    minHeight: 140,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    textAlignVertical: "top",
  },
  errorBox: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  actionRow: {
    gap: 10,
  },
});
