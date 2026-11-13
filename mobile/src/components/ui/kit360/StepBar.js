import React from 'react';
import { Pressable, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, spacing, themedStyles } from '../../../constants/theme';

/**
 * Forma 360° bosqichlari: raqamli doiralar + chiziq; bajarilganlari ✓.
 *
 * Props: t, steps ([{ id, label }]), step (1-based), onPress(n)
 */
export default function StepBar({ t, steps, step, onPress }) {
  return (
    <View style={styles.stepper}>
      {steps.map((s, i) => {
        const n = i + 1;
        const isActive = step === n;
        const isDone = n < step;
        return (
          <React.Fragment key={s.id}>
            {i > 0 ? <View style={[styles.line, n <= step && styles.lineDone]} /> : null}
            <Pressable
              onPress={() => onPress(n)}
              style={styles.item}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              hitSlop={6}
            >
              <View style={[styles.dot, isDone && styles.dotDone, isActive && styles.dotActive]}>
                {isDone ? (
                  <MaterialCommunityIcons name="check" size={16} color={colors.accent} />
                ) : (
                  <Text style={[styles.num, isActive && styles.numActive]}>{n}</Text>
                )}
              </View>
              <Text style={[styles.label, (isActive || isDone) && styles.labelOn]} numberOfLines={1}>
                {t(s.label)}
              </Text>
            </Pressable>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = themedStyles(() => ({
  stepper: { flexDirection: 'row', alignItems: 'flex-start', marginHorizontal: spacing.lg, marginTop: spacing.lg },
  item: { width: 72, alignItems: 'center' },
  dot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  dotDone: { borderColor: colors.accent, backgroundColor: colors.accentGlow },
  dotActive: { borderColor: colors.accent, backgroundColor: colors.accent },
  num: { color: colors.muted, fontSize: 14, fontWeight: '900' },
  numActive: { color: colors.primaryDark },
  label: { color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 6 },
  labelOn: { color: colors.text, fontWeight: '800' },
  line: { flex: 1, height: 2, borderRadius: 1, backgroundColor: colors.border, marginTop: 16, marginHorizontal: -14 },
  lineDone: { backgroundColor: colors.accent },
}));
