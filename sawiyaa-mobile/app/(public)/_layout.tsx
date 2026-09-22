import React from "react";
import { Slot } from "expo-router";
import { StyleSheet, View } from "react-native";
import { PublicBottomNav } from "../../src/features/public/components/PublicBottomNav";

export default function GuestNavigationLayout() {
  return (
    <View style={styles.container}>
      <Slot />
      <PublicBottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
