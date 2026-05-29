import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "../../../../components/ui";

export function HomeSectionHeading({ title }: { title: string }) {
  return (
    <View style={styles.wrap}>
      <Text variant="title" weight="600" style={styles.title}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    marginBottom: 8,
  },
  title: {
    width: "100%",
  },
});
