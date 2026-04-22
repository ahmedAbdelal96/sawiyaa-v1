import { View, Text, StyleSheet } from "react-native";
import { Link, Stack } from "expo-router";
import { useTranslation } from "react-i18next";

export default function NotFoundScreen() {
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen options={{ title: t("commonNotFound.title") }} />
      <View style={styles.container}>
        <Text style={styles.title}>{t("commonNotFound.body")}</Text>

        <Link href="/sessions" style={styles.link}>
          <Text style={styles.linkText}>
            {t("commonNotFound.goToSessions")}
          </Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
    color: "#2e78b7",
  },
});
