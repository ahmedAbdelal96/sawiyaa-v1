import React, { useMemo, useState } from "react";
import {
  Modal,
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../../providers/ThemeProvider";
import { Text } from "../../../components/ui";
import { DialCodeOption, DIAL_CODES } from "../dial-codes";

interface DialCodePickerModalProps {
  visible: boolean;
  value: string | null;
  onClose: () => void;
  onSelect: (dialCode: string) => void;
}

export function DialCodePickerModal({
  visible,
  value,
  onClose,
  onSelect,
}: DialCodePickerModalProps) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const isRtl = i18n.language?.startsWith("ar") ?? false;
  const [search, setSearch] = useState("");

  const filtered = useMemo<DialCodeOption[]>(() => {
    if (!search.trim()) return DIAL_CODES;
    const q = search.toLowerCase();
    return DIAL_CODES.filter(
      (d) =>
        d.dialCode.includes(q) ||
        d.labelAr.toLowerCase().includes(q) ||
        d.labelEn.toLowerCase().includes(q),
    );
  }, [search]);

  const displayLabel = (d: DialCodeOption) =>
    isRtl ? d.labelAr : d.labelEn;

  const selectedDialCode = value ?? null;

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
          {/* Header */}
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
                {t("auth.fields.selectDialCode")}
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

          {/* Search */}
          <View style={styles.searchWrap}>
            <Ionicons
              name="search"
              size={18}
              color={theme.colors.textMuted}
              style={isRtl ? styles.searchIconRtl : styles.searchIconLtr}
            />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={
                isRtl ? "ابحث" : t("auth.fields.searchDialCode")
              }
              placeholderTextColor={theme.colors.textMuted}
              style={[
                styles.searchInput,
                {
                  color: theme.colors.textPrimary,
                  textAlign: isRtl ? "right" : "left",
                  backgroundColor: theme.colors.surfaceTertiary,
                  borderColor: theme.colors.borderLight,
                },
              ]}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")} activeOpacity={0.7}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={theme.colors.textMuted}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* List */}
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {filtered.length === 0 ? (
              <View style={styles.empty}>
                <Text color={theme.colors.textMuted} style={{ textAlign: "center" }}>
                  {isRtl ? "لا توجد نتائج" : "No results"}
                </Text>
              </View>
            ) : (
              filtered.map((dial) => {
                const isSelected = dial.dialCode === selectedDialCode;
                return (
                  <TouchableOpacity
                    key={dial.dialCode}
                    activeOpacity={0.7}
                    onPress={() => {
                      onSelect(dial.dialCode);
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
                      style={{
                        flex: 1,
                        flexDirection: isRtl ? "row-reverse" : "row",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <Text
                        weight={isSelected ? "600" : "400"}
                        style={{
                          fontSize: 16,
                          color: isSelected
                            ? theme.colors.primary
                            : theme.colors.textPrimary,
                        }}
                      >
                        {displayLabel(dial)}
                      </Text>
                      <Text
                        color={theme.colors.textMuted}
                        style={{ fontSize: 14 }}
                      >
                        {dial.dialCode}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={theme.colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
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
    maxHeight: "80%",
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
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  searchIconLtr: {
    marginRight: 4,
  },
  searchIconRtl: {
    marginLeft: 4,
  },
  searchInput: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  list: {
    maxHeight: 400,
  },
  listContent: {
    paddingBottom: 24,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  empty: {
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
});
