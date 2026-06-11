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
  isRtl,
}: {
  label: string;
  value: string;
  isRtl: boolean;
}) {
  const { theme } = useTheme();

  return (
    <View style={[styles.infoRow, isRtl ? styles.infoRowRtl : null]}>
      <Text color={theme.colors.textSecondary} style={styles.infoLabel}>
        {label}
      </Text>
      <Text weight="600" style={styles.infoValue}>
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
  const isRtl = i18n.language?.startsWith("ar") ?? false;

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

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Avatar card */}
        <Card
          variant="elevated"
          style={[
            styles.card,
            { borderColor: theme.colors.borderLight },
          ]}
        >
          <View style={[styles.avatarRow, isRtl ? styles.avatarRowRtl : null]}>
            {isAvatarLoading ? (
              <View
                style={[
                  styles.avatarFallback,
                  styles.avatarLoading,
                  { backgroundColor: theme.colors.primaryLight },
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
                  { backgroundColor: theme.colors.primaryLight },
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
            <View style={styles.avatarMeta}>
              <Text weight="bold" style={styles.avatarName}>
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
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setAvatarActionSheetVisible(true)}
              disabled={isAvatarLoading}
              style={isRtl ? styles.editButtonRtl : styles.editButtonLtr}
            >
              <Ionicons
                name="camera-outline"
                size={18}
                color={isAvatarLoading ? theme.colors.textMuted : theme.colors.primary}
              />
            </TouchableOpacity>
          </View>
        </Card>

        {/* Personal information card */}
        <Card
          variant="elevated"
          style={[
            styles.card,
            { borderColor: theme.colors.borderLight },
          ]}
        >
          <View style={[styles.sectionHeader, isRtl ? styles.sectionHeaderRtl : null]}>
            <Text weight="bold" style={styles.sectionTitle}>
              {t("profileScreen.details.personalSectionTitle")}
            </Text>
          </View>

          <InfoRow
            label={t("profileScreen.details.fields.displayName")}
            value={displayName !== t("profileScreen.fallbackName") ? displayName : t("profileScreen.none")}
            isRtl={isRtl}
          />

          <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

          <InfoRow
            label={t("profileScreen.details.fields.dateOfBirth")}
            value={birthDateLabel}
            isRtl={isRtl}
          />

          <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

          <InfoRow
            label={t("profileScreen.details.fields.gender")}
            value={genderLabel}
            isRtl={isRtl}
          />

          <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

          <InfoRow
            label={t("profileScreen.details.fields.countryCode")}
            value={countryLabel || t("profileScreen.none")}
            isRtl={isRtl}
          />
        </Card>

        {/* Account contact card */}
        <Card
          variant="elevated"
          style={[
            styles.card,
            { borderColor: theme.colors.borderLight },
          ]}
        >
          <View style={[styles.sectionHeader, isRtl ? styles.sectionHeaderRtl : null]}>
            <Text weight="bold" style={styles.sectionTitle}>
              {t("profileScreen.details.accountTitle")}
            </Text>
          </View>

          <InfoRow
            label={t("profileScreen.details.readOnly.email")}
            value={user?.primaryEmail || t("profileScreen.fallbackEmail")}
            isRtl={isRtl}
          />

          <View style={[styles.divider, { backgroundColor: theme.colors.borderLight }]} />

          <InfoRow
            label={t("profileScreen.details.readOnly.phone")}
            value={user?.primaryPhone || t("profileScreen.none")}
            isRtl={isRtl}
          />

          <Text color={theme.colors.textSecondary} style={styles.contactNote}>
            {t("profileScreen.details.readOnly.note")}
          </Text>
        </Card>

        {/* Edit button */}
        <Button
          title={t("profileScreen.details.editButton")}
          onPress={() => router.push("/(patient)/profile-details/edit" as any)}
          variant="secondary"
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
    borderWidth: 1,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatarRowRtl: {
    flexDirection: "row-reverse",
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 26,
  },
  avatarMeta: {
    flex: 1,
    gap: 4,
  },
  avatarName: {
    fontSize: 20,
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
  },
  sectionHeaderRtl: {
    alignItems: "flex-end",
  },
  sectionTitle: {
    fontSize: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  infoRowRtl: {
    flexDirection: "row-reverse",
  },
  infoLabel: {
    fontSize: 13,
    flex: 1,
  },
  infoValue: {
    fontSize: 15,
    flex: 2,
    textAlign: "right",
  },
  divider: {
    height: 1,
  },
  contactNote: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 18,
  },
  editButtonLtr: {
    marginLeft: 8,
    padding: 6,
  },
  editButtonRtl: {
    marginRight: 8,
    padding: 6,
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
          { backgroundColor: theme.colors.surface },
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
