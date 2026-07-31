import React, { createContext, useContext, useState, useCallback } from "react";
import { Modal, StyleSheet, View, TouchableOpacity, Pressable, I18nManager } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "./AuthProvider";
import { useTheme } from "./ThemeProvider";
import { Text } from "../components/ui";
import { Ionicons } from "@expo/vector-icons";

type AuthGatewayContextType = {
  requireAuth: (action: () => void, explanationKey?: string) => void;
};

const AuthGatewayContext = createContext<AuthGatewayContextType | undefined>(undefined);

export function useAuthGateway() {
  const context = useContext(AuthGatewayContext);
  if (!context) {
    throw new Error("useAuthGateway must be used within an AuthGatewayProvider");
  }
  return context;
}

export function AuthGatewayProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [explanation, setExplanation] = useState("");

  const isRTL = i18n.language?.startsWith("ar") ?? I18nManager.isRTL;
  const publicTheme = theme.public;

  const requireAuth = useCallback(
    (action: () => void, explanationKey?: string) => {
      // If already authenticated, proceed immediately with zero gating
      if (user !== null) {
        action();
        return;
      }

      const defaultDesc = isRTL
        ? "يرجى تسجيل الدخول أو إنشاء حساب مريض للمتابعة."
        : "Please sign in or create a patient account to continue.";
      const desc = explanationKey ? t(explanationKey) : defaultDesc;

      setExplanation(desc);
      setIsOpen(true);
    },
    [user, t, isRTL]
  );

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleSignIn = () => {
    handleClose();
    router.push("/(auth)/signin/patient");
  };

  const handleSignUp = () => {
    handleClose();
    router.push("/(auth)/signup/patient");
  };

  return (
    <AuthGatewayContext.Provider value={{ requireAuth }}>
      {children}

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        <Pressable style={styles.overlay} onPress={handleClose}>
          <Pressable
            style={[
              styles.modalCard,
              {
                backgroundColor: publicTheme.raisedSurface,
                borderColor: publicTheme.subtleBorder,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
            accessibilityRole="alert"
            accessibilityLabel={isRTL ? "مطلوب تسجيل الدخول" : "Authentication Required"}
          >
            <TouchableOpacity
              onPress={handleClose}
              style={[
                styles.closeButton,
                isRTL ? { left: 16 } : { right: 16 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={isRTL ? "إغلاق" : "Close"}
            >
              <Ionicons name="close" size={20} color={publicTheme.secondaryText} />
            </TouchableOpacity>

            <View style={[styles.iconBadge, { backgroundColor: `${publicTheme.accentMint}60` }]}>
              <Ionicons name="lock-closed-outline" size={28} color={publicTheme.primaryText} />
            </View>

            <Text
              variant="title"
              style={[styles.titleText, { color: publicTheme.primaryText }]}
            >
              {isRTL ? "يتطلب تسجيل الدخول" : "Authentication Required"}
            </Text>

            <Text
              variant="body"
              style={[styles.descText, { color: publicTheme.secondaryText }]}
            >
              {explanation}
            </Text>

            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: publicTheme.primaryText }]}
                onPress={handleSignUp}
                accessibilityRole="button"
              >
                <Text style={styles.primaryBtnText} color="#FFFFFF">
                  {isRTL ? "إنشاء حساب مريض" : "Create Patient Account"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: publicTheme.primaryText, borderWidth: 1 }]}
                onPress={handleSignIn}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryBtnText} color={publicTheme.primaryText}>
                  {isRTL ? "تسجيل الدخول كمريض" : "Patient Sign In"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelLink}
                onPress={handleClose}
                accessibilityRole="button"
              >
                <Text style={[styles.cancelLinkText, { color: publicTheme.secondaryText }]}>
                  {isRTL ? "متابعة التصفح" : "Continue Browsing"}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </AuthGatewayContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 28,
    borderWidth: 1,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: "center",
    position: "relative",
    shadowColor: "rgba(31, 51, 47, 0.05)",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 8,
  },
  closeButton: {
    position: "absolute",
    top: 16,
    padding: 8,
    zIndex: 10,
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  titleText: {
    fontWeight: "700",
    marginBottom: 10,
    textAlign: "center",
  },
  descText: {
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  actionsContainer: {
    width: "100%",
    gap: 10,
  },
  primaryBtn: {
    width: "100%",
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  primaryBtnText: {
    fontWeight: "700",
    fontSize: 15,
  },
  secondaryBtn: {
    width: "100%",
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  secondaryBtnText: {
    fontWeight: "700",
    fontSize: 15,
  },
  cancelLink: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    minHeight: 44,
  },
  cancelLinkText: {
    fontWeight: "600",
    fontSize: 14,
    textDecorationLine: "underline",
  },
});
