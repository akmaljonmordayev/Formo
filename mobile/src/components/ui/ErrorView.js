import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../../constants/theme';
import { Button } from './Common';

/**
 * Full-page error state component.
 *
 * Props:
 *   message  — string describing what went wrong
 *   onRetry  — function called when the Retry button is pressed
 */
function ErrorView({ message, onRetry }) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⚠</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Button onPress={onRetry} style={styles.button}>
          Retry
        </Button>
      ) : null}
    </View>
  );
}

export default ErrorView;
export { ErrorView };

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    margin: spacing.xl,
    gap: spacing.md,
  },
  icon: {
    fontSize: 32,
  },
  message: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    marginTop: spacing.sm,
    alignSelf: 'stretch',
  },
});
