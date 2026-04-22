import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from './Text';
import { useTheme } from '../../providers/ThemeProvider';

export interface FilterChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export const FilterChip = ({ label, selected = false, onPress }: FilterChipProps) => {
  const { theme } = useTheme();

  const backgroundColor = selected ? theme.colors.primary : theme.colors.surfaceSecondary;
  const borderColor = selected ? theme.colors.primary : theme.colors.borderLight;
  const textColor = selected ? '#ffffff' : theme.colors.textSecondary;

  return (
    <TouchableOpacity
      style={[
        styles.chip,
        { backgroundColor, borderColor },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text color={textColor} weight={selected ? '600' : 'normal'} style={styles.label}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
  },
});
