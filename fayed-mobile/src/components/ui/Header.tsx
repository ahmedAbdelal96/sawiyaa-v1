import React from "react";
import { View, StyleSheet, TouchableOpacity, I18nManager } from "react-native";
import { useRouter, useNavigation } from "expo-router";
import { Text } from "./Text";
import { useTheme } from "../../providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";

const BackIcon = ({ color }: { color: string }) => {
  const isRTL = I18nManager.isRTL;
  return (
    <Ionicons
      name={isRTL ? "arrow-forward" : "arrow-back"}
      size={24}
      color={color}
    />
  );
};

export interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightElement?: React.ReactNode;
}

export const Header = ({
  title,
  showBack = false,
  onBack,
  rightElement,
}: HeaderProps) => {
  const { theme } = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const isRTL = I18nManager.isRTL;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation.canGoBack()) {
      router.back();
    }
  };

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: theme.colors.background,
          borderBottomColor: theme.colors.borderLight,
          flexDirection: isRTL ? "row-reverse" : "row",
        },
      ]}
    >
      <View
        style={[
          styles.sideContainer,
          isRTL ? styles.trailingContainer : styles.leadingContainer,
        ]}
      >
        {showBack && (
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <BackIcon color={theme.colors.textPrimary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.titleContainer}>
        {title ? (
          <Text weight="bold" style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
      </View>

      <View
        style={[
          styles.sideContainer,
          isRTL ? styles.leadingContainer : styles.trailingContainer,
        ]}
      >
        {rightElement}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 26,
    borderBottomWidth: 1,
  },
  sideContainer: {
    width: 64,
    justifyContent: "flex-start",
  },
  leadingContainer: {
    alignItems: "flex-start",
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  backButton: {
    padding: 12,
  },
  title: {
    fontSize: 20,
    letterSpacing: 0.2,
    textAlign: "center",
  },
  trailingContainer: {
    alignItems: "flex-end",
  },
});
