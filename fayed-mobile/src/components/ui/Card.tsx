import React from "react";
import { View, ViewProps, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "../../providers/ThemeProvider";

export interface CardProps extends ViewProps {
  variant?: "elevated" | "outlined" | "flat";
  onPress?: () => void;
  padding?: "none" | "sm" | "md" | "lg";
}

export const Card = ({
  children,
  style,
  variant = "elevated",
  onPress,
  padding = "md",
  ...props
}: CardProps) => {
  const { theme } = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case "outlined":
        return {
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.borderLight,
        };
      case "flat":
        return {
          backgroundColor: theme.colors.surfaceSecondary,
        };
      case "elevated":
      default:
        return {
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.borderLight,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.09,
          shadowRadius: 20,
          elevation: 6,
        };
    }
  };

  const getPadding = () => {
    switch (padding) {
      case "none":
        return 0;
      case "sm":
        return 12;
      case "lg":
        return 24;
      case "md":
      default:
        return 16;
    }
  };

  const Container: React.ElementType = onPress ? TouchableOpacity : View;
  const containerProps = onPress ? { activeOpacity: 0.7, onPress } : {};

  return (
    <Container
      style={[
        styles.card,
        getVariantStyles(),
        { padding: getPadding() },
        style,
      ]}
      {...containerProps}
      {...props}
    >
      {children}
    </Container>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    overflow: "hidden",
  },
});
