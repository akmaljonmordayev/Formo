import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radii, spacing, TAB_BAR_HEIGHT } from '../constants/theme';
import { Button, Card, Header, Overline, Screen, Segment, formatMoney } from '../components/ui/Common';
import { JerseyPreview } from '../components/ui/JerseyPreview';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { visibleSizes } from '../features/config';
import { usePopularProducts } from '../features/products';
import { errorText } from '../utils/errors';

// Backend savat qatori faqat shularni saqlaydi: forma (kitId), futbolka o'lchami,
// ism/raqam bosmasi, shortik (+ o'lchami, raqami). Rang/logo/yamoq kabi erkin
// dizayn sozlamalari buyurtmaga yozilmaydi — shuning uchun studiyada yo'q.
const pickSize = (sizes, preferred) => {
  const open = sizes.filter((s) => s.available).map((s) => s.size);
  return open.includes(preferred) ? preferred : open[0] || null;
};

export default function StudioScreen({ t, kit, cart, rules, onOpenCart, onBack, onPickKit }) {
  // Forma tanlanmagan bo'lsa (pastki tabdan kirilganda) — eng mashhur klubning formasi
  const { products: fallback, isLoading: fallbackLoading } = usePopularProducts(1);
  const product = kit || fallback[0] || null;

  const [side, setSide] = useState('back');
  const [tab, setTab] = useState('size');
  const [name, setName] = useState('');
  const [number, setNumber] = useState('10');
  const [shirtSize, setShirtSize] = useState(null);
  const [withShorts, setWithShorts] = useState(true);
  const [shortsSize, setShortsSize] = useState(null);
  const [numberOnShorts, setNumberOnShorts] = useState(false);
  const [adding, setAdding] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Forma almashganda mavjud o'lchamni qayta tanlaymiz
  // (bolalar o'lchamlari Superadmin sozlamasida o'chirilishi mumkin)
  const sizes = product ? visibleSizes(product.sizes, rules) : [];
  useEffect(() => {
    if (!product) return;
    setShirtSize((current) => pickSize(sizes, current || 'L'));
    setShortsSize((current) => pickSize(sizes, current || 'L'));
  }, [product?.kitId, rules.allowKidsSizes]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!product) {
    return (
      <Screen>
        <Header logo onBack={onBack} title={t('designStudio')} />
        {fallbackLoading ? <LoadingSpinner /> : <Text style={styles.rowSub}>{t('noKits')}</Text>}
      </Screen>
    );
  }

  const printName = name.trim();
  const hasPrint = Boolean(printName || number);
  const prices = product.priceBreakdown;
  const price = prices.shirt + (withShorts ? prices.shorts : 0) + (hasPrint ? prices.print : 0);

  const tabs = [
    ['size', t('tabSize')],
    ['print', t('tabPrint')],
    ['shorts', t('tabShorts')],
  ];

  const sizeRow = (selected, onPick) => (
    <View style={styles.sizes}>
      {sizes.map(({ size, available }) => (
        <Pressable
          key={size}
          disabled={!available}
          onPress={() => onPick(size)}
          style={[styles.sizeChip, selected === size && styles.sizeChipActive, !available && styles.sizeChipOff]}
        >
          <Text style={[styles.sizeText, selected === size && styles.sizeTextActive]}>{size}</Text>
        </Pressable>
      ))}
    </View>
  );

  const numberValue = number === '' ? null : Number(number);
  const numberInvalid = numberValue != null && (numberValue < rules.printNumberMin || numberValue > rules.printNumberMax);
  const paused = !rules.acceptOrders;

  const addToCart = async () => {
    if (!shirtSize) return;
    if (numberInvalid) {
      setFeedback({ ok: false, text: `${t('numberRange')}: ${rules.printNumberMin}–${rules.printNumberMax}` });
      return;
    }
    setAdding(true);
    setFeedback(null);
    try {
      await cart.addItem({
        kitId: product.kitId,
        shirtSize,
        printName: printName || null,
        printNumber: number || null,
        withShorts,
        ...(withShorts ? { shortsSize: shortsSize || shirtSize, numberOnShorts } : {}),
      });
      setFeedback({ ok: true, text: t('added') });
      setTimeout(() => setFeedback(null), 2000);
    } catch (err) {
      setFeedback({ ok: false, text: errorText(err, t) });
    } finally {
      setAdding(false);
    }
  };

  const renderPanel = () => {
    if (tab === 'size') {
      return (
        <View>
          <Overline>{t('shirtSize')}</Overline>
          {sizeRow(shirtSize, setShirtSize)}
        </View>
      );
    }
    if (tab === 'print') {
      return (
        <View>
          <Overline>{t('nameNumber')}</Overline>
          <View style={styles.inputs}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t('namePlaceholder')}
              placeholderTextColor={colors.muted}
              style={[styles.textInput, { flex: 1 }]}
              autoCapitalize="characters"
              maxLength={rules.printNameMaxLength}
            />
            <TextInput
              value={number}
              onChangeText={(value) => setNumber(value.replace(/\D/g, ''))}
              placeholder="10"
              placeholderTextColor={colors.muted}
              style={[styles.textInput, styles.number]}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
          <Text style={styles.hint}>{t('printHint')} · +{formatMoney(prices.print)}</Text>
          {numberInvalid ? (
            <Text style={[styles.hint, styles.errorFeedback]}>
              {t('numberRange')}: {rules.printNumberMin}–{rules.printNumberMax}
            </Text>
          ) : null}
        </View>
      );
    }
    return (
      <View>
        <View style={styles.panelRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{t('addShorts')}</Text>
            <Text style={styles.rowSub}>{t('addShortsSub')} · +{formatMoney(prices.shorts)}</Text>
          </View>
          <Switch
            value={withShorts}
            onValueChange={setWithShorts}
            trackColor={{ false: '#2A3160', true: colors.teal }}
            thumbColor="#FFFFFF"
          />
        </View>
        {withShorts ? (
          <View>
            <Overline style={styles.overlineGap}>{t('shortsSize')}</Overline>
            {sizeRow(shortsSize, setShortsSize)}
            <View style={[styles.panelRow, styles.overlineGap]}>
              <Text style={[styles.rowTitle, { flex: 1 }]}>{t('numberOnShorts')}</Text>
              <Switch
                value={numberOnShorts}
                onValueChange={setNumberOnShorts}
                trackColor={{ false: '#2A3160', true: colors.teal }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <Screen
      contentStyle={{ paddingBottom: 170 }}
      footerStyle={{ bottom: TAB_BAR_HEIGHT }}
      footer={
        <View style={styles.footerBar}>
          <View>
            <Text style={styles.footerLabel}>{t('total')}</Text>
            <Text style={styles.footerPrice}>{formatMoney(price)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4, flexShrink: 1 }}>
            {paused ? (
              <Text style={[styles.addedFeedback, styles.errorFeedback]} numberOfLines={2}>
                {rules.pausedMessage || t('ordersPaused')}
              </Text>
            ) : feedback ? (
              <Text style={[styles.addedFeedback, !feedback.ok && styles.errorFeedback]} numberOfLines={2}>
                {feedback.text}
              </Text>
            ) : null}
            <Button disabled={paused || adding || !shirtSize} onPress={addToCart}>
              {adding ? t('adding') : t('addToCart')}
            </Button>
          </View>
        </View>
      }
    >
      <Header
        logo
        onBack={onBack}
        title={t('designStudio')}
        right={
          <Segment
            options={[t('front'), t('rear')]}
            value={side === 'front' ? t('front') : t('rear')}
            onChange={(value) => setSide(value === t('front') ? 'front' : 'back')}
          />
        }
      />

      <View style={styles.preview}>
        <View style={styles.glow} />
        <JerseyPreview
          product={product}
          number={number || ''}
          large
          side={side}
          name={printName || ' '}
        />
      </View>

      <Pressable style={styles.kitRow} onPress={onPickKit}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle} numberOfLines={1}>{product.name}</Text>
          <Text style={styles.rowSub}>{t('chooseOtherKit')}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.accent} />
      </Pressable>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
        {tabs.map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setTab(key)}
            style={[styles.tab, tab === key && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.panel}>{renderPanel()}</View>

      <Card style={styles.ar}>
        <MaterialCommunityIcons name="cube-scan" size={24} color={colors.teal} />
        <View style={{ flex: 1 }}>
          <Text style={styles.arTitle}>{t('arTitle')}</Text>
          <Text style={styles.arText}>{t('arSub')}</Text>
        </View>
      </Card>

      {cart.count > 0 ? (
        <Pressable onPress={onOpenCart} style={styles.cartLink}>
          <Text style={styles.cartLinkText}>{t('openCart')} · {cart.count} {t('items')}</Text>
          <MaterialCommunityIcons name="chevron-right" size={16} color={colors.accent} />
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: {
    height: 280,
    borderRadius: radii.xl,
    backgroundColor: '#0C1130',
    borderWidth: 1,
    borderColor: '#1A2048',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  glow: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: '#182256', opacity: 0.7 },
  tabRow: { gap: spacing.sm, paddingRight: spacing.sm },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.round,
    backgroundColor: colors.chip,
    borderWidth: 1,
    borderColor: '#1D2350',
  },
  tabActive: { backgroundColor: '#0E1330', borderColor: colors.accent },
  tabText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: colors.accent, fontWeight: '800' },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#1B2150',
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  inputs: { flexDirection: 'row', gap: spacing.sm },
  textInput: {
    height: 48,
    borderRadius: radii.md,
    backgroundColor: '#0E1330',
    borderWidth: 1,
    borderColor: '#232A57',
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    fontWeight: '700',
  },
  number: { width: 84, textAlign: 'center' },
  panelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
  rowSub: { color: colors.muted, fontSize: 11, marginTop: 3 },
  overlineGap: { marginTop: spacing.lg },
  ar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    borderColor: 'rgba(63, 217, 183, 0.35)',
    backgroundColor: 'rgba(63, 217, 183, 0.06)',
  },
  arTitle: { color: colors.text, fontWeight: '800', fontSize: 13 },
  arText: { color: colors.muted, fontSize: 11, marginTop: 3 },
  cartLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: spacing.lg },
  cartLinkText: { color: colors.accent, fontSize: 12, fontWeight: '800' },
  footerBar: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footerLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  footerPrice: { color: colors.text, fontSize: 17, fontWeight: '900', marginTop: 3 },
  addedFeedback: { color: colors.teal, fontSize: 11, fontWeight: '700', textAlign: 'right' },
  errorFeedback: { color: '#E8543F' },
  hint: { color: colors.muted, fontSize: 11, marginTop: spacing.sm },
  sizes: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sizeChip: {
    minWidth: 48,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: radii.sm,
    backgroundColor: '#0E1330',
    borderWidth: 1.5,
    borderColor: '#1D2350',
    alignItems: 'center',
  },
  sizeChipActive: { borderColor: colors.accent },
  sizeChipOff: { opacity: 0.35 },
  sizeText: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  sizeTextActive: { color: colors.accent },
  kitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#1B2150',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
});
