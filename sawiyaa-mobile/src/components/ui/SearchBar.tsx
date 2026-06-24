import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Input, InputProps } from './Input';
import { useTheme } from '../../providers/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';

export interface SearchBarProps extends InputProps {
  onClear?: () => void;
}

export const SearchBar = ({ onClear, value, ...props }: SearchBarProps) => {
  const { theme } = useTheme();

  const SearchIcon = <Ionicons name="search" size={20} color={theme.colors.textMuted} />;
  const ClearIcon = <Ionicons name="close-circle" size={20} color={theme.colors.textMuted} />;

  const rightElement = value && value.length > 0 ? (
    <TouchableOpacity onPress={onClear} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
      {ClearIcon}
    </TouchableOpacity>
  ) : undefined;

  return (
    <View style={styles.container}>
      <Input
        value={value}
        leftElement={SearchIcon}
        rightElement={rightElement}
        style={styles.input}
        {...props}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  input: {
    height: 44, // Slightly shorter than regular inputs
  },
});
