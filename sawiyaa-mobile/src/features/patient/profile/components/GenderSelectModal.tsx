import React from "react";
import {
  Modal,
  View,
  TouchableOpacity,
  StyleSheet,
  I18nManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../../../providers/ThemeProvider";
import { Text } from "../../../../components/ui";

export type GenderValue = "male" | "female" | null;

interface GenderSelectModalProps {
  visible: boolean;
  value: GenderValue;
  onClose: () => void;
  onSelect: (gender: GenderValue) => void;
}

interface GenderOption {
  value: GenderValue;
  labelKey: string;
}

export function GenderSelectModal({
  visible,
  value,
  onClose,
  onSelect,
}: GenderSelectModalProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isRtl = I18nManager.isRTL;

  const options: GenderOption[] = [
    { value: "male", labelKey: "male" },
    { value: "female", labelKey: "female" },
    { value: null, labelKey: "unspecified" },
  ];

  const getLabel = (opt: GenderOption) => {
    if (opt.value === null) {
      return t("profileScreen.details.genderOptions.unspecified");
    }
    return t(
      `profileScreen.details.genderOptions.${opt.value}` as const,
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderLight,
            },
          ]}
        >
          <View
            style={[
              styles.header,
              {
                borderBottomColor: theme.colors.borderLight,
                flexDirection: isRtl ? "row-reverse" : "row",
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text weight="600" style={styles.headerTitle}>
                {t("profileScreen.edit.fields.gender")}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons
                name="close"
                size={22}
                color={theme.colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.optionsList}>
            {options.map((opt) => {
              const isSelected = value === opt.value;
              return (
                <TouchableOpacity
                  key={opt.labelKey}
                  activeOpacity={0.7}
                  onPress={() => {
                    onSelect(opt.value);
                    onClose();
                  }}
                  style={[
                    styles.optionRow,
                    {
                      borderBottomColor: theme.colors.borderLight,
                      flexDirection: isRtl ? "row-reverse" : "row",
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.radio,
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
                      <Ionicons
                        name="checkmark"
                        size={12}
                        color="#fff"
                      />
                    )}
                  </View>
                  <Text
                    weight={isSelected ? "600" : "400"}
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
                    {getLabel(opt)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 17,
  },
  optionsList: {
    paddingVertical: 8,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  optionLabel: {
    fontSize: 16,
    flex: 1,
  },
});
