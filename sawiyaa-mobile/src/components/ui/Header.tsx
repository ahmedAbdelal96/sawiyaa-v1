import React from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import { useRouter, useNavigation, usePathname } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "./Text";
import { useTheme } from "../../providers/ThemeProvider";
import { useAuth } from "../../providers/AuthProvider";
import { MOBILE_HEADER_HEIGHT, MOBILE_HORIZONTAL_PADDING } from "../mobile-shell";
import { useGeneralChatUnreadSummary } from "../../features/messages/hooks";
import { usePatientProfile } from "../../features/patient/profile/hooks";
import { usePatientUnreadNotificationCount } from "../../features/patient/notifications/hooks";
import { usePractitionerUnreadNotificationCount } from "../../features/practitioner/notifications/hooks";
import { useNavigationHistory } from "../../providers/NavigationHistoryProvider";
import { getAppDirection } from "../../i18n/direction";

const BackIcon = ({ color, isRTL }: { color: string; isRTL: boolean }) => (
  <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={color} />
);

export interface AppHeaderProps {
  title?: string;
  subtitle?: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  variant?: "home" | "tab" | "stack";
  hideQuickActions?: boolean;
}

export const AppHeader = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  leftElement,
  rightElement,
  variant = "tab",
  hideQuickActions = false,
}: AppHeaderProps) => {
  const { theme } = useTheme();
  const { i18n } = useTranslation();
  const direction = getAppDirection(i18n.language);
  const isRTL = direction === "rtl";
  const logoAccessibilityLabel = isRTL ? "شعار سويّـة" : "Sawiyaa logo";
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const pathname = usePathname();
  const { role, user } = useAuth();
  const { canGoBackInApp, goBackInApp, previousRoute, debugSnapshot } =
    useNavigationHistory();

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

  const badgePosition = isRTL ? styles.badgeRTL : styles.badgeLTR;
  const badgeTextPosition = isRTL ? styles.badgeTextRTL : styles.badgeTextLTR;

  const renderCountBadge = (count: number) =>
    count > 0 ? (
      <View
        style={[
          styles.unreadBadge,
          badgePosition,
          {
            backgroundColor: theme.colors.error,
            borderColor: theme.colors.surfaceRaised,
          },
        ]}
      >
        <Text
          weight="700"
          style={[styles.unreadBadgeText, badgeTextPosition, { color: theme.colors.onError }]}
        >
          {count > 99 ? "99+" : count.toString()}
        </Text>
      </View>
    ) : null;

  const quickActions = (
    <View
      style={[
        styles.quickActionsRow,
        { flexDirection: isRTL ? "row-reverse" : "row" },
      ]}
    >
      <TouchableOpacity
        onPress={handleOpenMessages}
        style={[
          styles.iconButton,
          {
            backgroundColor: theme.colors.surfaceContainerLow,
            borderColor: theme.colors.divider,
          },
        ]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="app-header-messages-button"
      >
        <View style={styles.iconContainer}>
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={21}
            color={theme.colors.textPrimary}
          />
          {renderCountBadge(unreadMessages)}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleOpenNotifications}
        style={[
          styles.iconButton,
          {
            backgroundColor: theme.colors.surfaceContainerLow,
            borderColor: theme.colors.divider,
          },
        ]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="app-header-notifications-button"
      >
        <View style={styles.iconContainer}>
          <Ionicons
            name="notifications-outline"
            size={21}
            color={theme.colors.textPrimary}
          />
          {renderCountBadge(unreadNotifications)}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleOpenProfile}
        style={[
          styles.profileButton,
          {
            backgroundColor: hasAvatar
              ? "transparent"
              : theme.colors.primarySoft,
            borderColor: theme.colors.divider,
          },
        ]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="app-header-profile-button"
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
          paddingTop: insets.top,
          minHeight: MOBILE_HEADER_HEIGHT + insets.top,
          backgroundColor: theme.colors.surfaceRaised,
          borderBottomColor: theme.colors.divider,
        },
      ]}
    >
      {showIdentityRow ? (
        <View
          style={[
            styles.identityRow,
            {
              flexDirection: isRTL ? "row-reverse" : "row",
            },
          ]}
        >
          <View
            style={[
              styles.identitySide,
              styles.brandWrap,
              { flexDirection: isRTL ? "row-reverse" : "row" },
            ]}
          >
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
                  style={[
                    styles.brandBackButton,
                    {
                      backgroundColor: theme.colors.surfaceContainerLow,
                      borderColor: theme.colors.divider,
                    },
                  ]}
                  testID="app-header-back-button"
                  accessibilityRole="button"
                  accessibilityLabel="app-header-back-button"
                >
                  <BackIcon color={theme.colors.textPrimary} isRTL={isRTL} />
                </TouchableOpacity>
              ) : null}
              <View style={styles.brandTextWrap}>
                <Image
                  source={require("../../../assets/logo.png")}
                  style={styles.brandLogo}
                  resizeMode="contain"
                  accessible
                  accessibilityRole="image"
                  accessibilityLabel={logoAccessibilityLabel}
                />
              </View>
            </View>
          </View>

          <View
            style={[
              styles.identitySide,
              styles.quickActionsWrap,
              { flexDirection: isRTL ? "row-reverse" : "row" },
            ]}
          >
            {quickActions}
            {leftElement}
          </View>
        </View>
      ) : null}

      {hasTitleRow || !showIdentityRow ? (
        <View
          style={[
            styles.titleRow,
            {
              borderTopWidth: showIdentityRow ? StyleSheet.hairlineWidth : 0,
              borderTopColor: theme.colors.divider,
              flexDirection: isRTL ? "row-reverse" : "row",
            },
          ]}
        >
          <View style={[styles.titleSide, styles.leadingContainer]}>
            {!showIdentityRow && showBack ? (
              <TouchableOpacity
                onPress={handleBack}
                style={[
                  styles.backButton,
                  {
                    backgroundColor: theme.colors.surfaceContainerLow,
                    borderColor: theme.colors.divider,
                  },
                ]}
                testID="app-header-back-button"
                accessibilityRole="button"
                accessibilityLabel="app-header-back-button"
              >
                <BackIcon color={theme.colors.textPrimary} isRTL={isRTL} />
              </TouchableOpacity>
            ) : !showIdentityRow ? (
              leftElement
            ) : null}
          </View>

          <View style={styles.titleContainer}>
            {title ? (
              <View style={styles.titleStack}>
                <Text weight="700" style={styles.title} numberOfLines={1}>
                  {title}
                </Text>
                {subtitle ? (
                  <Text
                    variant="caption"
                    color={theme.colors.textSecondary}
                    style={styles.subtitle}
                    numberOfLines={1}
                  >
                    {subtitle}
                  </Text>
                ) : null}
              </View>
            ) : variant === "home" ? (
              <Image
                source={require("../../../assets/logo.png")}
                style={styles.brandLogoCompact}
                resizeMode="contain"
                accessible
                accessibilityRole="image"
                accessibilityLabel={logoAccessibilityLabel}
              />
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

export const Header = AppHeader;

const styles = StyleSheet.create({
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  identityRow: {
    minHeight: 58,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: MOBILE_HORIZONTAL_PADDING,
    gap: 12,
  },
  identitySide: {
    alignItems: "center",
    minWidth: 0,
  },
  brandWrap: {
    flexShrink: 1,
  },
  quickActionsWrap: {
    flexShrink: 0,
  },
  brandGroup: {
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  brandTextWrap: {
    minWidth: 0,
  },
  brandBackButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: {
    minHeight: 50,
    alignItems: "center",
    paddingHorizontal: MOBILE_HORIZONTAL_PADDING,
    gap: 12,
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
    minWidth: 0,
  },
  titleStack: {
    alignItems: "center",
    minWidth: 0,
  },
  brandText: {
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: 0.2,
    lineHeight: 34,
  },
  brandLogo: {
    width: 140,
    height: 44,
  },
  brandLogoCompact: {
    width: 112,
    height: 36,
  },
  subtitle: {
    marginTop: 2,
    textAlign: "center",
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
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
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  profileButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  unreadBadge: {
    position: "absolute",
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  badgeLTR: {
    top: -4,
    right: -6,
  },
  badgeRTL: {
    top: -4,
    left: -6,
  },
  unreadBadgeText: {
    fontSize: 10,
    lineHeight: 12,
  },
  badgeTextLTR: {
    textAlign: "left",
  },
  badgeTextRTL: {
    textAlign: "right",
  },
});
