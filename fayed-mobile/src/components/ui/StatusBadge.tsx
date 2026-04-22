import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './Text';

export type BadgeStatus = 'success' | 'warning' | 'error' | 'info' | 'default';

export interface StatusBadgeProps {
  label: string;
  status?: BadgeStatus;
}

export const StatusBadge = ({ label, status = 'default' }: StatusBadgeProps) => {
  const getColors = () => {
    switch (status) {
      case 'success': return { bg: '#dcfce7', text: '#166534' };
      case 'warning': return { bg: '#fef9c3', text: '#854d0e' };
      case 'error': return { bg: '#fee2e2', text: '#991b1b' };
      case 'info': return { bg: '#dbeafe', text: '#1e40af' };
      case 'default':
      default:
        return { bg: '#f3f4f6', text: '#374151' };
    }
  };

  const colors = getColors();

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={styles.label} weight="600" color={colors.text}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    textTransform: 'uppercase',
  },
});
