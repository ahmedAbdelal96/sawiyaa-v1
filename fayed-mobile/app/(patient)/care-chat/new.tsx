import React, { useState } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import {
  Screen,
  Header,
  Text,
  Card,
  Button,
  Input,
} from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { useCreateCareChatRequest } from "../../../src/features/patient/care-chat/hooks";
import { extractApiErrorMessage } from "../../../src/lib/api";

export default function NewCareChatRequestScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [practitionerSlug, setPractitionerSlug] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateCareChatRequest();

  async function handleSubmit() {
    setError(null);
    if (!practitionerSlug.trim()) {
      setError(t("careChat.new.slugRequired"));
      return;
    }

    try {
      await createMutation.mutateAsync({
        practitionerSlug: practitionerSlug.trim(),
        reason: reason.trim() || undefined,
      });
      router.replace("/(patient)/care-chat" as any);
    } catch (err) {
      setError(extractApiErrorMessage(err));
    }
  }

  return (
    <Screen bg="background">
      <Header
        title={t("careChat.new.title")}
        showBack
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Info block */}
        <View
          style={[
            styles.infoBlock,
            { backgroundColor: theme.colors.primary + "12" },
          ]}
        >
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={theme.colors.primary}
          />
          <Text color={theme.colors.primary} style={styles.infoText}>
            {t("careChat.new.approvalNote")}
          </Text>
        </View>

        <Card style={styles.form}>
          {/* Practitioner slug */}
          <View style={styles.field}>
            <Text weight="600" style={styles.label}>
              {t("careChat.new.practitionerSlugLabel")}
            </Text>
            <Input
              value={practitionerSlug}
              onChangeText={setPractitionerSlug}
              placeholder={t("careChat.new.practitionerSlugPlaceholder")}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text color={theme.colors.textMuted} style={styles.hint}>
              {t("careChat.new.practitionerSlugHint")}
            </Text>
          </View>

          {/* Reason (optional) */}
          <View style={styles.field}>
            <Text weight="600" style={styles.label}>
              {t("careChat.new.reasonLabel")}
              <Text color={theme.colors.textMuted}>
                {" "}
                ({t("careChat.new.optional")})
              </Text>
            </Text>
            <Input
              value={reason}
              onChangeText={setReason}
              placeholder={t("careChat.new.reasonPlaceholder")}
              multiline
              numberOfLines={4}
              style={styles.textArea}
              maxLength={1000}
            />
          </View>

          {error ? (
            <View
              style={[
                styles.errorBox,
                { backgroundColor: theme.colors.error + "15" },
              ]}
            >
              <Text style={{ color: theme.colors.error, fontSize: 14 }}>
                {error}
              </Text>
            </View>
          ) : null}

          <Button
            title={t("careChat.new.submit")}
            onPress={handleSubmit}
            disabled={createMutation.isPending}
          />
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  infoBlock: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  form: {
    padding: 16,
    gap: 16,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 14,
  },
  hint: {
    fontSize: 12,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  errorBox: {
    borderRadius: 8,
    padding: 12,
  },
});

