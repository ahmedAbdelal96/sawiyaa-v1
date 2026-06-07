import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
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
  const profile = profileQuery.data?.profile;

  const [displayName, setDisplayName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [gender, setGender] = useState<GenderValue>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    displayName?: string;
    dateOfBirth?: string;
    gender?: string;
  }>({});

  // Modals
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [genderModalVisible, setGenderModalVisible] = useState(false);

  useEffect(() => {
    if (!profile) return;

    setDisplayName(profile.displayName ?? "");
    setGender((profile.gender as GenderValue) ?? null);

    if (profile.dateOfBirth) {
      const [y, mo, d] = profile.dateOfBirth.split("-").map(Number);
      if (y && mo && d) {
        setDateOfBirth(new Date(y, mo - 1, d));
      }
    }
  }, [profile]);

  const displayNameInitials = getInitials(
    (displayName.trim() || profile?.displayName) ?? undefined,
  );

  const dateDisplayValue = dateOfBirth
    ? formatProfileDate(dateOfBirth.toISOString().slice(0, 10), i18n.language)
    : "";

  const genderDisplayValue = gender
    ? t(`profileScreen.details.genderOptions.${gender}` as const)
    : t("profileScreen.none");

  const countryDisplayValue = profile?.countryCode
    ? getCountryLabel(profile.countryCode, i18n.language)
    : t("profileScreen.none");

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

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      await patchProfile.mutateAsync({
        displayName: displayName.trim(),
        dateOfBirth: normalizeDateOfBirth(toLocalDateString(dateOfBirth!)),
        gender,
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
        {/* Avatar card — read-only context, photo update is on /profile-details */}
        <Card
          variant="elevated"
          style={[styles.card, { borderColor: theme.colors.borderLight }]}
        >
          <View
            style={[
              styles.avatarRow,
              isRtl ? styles.avatarRowRtl : null,
            ]}
          >
            {profile?.avatarDataUrl || profile?.avatarUrl ? (
              <Image
                source={{ uri: profile?.avatarDataUrl ?? profile?.avatarUrl ?? "" }}
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
          </View>
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

            {/* Country — read-only, detected at registration */}
            <View style={styles.fieldWrap}>
              <Text
                weight="500"
                color={theme.colors.textSecondary}
                style={styles.fieldLabel}
              >
                {t("profileScreen.edit.fields.countryCode")}
              </Text>
              <View
                style={[
                  styles.selectorButton,
                  {
                    borderColor: theme.colors.borderLight,
                    backgroundColor: theme.colors.surface,
                    flexDirection: isRtl ? "row-reverse" : "row",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.selectorText,
                    {
                      color: theme.colors.textPrimary,
                      textAlign: isRtl ? "right" : "left",
                    },
                  ]}
                >
                  {countryDisplayValue}
                </Text>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={theme.colors.textMuted}
                />
              </View>
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
  cancelButton: {
    flex: 1,
    borderRadius: 14,
  },
  saveButton: {
    flex: 2,
    borderRadius: 14,
  },
});
