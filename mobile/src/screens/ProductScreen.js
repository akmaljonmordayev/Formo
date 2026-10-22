import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radii, spacing } from '../constants/theme';
import { Badge, Button, Card, Header, Screen, Segment, formatMoney } from '../components/ui/Common';
import ErrorView from '../components/ui/ErrorView';
import { JerseyPreview } from '../components/ui/JerseyPreview';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { visibleSizes } from '../features/config';
import { useClub } from '../features/products';

export default function ProductScreen({ clubId, kitId, rules, t, onBack, onCustomize }) {
  const [side, setSide] = useState('front');
  const [selectedId, setSelectedId] = useState(kitId || null);
  const { club, products, isLoading, error, refetch } = useClub(clubId);

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
          <Text style={styles.emptyText}>{t('noKits')}</Text>
        )}
      </Screen>
    );
  }

  const available = visibleSizes(product.sizes, rules).filter((s) => s.available).map((s) => s.size);
  const breakdown = product.priceBreakdown || {
    shirt: product.price || 0,
    shorts: 0,
    print: 0,
  };

  const specs = [
    [t('kitIncludes'), t('kitIncludesValue')],
    [t('shirtPrice'), formatMoney(breakdown.shirt)],
    [t('shortsPrice'), formatMoney(breakdown.shorts)],
    [t('printPrice'), formatMoney(breakdown.print)],
    [t('sizes'), available.length ? `${available[0]}–${available[available.length - 1]}` : '—'],
    [t('fabric'), '100% Sport Polyester (Dri-Fit)'],
  ];

  return (
    <Screen
      contentStyle={{ paddingBottom: 120 }}
      footer={
        <View style={styles.footer}>
          <View>
            <Text style={styles.footerLabel}>{t('total')}</Text>
            <Text style={styles.footerPrice}>{formatMoney(product.price)}</Text>
          </View>
          <Button
            variant="primary"
            size="regular"
            onPress={() => onCustomize(product)}
            icon={<MaterialCommunityIcons name="pencil-ruler" size={18} color={colors.primaryDark} />}
          >
            {t('customize')}
          </Button>
        </View>
      }
    >
      <Header
        title={club?.name || product.name}
        subtitle={club?.season || t('baseKit')}
        onBack={onBack}
      />

      {/* Front / Back Toggle */}
      <Segment
        style={styles.segment}
        options={[t('front'), t('rear')]}
        value={side === 'front' ? t('front') : t('rear')}
        onChange={(value) => setSide(value === t('front') ? 'front' : 'back')}
      />

      {/* Large Showcase Preview */}
      <View style={styles.previewBox}>
        <View style={styles.glow} />
        <View style={styles.badgeWrap}>
          <Badge label={product.badge || 'PRO KIT'} variant="teal" />
        </View>
        <JerseyPreview
          product={product}
          number="10"
          large
          side={side}
          name="FORMO"
        />
      </View>

      {/* Sibling Kits Selector (Home, Away, 3rd) */}
      <Text style={styles.sectionHeader}>{t('clubKitTitle')}</Text>
      <View style={styles.previewRow}>
        {products.map((item) => {
          const isSelected = product.kitId === item.kitId;
          return (
            <Pressable
              key={item.kitId}
              onPress={() => setSelectedId(item.kitId)}
              style={[styles.thumb, isSelected && styles.thumbActive]}
            >
              <View style={styles.thumbJersey}>
                <JerseyPreview product={item} number="10" tiny />
              </View>
              <Text style={[styles.thumbLabel, isSelected && styles.thumbLabelActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Available Sizes Strip */}
      <Text style={styles.sectionHeader}>{t('sizes').toUpperCase()}</Text>
      <View style={styles.sizesRow}>
        {visibleSizes(product.sizes, rules).map((sz) => (
          <View
            key={sz.size}
            style={[styles.sizeChip, !sz.available && styles.sizeChipDisabled]}
          >
            <Text style={[styles.sizeChipText, !sz.available && styles.sizeChipTextDisabled]}>
              {sz.size}
            </Text>
          </View>
        ))}
      </View>

      {/* Description */}
      <Text style={styles.sectionHeader}>{t('description')}</Text>
      <Text style={styles.description}>
        {product.description ||
          'Formo rasmiy sport formasi. Namlikni yutuvchi engil va bardoshli matodan tikilgan. Raqam va ismni o‘zingiz xohlagancha moslashtirishingiz mumkin.'}
      </Text>

      {/* Specs / Breakdown Card */}
      <View style={styles.specsCard}>
        {specs.map(([label, value], idx) => (
          <View
            key={label}
            style={[styles.specRow, idx === specs.length - 1 && styles.specRowLast]}
          >
            <Text style={styles.specLabel}>{label}</Text>
            <Text style={styles.specValue}>{value}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  segment: {
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  previewBox: {
    height: 310,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: spacing.lg,
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(242, 163, 58, 0.08)',
  },
  badgeWrap: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    zIndex: 2,
  },
  sectionHeader: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  previewRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  thumb: {
    flex: 1,
    height: 100,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbActive: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceRaised,
  },
  thumbJersey: {
    width: '100%',
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  thumbLabelActive: {
    color: colors.accent,
    fontWeight: '900',
  },
  sizesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.sm,
  },
  sizeChip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sizeChipDisabled: {
    opacity: 0.4,
  },
  sizeChipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  sizeChipTextDisabled: {
    color: colors.muted,
    textDecorationLine: 'line-through',
  },
  description: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  specsCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  specRowLast: {
    borderBottomWidth: 0,
  },
  specLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  specValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  footer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  footerPrice: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 40,
  },
});
