import React from "react";
import { StyleSheet, ScrollView, View } from "react-native";
import { Screen } from "../../../components/ui";
import { usePublicTheme } from "../theme/public-theme";
import { PublicBottomNav } from "./PublicBottomNav";

interface PublicPageContainerProps {
  children: React.ReactNode;
}

export function PublicPageContainer({ children }: PublicPageContainerProps) {
  const { publicTheme } = usePublicTheme();

  return (
    <Screen safeArea style={[styles.screen, { backgroundColor: publicTheme.canvas }]}>
      <View style={styles.screenInner}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { backgroundColor: publicTheme.canvas }]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {children}
        </ScrollView>
        {/* Sticky Fixed Bottom Navigation Bar */}
        <PublicBottomNav />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  screenInner: {
    flex: 1,
    position: "relative",
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 76,
  },
});
