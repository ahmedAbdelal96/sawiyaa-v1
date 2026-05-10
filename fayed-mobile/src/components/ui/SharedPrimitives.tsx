import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  I18nManager,
  ViewProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../providers/ThemeProvider';
import { Text } from './Text';

export type StatusTone = 'default' | 'info' | 'success' | 'warning' | 'error';

export interface StatusChipProps {
  label: string;
  tone?: StatusTone;
  showDot?: boolean;
}

export interface SummaryRowProps extends ViewProps {
  label: string;
  value?: React.ReactNode;
  helperText?: React.ReactNode;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
}

export interface SectionHeaderProps extends ViewProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}

export interface CompactActionRowProps extends ViewProps {
  label: React.ReactNode;
  onPress: () => void;
  accessibilityLabel?: string;
}

const toneStyles = {
  default: {
    light: {
      backgroundColor: '#f3f4f6',
      borderColor: '#e5e7eb',
      textColor: '#374151',
      dotColor: '#9ca3af',
    },
    dark: {
      backgroundColor: 'rgba(173, 191, 224, 0.12)',
      borderColor: 'rgba(173, 191, 224, 0.16)',
      textColor: 'rgba(244, 247, 255, 0.86)',
      dotColor: 'rgba(194, 206, 229, 0.58)',
    },
  },
  info: {
    light: {
      backgroundColor: '#dbeafe',
      borderColor: '#bfdbfe',
      textColor: '#1e40af',
      dotColor: '#2563eb',
    },
    dark: {
      backgroundColor: 'rgba(56, 189, 248, 0.12)',
      borderColor: 'rgba(56, 189, 248, 0.18)',
      textColor: '#7dd3fc',
      dotColor: '#38bdf8',
    },
  },
  success: {
    light: {
      backgroundColor: '#dcfce7',
      borderColor: '#bbf7d0',
      textColor: '#166534',
      dotColor: '#16a34a',
    },
    dark: {
      backgroundColor: 'rgba(74, 222, 128, 0.12)',
      borderColor: 'rgba(74, 222, 128, 0.18)',
      textColor: '#86efac',
      dotColor: '#4ade80',
    },
  },
  warning: {
    light: {
      backgroundColor: '#fef9c3',
      borderColor: '#fde68a',
      textColor: '#854d0e',
      dotColor: '#d97706',
    },
    dark: {
      backgroundColor: 'rgba(251, 191, 36, 0.12)',
      borderColor: 'rgba(251, 191, 36, 0.18)',
      textColor: '#fcd34d',
      dotColor: '#fbbf24',
    },
  },
  error: {
    light: {
      backgroundColor: '#fee2e2',
      borderColor: '#fecaca',
      textColor: '#991b1b',
      dotColor: '#dc2626',
    },
    dark: {
      backgroundColor: 'rgba(248, 113, 113, 0.12)',
      borderColor: 'rgba(248, 113, 113, 0.18)',
      textColor: '#fca5a5',
      dotColor: '#f87171',
    },
  },
} as const;

function resolveTone(themeIsDark: boolean, tone: StatusTone) {
  return toneStyles[tone][themeIsDark ? 'dark' : 'light'];
}

function parseDateValue(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function resolveLocale(locale?: string) {
  return locale || Intl.DateTimeFormat().resolvedOptions().locale;
}

function formatDateLike(
  value: string | null | undefined,
  locale: string | undefined,
  options: Intl.DateTimeFormatOptions,
) {
  const date = parseDateValue(value);
  if (!date) {
    return '-';
  }

  return date.toLocaleString(resolveLocale(locale), options);
}

export function formatDateTime(value: string | null | undefined, locale?: string) {
  return formatDateLike(value, locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDate(value: string | null | undefined, locale?: string) {
  return formatDateLike(value, locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(value: string | null | undefined, locale?: string) {
  return formatDateLike(value, locale, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export const StatusChip = ({
  label,
  tone = 'default',
  showDot = true,
}: StatusChipProps) => {
  const { theme, isDark } = useTheme();
  const palette = resolveTone(isDark, tone);

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
        },
      ]}
    >
      {showDot ? (
        <View
          style={[
            styles.dot,
            {
              backgroundColor: palette.dotColor,
            },
          ]}
        />
      ) : null}
      <Text
        weight="600"
        style={styles.chipLabel}
        color={palette.textColor}
      >
        {label}
      </Text>
    </View>
  );
};

export const SectionHeader = ({
  title,
  subtitle,
  action,
  style,
  ...props
}: SectionHeaderProps) => {
  const { theme } = useTheme();
  const isRTL = I18nManager.isRTL;

  return (
    <View
      style={[
        styles.sectionHeader,
        {
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
        style,
      ]}
      {...props}
    >
      <View style={styles.sectionHeaderText}>
        <Text weight="bold" style={styles.sectionTitle} color={theme.colors.textPrimary}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.sectionSubtitle} color={theme.colors.textSecondary}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action ? <View style={styles.sectionAction}>{action}</View> : null}
    </View>
  );
};

export const SummaryRow = ({
  label,
  value,
  helperText,
  rightElement,
  onPress,
  showChevron = false,
  style,
  ...props
}: SummaryRowProps) => {
  const { theme } = useTheme();
  const isRTL = I18nManager.isRTL;
  const Container: React.ElementType = onPress ? TouchableOpacity : View;
  const containerProps = onPress ? { activeOpacity: 0.75, onPress } : {};
  const Chevron = () => (
    <Ionicons
      name={isRTL ? 'chevron-back' : 'chevron-forward'}
      size={18}
      color={theme.colors.textMuted}
      style={{ opacity: 0.7 }}
    />
  );

  const valueNode =
    typeof value === 'string' || typeof value === 'number' ? (
      <Text weight="600" style={styles.rowValueText} color={theme.colors.textPrimary}>
        {value}
      </Text>
    ) : (
      value
    );

  return (
    <Container
      style={[
        styles.row,
        {
          borderBottomColor: theme.colors.borderLight,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
        style,
      ]}
      {...containerProps}
      {...props}
    >
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel} color={theme.colors.textSecondary}>
          {label}
        </Text>
        {helperText ? (
          <Text style={styles.rowHelper} color={theme.colors.textMuted}>
            {helperText}
          </Text>
        ) : null}
      </View>

      {(valueNode || rightElement || showChevron) && (
        <View style={styles.rowRight}>
          {valueNode}
          {rightElement ? <View style={styles.rowRightElement}>{rightElement}</View> : null}
          {showChevron ? <View style={styles.rowChevron}><Chevron /></View> : null}
        </View>
      )}
    </Container>
  );
};

export const CompactActionRow = ({
  label,
  onPress,
  accessibilityLabel,
  style,
  ...props
}: CompactActionRowProps) => {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.compactActionRow, style]}
      {...props}
    >
      {typeof label === 'string' || typeof label === 'number' ? (
        <Text
          color={theme.colors.primary}
          weight="600"
          style={styles.compactActionLabel}
        >
          {label}
        </Text>
      ) : (
        label
      )}
      <Ionicons
        name="arrow-forward"
        size={16}
        color={theme.colors.primary}
        style={styles.compactActionIcon}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginEnd: 8,
  },
  chipLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  sectionHeader: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sectionHeaderText: {
    flex: 1,
    marginEnd: 12,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },
  sectionAction: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  row: {
    alignItems: 'center',
    minHeight: 58,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    lineHeight: 22,
  },
  rowHelper: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginStart: 12,
  },
  rowValueText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'right',
  },
  rowRightElement: {
    marginStart: 8,
  },
  rowChevron: {
    marginStart: 6,
  },
  compactActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  compactActionLabel: {
    fontSize: 13,
  },
  compactActionIcon: {
    marginStart: 6,
  },
});
