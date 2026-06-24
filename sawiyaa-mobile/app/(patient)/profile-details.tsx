import React, { useMemo, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  Header,
  Screen,
  Card,
  Text,
  Button,
} from "../../src/components/ui";
import { useAuth } from "../../src/providers/AuthProvider";
import { useTheme } from "../../src/providers/ThemeProvider";
import { useTranslation } from "react-i18next";
import {
  usePatientProfile,
  useRemovePatientAvatar,
  useUploadPatientAvatar,
} from "../../src/features/patient/profile/hooks";
import { useAppDirection } from "../../src/i18n/direction";
import { normalizeProfileGender } from "../../src/features/patient/profile/gender-utils";
import {
  formatProfileDate,
  getInitials,
} from "../../src/features/patient/profile/account-utils";
import {
  getCountryLabel,
} from "../../src/features/patient/profile/country-utils";
import { extractApiErrorMessage } from "../../src/lib/api";

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const { theme } = useTheme();
  const { rowDirection, textAlign, oppositeTextAlign } = useAppDirection();

  return (
    <View style={[styles.infoRow, { flexDirection: rowDirection }]}>
      <Text
        color={theme.colors.textSecondary}
        style={[styles.infoLabel, { textAlign, flexShrink: 1 }]}
      >
        {label}
      </Text>
      <Text
        weight="600"
        style={[
          styles.infoValue,
          {
            textAlign: oppositeTextAlign,
            writingDirection: "ltr",
            flexShrink: 1,
          },
        ]}
        color={theme.colors.textPrimary}
      >
        {value}
      </Text>
    </View>
  );
}

export default function PatientProfileDetailsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const { isRtl, rowDirection } = useAppDirection();

  const profileQuery = usePatientProfile();
  const uploadAvatar = useUploadPatientAvatar();
  const removeAvatar = useRemovePatientAvatar();
  const profile = profileQuery.data?.profile;

  const [avatarActionSheetVisible, setAvatarActionSheetVisible] = useState(false);

  const displayName =
    profile?.displayName?.trim() ||
    user?.displayName?.trim() ||
    t("profileScreen.fallbackName");
  const initials = useMemo(() => getInitials(displayName), [displayName]);
  const avatarUri = profile?.avatarDataUrl ?? profile?.avatarUrl ?? null;

  const birthDateLabel = formatProfileDate(profile?.dateOfBirth, i18n.language)
    ?? t("profileScreen.none");

  const genderKey = normalizeProfileGender(profile?.gender);
  const genderLabel = genderKey
    ? t(`profileScreen.details.genderOptions.${genderKey}` as const)
    : t("profileScreen.none");

  const countryLabel = getCountryLabel(profile?.countryCode ?? null, i18n.language);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        t("profileScreen.details.avatar.permissionNeeded"),
        t("profileScreen.details.avatar.permissionDenied"),
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const fileSizeMB = (asset.fileSize ?? 0) / (1024 * 1024);
    if (fileSizeMB > 5) {
      Alert.alert(t("profileScreen.details.avatar.imageTooLarge"));
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(asset.mimeType ?? "")) {
      Alert.alert(t("profileScreen.details.avatar.unsupportedType"));
      return;
    }

    try {
      setAvatarActionSheetVisible(false);
      await uploadAvatar.mutateAsync({
        uri: asset.uri,
        fileName: `avatar.${asset.uri.split(".").pop()?.toLowerCase() ?? "jpg"}`,
        mimeType: asset.mimeType ?? "image/jpeg",
        fileSize: asset.fileSize,
      });
    } catch (error) {
      Alert.alert(
        t("profileScreen.common.saveFailedTitle"),
        extractApiErrorMessage(error) ||
          t("profileScreen.details.avatar.uploadFailed"),
      );
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      setAvatarActionSheetVisible(false);
      await removeAvatar.mutateAsync();
    } catch (error) {
      Alert.alert(
        t("profileScreen.common.saveFailedTitle"),
        extractApiErrorMessage(error) ||
          t("profileScreen.details.avatar.uploadFailed"),
      );
    }
  };

  const isAvatarLoading = uploadAvatar.isPending || removeAvatar.isPending;

  return (
    <Screen bg="background">
      <Header title={t("profileScreen.details.screenTitle")} showBack />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Avatar Card */}
        <Card
          variant="elevated"
          style={styles.avatarCard}
          padding="none"
        >
          {/* Subtle gold accent indicator line at the top */}
          <View style={[styles.goldAccentLine, { backgroundColor: theme.colors.tertiary }]} />

          <View style={[styles.avatarRow, { flexDirection: rowDirection }]}>
            <View style={styles.avatarContainer}>
              {isAvatarLoading ? (
                <View
                  style={[
                    styles.avatarFallback,
                    styles.avatarLoading,
                    { backgroundColor: theme.colors.primarySoft },
                  ]}
                >
                  <Ionicons
                    name="cloud-upload-outline"
                    size={24}
                    color={theme.colors.primary}
                  />
                </View>
              ) : avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <View
                  style={[
                    styles.avatarFallback,
                    { backgroundColor: theme.colors.primarySoft },
                  ]}
                >
                  <Text
                    weight="bold"
                    style={[styles.avatarText, { color: theme.colors.primary }]}
                  >
                    {initials}
                  </Text>
                </View>
              )}
              {/* Overlapping Camera Edit Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setAvatarActionSheetVisible(true)}
                disabled={isAvatarLoading}
                style={[
                  isRtl ? styles.cameraOverlayRtl : styles.cameraOverlayLtr,
                  { backgroundColor: theme.colors.primary }
                ]}
              >
                <Ionicons
                  name="camera-outline"
                  size={16}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>

            <View style={[styles.avatarMeta, { alignItems: isRtl ? "flex-end" : "flex-start" }]}>
              <Text weight="bold" style={styles.avatarName} color={theme.colors.primary}>
                {displayName}
              </Text>
              <Text color={theme.colors.textSecondary} style={styles.avatarHint}>
                {t("profileScreen.details.avatar.title")}
              </Text>
              {profile?.updatedAt ? (
                <Text color={theme.colors.textMuted} style={styles.updatedAt}>
                  {t("profileScreen.details.avatar.updatedAt", {
                    date: formatProfileDate(profile.updatedAt, i18n.language) ?? "",
                  })}
                </Text>
              ) : null}
            </View>
          </View>
        </Card>

        {/* Personal Information Card */}
        <Card
          variant="elevated"
          style={styles.card}
          padding="none"
        >
          {/* Subtle gold accent indicator line at the top */}
          <View style={[styles.goldAccentLine, { backgroundColor: theme.colors.tertiary }]} />

          <View style={styles.cardInnerPadding}>
            <View style={[styles.sectionHeader, isRtl ? styles.sectionHeaderRtl : null]}>
              <Text weight="bold" style={styles.sectionTitle} color={theme.colors.textPrimary}>
                {t("profileScreen.details.personalSectionTitle")}
              </Text>
            </View>

            <InfoRow
              label={t("profileScreen.details.fields.displayName")}
              value={displayName !== t("profileScreen.fallbackName") ? displayName : t("profileScreen.none")}
            />

            <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

            <InfoRow
              label={t("profileScreen.details.fields.dateOfBirth")}
              value={birthDateLabel}
            />

            <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

            <InfoRow
              label={t("profileScreen.details.fields.gender")}
              value={genderLabel}
            />

            <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

            <InfoRow
              label={t("profileScreen.details.fields.countryCode")}
              value={countryLabel || t("profileScreen.none")}
            />
          </View>
        </Card>

        {/* Account Contact Card - Warm Card layout with Lock Indicator */}
        <Card
          variant="elevated"
          style={[styles.warmCard, { backgroundColor: theme.colors.surface }]}
          padding="none"
        >
          <View style={styles.cardInnerPadding}>
            <View style={[styles.sectionHeader, isRtl ? styles.sectionHeaderRtl : null, styles.lockTitleRow, { flexDirection: rowDirection }]}>
              <Ionicons name="lock-closed-outline" size={16} color={theme.colors.textMuted} style={{ marginEnd: 6 }} />
              <Text weight="bold" style={styles.sectionTitle} color={theme.colors.textPrimary}>
                {t("profileScreen.details.accountTitle")}
              </Text>
            </View>

            <InfoRow
              label={t("profileScreen.details.readOnly.email")}
              value={user?.primaryEmail || t("profileScreen.fallbackEmail")}
            />

            <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

            <InfoRow
              label={t("profileScreen.details.readOnly.phone")}
              value={user?.primaryPhone || t("profileScreen.none")}
            />

            <View style={[styles.noteRow, { flexDirection: rowDirection }]}>
              <Ionicons name="information-circle-outline" size={16} color={theme.colors.textMuted} style={{ marginEnd: 6, marginTop: 2 }} />
              <Text color={theme.colors.textSecondary} style={styles.contactNote}>
                {t("profileScreen.details.readOnly.note")}
              </Text>
            </View>
          </View>
        </Card>

        {/* Edit Button */}
        <Button
          title={t("profileScreen.details.editButton")}
          onPress={() => router.push("/(patient)/profile-details/edit" as any)}
          variant="secondary"
          style={styles.editButton}
        />
      </ScrollView>

      <AvatarActionSheet
        visible={avatarActionSheetVisible}
        onClose={() => setAvatarActionSheetVisible(false)}
        onPickImage={pickImage}
        onRemove={handleRemoveAvatar}
        hasAvatar={!!(profile?.avatarUrl || profile?.avatarDataUrl)}
        theme={theme}
        t={t}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 120,
    gap: 14,
  },
  card: {
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8DED0",
    overflow: "hidden",
  },
  avatarCard: {
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8DED0",
    overflow: "hidden",
  },
  warmCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E8DED0",
    overflow: "hidden",
  },
  goldAccentLine: {
    height: 3,
    width: "100%",
  },
  cardInnerPadding: {
    padding: 16,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 16,
  },
  avatarRowRtl: {
    flexDirection: "row-reverse",
  },
  avatarContainer: {
    position: "relative",
    width: 72,
    height: 72,
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: "#24564F",
  },
  avatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: "#24564F",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 24,
  },
  cameraOverlayLtr: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  cameraOverlayRtl: {
    position: "absolute",
    bottom: -2,
    left: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  avatarMeta: {
    flex: 1,
    gap: 2,
    alignItems: "flex-start",
  },
  avatarName: {
    fontSize: 20,
    lineHeight: 25,
  },
  avatarHint: {
    fontSize: 13,
  },
  updatedAt: {
    fontSize: 11,
    marginTop: 2,
  },
  sectionHeader: {
    marginBottom: 12,
    alignItems: "flex-start",
  },
  sectionHeaderRtl: {
    alignItems: "flex-end",
  },
  lockTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  infoRowRtl: {
    flexDirection: "row-reverse",
  },
  infoLabel: {
    fontSize: 13,
    flex: 1,
    textAlign: "left",
  },
  infoValue: {
    fontSize: 15,
    flex: 2,
    textAlign: "right",
  },
  divider: {
    height: 1,
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 12,
  },
  rowRtl: {
    flexDirection: "row-reverse",
  },
  rowLtr: {
    flexDirection: "row",
  },
  contactNote: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  editButton: {
    height: 52,
    borderRadius: 14,
    marginTop: 6,
  },
  avatarLoading: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarActionBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  avatarActionSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    paddingTop: 10,
    paddingHorizontal: 20,
  },
  avatarActionHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  avatarActionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarActionLabel: {
    fontSize: 16,
  },
});

function AvatarActionSheet({
  visible,
  onClose,
  onPickImage,
  onRemove,
  hasAvatar,
  theme,
  t,
}: {
  visible: boolean;
  onClose: () => void;
  onPickImage: () => void;
  onRemove: () => void;
  hasAvatar: boolean;
  theme: ReturnType<typeof useTheme>["theme"];
  t: (key: string) => string;
}) {
  if (!visible) return null;

  return (
    <View style={styles.avatarActionBackdrop}>
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={onClose}
      />
      <View
        style={[
          styles.avatarActionSheet,
          { backgroundColor: theme.colors.surfaceBright },
        ]}
      >
        <View
          style={[
            styles.avatarActionHandle,
            { backgroundColor: theme.colors.borderLight },
          ]}
        />
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onPickImage}
          style={[
            styles.avatarActionItem,
            { borderBottomColor: theme.colors.borderLight },
          ]}
        >
          <Ionicons
            name="image-outline"
            size={22}
            color={theme.colors.primary}
          />
          <Text
            weight="500"
            style={[styles.avatarActionLabel, { color: theme.colors.textPrimary }]}
          >
            {t("profileScreen.details.avatar.choosePhoto")}
          </Text>
        </TouchableOpacity>
        {hasAvatar && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onRemove}
            style={styles.avatarActionItem}
          >
            <Ionicons
              name="trash-outline"
              size={22}
              color="#ef4444"
            />
            <Text
              weight="500"
              style={[styles.avatarActionLabel, { color: "#ef4444" }]}
            >
              {t("profileScreen.details.avatar.removePhoto")}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
