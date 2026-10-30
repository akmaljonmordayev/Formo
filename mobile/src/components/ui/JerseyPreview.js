import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Shirt, patchKind } from './Shirt';

/**
 * Mahsulot/dizayn ma'lumotidan formani chizadi (Shirt SVG renderer).
 * Props avvalgidek: product { color, accent, gradient, fontStyle, patch, crest|code },
 * number, side, name, o'lcham: tiny | compact | large.
 * Joylashuv qutisi o'zgarmagan (126×152 + scale) — chaqiruvchi ekranlar buzilmaydi.
 */
const BOX_W = 126;
const BOX_H = 152;

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
  const gradient = Array.isArray(item.gradient) && item.gradient.length === 2 ? item.gradient : null;
  const patch = patchKind(item.patch);

  return (
    <View style={[styles.box, scale !== 1 && { transform: [{ scale }] }]}>
      <Shirt
        width={BOX_W}
        color={color}
        ink={accent}
        trim={accent}
        grad={gradient}
        side={side}
        player={side === 'back' ? name : ''}
        number={number}
        crest={item.crest || item.code || ''}
        patches={patch ? [patch] : []}
        textStyle={item.fontStyle}
        glow={Boolean(item.glow)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: BOX_W, height: BOX_H, alignItems: 'center', justifyContent: 'center' },
});
