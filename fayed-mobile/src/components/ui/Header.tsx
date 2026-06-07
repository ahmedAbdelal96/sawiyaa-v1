import React from "react";
import { View, StyleSheet, TouchableOpacity, I18nManager, Image } from "react-native";
import { useRouter, useNavigation, usePathname } from "expo-router";
import { useTranslation } from "react-i18next";
import { Text } from "./Text";
import { useTheme } from "../../providers/ThemeProvider";
import { useAuth } from "../../providers/AuthProvider";
import { Ionicons } from "@expo/vector-icons";
import { MOBILE_HEADER_HEIGHT, MOBILE_HORIZONTAL_PADDING } from "../mobile-shell";
import { useGeneralChatUnreadSummary } from "../../features/messages/hooks";
import { usePatientProfile } from "../../features/patient/profile/hooks";
import { usePatientUnreadNotificationCount } from "../../features/patient/notifications/hooks";
import { usePractitionerUnreadNotificationCount } from "../../features/practitioner/notifications/hooks";
import { useNavigationHistory } from "../../providers/NavigationHistoryProvider";

const BackIcon = ({ color, isRTL }: { color: string; isRTL: boolean }) => {
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
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  variant?: "home" | "tab" | "stack";
  hideQuickActions?: boolean;
}

export const Header = ({
  title,
  showBack = false,
  onBack,
  leftElement,
  rightElement,
  variant,
  hideQuickActions = false,
}: HeaderProps) => {
  const { theme } = useTheme();
  const { i18n } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const pathname = usePathname();
  const isRTL = i18n.language?.startsWith("ar") || I18nManager.isRTL;
  const { role, user } = useAuth();
  const { canGoBackInApp, goBackInApp, previousRoute, debugSnapshot } = useNavigationHistory();

  const isAuthenticatedRole = role === "patient" || role === "practitioner";
  const showIdentityRow = isAuthenticatedRole && !hideQuickActions;
  const showBackInIdentityRow = showIdentityRow && showBack;
  const hasTitleRow = Boolean(title || (!showIdentityRow && showBack));
  const messagesRole = role === "practitioner" ? "practitioner" : "patient";

  const unreadMessagesQuery = useGeneralChatUnreadSummary(
    messagesRole,
    isAuthenticatedRole && !hideQuickActions,
    { refetchInterval: 30_000 },
  );
  const unreadPatientNotificationsQuery = usePatientUnreadNotificationCount({
    enabled: role === "patient" && !hideQuickActions,
  });
  const unreadPractitionerNotificationsQuery = usePractitionerUnreadNotificationCount({
    enabled: role === "practitioner" && !hideQuickActions,
  });

  const patientProfileQuery = usePatientProfile(
    role === "patient" && !hideQuickActions,
  );
  const patientAvatarUrl =
    patientProfileQuery.data?.profile?.avatarDataUrl ??
    patientProfileQuery.data?.profile?.avatarUrl ??
    null;

  const unreadMessages = unreadMessagesQuery.data?.item.totalUnreadMessages ?? 0;
  const unreadNotifications =
    role === "practitioner"
      ? unreadPractitionerNotificationsQuery.data?.item.unreadCount ?? 0
      : unreadPatientNotificationsQuery.data?.item.unreadCount ?? 0;

  const handleBack = () => {
    const debugBase = {
      pathname,
      role,
      previousRoute,
      canGoBackInApp,
    };

    if (onBack) {
      if (__DEV__) {
        console.log("[HeaderBack] onBack", {
          ...debugBase,
          action: "onBack",
          snapshot: debugSnapshot(),
        });
      }
      onBack();
      return;
    }

    const canGoBackInTree = (() => {
      if (typeof router.canGoBack === "function" && router.canGoBack()) {
        return true;
      }

      let nav: any = navigation;
      while (nav) {
        if (typeof nav.canGoBack === "function" && nav.canGoBack()) {
          return true;
        }
        nav = typeof nav.getParent === "function" ? nav.getParent() : null;
      }

      return false;
    })();

    if (canGoBackInApp) {
      if (goBackInApp()) {
        if (__DEV__) {
          console.log("[HeaderBack] trackedBack", {
            ...debugBase,
            action: "goBackInApp()",
            snapshot: debugSnapshot(),
          });
        }
        return;
      }
    }

    if (canGoBackInTree) {
      if (__DEV__) {
        console.log("[HeaderBack] nativeBack", {
          ...debugBase,
          action: "router.back",
          snapshot: debugSnapshot(),
        });
      }
      router.back();
      return;
    }

    const homeRoute = role === "practitioner" ? "/(practitioner)" : "/(patient)";
    if (__DEV__) {
      console.log("[HeaderBack] homeFallback", {
        ...debugBase,
        action: "router.replace(homeRoute)",
        homeRoute,
        snapshot: debugSnapshot(),
      });
    }
    router.replace(homeRoute);
  };

  const handleOpenMessages = () => {
    if (role === "practitioner") {
      router.push("/(practitioner)/messages" as any);
      return;
    }
    router.push("/(patient)/messages" as any);
  };

  const handleOpenNotifications = () => {
    if (role === "practitioner") {
      router.push("/(practitioner)/notifications" as any);
      return;
    }
    router.push("/(patient)/notifications" as any);
  };

  const handleOpenProfile = () => {
    if (role === "practitioner") {
      router.push("/(practitioner)/account" as any);
      return;
    }
    router.push("/(patient)/profile" as any);
  };

  const hasAvatar = Boolean(
    (patientAvatarUrl && patientAvatarUrl.trim()) ||
      ((user as any)?.avatarUrl && String((user as any).avatarUrl).trim()),
  );
  const avatarSource = patientAvatarUrl
    ? { uri: patientAvatarUrl }
    : (user as any)?.avatarUrl
      ? { uri: String((user as any).avatarUrl) }
      : null;

  const quickActions = (
    <View
      style={[
        styles.quickActionsRow,
        { flexDirection: isRTL ? "row" : "row-reverse" },
      ]}
    >
      <TouchableOpacity
        onPress={handleOpenMessages}
        style={styles.iconButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <View style={styles.iconContainer}>
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={21}
            color={theme.colors.textPrimary}
          />
          {unreadMessages > 0 ? (
            <View
              style={[
                styles.unreadBadge,
                {
                  backgroundColor: theme.colors.error,
                  borderColor: theme.colors.surface,
                },
              ]}
            >
              <Text weight="700" style={[styles.unreadBadgeText, { color: "#fff" }]}>
                {unreadMessages > 99 ? "99+" : unreadMessages.toString()}
              </Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleOpenNotifications}
        style={styles.iconButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <View style={styles.iconContainer}>
          <Ionicons
            name="notifications-outline"
            size={21}
            color={theme.colors.textPrimary}
          />
          {unreadNotifications > 0 ? (
            role === "practitioner" ? (
              <View
                style={[
                  styles.unreadBadge,
                  {
                    backgroundColor: theme.colors.error,
                    borderColor: theme.colors.surface,
                  },
                ]}
              >
                <Text
                  weight="700"
                  style={[styles.unreadBadgeText, { color: "#fff" }]}
                >
                  {unreadNotifications > 99
                    ? "99+"
                    : unreadNotifications.toString()}
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.unreadDot,
                  {
                    backgroundColor: theme.colors.error,
                    borderColor: theme.colors.surface,
                  },
                ]}
              />
            )
          ) : null}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleOpenProfile}
        style={[
          styles.profileButton,
          !hasAvatar ? { backgroundColor: theme.colors.primaryLight } : null,
        ]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {avatarSource ? (
          <Image source={avatarSource} style={styles.avatar} />
        ) : (
          <Ionicons name="person" size={18} color={theme.colors.primary} />
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.borderLight,
        },
      ]}
    >
      {showIdentityRow ? (
        <View style={[styles.identityRow, { flexDirection: isRTL ? "row" : "row-reverse" }]}>
          <View style={[styles.identitySide, styles.quickActionsWrap]}>
            {quickActions}
            {leftElement}
          </View>
          <View style={[styles.identitySide, styles.brandWrap]}>
            {rightElement}
            <View
              style={[
                styles.brandGroup,
                { flexDirection: isRTL ? "row-reverse" : "row" },
              ]}
            >
              {showBackInIdentityRow ? (
                <TouchableOpacity
                  onPress={handleBack}
                  style={styles.brandBackButton}
                  testID="app-header-back-button"
                  accessibilityRole="button"
                  accessibilityLabel="app-header-back-button"
                >
                  <BackIcon color={theme.colors.textPrimary} isRTL={isRTL} />
                </TouchableOpacity>
              ) : null}
              <Text weight="bold" style={[styles.brandText, { color: theme.colors.primary }]}>
                Fayed
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      {hasTitleRow || !showIdentityRow ? (
        <View
          style={[
            styles.titleRow,
            {
              borderTopWidth: showIdentityRow ? 1 : 0,
              borderTopColor: theme.colors.borderLight,
            },
          ]}
        >
          <View style={[styles.titleSide, styles.leadingContainer]}>
            {!showIdentityRow && showBack ? (
              <TouchableOpacity
                onPress={handleBack}
                style={styles.backButton}
                testID="app-header-back-button"
                accessibilityRole="button"
                accessibilityLabel="app-header-back-button"
              >
                <BackIcon color={theme.colors.textPrimary} isRTL={isRTL} />
              </TouchableOpacity>
            ) : (
              !showIdentityRow ? leftElement : null
            )}
          </View>

          <View style={styles.titleContainer}>
            {title ? (
              <Text weight="bold" style={styles.title} numberOfLines={1}>
                {title}
              </Text>
            ) : variant === "home" ? (
              <Text weight="bold" style={[styles.brandText, { color: theme.colors.primary }]} numberOfLines={1}>
                Fayed
              </Text>
            ) : null}
          </View>

          <View style={[styles.titleSide, styles.trailingContainer]}>
            {!showIdentityRow ? rightElement : null}
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    minHeight: MOBILE_HEADER_HEIGHT,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
  },
  identityRow: {
    minHeight: 58,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: MOBILE_HORIZONTAL_PADDING,
  },
  identitySide: {
    flexDirection: "row",
    alignItems: "center",
  },
  quickActionsWrap: {
    justifyContent: "flex-start",
  },
  brandWrap: {
    justifyContent: "flex-end",
    marginStart: 12,
  },
  brandGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandBackButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: MOBILE_HORIZONTAL_PADDING,
  },
  titleSide: {
    width: 52,
    justifyContent: "center",
  },
  leadingContainer: {
    alignItems: "flex-start",
  },
  trailingContainer: {
    alignItems: "flex-end",
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  brandText: {
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: 0.2,
    lineHeight: 34,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: 0.2,
    textAlign: "center",
  },
  quickActionsRow: {
    alignItems: "center",
    gap: 6,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  profileButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  unreadDot: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 7,
    height: 7,
    borderRadius: 999,
    borderWidth: 1.25,
  },
  unreadBadge: {
    position: "absolute",
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadBadgeText: {
    fontSize: 10,
    lineHeight: 12,
  },
});
