import { View, StyleSheet } from "react-native";
import { Link, Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { Screen, Text, Button } from "../src/components/ui";

export default function NotFoundScreen() {
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen options={{ title: t("commonNotFound.title") }} />
      <Screen safeArea style={styles.container}>
        <View style={styles.content}>
          <Text weight="bold" style={styles.title}>
            {t("commonNotFound.body")}
          </Text>
          <Text color="#64748b" style={styles.description}>
            {t("commonNotFound.goToSessions")}
          </Text>
          <View style={styles.buttonContainer}>
            <Link href="/" asChild>
              <Button title={t("commonNotFound.goToSessions")} />
            </Link>
          </View>
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 22,
    textAlign: "center",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  buttonContainer: {
    width: "100%",
  },
});
