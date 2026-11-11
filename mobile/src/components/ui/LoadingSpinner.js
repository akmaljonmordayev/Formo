import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * A centered loading spinner with an optional text label.
 *
 * Props:
 *   size   — ActivityIndicator size prop (default 'large')
 *   label  — optional string shown below the spinner in muted colour
 */
function LoadingSpinner({ size = 'large', label }) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={colors.accent} />
      {label ? <Text style={[styles.label, { color: colors.muted }]}>{label}</Text> : null}
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
    fontSize: 13,
    marginTop: 10,
  },
});
