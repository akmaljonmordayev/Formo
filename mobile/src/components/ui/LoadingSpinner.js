import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/theme';

/**
 * A centered loading spinner with an optional text label.
 *
 * Props:
 *   size   — ActivityIndicator size prop (default 'large')
 *   label  — optional string shown below the spinner in muted colour
 */
function LoadingSpinner({ size = 'large', label }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={colors.accent} />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

export default LoadingSpinner;
export { LoadingSpinner };

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 10,
  },
});
