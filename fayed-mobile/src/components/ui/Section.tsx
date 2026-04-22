import React from "react";
import { View, StyleSheet, ViewProps } from "react-native";
import { Text } from "./Text";
import { useTheme } from "../../providers/ThemeProvider";

export interface SectionProps extends ViewProps {
  title?: string;
  action?: React.ReactNode;
  noPadding?: boolean;
}

export const Section = ({
  children,
  title,
  action,
  noPadding = false,
  style,
  ...props
}: SectionProps) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, style]} {...props}>
      {(title || action) && (
        <View
          style={[styles.header, { paddingHorizontal: noPadding ? 0 : 16 }]}
        >
          {title ? (
            <Text
              weight="bold"
              style={styles.title}
              color={theme.colors.textPrimary}
            >
              {title}
            </Text>
          ) : (
            <View />
          )}
          {action && <View>{action}</View>}
        </View>
      )}
      <View style={[!noPadding && styles.contentPadding]}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 30,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
  },
  contentPadding: {
    paddingHorizontal: 20,
  },
});
