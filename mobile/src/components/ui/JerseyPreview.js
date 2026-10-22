import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../constants/theme';

export function JerseyPreview({
  product,
  number = '10',
  compact = false,
  tiny = false,
  large = false,
  side = 'front',
  name,
}) {
  const item = product || {};
  const color = item.color || '#1A3582';
  const accent = item.accent || '#FFFFFF';
  const scale = tiny ? 0.42 : compact ? 0.78 : large ? 1.35 : 1;
  const caption = side === 'back' && name ? name : 'FORMO';
  const gradient = Array.isArray(item.gradient) && item.gradient.length === 2 ? item.gradient : null;
  const sleeveColor = (index) => (gradient ? gradient[index] : color);

  return (
    <View
      style={[
        styles.jersey,
        { backgroundColor: color },
        scale !== 1 && { transform: [{ scale }] },
      ]}
    >
      {gradient ? (
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      {/* Athletic chest stripe / dynamic sash */}
      <View style={[styles.stripe, { backgroundColor: accent }]} />

      {/* Modern athletic collar */}
      <View style={styles.collar} />
      <View style={[styles.collarInner, { borderColor: accent }]} />

      {/* Wordmark / squad name */}
      <Text
        style={[
          styles.brand,
          { color: accent },
          item.fontStyle,
          side === 'back' && styles.backName,
        ]}
        numberOfLines={1}
      >
        {caption}
      </Text>

      {/* Squad number */}
      <Text style={[styles.number, { color: accent }, item.fontStyle]}>
        {number}
      </Text>

      {/* Sleeves with athletic trims */}
      <View style={[styles.sleeve, styles.left, { backgroundColor: sleeveColor(0) }]}>
        <View style={[styles.sleeveTrim, { backgroundColor: accent }]} />
      </View>
      <View style={[styles.sleeve, styles.right, { backgroundColor: sleeveColor(1) }]}>
        <View style={[styles.sleeveTrim, { backgroundColor: accent }]} />
      </View>

      {/* Sleeve patch if present (e.g. Captain, Flag, Champion) */}
      {item.patch && side === 'front' ? (
        <View style={[styles.patch, { borderColor: accent }]}>
          <Text style={[styles.patchText, { color: accent }]}>{item.patch}</Text>
        </View>
      ) : null}

      {/* Subtle athletic jersey mesh texture simulation */}
      <View style={styles.bottomHem} />
    </View>
  );
}

const styles = StyleSheet.create({
  jersey: {
    width: 126,
    height: 152,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  stripe: {
    position: 'absolute',
    width: 26,
    height: 190,
    transform: [{ rotate: '28deg' }],
    opacity: 0.35,
  },
  collar: {
    position: 'absolute',
    top: -6,
    width: 40,
    height: 22,
    borderRadius: 20,
    backgroundColor: colors.primaryDark,
    zIndex: 2,
  },
  collarInner: {
    position: 'absolute',
    top: -2,
    width: 32,
    height: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    zIndex: 3,
  },
  brand: {
    fontSize: 9,
    fontWeight: '900',
    marginTop: 18,
    letterSpacing: 1.8,
    zIndex: 4,
  },
  backName: {
    fontSize: 10,
    letterSpacing: 2.2,
    fontWeight: '900',
  },
  number: {
    fontSize: 54,
    fontWeight: '900',
    marginTop: 6,
    letterSpacing: -1,
    zIndex: 4,
  },
  sleeve: {
    position: 'absolute',
    top: 14,
    width: 36,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    zIndex: 1,
  },
  sleeveTrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    opacity: 0.8,
  },
  left: {
    left: -18,
    transform: [{ rotate: '-28deg' }],
  },
  right: {
    right: -18,
    transform: [{ rotate: '28deg' }],
  },
  patch: {
    position: 'absolute',
    top: 32,
    left: 20,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 4,
  },
  patchText: {
    fontSize: 8,
    fontWeight: '900',
  },
  bottomHem: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
});
