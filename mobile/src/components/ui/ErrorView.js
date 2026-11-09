import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { radii, spacing } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from './Common';

/**
 * Full-page error state component.
 *
 * Props:
 *   message    — string describing what went wrong
 *   onRetry    — function called when the Retry button is pressed
 *   retryLabel — localized label for the retry button
 */
function ErrorView({ message, onRetry, retryLabel = 'Retry' }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <MaterialCommunityIcons name="alert-circle-outline" size={32} color="#E8543F" />
      <Text style={[styles.message, { color: colors.muted }]}>{message}</Text>
      {onRetry ? (
        <Button onPress={onRetry} style={styles.button}>
          {retryLabel}
        </Button>
      ) : null}
    </View>
  );
}

export default ErrorView;
export { ErrorView };

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    margin: spacing.xl,
    gap: spacing.md,
  },
  message: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    marginTop: spacing.sm,
    alignSelf: 'stretch',
  },
});
