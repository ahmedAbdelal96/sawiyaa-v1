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
          backgroundColor: theme.colors.surfaceRaised,
          borderWidth: 1,
          borderColor: theme.colors.border,
        };
      case "flat":
        return {
          backgroundColor: theme.colors.surfaceContainer,
        };
      case "elevated":
      default:
        return {
          backgroundColor: theme.colors.surfaceRaised,
          borderWidth: 1,
          borderColor: theme.colors.border,
          ...theme.shadows.md,
        };
    }
  };

  const getPadding = () => {
    switch (padding) {
      case "none":
        return 0;
      case "sm":
        return 16;
      case "lg":
        return 32;
      case "md":
      default:
        return 24;
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
