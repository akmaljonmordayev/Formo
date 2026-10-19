import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import JerseyVisualizer from '../components/ui/JerseyVisualizer';
import { colors, radii } from '../constants/theme';

export default function ArPreviewScreen({
  product,
  t,
  onBack,
  onTakeSnapshot,
}) {
  const [lighting, setLighting] = useState('studio'); // 'studio' | 'daylight' | 'stadium'
  const [scale, setScale] = useState(1);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      {/* Top bar overlay */}
      <View style={styles.topBar}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.iconBtn}>
          <MaterialCommunityIcons name="close" size={24} color="#F3F5F9" />
        </Pressable>
        <View style={styles.badge}>
          <MaterialCommunityIcons name="cube-scan" size={16} color={colors.accent} />
          <Text style={styles.badgeText}>3D / AR KO‘RINISH</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Simulated 3D / AR Viewport */}
      <View style={styles.viewport}>
        {/* AR grid guidelines */}
        <View style={styles.gridOverlay}>
          <View style={styles.cornerTL} />
          <View style={styles.cornerTR} />
          <View style={styles.cornerBL} />
          <View style={styles.cornerBR} />
        </View>

        {/* 3D Visualizer */}
        <View style={[styles.visualizerContainer, { transform: [{ scale }] }]}>
          <JerseyVisualizer
            color={product?.color || '#0E1A3F'}
            trim={product?.trim || '#F2A33A'}
            ink={product?.ink || '#F3F5F9'}
            grad={product?.grad}
            pattern={product?.pattern || 'stripes'}
            crest={product?.crest || 'FORMO'}
            player={product?.player || 'RONALDO'}
            number={product?.number || '7'}
            side="front"
            size={240}
          />
        </View>

        <Text style={styles.instruction}>
          Kamerani tekis yuzaga qarating yoki formani kattalashtiring
        </Text>
      </View>

      {/* Lighting controls & zoom bar */}
      <View style={styles.bottomBar}>
        {/* Lighting selector */}
        <View style={styles.lightingRow}>
          <Pressable
            onPress={() => setLighting('studio')}
            style={[styles.lightChip, lighting === 'studio' && styles.lightChipActive]}
          >
            <MaterialCommunityIcons
              name="lightbulb-on-outline"
              size={18}
              color={lighting === 'studio' ? colors.accent : '#8D95BD'}
            />
            <Text style={[styles.lightText, lighting === 'studio' && styles.lightTextActive]}>
              Studiya
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setLighting('daylight')}
            style={[styles.lightChip, lighting === 'daylight' && styles.lightChipActive]}
          >
            <MaterialCommunityIcons
              name="white-balance-sunny"
              size={18}
              color={lighting === 'daylight' ? colors.accent : '#8D95BD'}
            />
            <Text style={[styles.lightText, lighting === 'daylight' && styles.lightTextActive]}>
              Kunduzgi
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setLighting('stadium')}
            style={[styles.lightChip, lighting === 'stadium' && styles.lightChipActive]}
          >
            <MaterialCommunityIcons
              name="stadium"
              size={18}
              color={lighting === 'stadium' ? colors.accent : '#8D95BD'}
            />
            <Text style={[styles.lightText, lighting === 'stadium' && styles.lightTextActive]}>
              Stadion
            </Text>
          </Pressable>
        </View>

        {/* Zoom controls */}
        <View style={styles.zoomRow}>
          <Pressable
            onPress={() => setScale((s) => Math.max(0.7, s - 0.15))}
            style={styles.zoomBtn}
          >
            <MaterialCommunityIcons name="magnify-minus-outline" size={22} color="#F3F5F9" />
          </Pressable>

          <Pressable
            onPress={onTakeSnapshot || onBack}
            style={styles.snapshotBtn}
          >
            <View style={styles.snapshotInner} />
          </Pressable>

          <Pressable
            onPress={() => setScale((s) => Math.min(1.4, s + 0.15))}
            style={styles.zoomBtn}
          >
            <MaterialCommunityIcons name="magnify-plus-outline" size={22} color="#F3F5F9" />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#030510',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    zIndex: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: 'rgba(14, 26, 63, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(242, 163, 58, 0.15)',
    borderRadius: radii.round,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(242, 163, 58, 0.35)',
  },
  badgeText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  viewport: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  gridOverlay: {
    position: 'absolute',
    width: 280,
    height: 340,
  },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 24,
    height: 24,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: colors.accent,
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 24,
    height: 24,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: colors.accent,
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 24,
    height: 24,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: colors.accent,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: colors.accent,
  },
  visualizerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  instruction: {
    position: 'absolute',
    bottom: 24,
    fontSize: 12,
    color: '#8D95BD',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  lightingRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  lightChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0E1A3F',
    borderRadius: radii.round,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  lightChipActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(242, 163, 58, 0.15)',
  },
  lightText: {
    fontSize: 12,
    color: '#8D95BD',
    fontWeight: '700',
  },
  lightTextActive: {
    color: colors.accent,
  },
  zoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  zoomBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0E1A3F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  snapshotBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: '#F3F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  snapshotInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.accent,
  },
});
