import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../../components/ui';
import { useTheme } from '../../../../providers/ThemeProvider';

interface AssessmentScoreRingProps {
  score: number;
  scoreMax?: number;
  /** The localised band label, e.g. "قلق خفيف" */
  label: string;
  /** Small overline label shown above the main text, e.g. "المستوى" */
  overlineLabel: string;
  size?: number;
}

export function AssessmentScoreRing({
  label,
  overlineLabel,
  size = 180,
}: AssessmentScoreRingProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderColor: theme.colors.primary,
        },
      ]}
    >
      {/* Inner decorative ring (muted) */}
      <View
        style={[
          styles.innerRing,
          {
            borderColor: theme.colors.borderLight,
            width: size - 28,
            height: size - 28,
          },
        ]}
      />
      <View style={styles.content}>
        <Text color={theme.colors.textSecondary} style={styles.overline}>
          {overlineLabel}
        </Text>
        <Text
          weight="bold"
          style={[styles.label, { color: theme.colors.primary }]}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 10,
    position: 'relative',
  },
  innerRing: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 4,
  },
  content: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 16,
  },
  overline: {
    fontSize: 13,
    textAlign: 'center',
  },
  label: {
    fontSize: 22,
    textAlign: 'center',
    lineHeight: 30,
  },
});