import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../constants/theme';
import { Button, Header, Screen, Segment, formatMoney } from '../components/ui/Common';
import ErrorView from '../components/ui/ErrorView';
import { JerseyPreview } from '../components/ui/JerseyPreview';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { visibleSizes } from '../features/config';
import { useClub } from '../features/products';

// Klub sahifasi: GET /api/catalog/clubs/:id — formalar (Uy / Mehmon / Uchinchi) narxi bilan.
export default function ProductScreen({ clubId, kitId, rules, t, onBack, onCustomize }) {
  const [side, setSide] = useState('front');
  const [selectedId, setSelectedId] = useState(kitId || null);
  const { club, products, isLoading, error, refetch } = useClub(clubId);

  // Boshqa klub ochilganda yoki tanlangan forma yo'q bo'lsa — birinchisi
  useEffect(() => {
    if (products.length && !products.some((p) => p.kitId === selectedId)) {
      setSelectedId(products.find((p) => p.kitId === kitId)?.kitId ?? products[0].kitId);
    }
  }, [products, selectedId, kitId]);

  const product = products.find((p) => p.kitId === selectedId) || products[0];

  if (!product) {
    return (
      <Screen>
        <Header title={club?.name || t('catalog')} onBack={onBack} />
        {error ? (
          <ErrorView message={t('loadError')} onRetry={refetch} retryLabel={t('retry')} />
        ) : isLoading ? (
          <LoadingSpinner />
        ) : (
          <Text style={styles.description}>{t('noKits')}</Text>
        )}
      </Screen>
    );
  }

  const available = visibleSizes(product.sizes, rules).filter((s) => s.available).map((s) => s.size);
  const specs = [
    [t('kitIncludes'), t('kitIncludesValue')],
    [t('shirtPrice'), formatMoney(product.priceBreakdown.shirt)],
    [t('shortsPrice'), formatMoney(product.priceBreakdown.shorts)],
    [t('printPrice'), formatMoney(product.priceBreakdown.print)],
    [t('sizes'), available.length ? `${available[0]}–${available[available.length - 1]}` : '—'],
  ];
  return (
    <Screen
      contentStyle={{ paddingBottom: 110 }}
      footer={
        <View style={styles.footer}>
          <View>
            <Text style={styles.footerLabel}>{t('total')}</Text>
            <Text style={styles.footerPrice}>{formatMoney(product.price)}</Text>
          </View>
          <Button onPress={() => onCustomize(product)}>{t('customize')}</Button>
        </View>
      }
    >
      <Header title={club?.name || product.name} subtitle={club?.season || t('baseKit')} onBack={onBack} />

      <Segment
        style={styles.segment}
        options={[t('front'), t('rear')]}
        value={side === 'front' ? t('front') : t('rear')}
        onChange={(value) => setSide(value === t('front') ? 'front' : 'back')}
      />

      <View style={styles.preview}>
        <View style={styles.glow} />
        <Text style={styles.badge}>{product.badge}</Text>
        <JerseyPreview
          product={product}
          number="10"
          large
          side={side}
          name="AZIZ"
        />
      </View>

      <View style={styles.previewRow}>
        {products.map((item) => (
          <Pressable
            key={item.kitId}
            onPress={() => setSelectedId(item.kitId)}
            style={[styles.thumb, product.kitId === item.kitId && styles.thumbActive]}
          >
            <View style={styles.thumbJersey}>
              <JerseyPreview product={item} number="10" tiny />
            </View>
            <Text style={[styles.thumbLabel, product.kitId === item.kitId && styles.thumbLabelActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.description}>{product.description || t('description')}</Text>

      <View style={styles.specs}>
        {specs.map(([label, value]) => (
          <View key={label} style={styles.specRow}>
            <Text style={styles.specLabel}>{label}</Text>
            <Text style={styles.specValue}>{value}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  segment: { alignSelf: 'center', marginBottom: spacing.lg },
  preview: {
    height: 300,
    borderRadius: radii.xl,
    backgroundColor: '#0C1130',
    borderWidth: 1,
    borderColor: '#1A2048',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  glow: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: '#182256',
    opacity: 0.75,
  },
  badge: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    color: colors.accent,
    backgroundColor: '#171E4B',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    overflow: 'hidden',
    zIndex: 2,
  },
  previewRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  thumb: {
    flex: 1,
    height: 96,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: '#1B2150',
    paddingTop: 6,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbActive: { borderColor: colors.accent, backgroundColor: '#0E1330' },
  thumbJersey: { width: '100%', height: 64, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumbLabel: { color: colors.muted, fontSize: 9, fontWeight: '700', marginTop: 4 },
  thumbLabelActive: { color: colors.accent },
  description: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  specs: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#1B2150',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#171C3F',
  },
  specLabel: { color: colors.muted, fontSize: 13 },
  specValue: { color: colors.text, fontSize: 13, fontWeight: '800' },
  footer: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footerLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  footerPrice: { color: colors.text, fontSize: 17, fontWeight: '900', marginTop: 3 },
});
