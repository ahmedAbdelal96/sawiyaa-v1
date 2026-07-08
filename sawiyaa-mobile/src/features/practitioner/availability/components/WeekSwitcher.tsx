import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../../../providers/ThemeProvider";
import { Text } from "../../../../components/ui";

interface WeekSwitcherProps {
  selectedWeekKey: "current" | "next";
  onSelect: (key: "current" | "next") => void;
}

export function WeekSwitcher({ selectedWeekKey, onSelect }: WeekSwitcherProps) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const isRtl = i18n.dir() === "rtl";

  const renderTab = (key: "current" | "next", labelKey: string) => {
    const isSelected = selectedWeekKey === key;
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onSelect(key)}
        style={[
          styles.tab,
          {
            backgroundColor: isSelected ? theme.colors.primary : "transparent",
          },
        ]}
      >
        <Text
          style={[
            theme.typography.bodySmall,
            {
              color: isSelected ? "#FFFFFF" : theme.colors.textSecondary,
              fontWeight: "700",
              textAlign: "center",
            },
          ]}
        >
          {t(labelKey)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.outerContainer}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.surfaceRaised,
            borderColor: theme.colors.border,
            flexDirection: isRtl ? "row-reverse" : "row",
          },
        ]}
      >
        {renderTab("current", "practitioner.availability.weeks.currentLabel")}
        {renderTab("next", "practitioner.availability.weeks.nextLabel")}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    paddingHorizontal: 16,
    marginVertical: 8,
    alignItems: "center",
    width: "100%",
  },
  container: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 4,
    width: "100%",
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 40,
  },
});
