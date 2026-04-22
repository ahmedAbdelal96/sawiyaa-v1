import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from './Text';
import { useTheme } from '../../providers/ThemeProvider';
import { I18nManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
}

export const ListRow = ({
  title,
  subtitle,
  leftElement,
  rightElement,
  onPress,
  showChevron = false,
}: ListRowProps) => {
  const { theme } = useTheme();
  const isRTL = I18nManager.isRTL;

  const Chevron = () => (
    <Ionicons 
      name={isRTL ? "chevron-back" : "chevron-forward"} 
      size={20} 
      color={theme.colors.textMuted} 
      style={{ opacity: 0.5 }} 
    />
  );

  const Container: React.ElementType = onPress ? TouchableOpacity : View;
  const containerProps = onPress ? { activeOpacity: 0.7, onPress } : {};

  return (
    <Container style={[styles.row, { borderBottomColor: theme.colors.borderLight }]} {...containerProps}>
      {leftElement && <View style={styles.leftContainer}>{leftElement}</View>}
      
      <View style={styles.contentContainer}>
        <Text weight="500" style={styles.title} color={theme.colors.textPrimary}>
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.subtitle} color={theme.colors.textSecondary}>
            {subtitle}
          </Text>
        )}
      </View>

      {(rightElement || showChevron) && (
        <View style={styles.rightContainer}>
          {rightElement}
          {showChevron && <View style={styles.chevron}><Chevron /></View>}
        </View>
      )}
    </Container>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  leftContainer: {
    marginRight: 16,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  title: {
    fontSize: 16,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  chevron: {
    marginLeft: 8,
  },
});
