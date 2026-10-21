import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../constants/theme';

// product: { color, accent } — klub formasi; maxsus dizaynda qo'shimcha
// gradient ([from, to]), fontStyle (shrift uslubi) va patch (yamoq belgisi) keladi.
export function JerseyPreview({ product, number = '10', compact = false, tiny = false, large = false, side = 'front', name }) {
  const item = product || {};
  const color = item.color || '#5A66DE';
  const accent = item.accent || '#BFD5FF';
  const scale = tiny ? 0.4 : compact ? 0.78 : large ? 1.35 : 1;
  const caption = side === 'back' && name ? name : 'FORMO';
  const gradient = Array.isArray(item.gradient) && item.gradient.length === 2 ? item.gradient : null;
  const sleeveColor = (index) => (gradient ? gradient[index] : color);
  return (
    <View style={[styles.jersey, { backgroundColor: color }, scale !== 1 && { transform: [{ scale }] }]}>
      {gradient ? (
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={StyleSheet.absoluteFill} />
      ) : null}
      <View style={[styles.stripe, { backgroundColor: accent }]} />
      <View style={styles.collar} />
      <Text style={[styles.brand, { color: accent }, item.fontStyle]} numberOfLines={1}>{caption}</Text>
      <Text style={[styles.number, { color: accent }, item.fontStyle]}>{number}</Text>
      <View style={[styles.sleeve, styles.left, { backgroundColor: sleeveColor(0) }]} />
      <View style={[styles.sleeve, styles.right, { backgroundColor: sleeveColor(1) }]} />
      {item.patch && side === 'front' ? (
        <View style={[styles.patch, { borderColor: accent }]}>
          <Text style={[styles.patchText, { color: accent }]}>{item.patch}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  jersey: {
    width: 126,
    height: 150,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    elevation: 5,
  },
  stripe: { position: 'absolute', width: 28, height: 180, transform: [{ rotate: '28deg' }], opacity: 0.55 },
  collar: { position: 'absolute', top: -5, width: 37, height: 21, borderRadius: 20, backgroundColor: colors.black },
  brand: { fontSize: 8, fontWeight: '900', marginTop: 14, letterSpacing: 1 },
  number: { fontSize: 52, fontWeight: '900', marginTop: 9 },
  sleeve: { position: 'absolute', top: 14, width: 34, height: 54, borderRadius: 12 },
  patch: {
    position: 'absolute',
    top: 30,
    left: 20,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patchText: { fontSize: 8, fontWeight: '900' },
  left: { left: -17, transform: [{ rotate: '-27deg' }] },
  right: { right: -17, transform: [{ rotate: '27deg' }] },
});
