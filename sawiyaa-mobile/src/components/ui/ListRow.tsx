import React from 'react';
import { View, StyleSheet, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
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
  style?: StyleProp<ViewStyle>;
}

export const ListRow = ({
  title,
  subtitle,
  leftElement,
  rightElement,
  onPress,
  showChevron = false,
  style,
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
    <Container
      style={[
        styles.row,
        {
          borderBottomColor: theme.colors.divider,
          flexDirection: isRTL ? "row-reverse" : "row",
        },
        style,
      ]}
      {...containerProps}
    >
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
    alignItems: 'center',
    minHeight: 60,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  leftContainer: {
    marginEnd: 12,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginStart: 12,
  },
  title: {
    fontSize: 16,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  chevron: {
    marginStart: 8,
  },
});
