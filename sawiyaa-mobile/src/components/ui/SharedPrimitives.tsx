import React from 'react';
import {
  I18nManager,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
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
  accessibilityLabel?: string;
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

const toneSelectors: Record<
  StatusTone,
  {
    bg: keyof ReturnType<typeof useTheme>['theme']['colors'];
    text: keyof ReturnType<typeof useTheme>['theme']['colors'];
    border: keyof ReturnType<typeof useTheme>['theme']['colors'];
    dot: keyof ReturnType<typeof useTheme>['theme']['colors'];
  }
> = {
  default: {
    bg: 'surfaceContainer',
    text: 'textSecondary',
    border: 'border',
    dot: 'textMuted',
  },
  info: {
    bg: 'statusInfoBg',
    text: 'statusInfoText',
    border: 'statusInfoBg',
    dot: 'info',
  },
  success: {
    bg: 'statusSuccessBg',
    text: 'statusSuccessText',
    border: 'statusSuccessBg',
    dot: 'success',
  },
  warning: {
    bg: 'statusWarningBg',
    text: 'statusWarningText',
    border: 'statusWarningBg',
    dot: 'warning',
  },
  error: {
    bg: 'statusErrorBg',
    text: 'statusErrorText',
    border: 'statusErrorBg',
    dot: 'error',
  },
};

function resolveTone(theme: ReturnType<typeof useTheme>['theme'], tone: StatusTone) {
  const selector = toneSelectors[tone];
  return {
    backgroundColor: theme.colors[selector.bg],
    textColor: theme.colors[selector.text],
    borderColor: theme.colors[selector.border],
    dotColor: theme.colors[selector.dot],
  };
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

export const StatusPill = ({
  label,
  tone = 'default',
  showDot = true,
  accessibilityLabel,
}: StatusChipProps) => {
  const { theme } = useTheme();
  const colors = resolveTone(theme, tone);

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: colors.backgroundColor,
          borderColor: colors.borderColor,
        },
      ]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel || label}
    >
      {showDot ? (
        <View style={[styles.dot, { backgroundColor: colors.dotColor }]} />
      ) : null}
      <Text variant="caption" weight="600" style={styles.chipLabel} color={colors.textColor}>
        {label}
      </Text>
    </View>
  );
};

export const StatusChip = StatusPill;

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
        { flexDirection: isRTL ? 'row-reverse' : 'row' },
        style,
      ]}
      {...props}
    >
      <View style={styles.sectionHeaderText}>
        <Text variant="title" weight="700" style={styles.sectionTitle} color={theme.colors.textPrimary}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodySmall" style={styles.sectionSubtitle} color={theme.colors.textSecondary}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action ? <View style={styles.sectionAction}>{action}</View> : null}
    </View>
  );
};

export const InfoRow = ({
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
  const containerProps = onPress ? { activeOpacity: 0.78, onPress } : {};

  const Chevron = () => (
    <Ionicons
      name={isRTL ? 'chevron-back' : 'chevron-forward'}
      size={18}
      color={theme.colors.textMuted}
    />
  );

  const valueNode =
    typeof value === 'string' || typeof value === 'number' ? (
      <Text variant="body" weight="600" style={styles.rowValueText} color={theme.colors.textPrimary}>
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
          borderBottomColor: theme.colors.divider,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
        style,
      ]}
      {...containerProps}
      {...props}
    >
      <View style={styles.rowContent}>
        <Text variant="body" color={theme.colors.textPrimary} style={styles.rowLabel}>
          {label}
        </Text>
        {helperText ? (
          <Text variant="caption" color={theme.colors.textMuted} style={styles.rowHelper}>
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

export const SummaryRow = InfoRow;

export const IconRow = ({
  label,
  onPress,
  accessibilityLabel,
  style,
  ...props
}: CompactActionRowProps) => {
  const { theme } = useTheme();
  const isRTL = I18nManager.isRTL;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.compactActionRow,
        { flexDirection: isRTL ? 'row-reverse' : 'row' },
        style,
      ]}
      {...props}
    >
      {typeof label === 'string' || typeof label === 'number' ? (
        <Text variant="bodySmall" color={theme.colors.primary} weight="600" style={styles.compactActionLabel}>
          {label}
        </Text>
      ) : (
        label
      )}
      <Ionicons
        name={isRTL ? 'arrow-back' : 'arrow-forward'}
        size={16}
        color={theme.colors.primary}
        style={styles.compactActionIcon}
      />
    </TouchableOpacity>
  );
};

export const CompactActionRow = IconRow;

export const Avatar = ({
  name,
  source,
  size = 40,
  label,
}: {
  name?: string;
  source?: { uri: string } | null;
  size?: number;
  label?: string;
}) => {
  const { theme } = useTheme();
  const initials =
    name
      ?.split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?';

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.colors.primarySoft,
          borderColor: theme.colors.border,
        },
      ]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label || name || 'Avatar'}
    >
      {source ? (
        <Image source={source} resizeMode="cover" style={styles.avatarImage} />
      ) : (
        <Text variant="caption" weight="700" color={theme.colors.primary}>
          {initials}
        </Text>
      )}
    </View>
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
    lineHeight: 24,
  },
  sectionSubtitle: {
    marginTop: 4,
    lineHeight: 19,
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
    lineHeight: 22,
  },
  rowHelper: {
    marginTop: 2,
    lineHeight: 18,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginStart: 12,
  },
  rowValueText: {
    textAlign: 'right',
  },
  rowRightElement: {
    marginStart: 8,
  },
  rowChevron: {
    marginStart: 6,
  },
  compactActionRow: {
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  compactActionLabel: {
    lineHeight: 18,
  },
  compactActionIcon: {
    marginStart: 6,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
});
