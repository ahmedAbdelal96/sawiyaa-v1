import React from "react";
import { StyleSheet, ScrollView } from "react-native";
import { Screen } from "../../../components/ui";
import { usePublicTheme } from "../theme/public-theme";

interface PublicPageContainerProps {
  children: React.ReactNode;
}

export function PublicPageContainer({ children }: PublicPageContainerProps) {
  const { publicTheme } = usePublicTheme();

  return (
    <Screen safeArea style={[styles.screen, { backgroundColor: publicTheme.canvas }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { backgroundColor: publicTheme.canvas }]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
});
