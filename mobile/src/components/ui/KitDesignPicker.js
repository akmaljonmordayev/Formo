import React from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radii, spacing } from '../../constants/theme';
import { assetUrl } from '../../services/api';
import { formatMoney } from './Common';

/**
 * Superadmin nashr qilgan 3D dizaynlar karuseli (+ "O'z rangim" — mavjud rang studiyasi).
 * Tarmoq yo'q bo'lsa — qayta urinish; studiyaning o'z ranglari baribir ishlayveradi.
 */
export default function KitDesignPicker({ t, designs, loading, error, onRetry, selectedId, onSelect, showCustom }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={styles.scroll}>
      {showCustom ? (
        <Pressable onPress={() => onSelect(null)} style={[styles.card, selectedId == null && styles.cardActive]}>
          <View style={[styles.thumb, styles.customThumb]}>
            <MaterialCommunityIcons name="palette-outline" size={26} color={colors.accent} />
          </View>
          <Text style={[styles.name, selectedId == null && styles.nameActive]} numberOfLines={1}>
            {t('kit3dCustom')}
          </Text>
        </Pressable>
      ) : null}

      {designs.map((d) => {
        const active = selectedId === d.id;
        const thumb = assetUrl(d.thumbnailUrl);
        return (
          <Pressable key={d.id} onPress={() => onSelect(d.id)} style={[styles.card, active && styles.cardActive]}>
            <View style={[styles.thumb, { backgroundColor: d.design.primaryColor }]}>
              {thumb ? <Image source={{ uri: thumb }} style={styles.image} resizeMode="cover" /> : null}
            </View>
            <Text style={[styles.name, active && styles.nameActive]} numberOfLines={1}>
              {d.name}
            </Text>
            <Text style={styles.price}>{formatMoney(d.prices.shirt)}</Text>
          </Pressable>
        );
      })}

      {loading ? (
        <View style={[styles.card, styles.status]}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : error ? (
        <Pressable style={[styles.card, styles.status]} onPress={onRetry}>
          <MaterialCommunityIcons name="wifi-off" size={20} color={colors.danger} />
          <Text style={styles.statusText}>{t('kit3dLoadError')}</Text>
          <Text style={styles.retry}>{t('retry')}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { marginBottom: spacing.md, marginHorizontal: -2 },
  row: { gap: spacing.sm, paddingHorizontal: 2 },
  card: {
    width: 92,
    padding: 6,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cardActive: { borderColor: colors.accent },
  thumb: { width: 78, height: 88, borderRadius: radii.sm, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  customThumb: { backgroundColor: colors.surfaceRaised },
  image: { width: '100%', height: '100%' },
  name: { color: colors.muted, fontSize: 11, fontWeight: '800', marginTop: 6, maxWidth: 80 },
  nameActive: { color: colors.accent },
  price: { color: colors.muted, fontSize: 10, marginTop: 2 },
  status: { justifyContent: 'center', gap: 4, minHeight: 118 },
  statusText: { color: colors.muted, fontSize: 10, textAlign: 'center' },
  retry: { color: colors.accent, fontSize: 11, fontWeight: '800' },
});
