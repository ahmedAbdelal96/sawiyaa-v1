import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../ui";
import { useTheme } from "../../providers/ThemeProvider";
import { extractApiErrorMessage } from "../../lib/api";
import {
  GOOGLE_ANDROID_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_WEB_CLIENT_ID,
} from "../../config/mobile-environment";

WebBrowser.maybeCompleteAuthSession();

const G_BLUE = "#4285F4";
const G_DARK = "#3c4043";
const FALLBACK_CLIENT_ID = "__GOOGLE_CLIENT_ID_NOT_CONFIGURED__";

interface PatientGoogleSignInButtonProps {
  onTokenReceived: (idToken: string) => Promise<void>;
  title: string;
  unavailableText: string;
}

export function PatientGoogleSignInButton({
  onTokenReceived,
  title,
  unavailableText,
}: PatientGoogleSignInButtonProps) {
  const { theme } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const clientIds = useMemo(
    () => ({
      androidClientId: GOOGLE_ANDROID_CLIENT_ID ?? FALLBACK_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID ?? FALLBACK_CLIENT_ID,
      webClientId: GOOGLE_WEB_CLIENT_ID ?? FALLBACK_CLIENT_ID,
    }),
    [],
  );

  const isConfigured = useMemo(() => {
    if (Platform.OS === "android") return clientIds.androidClientId !== FALLBACK_CLIENT_ID;
    if (Platform.OS === "ios") return clientIds.iosClientId !== FALLBACK_CLIENT_ID;
    return clientIds.webClientId !== FALLBACK_CLIENT_ID;
  }, [clientIds.androidClientId, clientIds.iosClientId, clientIds.webClientId]);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(clientIds);

  useEffect(() => {
    async function completeGoogleAuth() {
      if (response?.type !== "success") return;
      const idToken = response.params.id_token;
      if (!idToken) { setErrorText(unavailableText); return; }
      setIsSubmitting(true);
      setErrorText(null);
      try { await onTokenReceived(idToken); }
      catch (error) { setErrorText(extractApiErrorMessage(error)); }
      finally { setIsSubmitting(false); }
    }
    void completeGoogleAuth();
  }, [onTokenReceived, response, unavailableText]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.82}
        disabled={!isConfigured || !request || isSubmitting}
        onPress={() => { setErrorText(null); void promptAsync(); }}
        style={[styles.button, { opacity: !isConfigured ? 0.52 : 1 }]}
      >
        {isSubmitting ? (
          <ActivityIndicator color={G_BLUE} />
        ) : (
          <View style={styles.googleLogoRow}>
            <Ionicons name="logo-google" size={22} color={G_BLUE} />
            <Text weight="600" style={styles.buttonText} color={G_DARK}>
              {title}
            </Text>
          </View>
        )}
      </TouchableOpacity>
      {errorText ? (
        <View style={[styles.errorRow, { backgroundColor: theme.colors.errorLight }]}>
          <Text style={styles.errorText} color={theme.colors.error}>{errorText}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 6, marginBottom: 10 },
  button: {
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#dadce0",
    borderRadius: 24,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  googleLogoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  buttonText: { fontSize: 15 },
  errorRow: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  errorText: { fontSize: 12 },
});
