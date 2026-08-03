import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../providers/ThemeProvider";
import { getAppDirection } from "../../i18n/direction";
import { Text } from "../ui/Text";
import {
  buildTimeZoneOptions,
  getTimeZoneSnapshot,
  type TimeZoneLocale,
} from "../../features/timezone/timezone-options";

type Props = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  detectedTimeZone?: string | null;
};

export function TimeZonePicker({
  value,
  onChange,
  label,
  placeholder,
  disabled,
  error,
  helperText,
  detectedTimeZone,
}: Props) {
  const { theme } = useTheme();
  const { i18n } = useTranslation();
  const locale = (
    i18n.language?.startsWith("ar") ? "ar" : "en"
  ) as TimeZoneLocale;
  const direction = getAppDirection(i18n.language);
  const textAlign = direction === "rtl" ? "right" : "left";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const options = useMemo(
    () =>
      buildTimeZoneOptions({
        locale,
        selectedTimeZone: value,
        detectedTimeZone,
        query,
      }),
    [detectedTimeZone, locale, query, value],
  );
  const selected = useMemo(
    () =>
      buildTimeZoneOptions({ locale, selectedTimeZone: value }).find(
        (item) => item.value === value,
      ),
    [locale, value],
  );

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  return (
    <View style={styles.container}>
      {label ? (
        <Text
          weight="500"
          style={[styles.label, { textAlign }]}
          color={theme.colors.textSecondary}
        >
          {label}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[
          styles.field,
          {
            borderColor: error ? "#ef4444" : theme.colors.borderStrong,
            backgroundColor: theme.colors.surface,
            opacity: disabled ? 0.55 : 1,
          },
        ]}
      >
        <Text
          color={selected ? theme.colors.textPrimary : theme.colors.textMuted}
          style={{ textAlign, flex: 1 }}
        >
          {selected?.label ?? placeholder}
        </Text>
        <Text color={theme.colors.textMuted}>⌄</Text>
      </Pressable>
      {selected ? (
        <Text
          color={theme.colors.textMuted}
          style={[styles.helper, { textAlign }]}
        >
          {getTimeZoneSnapshot(selected.value, locale) ?? ""}
        </Text>
      ) : null}
      {error ? (
        <Text color="#ef4444" style={[styles.helper, { textAlign }]}>
          {error}
        </Text>
      ) : helperText ? (
        <Text
          color={theme.colors.textMuted}
          style={[styles.helper, { textAlign }]}
        >
          {helperText}
        </Text>
      ) : null}

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={close}
      >
        <SafeAreaView style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={close} />
          <View
            style={[styles.sheet, { backgroundColor: theme.colors.surface }]}
          >
            <View style={styles.sheetHeader}>
              <Text weight="600" color={theme.colors.textPrimary}>
                {label ?? (locale === "ar" ? "المنطقة الزمنية" : "Timezone")}
              </Text>
              <Pressable onPress={close} accessibilityRole="button">
                <Text color={theme.colors.primary}>
                  {locale === "ar" ? "إغلاق" : "Close"}
                </Text>
              </Pressable>
            </View>
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder={
                locale === "ar"
                  ? "ابحث باسم المدينة أو المنطقة أو IANA"
                  : "Search city, region, or IANA ID"
              }
              placeholderTextColor={theme.colors.textMuted}
              style={[
                styles.search,
                {
                  color: theme.colors.textPrimary,
                  borderColor: theme.colors.borderStrong,
                  textAlign,
                },
              ]}
              accessibilityLabel={
                locale === "ar" ? "بحث عن المنطقة الزمنية" : "Search timezones"
              }
            />
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={30}
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: item.value === value }}
                  onPress={() => {
                    onChange(item.value);
                    close();
                  }}
                  style={[
                    styles.option,
                    item.value === value
                      ? { backgroundColor: theme.colors.surfaceSecondary }
                      : null,
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      weight="500"
                      color={theme.colors.textPrimary}
                      style={{ textAlign }}
                    >
                      {item.label}
                    </Text>
                    <Text
                      color={theme.colors.textMuted}
                      style={{ textAlign, fontSize: 12 }}
                    >
                      {item.value}
                    </Text>
                  </View>
                </Pressable>
              )}
              ListEmptyComponent={
                <Text
                  color={theme.colors.textMuted}
                  style={[styles.empty, { textAlign }]}
                >
                  {locale === "ar"
                    ? "لا توجد مناطق زمنية مطابقة"
                    : "No matching timezones"}
                </Text>
              }
            />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", marginBottom: 16 },
  label: { fontSize: 14, marginBottom: 8 },
  field: {
    minHeight: 60,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  helper: { fontSize: 12, marginTop: 4 },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    maxHeight: "86%",
    minHeight: "55%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  search: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    fontSize: 16,
  },
  option: {
    minHeight: 58,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  empty: { padding: 24 },
});

export default TimeZonePicker;
