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

WebBrowser.maybeCompleteAuthSession();

interface PatientGoogleSignInButtonProps {
  onTokenReceived: (idToken: string) => Promise<void>;
  title: string;
  helperText: string;
  unavailableText: string;
}

export function PatientGoogleSignInButton({
  onTokenReceived,
  title,
  helperText,
  unavailableText,
}: PatientGoogleSignInButtonProps) {
  const { theme } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const publicEnv = process.env as Record<string, string | undefined>;

  // The Google provider hook requires a client id for the active platform.
  // Fallback placeholders prevent runtime crashes when env values are missing.
  const fallbackClientId = "__GOOGLE_CLIENT_ID_NOT_CONFIGURED__";

  const clientIds = useMemo(
    () => ({
      androidClientId:
        publicEnv.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? fallbackClientId,
      iosClientId:
        publicEnv.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? fallbackClientId,
      webClientId:
        publicEnv.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? fallbackClientId,
    }),
    [publicEnv],
  );

  const isConfigured = useMemo(() => {
    if (Platform.OS === "android") {
      return clientIds.androidClientId !== fallbackClientId;
    }

    if (Platform.OS === "ios") {
      return clientIds.iosClientId !== fallbackClientId;
    }

    return clientIds.webClientId !== fallbackClientId;
  }, [
    clientIds.androidClientId,
    clientIds.iosClientId,
    clientIds.webClientId,
    fallbackClientId,
  ]);

  const [request, response, promptAsync] =
    Google.useIdTokenAuthRequest(clientIds);

  useEffect(() => {
    async function completeGoogleAuth() {
      if (response?.type !== "success") {
        return;
      }

      const idToken = response.params.id_token;
      if (!idToken) {
        setErrorText(unavailableText);
        return;
      }

      setIsSubmitting(true);
      setErrorText(null);

      try {
        await onTokenReceived(idToken);
      } catch (error) {
        setErrorText(extractApiErrorMessage(error));
      } finally {
        setIsSubmitting(false);
      }
    }

    void completeGoogleAuth();
  }, [onTokenReceived, response, unavailableText]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.82}
        disabled={!isConfigured || !request || isSubmitting}
        onPress={() => {
          setErrorText(null);
          void promptAsync();
        }}
        style={[
          styles.button,
          {
            backgroundColor: theme.colors.surfaceSecondary,
            borderColor: theme.colors.borderStrong,
            opacity: !isConfigured ? 0.52 : 1,
          },
        ]}
      >
        {isSubmitting ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : (
          <>
            <Ionicons
              name="logo-google"
              size={18}
              color={theme.colors.textPrimary}
            />
            <Text
              weight="600"
              style={styles.buttonText}
              color={theme.colors.textPrimary}
            >
              {title}
            </Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.helperText} color={theme.colors.textMuted}>
        {isConfigured ? helperText : unavailableText}
      </Text>
      {errorText ? (
        <Text style={styles.errorText} color="#dc2626">
          {errorText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 6,
    marginBottom: 10,
  },
  button: {
    borderWidth: 1,
    borderRadius: 16,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  buttonText: {
    fontSize: 15,
  },
  helperText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    marginTop: 6,
  },
});
