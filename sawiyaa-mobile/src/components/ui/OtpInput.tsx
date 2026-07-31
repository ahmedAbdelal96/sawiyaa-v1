import React, { useRef, useState, useEffect } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
} from "react-native";
import { useTheme } from "../../providers/ThemeProvider";
import { useTranslation } from "react-i18next";
import { getAppDirection } from "../../i18n/direction";
import { Text } from "./Text";

export interface OtpInputProps {
  value: string;
  onChangeText: (value: string) => void;
  length?: number;
  disabled?: boolean;
  error?: string;
  autoFocus?: boolean;
  label?: string;
}

export const OtpInput = ({
  value,
  onChangeText,
  length = 6,
  disabled = false,
  error,
  autoFocus = true,
  label,
}: OtpInputProps) => {
  const { theme } = useTheme();
  const { i18n } = useTranslation();
  const direction = getAppDirection(i18n.language);
  const isRtl = direction === "rtl";

  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (autoFocus && !disabled) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocus, disabled]);

  const handlePress = () => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  };

  const handleTextChange = (text: string) => {
    // Standardize digits (convert Arabic/Persian digits to English)
    const normalized = text
      .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
      .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776));
    
    const cleanText = normalized.replace(/[^0-9]/g, "").slice(0, length);
    onChangeText(cleanText);
  };

  const valueArray = value.split("");

  const labelAlign = isRtl ? "right" : "left";

  return (
    <View style={styles.container}>
      {label && (
        <Text
          weight="500"
          style={[
            styles.label,
            { textAlign: labelAlign, writingDirection: direction },
          ]}
          color={theme.colors.textSecondary}
        >
          {label}
        </Text>
      )}

      <View style={styles.inputWrapper}>
        {/* Invisible TextInput overlay that catches touches and handles text inputs */}
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={handleTextChange}
          keyboardType="number-pad"
          maxLength={length}
          editable={!disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={styles.hiddenInput}
          caretHidden
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          underlineColorAndroid="transparent"
        />

        {/* Visible digit boxes row (forced LTR for digit ordering) */}
        <Pressable
          onPress={handlePress}
          style={[styles.row, { flexDirection: "row", pointerEvents: "none" }]}
        >
          {Array.from({ length }).map((_, index) => {
            const char = valueArray[index] || "";
            const isCurrentActive = index === value.length;
            const isBoxFocused = isFocused && isCurrentActive;

            let borderColor = theme.colors.borderStrong;
            if (disabled) {
              borderColor = theme.colors.borderLight;
            } else if (error) {
              borderColor = "#ef4444";
            } else if (isBoxFocused) {
              borderColor = theme.colors.primary;
            }

            let bgColor = theme.colors.surface;
            if (disabled) {
              bgColor = theme.colors.surfaceTertiary ?? "#f9fafb";
            }

            return (
              <View
                key={index}
                style={[
                  styles.box,
                  {
                    borderColor,
                    backgroundColor: bgColor,
                    borderWidth: isBoxFocused ? 2 : 1,
                  },
                ]}
              >
                <Text
                  weight="bold"
                  style={[
                    styles.boxText,
                    {
                      color: disabled
                        ? theme.colors.textMuted
                        : error
                        ? "#ef4444"
                        : theme.colors.textPrimary,
                    },
                  ]}
                >
                  {char}
                </Text>
              </View>
            );
          })}
        </Pressable>
      </View>

      {error ? (
        <Text
          style={[
            styles.errorText,
            { textAlign: labelAlign, writingDirection: direction },
          ]}
          color="#ef4444"
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: "100%",
    minWidth: 0,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  inputWrapper: {
    position: "relative",
    width: "100%",
    minHeight: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  hiddenInput: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.01,
    zIndex: 1,
    fontSize: 1,
    color: "transparent",
  },
  row: {
    justifyContent: "center",
    gap: 8,
    width: "100%",
    paddingVertical: 4,
  },
  box: {
    width: 44,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  boxText: {
    fontSize: 20,
    textAlign: "center",
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
});
