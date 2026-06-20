import React from 'react';
import {
  I18nManager,
  Pressable,
  StyleSheet,
  Switch,
  View,
  ViewProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../providers/ThemeProvider';
import { Text } from './Text';

export interface BottomActionBarProps extends ViewProps {
  children: React.ReactNode;
}

export const BottomActionBar = ({ children, style, ...props }: BottomActionBarProps) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bottomBar,
        {
          paddingBottom: Math.max(insets.bottom, theme.spacing.sm),
          paddingHorizontal: theme.spacing.page,
          backgroundColor: theme.colors.surfaceRaised,
          borderTopColor: theme.colors.divider,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

export interface SegmentedOption {
  key: string;
  label: string;
  disabled?: boolean;
}

export interface SegmentedControlProps extends ViewProps {
  options: SegmentedOption[];
  value: string;
  onChange: (nextValue: string) => void;
}

export const SegmentedControl = ({
  options,
  value,
  onChange,
  style,
  ...props
}: SegmentedControlProps) => {
  const { theme } = useTheme();
  const isRTL = I18nManager.isRTL;

  return (
    <View
      style={[
        styles.segmentedWrap,
        { backgroundColor: theme.colors.surfaceContainer, borderColor: theme.colors.border },
        style,
      ]}
      {...props}
    >
      <View style={[styles.segmentedInner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {options.map((option) => {
          const selected = option.key === value;
          return (
            <Pressable
              key={option.key}
              onPress={() => onChange(option.key)}
              disabled={option.disabled}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled: option.disabled }}
              style={[
                styles.segment,
                {
                  backgroundColor: selected ? theme.colors.surfaceRaised : 'transparent',
                },
              ]}
            >
              <Text
                variant="bodySmall"
                weight={selected ? '700' : '600'}
                color={selected ? theme.colors.textPrimary : theme.colors.textSecondary}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

export interface ChipProps extends ViewProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}

export const Chip = ({ label, selected = false, onPress, disabled, style, ...props }: ChipProps) => {
  const { theme } = useTheme();
  const isPressable = Boolean(onPress);

  const Container: React.ElementType = isPressable ? Pressable : View;
  const containerProps = isPressable ? { onPress } : {};

  return (
    <Container
      accessibilityRole={isPressable ? 'button' : undefined}
      accessibilityState={{ selected, disabled }}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surfaceContainer,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          opacity: disabled ? 0.56 : 1,
        },
        style,
      ]}
      {...containerProps}
      {...props}
    >
      <Text variant="caption" weight="600" color={selected ? theme.colors.primary : theme.colors.textSecondary}>
        {label}
      </Text>
    </Container>
  );
};

export interface ChipsProps extends ViewProps {
  items: ChipProps[];
}

export const Chips = ({ items, style, ...props }: ChipsProps) => {
  const isRTL = I18nManager.isRTL;

  return (
    <View
      style={[
        styles.chipsWrap,
        { flexDirection: isRTL ? 'row-reverse' : 'row' },
        style,
      ]}
      {...props}
    >
      {items.map((item) => (
        <Chip key={item.label} {...item} />
      ))}
    </View>
  );
};

export interface PreferenceToggleRowProps extends ViewProps {
  title: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export const PreferenceToggleRow = ({
  title,
  description,
  value,
  onValueChange,
  disabled,
  style,
  ...props
}: PreferenceToggleRowProps) => {
  const { theme } = useTheme();
  const isRTL = I18nManager.isRTL;

  return (
    <View
      style={[
        styles.preferenceRow,
        {
          flexDirection: isRTL ? 'row-reverse' : 'row',
          borderBottomColor: theme.colors.divider,
        },
        style,
      ]}
      {...props}
    >
      <View style={styles.preferenceText}>
        <Text variant="body" weight="600" color={theme.colors.textPrimary}>
          {title}
        </Text>
        {description ? (
          <Text variant="caption" color={theme.colors.textMuted} style={styles.preferenceDescription}>
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{
          false: theme.colors.surfaceContainerHigh,
          true: theme.colors.primarySoft,
        }}
        thumbColor={value ? theme.colors.primary : theme.colors.surfaceRaised}
      />
    </View>
  );
};

export interface ContentListItemProps extends ViewProps {
  title: string;
  subtitle?: string;
  meta?: string;
  leading?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
}

export const ContentListItem = ({
  title,
  subtitle,
  meta,
  leading,
  onPress,
  showChevron = true,
  style,
  ...props
}: ContentListItemProps) => {
  const { theme } = useTheme();
  const isRTL = I18nManager.isRTL;
  const Container: React.ElementType = onPress ? Pressable : View;
  const containerProps = onPress ? { onPress } : {};

  return (
    <Container
      accessibilityRole={onPress ? 'button' : undefined}
      style={[
        styles.listItem,
        {
          flexDirection: isRTL ? 'row-reverse' : 'row',
          borderBottomColor: theme.colors.divider,
        },
        style,
      ]}
      {...containerProps}
      {...props}
    >
      {leading ? <View style={styles.listLeading}>{leading}</View> : null}
      <View style={styles.listContent}>
        <Text variant="body" weight="600" color={theme.colors.textPrimary}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodySmall" color={theme.colors.textSecondary} style={styles.listSubtitle}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? (
          <Text variant="caption" color={theme.colors.textMuted} style={styles.listMeta}>
            {meta}
          </Text>
        ) : null}
      </View>
      {showChevron ? (
        <Ionicons
          name={isRTL ? 'chevron-back' : 'chevron-forward'}
          size={18}
          color={theme.colors.textMuted}
        />
      ) : null}
    </Container>
  );
};

export interface TransactionRowProps extends ViewProps {
  title: string;
  subtitle?: string;
  amountLabel: string;
  currencyLabel?: string;
  status?: React.ReactNode;
  leading?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
}

export const TransactionRow = ({
  title,
  subtitle,
  amountLabel,
  currencyLabel,
  status,
  leading,
  onPress,
  showChevron = false,
  style,
  ...props
}: TransactionRowProps) => {
  const { theme } = useTheme();
  const isRTL = I18nManager.isRTL;
  const Container: React.ElementType = onPress ? Pressable : View;
  const containerProps = onPress ? { onPress } : {};

  return (
    <Container
      accessibilityRole={onPress ? 'button' : undefined}
      style={[
        styles.transactionRow,
        {
          flexDirection: isRTL ? 'row-reverse' : 'row',
          borderBottomColor: theme.colors.divider,
        },
        style,
      ]}
      {...containerProps}
      {...props}
    >
      {leading ? <View style={styles.listLeading}>{leading}</View> : null}
      <View style={styles.listContent}>
        <Text variant="body" weight="600" color={theme.colors.textPrimary}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodySmall" color={theme.colors.textSecondary} style={styles.listSubtitle}>
            {subtitle}
          </Text>
        ) : null}
        {status ? <View style={styles.statusSlot}>{status}</View> : null}
      </View>
      <View style={styles.amountSlot}>
        <Text variant="body" weight="700" color={theme.colors.textPrimary}>
          {amountLabel}
        </Text>
        {currencyLabel ? (
          <Text variant="caption" color={theme.colors.textMuted} style={styles.currencyLabel}>
            {currencyLabel}
          </Text>
        ) : null}
      </View>
      {showChevron ? (
        <Ionicons
          name={isRTL ? 'chevron-back' : 'chevron-forward'}
          size={18}
          color={theme.colors.textMuted}
          style={styles.rowChevron}
        />
      ) : null}
    </Container>
  );
};

const styles = StyleSheet.create({
  bottomBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    gap: 12,
  },
  segmentedWrap: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
  },
  segmentedInner: {
    gap: 4,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  chip: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsWrap: {
    flexWrap: 'wrap',
    gap: 8,
  },
  preferenceRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 60,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  preferenceText: {
    flex: 1,
  },
  preferenceDescription: {
    marginTop: 2,
  },
  listItem: {
    alignItems: 'center',
    minHeight: 64,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  transactionRow: {
    alignItems: 'center',
    minHeight: 72,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  listLeading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    flex: 1,
    minWidth: 0,
  },
  listSubtitle: {
    marginTop: 2,
  },
  listMeta: {
    marginTop: 4,
  },
  statusSlot: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  amountSlot: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  currencyLabel: {
    marginTop: 2,
  },
  rowChevron: {
    marginStart: 2,
  },
});
