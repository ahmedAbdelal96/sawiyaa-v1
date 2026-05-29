import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  I18nManager,
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
} from "../../../src/components/ui";
import { useTheme } from "../../../src/providers/ThemeProvider";
import { useTranslation } from "react-i18next";
import {
  usePatchPatientProfile,
  usePatientProfile,
  useRemovePatientAvatar,
  useUploadPatientAvatar,
} from "../../../src/features/patient/profile/hooks";
import {
  formatProfileDate,
  getInitials,
  normalizeDateOfBirth,
  isValidDateOfBirth,
} from "../../../src/features/patient/profile/account-utils";
import { getCountryLabel } from "../../../src/features/patient/profile/country-utils";
import { extractApiErrorMessage } from "../../../src/lib/api";
import { DatePickerModal } from "../../../src/features/patient/profile/components/DatePickerModal";
import { GenderSelectModal, type GenderValue } from "../../../src/features/patient/profile/components/GenderSelectModal";
import { CountryPickerModal } from "../../../src/features/patient/profile/components/CountryPickerModal";

function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function EditPatientProfileScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language?.startsWith("ar") ?? false;

  const profileQuery = usePatientProfile();
  const patchProfile = usePatchPatientProfile();
  const uploadAvatar = useUploadPatientAvatar();
  const removeAvatar = useRemovePatientAvatar();
  const profile = profileQuery.data?.profile;

  const [displayName, setDisplayName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [gender, setGender] = useState<GenderValue>(null);
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    displayName?: string;
    dateOfBirth?: string;
    gender?: string;
    countryCode?: string;
  }>({});

  // Avatar actions
  const [avatarActionSheetVisible, setAvatarActionSheetVisible] = useState(false);

  // Modals
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [genderModalVisible, setGenderModalVisible] = useState(false);
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);

  useEffect(() => {
    if (!profile) return;

    setDisplayName(profile.displayName ?? "");
    setGender((profile.gender as GenderValue) ?? null);
    setCountryCode(profile.countryCode ?? null);

    if (profile.dateOfBirth) {
      const [y, mo, d] = profile.dateOfBirth.split("-").map(Number);
      if (y && mo && d) {
        setDateOfBirth(new Date(y, mo - 1, d));
      }
    }
  }, [profile]);

  useEffect(() => {
    setSelectedImageUri(
      profile?.avatarDataUrl ?? profile?.avatarUrl ?? null,
    );
  }, [profile?.avatarDataUrl, profile?.avatarUrl]);

  const displayNameInitials = getInitials(
    (displayName.trim() || profile?.displayName) ?? undefined,
  );

  const dateDisplayValue = dateOfBirth
    ? formatProfileDate(dateOfBirth.toISOString().slice(0, 10), i18n.language)
    : "";

  const genderDisplayValue = gender
    ? t(`profileScreen.details.genderOptions.${gender}` as const)
    : t("profileScreen.none");

  const countryDisplayValue = countryCode
    ? getCountryLabel(countryCode, i18n.language)
    : "";

  const genderOptions: { value: GenderValue; label: string }[] = [
    { value: "male", label: t("profileScreen.details.genderOptions.male") },
    { value: "female", label: t("profileScreen.details.genderOptions.female") },
    { value: null, label: t("profileScreen.details.genderOptions.unspecified") },
  ];

  const validate = (): boolean => {
    const errors: typeof fieldErrors = {};

    if (!displayName.trim()) {
      errors.displayName = t("profileScreen.edit.fields.displayNameRequired");
    }

    if (!dateOfBirth) {
      errors.dateOfBirth = t("profileScreen.edit.fields.dateOfBirthRequired");
    } else {
      const dobStr = toLocalDateString(dateOfBirth);
      if (!isValidDateOfBirth(dobStr)) {
        errors.dateOfBirth = t("profileScreen.edit.fields.invalidDateFormat");
      } else if (dateOfBirth > new Date()) {
        errors.dateOfBirth = t("profileScreen.edit.fields.futureDateError");
      }
    }

    if (!gender) {
      errors.gender = t("profileScreen.edit.fields.genderRequired");
    }

    if (!countryCode) {
      errors.countryCode = t("profileScreen.edit.fields.countryRequired");
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

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

    setSelectedImageUri(asset.uri);
  };

  const handleRemoveAvatar = async () => {
    try {
      await removeAvatar.mutateAsync();
      setSelectedImageUri(null);
      setAvatarActionSheetVisible(false);
    } catch (error) {
      Alert.alert(
        t("profileScreen.common.saveFailedTitle"),
        extractApiErrorMessage(error) ||
          t("profileScreen.details.avatar.uploadFailed"),
      );
    }
  };

  const handleSaveAvatar = async () => {
    if (!selectedImageUri) return;
    if (selectedImageUri === profile?.avatarDataUrl || selectedImageUri === profile?.avatarUrl) return;

    const uriParts = selectedImageUri.split(".");
    const ext = uriParts[uriParts.length - 1]?.toLowerCase() ?? "jpg";
    const name = `avatar.${ext}`;
    const mimeType =
      ext === "png"
        ? "image/png"
        : ext === "webp"
          ? "image/webp"
          : "image/jpeg";

    try {
      await uploadAvatar.mutateAsync({
        uri: selectedImageUri,
        name,
        type: mimeType,
      });
    } catch (error) {
      Alert.alert(
        t("profileScreen.common.saveFailedTitle"),
        extractApiErrorMessage(error) ||
          t("profileScreen.details.avatar.uploadFailed"),
      );
      throw error;
    }
  };

  const handleSave = async () => {
    if (!validate()) return;

    const needsAvatarUpload =
      selectedImageUri &&
      selectedImageUri !== profile?.avatarDataUrl &&
      selectedImageUri !== profile?.avatarUrl;

    try {
      if (needsAvatarUpload) {
        await handleSaveAvatar();
      }

      await patchProfile.mutateAsync({
        displayName: displayName.trim(),
        dateOfBirth: normalizeDateOfBirth(toLocalDateString(dateOfBirth!)),
        gender,
        countryCode,
      });

      router.back();
    } catch (error) {
      Alert.alert(
        t("profileScreen.common.saveFailedTitle"),
        extractApiErrorMessage(error) ||
          t("profileScreen.edit.saveFailedBody"),
      );
    }
  };

  return (
    <Screen bg="background">
      <Header title={t("profileScreen.edit.screenTitle")} showBack />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Avatar card */}
        <Card
          variant="elevated"
          style={[styles.card, { borderColor: theme.colors.borderLight }]}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setAvatarActionSheetVisible(true)}
            style={[
              styles.avatarRow,
              isRtl ? styles.avatarRowRtl : null,
            ]}
          >
            {selectedImageUri ? (
              <Image
                source={{ uri: selectedImageUri }}
                style={styles.avatarImage}
              />
            ) : (
              <View
                style={[
                  styles.avatarFallback,
                  { backgroundColor: theme.colors.primaryLight },
                ]}
              >
                <Text
                  weight="bold"
                  style={[
                    styles.avatarText,
                    { color: theme.colors.primary },
                  ]}
                >
                  {displayNameInitials}
                </Text>
              </View>
            )}
            <View style={styles.avatarMeta}>
              <Text weight="600" style={styles.avatarName}>
                {displayName.trim() ||
                  profile?.displayName ||
                  t("profileScreen.fallbackName")}
              </Text>
              <Text
                color={theme.colors.textSecondary}
                style={styles.avatarHint}
              >
                {t("profileScreen.edit.avatarHint")}
              </Text>
            </View>
            <Ionicons
              name="camera"
              size={20}
              color={theme.colors.primary}
              style={isRtl ? styles.cameraIconRtl : styles.cameraIconLtr}
            />
          </TouchableOpacity>
        </Card>

        {/* Personal data card */}
        <Card
          variant="elevated"
          style={[styles.card, { borderColor: theme.colors.borderLight }]}
        >
          <Text weight="bold" style={styles.sectionTitle}>
            {t("profileScreen.edit.sectionTitle")}
          </Text>

          <View style={styles.formStack}>
            {/* Display name */}
            <View style={styles.fieldWrap}>
              <Text
                weight="500"
                color={theme.colors.textSecondary}
                style={styles.fieldLabel}
              >
                {t("profileScreen.edit.fields.displayName")}
              </Text>
              <View
                style={[
                  styles.textInputContainer,
                  {
                    borderColor: fieldErrors.displayName
                      ? "#ef4444"
                      : theme.colors.borderLight,
                    backgroundColor: theme.colors.surface,
                  },
                ]}
              >
                <View
                  style={[
                    styles.inputWrapper,
                    { flexDirection: isRtl ? "row-reverse" : "row" },
                  ]}
                >
                  <View style={styles.inputFlex}>
                    <TouchableOpacity
                      activeOpacity={1}
                      onPress={() => {}}
                      style={styles.nameInputTouchable}
                    >
                      <View
                        style={[
                          styles.nameInputInner,
                          { flexDirection: isRtl ? "row-reverse" : "row" },
                        ]}
                      >
                        <View style={styles.inputTextWrap}>
                          <TextInput
                            value={displayName}
                            onChangeText={(val: string) => {
                              setDisplayName(val);
                              if (fieldErrors.displayName) {
                                setFieldErrors((e) => ({
                                  ...e,
                                  displayName: undefined,
                                }));
                              }
                            }}
                            placeholder={
                              t(
                                "profileScreen.edit.fields.displayNamePlaceholder",
                              ) ?? ""
                            }
                            placeholderTextColor={theme.colors.textMuted}
                            maxLength={80}
                            style={[
                              styles.nameInput,
                              {
                                color: theme.colors.textPrimary,
                                textAlign: isRtl ? "right" : "left",
                              },
                            ]}
                          />
                        </View>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              {fieldErrors.displayName ? (
                <Text color="#ef4444" style={styles.fieldError}>
                  {fieldErrors.displayName}
                </Text>
              ) : null}
            </View>

            {/* Date of birth */}
            <View style={styles.fieldWrap}>
              <Text
                weight="500"
                color={theme.colors.textSecondary}
                style={styles.fieldLabel}
              >
                {t("profileScreen.edit.fields.dateOfBirth")}
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setDatePickerVisible(true)}
                style={[
                  styles.selectorButton,
                  {
                    borderColor: fieldErrors.dateOfBirth
                      ? "#ef4444"
                      : theme.colors.borderLight,
                    backgroundColor: theme.colors.surface,
                    flexDirection: isRtl ? "row-reverse" : "row",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.selectorText,
                    {
                      color: dateDisplayValue
                        ? theme.colors.textPrimary
                        : theme.colors.textMuted,
                      textAlign: isRtl ? "right" : "left",
                    },
                  ]}
                >
                  {dateDisplayValue ||
                    t("profileScreen.edit.datePicker.placeholder")}
                </Text>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={theme.colors.textMuted}
                  style={isRtl ? { marginLeft: 0 } : {}}
                />
              </TouchableOpacity>
              {fieldErrors.dateOfBirth ? (
                <Text color="#ef4444" style={styles.fieldError}>
                  {fieldErrors.dateOfBirth}
                </Text>
              ) : null}
            </View>

            {/* Gender */}
            <View style={styles.fieldWrap}>
              <Text
                weight="500"
                color={theme.colors.textSecondary}
                style={styles.fieldLabel}
              >
                {t("profileScreen.edit.fields.gender")}
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setGenderModalVisible(true)}
                style={[
                  styles.selectorButton,
                  {
                    borderColor: fieldErrors.gender
                      ? "#ef4444"
                      : theme.colors.borderLight,
                    backgroundColor: theme.colors.surface,
                    flexDirection: isRtl ? "row-reverse" : "row",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.selectorText,
                    {
                      color: genderDisplayValue
                        ? theme.colors.textPrimary
                        : theme.colors.textMuted,
                      textAlign: isRtl ? "right" : "left",
                    },
                  ]}
                >
                  {genderDisplayValue}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={18}
                  color={theme.colors.textMuted}
                />
              </TouchableOpacity>
              {fieldErrors.gender ? (
                <Text color="#ef4444" style={styles.fieldError}>
                  {fieldErrors.gender}
                </Text>
              ) : null}
            </View>

            {/* Country */}
            <View style={styles.fieldWrap}>
              <Text
                weight="500"
                color={theme.colors.textSecondary}
                style={styles.fieldLabel}
              >
                {t("profileScreen.edit.fields.countryCode")}
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setCountryPickerVisible(true)}
                style={[
                  styles.selectorButton,
                  {
                    borderColor: fieldErrors.countryCode
                      ? "#ef4444"
                      : theme.colors.borderLight,
                    backgroundColor: theme.colors.surface,
                    flexDirection: isRtl ? "row-reverse" : "row",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.selectorText,
                    {
                      color: countryDisplayValue
                        ? theme.colors.textPrimary
                        : theme.colors.textMuted,
                      textAlign: isRtl ? "right" : "left",
                    },
                  ]}
                >
                  {countryDisplayValue ||
                    t("profileScreen.edit.countryPicker.placeholder")}
                </Text>
                <Ionicons
                  name="location-outline"
                  size={20}
                  color={theme.colors.textMuted}
                />
              </TouchableOpacity>
              {fieldErrors.countryCode ? (
                <Text color="#ef4444" style={styles.fieldError}>
                  {fieldErrors.countryCode}
                </Text>
              ) : null}
            </View>
          </View>
        </Card>

        {/* Contact info note */}
        <Card
          variant="flat"
          style={[styles.noteCard, { borderColor: theme.colors.borderLight }]}
        >
          <Text color={theme.colors.textSecondary} style={styles.noteText}>
            {t("profileScreen.edit.contactNote")}
          </Text>
        </Card>

        {/* Save / Cancel */}
        <View style={styles.actionRow}>
          <Button
            title={t("profileScreen.edit.cancel")}
            variant="secondary"
            onPress={() => router.back()}
            style={styles.cancelButton}
          />
          <Button
            title={
              patchProfile.isPending
                ? t("profileScreen.common.saving")
                : t("profileScreen.edit.save")
            }
            onPress={handleSave}
            disabled={patchProfile.isPending || profileQuery.isLoading}
            style={styles.saveButton}
          />
        </View>
      </ScrollView>

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={datePickerVisible}
        value={dateOfBirth}
        onClose={() => setDatePickerVisible(false)}
        onConfirm={(date) => {
          setDateOfBirth(date);
          setDatePickerVisible(false);
          if (fieldErrors.dateOfBirth) {
            setFieldErrors((e) => ({ ...e, dateOfBirth: undefined }));
          }
        }}
      />

      {/* Gender Select Modal */}
      <GenderSelectModal
        visible={genderModalVisible}
        value={gender}
        onClose={() => setGenderModalVisible(false)}
        onSelect={(val) => {
          setGender(val);
        }}
      />

      {/* Country Picker Modal */}
      <CountryPickerModal
        visible={countryPickerVisible}
        value={countryCode}
        onClose={() => setCountryPickerVisible(false)}
        onSelect={(code) => {
          setCountryCode(code);
          if (fieldErrors.countryCode) {
            setFieldErrors((e) => ({ ...e, countryCode: undefined }));
          }
        }}
      />

      {/* Avatar Action Sheet */}
      {avatarActionSheetVisible && (
        <View style={styles.avatarActionBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setAvatarActionSheetVisible(false)}
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
              onPress={() => {
                setAvatarActionSheetVisible(false);
                pickImage();
              }}
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
            {(profile?.avatarUrl || profile?.avatarDataUrl) && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleRemoveAvatar}
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
      )}
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
  noteCard: {
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
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 22,
  },
  avatarMeta: {
    flex: 1,
    gap: 4,
  },
  avatarName: {
    fontSize: 18,
  },
  avatarHint: {
    fontSize: 12,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 17,
    marginBottom: 14,
  },
  formStack: {
    gap: 4,
  },
  fieldWrap: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  textInputContainer: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 52,
  },
  inputWrapper: {
    flex: 1,
    alignItems: "center",
  },
  inputFlex: {
    flex: 1,
  },
  nameInputTouchable: {
    flex: 1,
  },
  nameInputInner: {
    flex: 1,
    alignItems: "center",
  },
  inputTextWrap: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  nameInput: {
    fontSize: 16,
    paddingVertical: 0,
  },
  selectorButton: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 52,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  selectorText: {
    fontSize: 16,
    flex: 1,
  },
  fieldError: {
    fontSize: 12,
    marginTop: 4,
  },
  noteText: {
    fontSize: 13,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  cameraIconLtr: {
    marginLeft: 4,
  },
  cameraIconRtl: {
    marginRight: 4,
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
  cancelButton: {
    flex: 1,
    borderRadius: 14,
  },
  saveButton: {
    flex: 2,
    borderRadius: 14,
  },
});
