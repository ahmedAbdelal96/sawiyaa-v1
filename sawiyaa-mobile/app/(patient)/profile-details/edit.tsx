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
import { useAppDirection } from "../../../src/i18n/direction";
import {
  formatProfileDate,
  getInitials,
  normalizeDateOfBirth,
  isValidDateOfBirth,
} from "../../../src/features/patient/profile/account-utils";
import { normalizeProfileGender } from "../../../src/features/patient/profile/gender-utils";
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
  const { isRtl, rowDirection, textAlign, writingDirection } = useAppDirection();

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

  // Focus states
  const [nameFocused, setNameFocused] = useState(false);

  // Modals
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [genderModalVisible, setGenderModalVisible] = useState(false);

  useEffect(() => {
    if (!profile) return;

    setDisplayName(profile.displayName ?? "");
    const normalizedGender = normalizeProfileGender(profile.gender);
    setGender(
      normalizedGender === "male" || normalizedGender === "female"
        ? normalizedGender
        : null,
    );

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

  const genderDisplayKey = normalizeProfileGender(gender);
  const genderDisplayValue = genderDisplayKey
    ? t(`profileScreen.details.genderOptions.${genderDisplayKey}` as const)
    : t("profileScreen.none");

  const countryDisplayValue = profile?.countryCode
    ? getCountryLabel(profile.countryCode, i18n.language)
    : t("profileScreen.none");

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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Avatar Card (Read-only context) */}
        <Card
          variant="elevated"
          style={styles.avatarCard}
          padding="none"
        >
          {/* Subtle gold accent indicator line at the top */}
          <View style={[styles.goldAccentLine, { backgroundColor: theme.colors.tertiary }]} />

          <View style={[styles.avatarRow, { flexDirection: rowDirection }]}>
            {profile?.avatarDataUrl || profile?.avatarUrl ? (
              <Image
                source={{ uri: profile?.avatarDataUrl ?? profile?.avatarUrl ?? "" }}
                style={styles.avatarImage}
              />
            ) : (
              <View
                style={[
                  styles.avatarFallback,
                  { backgroundColor: theme.colors.primarySoft },
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
            <View style={[styles.avatarMeta, { alignItems: isRtl ? "flex-end" : "flex-start" }]}>
              <Text weight="bold" style={styles.avatarName} color={theme.colors.primary}>
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

        {/* Personal Data Form Card */}
        <Card
          variant="elevated"
          style={styles.card}
          padding="none"
        >
          {/* Subtle gold accent indicator line at the top */}
          <View style={[styles.goldAccentLine, { backgroundColor: theme.colors.tertiary }]} />

          <View style={styles.cardInnerPadding}>
            <Text weight="bold" style={styles.sectionTitle} color={theme.colors.textPrimary}>
              {t("profileScreen.edit.sectionTitle")}
            </Text>

            <View style={styles.formStack}>
              {/* Display Name Input */}
              <View style={styles.fieldWrap}>
                <Text
                  weight="600"
                  color={theme.colors.textSecondary}
                  style={styles.fieldLabel}
                >
                  {t("profileScreen.edit.fields.displayName")}
                </Text>
                
                <View
                  style={[
                    styles.inputContainer,
                    {
                      borderColor: fieldErrors.displayName
                        ? "#ef4444"
                        : nameFocused
                        ? theme.colors.primary
                        : theme.colors.borderLight,
                      backgroundColor: theme.colors.surfaceBright,
                    },
                  ]}
                >
                  <View style={[styles.inputRow, { flexDirection: rowDirection }]}>
                    <Ionicons
                      name="person-outline"
                      size={20}
                      color={nameFocused ? theme.colors.primary : theme.colors.textMuted}
                      style={{ marginEnd: 10 }}
                    />
                    <TextInput
                      value={displayName}
                      onFocus={() => setNameFocused(true)}
                      onBlur={() => setNameFocused(false)}
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
                        t("profileScreen.edit.fields.displayNamePlaceholder") ?? ""
                      }
                      placeholderTextColor={theme.colors.textMuted}
                      maxLength={80}
                      style={[
                        styles.textInput,
                        {
                          color: theme.colors.textPrimary,
                          textAlign,
                          writingDirection,
                        },
                      ]}
                    />
                  </View>
                </View>
                {fieldErrors.displayName ? (
                  <Text color="#ef4444" style={styles.fieldError}>
                    {fieldErrors.displayName}
                  </Text>
                ) : null}
              </View>

              {/* Date of Birth Picker */}
              <View style={styles.fieldWrap}>
                <Text
                  weight="600"
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
                      backgroundColor: theme.colors.surfaceBright,
                      flexDirection: rowDirection,
                    },
                  ]}
                >
                  <View style={[styles.selectorLeftRow, { flexDirection: rowDirection }]}>
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color={theme.colors.textMuted}
                      style={{ marginEnd: 10 }}
                    />
                    <Text
                      style={[
                        styles.selectorText,
                        {
                          color: dateDisplayValue
                            ? theme.colors.textPrimary
                            : theme.colors.textMuted,
                          textAlign,
                        },
                      ]}
                    >
                      {dateDisplayValue ||
                        t("profileScreen.edit.datePicker.placeholder")}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-down"
                    size={16}
                    color={theme.colors.textMuted}
                  />
                </TouchableOpacity>
                {fieldErrors.dateOfBirth ? (
                  <Text color="#ef4444" style={styles.fieldError}>
                    {fieldErrors.dateOfBirth}
                  </Text>
                ) : null}
              </View>

              {/* Gender Selector */}
              <View style={styles.fieldWrap}>
                <Text
                  weight="600"
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
                      backgroundColor: theme.colors.surfaceBright,
                      flexDirection: rowDirection,
                    },
                  ]}
                >
                  <View style={[styles.selectorLeftRow, { flexDirection: rowDirection }]}>
                    <Ionicons
                      name="transgender-outline"
                      size={20}
                      color={theme.colors.textMuted}
                      style={{ marginEnd: 10 }}
                    />
                    <Text
                      style={[
                        styles.selectorText,
                        {
                          color: genderDisplayValue && genderDisplayValue !== t("profileScreen.none")
                            ? theme.colors.textPrimary
                            : theme.colors.textMuted,
                          textAlign,
                        },
                      ]}
                    >
                      {genderDisplayValue}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-down"
                    size={16}
                    color={theme.colors.textMuted}
                  />
                </TouchableOpacity>
                {fieldErrors.gender ? (
                  <Text color="#ef4444" style={styles.fieldError}>
                    {fieldErrors.gender}
                  </Text>
                ) : null}
              </View>

              {/* Country (Read-only, visually styled as Warm Card) */}
              <View style={styles.fieldWrap}>
                <Text
                  weight="600"
                  color={theme.colors.textSecondary}
                  style={styles.fieldLabel}
                >
                  {t("profileScreen.edit.fields.countryCode")}
                </Text>
                <View
                  style={[
                    styles.selectorButtonReadOnly,
                    {
                      borderColor: theme.colors.borderLight,
                      backgroundColor: theme.colors.surface,
                      flexDirection: rowDirection,
                    },
                  ]}
                >
                  <View style={[styles.selectorLeftRow, { flexDirection: rowDirection }]}>
                    <Ionicons
                      name="globe-outline"
                      size={20}
                      color={theme.colors.textMuted}
                      style={{ marginEnd: 10 }}
                    />
                    <Text
                      style={[
                        styles.selectorText,
                        {
                          color: theme.colors.textSecondary,
                          textAlign,
                        },
                      ]}
                    >
                      {countryDisplayValue}
                    </Text>
                  </View>
                  <Ionicons
                    name="lock-closed-outline"
                    size={16}
                    color={theme.colors.textMuted}
                  />
                </View>
              </View>
            </View>
          </View>
        </Card>

        {/* Contact Info Note Card */}
        <Card
          variant="flat"
          style={styles.noteCard}
        >
          <View style={[styles.noteRow, { flexDirection: rowDirection }]}>
            <Ionicons name="information-circle-outline" size={18} color={theme.colors.textMuted} style={{ marginEnd: 8 }} />
            <Text color={theme.colors.textSecondary} style={styles.noteText}>
              {t("profileScreen.edit.contactNote")}
            </Text>
          </View>
        </Card>

        {/* Save / Cancel Action Buttons */}
        <View style={[styles.actionRow, { flexDirection: rowDirection }]}>
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
    gap: 2,
    alignItems: "flex-start",
  },
  avatarName: {
    fontSize: 18,
    lineHeight: 23,
  },
  avatarHint: {
    fontSize: 12,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 17,
    marginBottom: 16,
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
  inputContainer: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 52,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  textInput: {
    fontSize: 15,
    flex: 1,
    paddingVertical: 8,
  },
  selectorButton: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 52,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectorButtonReadOnly: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 52,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    opacity: 0.8,
  },
  selectorLeftRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  selectorText: {
    fontSize: 15,
    flex: 1,
  },
  fieldError: {
    fontSize: 12,
    marginTop: 4,
  },
  noteCard: {
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8DED0",
    padding: 16,
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  noteText: {
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 14,
    height: 52,
  },
  saveButton: {
    flex: 1.5,
    borderRadius: 14,
    height: 52,
  },
  rowRtl: {
    flexDirection: "row-reverse",
  },
  rowLtr: {
    flexDirection: "row",
  },
});
