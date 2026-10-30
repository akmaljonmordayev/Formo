import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radii, spacing } from '../constants/theme';
import { Badge, Button, Header, Screen, Segment, formatMoney } from '../components/ui/Common';
import ErrorView from '../components/ui/ErrorView';
import Kit360Thumb from '../components/ui/Kit360Thumb';
import Kit360Viewer from '../components/ui/Kit360Viewer';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { visibleSizes } from '../features/config';
import { kit360Team } from '../features/kit360';
import { useClub } from '../features/products';

export default function ProductScreen({ clubId, kitId, rules, t, onBack, onCustomize }) {
  const [side, setSide] = useState('front');
  const { width: screenW, height: screenH } = useWindowDimensions();
  const previewWidth = screenW - spacing.lg * 2;
  const previewHeight = Math.max(320, Math.min(480, Math.round(screenH * 0.5)));
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

  // Faqat serverdan kelgan ma'lumot (Kit: colorsLabel, narx tarkibi, o'lchamlar)
  const specs = [
    [t('kitIncludes'), t('kitIncludesValue')],
    product.colorsLabel ? [t('kitColors'), product.colorsLabel] : null,
    [t('shirtPrice'), formatMoney(breakdown.shirt)],
    [t('shortsPrice'), formatMoney(breakdown.shorts)],
    [t('printPrice'), formatMoney(breakdown.print)],
    [t('sizes'), available.length ? `${available[0]}–${available[available.length - 1]}` : '—'],
  ].filter(Boolean);
  const team = kit360Team(product);

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
        cart
        title={club?.name || product.name}
        subtitle={club?.season || t('baseKit')}
        onBack={onBack}
      />

      {/* Forma 360° (admin paneldagi suratlar): barmoq bilan aylantiriladi, old/orqa */}
      <View style={styles.previewBox}>
        {/* Surati yo'q klub (admin bog'lamagan, eski havola) — faqat joy egasi; viewer boshqa jamoani ko'rsatmasin */}
        {team ? (
          <Kit360Viewer
            t={t}
            height={previewHeight}
            team={team}
            view={side}
            onViewChange={setSide}
            fallback={<Kit360Thumb team={team} width={previewWidth} height={previewHeight} zoom={1.2} />}
          />
        ) : (
          <Kit360Thumb team={null} width={previewWidth} height={previewHeight} />
        )}
        {product.badge ? (
          <View style={styles.badgeWrap}>
            <Badge label={product.badge} variant="teal" />
          </View>
        ) : null}
        <View style={styles.previewControls}>
          <Text style={styles.rotateHint}>{t('rotateHint')}</Text>
          <Segment
            style={styles.segment}
            options={[t('front'), t('rear')]}
            value={side === 'front' ? t('front') : t('rear')}
            onChange={(value) => setSide(value === t('front') ? 'front' : 'back')}
          />
        </View>
      </View>

      {/* Klubning formalari (Uy / Mehmon / Uchinchi) — bittadan ko'p bo'lsa */}
      {products.length > 1 ? (
        <>
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
                  <View style={[styles.kitDot, { backgroundColor: item.color || '#1A3582', borderColor: item.accent || '#FFFFFF' }]} />
                  <Text style={[styles.thumbLabel, isSelected && styles.thumbLabelActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

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

      {/* Tavsif — faqat serverda bo'lsa (Kit.description) */}
      {product.description ? (
        <>
          <Text style={styles.sectionHeader}>{t('aboutKit')}</Text>
          <Text style={styles.description}>{product.description}</Text>
        </>
      ) : null}

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
    marginTop: 4,
  },
  rotateHint: { color: '#3a3b40', fontSize: 10, fontWeight: '700' },
  // 360° sahna butun qutini egallaydi; "Old/Orqa" — ustida, pastda
  previewBox: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    position: 'relative',
  },
  previewControls: { position: 'absolute', bottom: 12, alignSelf: 'center', alignItems: 'center' },
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
    height: 48,
    flexDirection: 'row',
    gap: 8,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbActive: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceRaised,
  },
  kitDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  thumbLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
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
