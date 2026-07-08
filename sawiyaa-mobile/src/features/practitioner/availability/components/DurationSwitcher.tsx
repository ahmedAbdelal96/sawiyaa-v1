import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../../../providers/ThemeProvider";
import { Text } from "../../../../components/ui";

interface DurationSwitcherProps {
  selectedDuration: 30 | 60;
  onSelect: (duration: 30 | 60) => void;
}

export function DurationSwitcher({
  selectedDuration,
  onSelect,
}: DurationSwitcherProps) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const isRtl = i18n.dir() === "rtl";

  const renderOption = (value: 30 | 60, labelKey: string) => {
    const isSelected = selectedDuration === value;
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onSelect(value)}
        style={[
          styles.button,
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
              fontWeight: isSelected ? "700" : "500",
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
    <View
      style={[
        styles.outerContainer,
        {
          flexDirection: isRtl ? "row-reverse" : "row",
        },
      ]}
    >
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
        {renderOption(30, "practitioner.availability.weeks.durations.m30")}
        {renderOption(60, "practitioner.availability.weeks.durations.m60")}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    marginVertical: 4,
    alignItems: "center",
    width: "100%",
  },
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    width: "100%",
    maxWidth: 320,
  },
  button: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 36,
  },
});
