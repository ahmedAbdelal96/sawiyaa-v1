import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  Header,
  Screen,
  Card,
  Text,
  SectionHeader,
} from "../../../components/ui";
import { useTheme, type ThemeMode } from "../../../providers/ThemeProvider";
import { setAppLanguage, type AppLanguage } from "../../../i18n";
import { useAppDirection } from "../../../i18n/direction";

export default function SettingsScreen() {
  const { theme, themeMode, setThemeMode } = useTheme();
  const { t, i18n } = useTranslation();
  const { isRtl, rowDirection, chevronForward } = useAppDirection();

  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState(false);
  const [isAppearanceModalVisible, setIsAppearanceModalVisible] =
    useState(false);

  const [showRestartNotice, setShowRestartNotice] = useState(false);

  const currentLanguage: AppLanguage = i18n.language?.startsWith("ar")
    ? "ar"
    : "en";

  const getLanguageLabel = (lang: AppLanguage) => {
    return lang === "ar"
      ? t("settings.language.options.ar", { defaultValue: "العربية" })
      : t("settings.language.options.en", { defaultValue: "English" });
  };

  const getAppearanceLabel = (mode: ThemeMode) => {
    switch (mode) {
      case "system":
        return t("settings.appearance.options.system", {
          defaultValue: i18n.language?.startsWith("ar")
            ? "حسب إعداد الجهاز"
            : "System default",
        });
      case "light":
        return t("settings.appearance.options.light", {
          defaultValue: i18n.language?.startsWith("ar") ? "فاتح" : "Light",
        });
      case "dark":
        return t("settings.appearance.options.dark", {
          defaultValue: i18n.language?.startsWith("ar") ? "داكن" : "Dark",
        });
    }
  };

  const handleSelectLanguage = async (lang: AppLanguage) => {
    setIsLanguageModalVisible(false);
    if (lang !== currentLanguage) {
      const result = await setAppLanguage(lang);
      if (result.requiresRestart) {
        setShowRestartNotice(true);
      } else {
        setShowRestartNotice(false);
      }
    }
  };

  const handleSelectAppearance = async (mode: ThemeMode) => {
    setIsAppearanceModalVisible(false);
    if (mode !== themeMode) {
      await setThemeMode(mode);
    }
  };

  return (
    <Screen bg="background" testID="settings-screen">
      <Header
        title={t("settings.screenTitle")}
        showBack
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {showRestartNotice && (
          <View
            style={[
              styles.noticeBanner,
              {
                backgroundColor: theme.colors.primarySoft,
                borderColor: theme.colors.primary,
                flexDirection: rowDirection,
              },
            ]}
          >
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={theme.colors.primary}
              style={{ marginEnd: 8 }}
            />
            <Text
              style={styles.noticeText}
              color={theme.colors.primary}
            >
              {t("settings.language.restartNotice", {
                defaultValue: i18n.language?.startsWith("ar")
                  ? "تم تحديث اللغة والاتجاه. أعد تشغيل التطبيق لتشغيل كامل المحاذاة الأصلية."
                  : "Language updated. Restart app to apply full native writing direction.",
              })}
            </Text>
          </View>
        )}

        <SectionHeader
          title={t("settings.sections.preferences", {
            defaultValue: "التفضيلات العامّة",
          })}
          style={{ flexDirection: isRtl ? "row-reverse" : "row" }}
        />

        <Card
          variant="elevated"
          style={[
            styles.groupedCard,
            {
              backgroundColor: theme.colors.surfaceRaised,
              borderColor: theme.colors.borderLight,
            },
          ]}
          padding="none"
        >
          {/* Language Row */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setIsLanguageModalVisible(true)}
            style={[
              styles.rowButton,
              {
                flexDirection: rowDirection,
                borderBottomColor: theme.colors.divider,
              },
            ]}
          >
            <View
              style={[
                styles.iconWrapper,
                { backgroundColor: theme.colors.primarySoft },
              ]}
            >
              <Ionicons
                name="language-outline"
                size={20}
                color={theme.colors.primary}
              />
            </View>

            <View
              style={[
                styles.rowTextWrap,
                { alignItems: isRtl ? "flex-end" : "flex-start" },
              ]}
            >
              <Text
                weight="600"
                style={styles.rowTitle}
                color={theme.colors.textPrimary}
              >
                {t("settings.language.title", { defaultValue: "اللغة" })}
              </Text>
              <Text
                style={styles.rowSubtitle}
                color={theme.colors.textSecondary}
              >
                {t("settings.language.subtitle", {
                  defaultValue: "اختر لغة التطبيق",
                })}
              </Text>
            </View>

            <View
              style={[styles.rowRightWrap, { flexDirection: rowDirection }]}
            >
              <Text
                weight="600"
                style={styles.valueText}
                color={theme.colors.primary}
              >
                {getLanguageLabel(currentLanguage)}
              </Text>
              <Ionicons
                name={chevronForward}
                size={18}
                color={theme.colors.textMuted}
                style={{ opacity: 0.6, marginStart: 6 }}
              />
            </View>
          </TouchableOpacity>

          {/* Appearance Row */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setIsAppearanceModalVisible(true)}
            style={[styles.rowButton, { flexDirection: rowDirection }]}
          >
            <View
              style={[
                styles.iconWrapper,
                { backgroundColor: theme.colors.primarySoft },
              ]}
            >
              <Ionicons
                name="color-palette-outline"
                size={20}
                color={theme.colors.primary}
              />
            </View>

            <View
              style={[
                styles.rowTextWrap,
                { alignItems: isRtl ? "flex-end" : "flex-start" },
              ]}
            >
              <Text
                weight="600"
                style={styles.rowTitle}
                color={theme.colors.textPrimary}
              >
                {t("settings.appearance.title", { defaultValue: "المظهر" })}
              </Text>
              <Text
                style={styles.rowSubtitle}
                color={theme.colors.textSecondary}
              >
                {t("settings.appearance.subtitle", {
                  defaultValue: "تخصيص ثيم وألوان التطبيق",
                })}
              </Text>
            </View>

            <View
              style={[styles.rowRightWrap, { flexDirection: rowDirection }]}
            >
              <Text
                weight="600"
                style={styles.valueText}
                color={theme.colors.primary}
              >
                {getAppearanceLabel(themeMode)}
              </Text>
              <Ionicons
                name={chevronForward}
                size={18}
                color={theme.colors.textMuted}
                style={{ opacity: 0.6, marginStart: 6 }}
              />
            </View>
          </TouchableOpacity>
        </Card>
      </ScrollView>

      {/* Language Selection Modal */}
      <SelectionModal<AppLanguage>
        visible={isLanguageModalVisible}
        title={t("settings.language.title", { defaultValue: "اللغة" })}
        selectedValue={currentLanguage}
        options={[
          { key: "ar", label: getLanguageLabel("ar") },
          { key: "en", label: getLanguageLabel("en") },
        ]}
        onClose={() => setIsLanguageModalVisible(false)}
        onSelect={handleSelectLanguage}
      />

      {/* Appearance Selection Modal */}
      <SelectionModal<ThemeMode>
        visible={isAppearanceModalVisible}
        title={t("settings.appearance.title", { defaultValue: "المظهر" })}
        selectedValue={themeMode}
        options={[
          { key: "system", label: getAppearanceLabel("system") },
          { key: "light", label: getAppearanceLabel("light") },
          { key: "dark", label: getAppearanceLabel("dark") },
        ]}
        onClose={() => setIsAppearanceModalVisible(false)}
        onSelect={handleSelectAppearance}
      />
    </Screen>
  );
}

interface SelectionModalProps<T extends string> {
  visible: boolean;
  title: string;
  selectedValue: T;
  options: Array<{ key: T; label: string }>;
  onClose: () => void;
  onSelect: (value: T) => void;
}

function SelectionModal<T extends string>({
  visible,
  title,
  selectedValue,
  options,
  onClose,
  onSelect,
}: SelectionModalProps<T>) {
  const { theme } = useTheme();
  const { isRtl } = useAppDirection();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.modalContainer,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderLight,
            },
          ]}
        >
          <View
            style={[
              styles.modalHeader,
              {
                borderBottomColor: theme.colors.divider,
                flexDirection: isRtl ? "row-reverse" : "row",
              },
            ]}
          >
            <Text
              weight="bold"
              style={styles.modalTitle}
              color={theme.colors.textPrimary}
            >
              {title}
            </Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons
                name="close-circle-outline"
                size={24}
                color={theme.colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.optionsList}>
            {options.map((option) => {
              const isSelected = selectedValue === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  activeOpacity={0.7}
                  onPress={() => onSelect(option.key)}
                  style={[
                    styles.optionRow,
                    {
                      borderBottomColor: theme.colors.divider,
                      flexDirection: isRtl ? "row-reverse" : "row",
                      backgroundColor: isSelected
                        ? theme.colors.primarySoft
                        : "transparent",
                    },
                  ]}
                >
                  <Text
                    weight={isSelected ? "700" : "500"}
                    style={[
                      styles.optionLabel,
                      {
                        color: isSelected
                          ? theme.colors.primary
                          : theme.colors.textPrimary,
                        textAlign: isRtl ? "right" : "left",
                      },
                    ]}
                  >
                    {option.label}
                  </Text>

                  <View
                    style={[
                      styles.radioButton,
                      {
                        borderColor: isSelected
                          ? theme.colors.primary
                          : theme.colors.borderLight,
                        backgroundColor: isSelected
                          ? theme.colors.primary
                          : "transparent",
                      },
                    ]}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 12,
  },
  noticeBanner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    marginBottom: 8,
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  groupedCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  rowButton: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTextWrap: {
    flex: 1,
    marginHorizontal: 12,
  },
  rowTitle: {
    fontSize: 15,
  },
  rowSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  rowRightWrap: {
    alignItems: "center",
  },
  valueText: {
    fontSize: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingBottom: 24,
  },
  modalHeader: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 17,
  },
  optionsList: {
    paddingTop: 8,
  },
  optionRow: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionLabel: {
    fontSize: 15,
    flex: 1,
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
