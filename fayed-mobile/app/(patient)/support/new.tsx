import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
} from "react-native";
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
import { useCreateSupportTicket } from "../../../src/features/patient/support/hooks";
import { extractApiErrorMessage } from "../../../src/lib/api";
import type { SupportTicketType } from "../../../src/features/patient/support/types";

const CATEGORIES: SupportTicketType[] = [
  "BOOKING",
  "PAYMENT",
  "SESSION",
  "TECHNICAL",
  "ACCOUNT",
  "MATCHING",
  "GENERAL",
  "OTHER",
];

export default function NewSupportTicketScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [category, setCategory] = useState<SupportTicketType>("GENERAL");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateSupportTicket();

  async function handleSubmit() {
    setError(null);
    if (!subject.trim() || subject.trim().length < 4) {
      setError(t("support.new.subjectRequired"));
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      setError(t("support.new.descriptionRequired"));
      return;
    }

    try {
      const res = await createMutation.mutateAsync({
        category,
        subject: subject.trim(),
        description: description.trim(),
      });
      router.replace(`/(patient)/support/${res.item.id}` as any);
    } catch (err) {
      setError(extractApiErrorMessage(err));
    }
  }

  return (
    <Screen bg="background">
      <Header
        title={t("support.new.title")}
        showBack
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.form}>
          {/* Category picker */}
          <View style={styles.field}>
            <Text weight="600" style={styles.label}>
              {t("support.new.categoryLabel")}
            </Text>
            <TouchableOpacity
              style={[
                styles.picker,
                {
                  borderColor: theme.colors.borderLight,
                  backgroundColor: theme.colors.surface,
                },
              ]}
              onPress={() => setCategoryModalOpen(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.pickerText}>
                {t(`support.categories.${category}`, category)}
              </Text>
              <Ionicons
                name="chevron-down"
                size={18}
                color={theme.colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          {/* Subject */}
          <View style={styles.field}>
            <Text weight="600" style={styles.label}>
              {t("support.new.subjectLabel")}
            </Text>
            <Input
              value={subject}
              onChangeText={setSubject}
              placeholder={t("support.new.subjectPlaceholder")}
              maxLength={191}
            />
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text weight="600" style={styles.label}>
              {t("support.new.descriptionLabel")}
            </Text>
            <Input
              value={description}
              onChangeText={setDescription}
              placeholder={t("support.new.descriptionPlaceholder")}
              multiline
              numberOfLines={5}
              style={styles.textArea}
              maxLength={2000}
            />
            <Text color={theme.colors.textMuted} style={styles.charCount}>
              {description.length} / 2000
            </Text>
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
            title={t("support.new.submit")}
            onPress={handleSubmit}
            disabled={createMutation.isPending}
            style={styles.submitBtn}
          />
        </Card>
      </ScrollView>

      {/* Category modal */}
      <Modal
        visible={categoryModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCategoryModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCategoryModalOpen(false)}
        >
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <View style={styles.modalHandle} />
            <Text weight="bold" style={styles.modalTitle}>
              {t("support.new.categoryLabel")}
            </Text>
            <FlatList
              data={CATEGORIES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.categoryOption,
                    item === category && {
                      backgroundColor: theme.colors.primary + "15",
                    },
                  ]}
                  onPress={() => {
                    setCategory(item);
                    setCategoryModalOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.categoryOptionText,
                      item === category && { color: theme.colors.primary },
                    ]}
                  >
                    {t(`support.categories.${item}`, item)}
                  </Text>
                  {item === category && (
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color={theme.colors.primary}
                    />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    paddingBottom: 40,
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
  picker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickerText: {
    fontSize: 15,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 12,
    textAlign: "right",
  },
  errorBox: {
    borderRadius: 8,
    padding: 12,
  },
  submitBtn: {
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: "70%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#d1d5db",
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    marginBottom: 12,
    textAlign: "center",
  },
  categoryOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 2,
  },
  categoryOptionText: {
    fontSize: 15,
  },
});
