import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors } from '../../constants/theme';
import thumbs from './kit360/thumbs';

// Kadr 600×800 (3:4), forma o'rtada: gorizontal markazda, vertikal ~41% balandlikda
const ASPECT = 4 / 3;
const FOCUS_Y = 0.41;
export const KIT360_BG = '#b8b8ba';

/**
 * Forma 360° jamoasining old tomon surati (katalog, bosh sahifa, savat, buyurtma kartalari).
 * width/height berilmasa — ota konteynerni to'ldiradi (absolute) va o'lchamini o'zi o'lchaydi.
 * zoom — kadr kartadan necha marta keng (forma atrofidagi fonni kesish uchun).
 * Surati yo'q jamoa (eski buyurtma, bog'lanmagan klub) — fon va futbolka belgisi.
 *
 * Props: team (kit360Id), width?, height?, zoom, style
 */
export default function Kit360Thumb({ team, width, height, zoom = 1.6, style }) {
  const fill = !width || !height;
  const [measured, setMeasured] = useState(null);
  const w = fill ? measured?.width : width;
  const h = fill ? measured?.height : height;
  const source = team ? thumbs[team] : null;
  const box = [styles.box, fill ? StyleSheet.absoluteFill : { width, height }, !source && styles.empty, style];
  const onLayout = fill ? (e) => setMeasured(e.nativeEvent.layout) : undefined;

  if (!source) {
    return (
      <View style={box} onLayout={onLayout}>
        <MaterialCommunityIcons name="tshirt-crew-outline" size={Math.round(Math.min(w || 40, h || 40) * 0.45)} color={colors.muted} />
      </View>
    );
  }
  const imgW = (w || 0) * zoom;
  const imgH = imgW * ASPECT;
  return (
    <View style={box} onLayout={onLayout}>
      {w && h ? (
        <Image
          source={source}
          resizeMode="cover"
          style={{ position: 'absolute', width: imgW, height: imgH, left: (w - imgW) / 2, top: h / 2 - imgH * FOCUS_Y }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { overflow: 'hidden', backgroundColor: KIT360_BG },
  empty: { backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
});
