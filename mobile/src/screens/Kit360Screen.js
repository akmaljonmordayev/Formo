import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radii, spacing, TAB_BAR_HEIGHT } from '../constants/theme';
import { Button, Header, Overline, Screen, Segment, formatMoney } from '../components/ui/Common';
import Kit360Viewer from '../components/ui/Kit360Viewer';
import { visibleSizes } from '../features/config';
import { KIT360_TEAMS, findKit360Team, kit360Team } from '../features/kit360';
import { useClub, useClubs } from '../features/products';
import { errorText } from '../utils/errors';

const SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];

const cleanPrintName = (s, maxLen = 30) =>
  String(s ?? '')
    .replace(/[`'‘’ʻʼ´]/g, "'")
    .toUpperCase()
    .replace(/[^A-ZА-ЯЁЎҚҒҲ' .-]/g, '')
    .replace(/ {2,}/g, ' ')
    .replace(/^ /, '')
    .slice(0, maxLen);

const cleanPrintNumber = (s, max = 99) => {
  const digits = String(s ?? '').replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  const val = Number(digits);
  return val > max ? String(max) : digits;
};

export default function Kit360Screen({ t, initialTeam = null, rules = {}, cart, onBack }) {
  const [selectedId, setSelectedId] = useState(initialTeam || 'rm');
  const [side, setSide] = useState('back');
  const [tab, setTab] = useState('size'); // 'size' | 'print' | 'shorts'
  const [name, setName] = useState('');
  const [number, setNumber] = useState('10');
  const [shirtSize, setShirtSize] = useState('L');
  const [withShorts, setWithShorts] = useState(true);
  const [shortsSize, setShortsSize] = useState('L');
  const [numberOnShorts, setNumberOnShorts] = useState(false);
  const [shortsNumber, setShortsNumber] = useState('');
  const [adding, setAdding] = useState(false);
  const addingRef = useRef(false);
  const [feedback, setFeedback] = useState(null);

  // Backend klublarini yuklaymiz (aniq kitId va narxlar uchun)
  const { clubs } = useClubs();

  useEffect(() => {
    if (initialTeam && KIT360_TEAMS.some((t) => t.id === initialTeam)) {
      setSelectedId(initialTeam);
    }
  }, [initialTeam]);

  const team = useMemo(() => findKit360Team(selectedId), [selectedId]);

  // Backend'dagi mos klub va uning formasi
  const matchedClub = useMemo(() => {
    if (!clubs || !clubs.length) return null;
    return clubs.find((c) => kit360Team(c) === team.id || c.kit360Id === team.id) || null;
  }, [clubs, team.id]);

  // Klublar ro'yxatida formalar yo'q (faqat kitsCount) — haqiqiy kit id, narx va o'lchamlar klub sahifasidan
  const { products: clubKits, isLoading: kitLoading } = useClub(matchedClub?.id);
  const matchedKit = clubKits[0] || null;
  const kitId = matchedKit?.kitId ?? null;

  const prices = useMemo(() => {
    const pb = matchedKit?.priceBreakdown || {};
    return { shirt: pb.shirt ?? 99000, shorts: pb.shorts ?? 60000, print: pb.print ?? 30000 };
  }, [matchedKit]);

  const availableSizes = useMemo(() => {
    const raw = matchedKit?.sizes || SIZES;
    const sizeObjects = raw.map((s) => (typeof s === 'string' ? { size: s, available: true } : { size: s.size, available: s.available !== false }));
    return visibleSizes(sizeObjects, rules).filter((s) => s.available).map((s) => s.size);
  }, [matchedKit, rules]);

  useEffect(() => {
    if (availableSizes.length && !availableSizes.includes(shirtSize)) {
      setShirtSize(availableSizes[0]);
    }
    if (availableSizes.length && !availableSizes.includes(shortsSize)) {
      setShortsSize(availableSizes[0]);
    }
  }, [availableSizes, shirtSize, shortsSize]);

  const printName = cleanPrintName(name, rules.printNameMaxLength || 30);
  const printNum = cleanPrintNumber(number, rules.printNumberMax || 99);
  const hasPrint = Boolean(printName.trim() || printNum);

  const totalPrice = prices.shirt + (withShorts ? prices.shorts : 0) + (hasPrint ? prices.print : 0);
  const paused = Boolean(rules && rules.acceptOrders === false);

  const addToCart = async () => {
    // Tez ikki marta bosish — server bir xil qatorlarni birlashtirib miqdorni 2 qilib qo'yardi
    if (!shirtSize || !cart || addingRef.current) return;
    if (!kitId) {
      setFeedback({ ok: false, text: t('noKits') });
      return;
    }
    addingRef.current = true;
    setAdding(true);
    setFeedback(null);
    try {
      await cart.addItem({
        kitId,
        shirtSize,
        printName: printName.trim() || null,
        printNumber: printNum || null,
        withShorts,
        shortsSize: withShorts ? shortsSize || shirtSize : undefined,
        numberOnShorts: withShorts ? numberOnShorts : false,
        shortsNumber: withShorts && numberOnShorts ? (cleanPrintNumber(shortsNumber, rules.printNumberMax || 99) || printNum || null) : null,
      });
      setFeedback({ ok: true, text: t('added') });
      setTimeout(() => setFeedback(null), 2500);
    } catch (err) {
      setFeedback({ ok: false, text: errorText(err, t) });
    } finally {
      addingRef.current = false;
      setAdding(false);
    }
  };

  const tabs = [
    { key: 'size', label: t('tabSize') },
    { key: 'print', label: t('tabPrint') },
    { key: 'shorts', label: t('tabShorts') },
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardWrap}
    >
      <Screen
        contentStyle={styles.screenContent}
        footerStyle={{ bottom: TAB_BAR_HEIGHT }}
        footer={
          <View style={styles.footerBar}>
            <View>
              <Text style={styles.footerLabel}>{t('total')}</Text>
              <Text style={styles.footerPrice}>{formatMoney(totalPrice)}</Text>
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
              <Button disabled={paused || adding || !shirtSize || (kitLoading && !kitId)} onPress={addToCart}>
                {adding ? t('adding') : t('addToCart')}
              </Button>
            </View>
          </View>
        }
      >
        <Header cart title={t('forma360')} subtitle={t('forma360Sub')} onBack={onBack} />

        {/* Jamoalarni tanlash lentasi */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.teamRail}
        >
          {KIT360_TEAMS.map((item) => {
            const isSelected = item.id === team.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setSelectedId(item.id)}
                style={[styles.teamChip, isSelected && styles.teamChipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <View style={[styles.teamDot, { backgroundColor: item.color, borderColor: item.accent }]} />
                <Text style={[styles.teamChipText, isSelected && styles.teamChipTextActive]} numberOfLines={1}>
                  {item.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* 360° Foto Ko'rish qutisi */}
        <View style={styles.previewBox}>
          <View style={styles.glow} />
          <Kit360Viewer
            t={t}
            team={team.id}
            name={printName}
            number={printNum}
            view={side}
            onViewChange={setSide}
            height={350}
          />
          {/* Old / Orqa tomon tugmasi */}
          <View style={styles.previewSide}>
            <Segment
              options={[t('front'), t('rear')]}
              value={side === 'front' ? t('front') : side === 'back' ? t('rear') : null}
              onChange={(value) => setSide(value === t('front') ? 'front' : 'back')}
            />
          </View>
        </View>

        {/* Tanlov bo'limlari (Tabs) */}
        <View style={styles.tabsRow}>
          {tabs.map((tb) => {
            const isActive = tab === tb.key;
            return (
              <Pressable
                key={tb.key}
                onPress={() => setTab(tb.key)}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tb.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Tanlov panellari */}
        <View style={styles.panelBox}>
          {tab === 'size' ? (
            <View>
              <Overline>{t('shirtSize')}</Overline>
              <View style={styles.sizesRow}>
                {availableSizes.map((size) => (
                  <Pressable
                    key={size}
                    onPress={() => setShirtSize(size)}
                    style={[styles.sizeChip, shirtSize === size && styles.sizeChipActive]}
                  >
                    <Text style={[styles.sizeText, shirtSize === size && styles.sizeTextActive]}>
                      {size}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : tab === 'print' ? (
            <View>
              <Overline>{t('nameNumber')}</Overline>
              <View style={styles.inputsRow}>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder={t('namePlaceholder')}
                  placeholderTextColor={colors.dim}
                  autoCapitalize="characters"
                  maxLength={rules.printNameMaxLength || 30}
                  onFocus={() => setSide('back')}
                  style={[styles.textInput, { flex: 1 }]}
                />
                <TextInput
                  value={number}
                  onChangeText={setNumber}
                  placeholder="10"
                  placeholderTextColor={colors.dim}
                  keyboardType="number-pad"
                  maxLength={2}
                  onFocus={() => setSide('back')}
                  style={[styles.textInput, styles.numberInput]}
                />
              </View>
              <Text style={styles.hint}>
                {t('printHint')} · +{formatMoney(prices.print)}
              </Text>
            </View>
          ) : (
            <View>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.optionTitle}>{t('addShorts')}</Text>
                  <Text style={styles.optionSub}>+{formatMoney(prices.shorts)}</Text>
                </View>
                <Switch
                  value={withShorts}
                  onValueChange={setWithShorts}
                  trackColor={{ false: colors.surfaceRaised, true: colors.accent }}
                  thumbColor="#ffffff"
                />
              </View>

              {withShorts ? (
                <>
                  <Overline style={{ marginTop: spacing.md }}>{t('shortsSize')}</Overline>
                  <View style={styles.sizesRow}>
                    {availableSizes.map((size) => (
                      <Pressable
                        key={size}
                        onPress={() => setShortsSize(size)}
                        style={[styles.sizeChip, shortsSize === size && styles.sizeChipActive]}
                      >
                        <Text style={[styles.sizeText, shortsSize === size && styles.sizeTextActive]}>
                          {size}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <View style={[styles.rowBetween, { marginTop: spacing.md }]}>
                    <View>
                      <Text style={styles.optionTitle}>{t('numberOnShorts')}</Text>
                      <Text style={styles.optionSub}>{t('free')}</Text>
                    </View>
                    <Switch
                      value={numberOnShorts}
                      onValueChange={setNumberOnShorts}
                      trackColor={{ false: colors.surfaceRaised, true: colors.accent }}
                      thumbColor="#ffffff"
                    />
                  </View>

                  {numberOnShorts ? (
                    <View style={{ marginTop: spacing.sm }}>
                      <TextInput
                        value={shortsNumber}
                        onChangeText={setShortsNumber}
                        placeholder={printNum || '10'}
                        placeholderTextColor={colors.dim}
                        keyboardType="number-pad"
                        maxLength={2}
                        onFocus={() => setSide('front')}
                        style={[styles.textInput, styles.numberInput, { alignSelf: 'flex-start' }]}
                      />
                    </View>
                  ) : null}
                </>
              ) : null}
            </View>
          )}
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardWrap: { flex: 1, backgroundColor: colors.background },
  screenContent: { paddingBottom: 170 },
  teamRail: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  teamChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.round,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  teamChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceSubtle,
  },
  teamDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
  teamChipText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  teamChipTextActive: {
    color: colors.accent,
    fontWeight: '800',
  },
  previewBox: {
    marginHorizontal: spacing.lg,
    height: 350,
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  glow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(235, 185, 78, 0.08)',
  },
  previewSide: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radii.round,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  tabText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  tabTextActive: {
    color: colors.primaryDark,
    fontWeight: '900',
  },
  panelBox: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sizesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  sizeChip: {
    minWidth: 48,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  sizeChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceSubtle,
  },
  sizeText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  sizeTextActive: {
    color: colors.accent,
  },
  inputsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  textInput: {
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    fontWeight: '700',
  },
  numberInput: {
    width: 80,
    textAlign: 'center',
  },
  hint: {
    color: colors.muted,
    fontSize: 11,
    marginTop: spacing.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  optionSub: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  footerBar: {
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
  addedFeedback: {
    color: colors.tealLight,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
  },
  errorFeedback: {
    color: colors.danger,
  },
});
