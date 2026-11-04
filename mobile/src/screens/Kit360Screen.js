import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radii, spacing, TAB_BAR_HEIGHT } from '../constants/theme';
import { Button, Header, Screen, Segment, formatMoney } from '../components/ui/Common';
import Kit360Viewer from '../components/ui/Kit360Viewer';
import { visibleSizes } from '../features/config';
import { KIT360_TEAMS, findKit360Team, kit360Team } from '../features/kit360';
import { useClub, useClubs } from '../features/products';
import { errorText } from '../utils/errors';

const SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];
const STEPS = [1, 2, 3];

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

/**
 * Forma 360°: jamoa tanlanadi, so'ng bosqichma-bosqich:
 *   1) o'lcham (majburiy) → 2) ism va raqam (ixtiyoriy) → 3) shortikka raqam kerakmi → savatga.
 * Forma komplekt (futbolka + shortik): shortik o'lchami futbolka bilan bir xil, alohida so'ralmaydi.
 *
 * Props: t, initialTeam, rules, cart, onBack, onAdded() — savatga qo'shilgach (savatni ochish)
 */
export default function Kit360Screen({ t, initialTeam = null, rules = {}, cart, onBack, onAdded }) {
  const [selectedId, setSelectedId] = useState(initialTeam || 'rm');
  const [side, setSide] = useState('back');
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [shirtSize, setShirtSize] = useState(null);
  const [shortsNumber, setShortsNumber] = useState('');
  const [adding, setAdding] = useState(false);
  const addingRef = useRef(false);
  const [feedback, setFeedback] = useState(null);

  // Backend klublarini yuklaymiz (aniq kitId va narxlar uchun)
  const { clubs, isLoading: clubsLoading, refetch: refetchClubs } = useClubs();

  useEffect(() => {
    if (initialTeam && KIT360_TEAMS.some((tm) => tm.id === initialTeam)) {
      setSelectedId(initialTeam);
    }
  }, [initialTeam]);

  const team = useMemo(() => findKit360Team(selectedId), [selectedId]);

  // Boshqa jamoa tanlansa — bosqichlar boshidan
  useEffect(() => {
    setStep(1);
    setFeedback(null);
  }, [team.id]);

  // Backend'dagi mos klub va uning formasi
  const matchedClub = useMemo(() => {
    if (!clubs || !clubs.length) return null;
    return clubs.find((c) => c.kit360Id === team.id) || clubs.find((c) => kit360Team(c) === team.id) || null;
  }, [clubs, team.id]);

  // Klublar ro'yxatida formalar yo'q (faqat kitsCount) — haqiqiy kit id, narx va o'lchamlar klub sahifasidan
  const { products: clubKits, isLoading: kitLoading } = useClub(matchedClub?.id);
  const matchedKit = clubKits[0] || null;
  const kitId = matchedKit?.kitId ?? null;
  const kitPending = clubsLoading || (matchedClub && kitLoading);

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
    if (shirtSize && !availableSizes.includes(shirtSize)) setShirtSize(null);
  }, [availableSizes, shirtSize]);

  const printName = cleanPrintName(name, rules.printNameMaxLength || 30);
  const printNum = cleanPrintNumber(number, rules.printNumberMax || 99);
  const hasPrint = Boolean(printName.trim() || printNum);
  // Shortik raqami: yozilmasa — shortik raqamsiz
  const shortsNum = cleanPrintNumber(shortsNumber, rules.printNumberMax || 99);
  const numberOnShorts = Boolean(shortsNum);

  // Komplekt: futbolka + shortik doim; bosma faqat ism yoki raqam yozilsa
  const totalPrice = prices.shirt + prices.shorts + (hasPrint ? prices.print : 0);
  const paused = Boolean(rules && rules.acceptOrders === false);

  const goStep = (next) => {
    setFeedback(null);
    setStep(next);
    setSide(next === 3 ? 'front' : 'back');
  };

  // 3-bosqich: o'z raqam paneli (tizim klaviaturasi ekranni yopmasin)
  const pressDigit = (d) => setShortsNumber((v) => cleanPrintNumber(`${v}${d}`.slice(0, 2), rules.printNumberMax || 99));
  const eraseDigit = () => setShortsNumber((v) => v.slice(0, -1));

  const onNext = () => {
    if (step === 1 && !shirtSize) {
      setFeedback({ ok: false, text: t('kitStepSize') });
      return;
    }
    goStep(step + 1);
  };

  const addToCart = async () => {
    // Tez ikki marta bosish — server bir xil qatorlarni birlashtirib miqdorni 2 qilib qo'yardi
    if (!cart || addingRef.current) return;
    if (!shirtSize) {
      goStep(1);
      setFeedback({ ok: false, text: t('kitStepSize') });
      return;
    }
    if (!kitId) {
      // Ro'yxat eskirgan bo'lishi mumkin — keyingi bosishda yangisi bilan
      refetchClubs();
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
        withShorts: true,
        shortsSize: shirtSize,
        numberOnShorts,
        shortsNumber: numberOnShorts ? shortsNum : null,
      });
      setFeedback({ ok: true, text: t('added') });
      setStep(1);
      setShortsNumber('');
      if (onAdded) onAdded();
    } catch (err) {
      setFeedback({ ok: false, text: errorText(err, t) });
    } finally {
      addingRef.current = false;
      setAdding(false);
    }
  };

  const stepTitles = { 1: t('kitStepSize'), 2: t('kitStepPrint'), 3: t('shortsNumberAsk') };
  const canOpen = (s) => s <= step || Boolean(shirtSize);

  const renderSizes = (value, onChange) => (
    <View style={styles.sizesRow}>
      {availableSizes.map((size) => (
        <Pressable
          key={size}
          onPress={() => {
            onChange(size);
            setFeedback(null);
          }}
          style={[styles.sizeChip, value === size && styles.sizeChipActive]}
          accessibilityRole="button"
          accessibilityState={{ selected: value === size }}
        >
          <Text style={[styles.sizeText, value === size && styles.sizeTextActive]}>{size}</Text>
        </Pressable>
      ))}
    </View>
  );

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
            <View style={styles.footerAction}>
              {paused ? (
                <Text style={[styles.addedFeedback, styles.errorFeedback]} numberOfLines={2}>
                  {rules.pausedMessage || t('ordersPaused')}
                </Text>
              ) : feedback ? (
                <Text style={[styles.addedFeedback, !feedback.ok && styles.errorFeedback]} numberOfLines={2}>
                  {feedback.text}
                </Text>
              ) : null}
              {step < 3 ? (
                <Button onPress={onNext} disabled={step === 1 && !shirtSize} style={styles.footerButton}>
                  {`${t('nextStep')} →`}
                </Button>
              ) : (
                <Button
                  disabled={paused || adding || (kitPending && !kitId)}
                  onPress={addToCart}
                  style={styles.footerButton}
                >
                  {adding ? t('adding') : t('addToCart')}
                </Button>
              )}
            </View>
          </View>
        }
      >
        <Header cart title={t('forma360')} subtitle={t('forma360Sub')} onBack={onBack} />

        {/* Jamoani tanlash lentasi */}
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

        {/* Bosqichlar: chapda "orqaga" (oldingi bosqich), o'ngda 1 → 2 → 3 */}
        <View style={styles.tabsRow}>
          <Pressable
            onPress={() => step > 1 && goStep(step - 1)}
            disabled={step === 1}
            hitSlop={8}
            style={[styles.stepBack, step === 1 && styles.stepBackHidden]}
            accessibilityRole="button"
            accessibilityLabel={t('back')}
          >
            <MaterialCommunityIcons name="chevron-left" size={24} color={colors.accent} />
          </Pressable>
          {STEPS.map((s) => {
            const isActive = step === s;
            const isDone = s < step;
            return (
              <Pressable
                key={s}
                onPress={() => (canOpen(s) ? goStep(s) : onNext())}
                style={[styles.tabButton, isDone && styles.tabButtonDone, isActive && styles.tabButtonActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
              >
                {isDone ? <MaterialCommunityIcons name="check" size={14} color={colors.accent} /> : null}
                <Text
                  style={[styles.tabText, isDone && styles.tabTextDone, isActive && styles.tabTextActive]}
                  numberOfLines={1}
                >
                  {t('kitStep').replace('{n}', String(s))}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Joriy bosqich */}
        <View style={styles.panelBox}>
          <Text style={styles.stepTitle}>{stepTitles[step]}</Text>

          {step === 1 ? (
            renderSizes(shirtSize, setShirtSize)
          ) : step === 2 ? (
            <View>
              <Text style={styles.optionSub}>{t('kitStepPrintSub')}</Text>
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
              <Text style={styles.optionSub}>{t('kitStepShortsSub')}</Text>
              <View style={styles.shortsRow}>
                {/* Fokusda turadi, lekin tizim klaviaturasi chiqmaydi — raqam pastdagi paneldan */}
                <TextInput
                  value={shortsNumber}
                  autoFocus
                  showSoftInputOnFocus={false}
                  inputMode="none"
                  caretHidden
                  placeholder="—"
                  placeholderTextColor={colors.dim}
                  maxLength={2}
                  style={[styles.textInput, styles.shortsInput]}
                  accessibilityLabel={t('shortsNumberAsk')}
                />
                <Text style={[styles.optionSub, styles.shortsHint]}>
                  {numberOnShorts ? t('free') : t('shortsNoNumber')}
                </Text>
              </View>
              <View style={styles.numpad}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'erase'].map((k) => (
                  <Pressable
                    key={k}
                    onPress={() => (k === 'erase' ? eraseDigit() : k === 'clear' ? setShortsNumber('') : pressDigit(k))}
                    style={({ pressed }) => [styles.numKey, pressed && styles.numKeyPressed]}
                    accessibilityRole="button"
                    accessibilityLabel={k === 'erase' ? '⌫' : k === 'clear' ? t('clear') : k}
                  >
                    {k === 'erase' ? (
                      <MaterialCommunityIcons name="backspace-outline" size={20} color={colors.text} />
                    ) : k === 'clear' ? (
                      <Text style={styles.numKeySmall}>{t('clear')}</Text>
                    ) : (
                      <Text style={styles.numKeyText}>{k}</Text>
                    )}
                  </Pressable>
                ))}
              </View>
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
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  stepBack: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepBackHidden: { opacity: 0.3 },
  shortsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  shortsInput: {
    width: 88,
    height: 56,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '900',
    borderColor: colors.accent,
  },
  shortsHint: { flex: 1 },
  numpad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.sm,
    marginTop: spacing.md,
  },
  numKey: {
    width: '31.5%',
    height: 46,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numKeyPressed: { backgroundColor: colors.surfaceSubtle, borderColor: colors.accent },
  numKeyText: { color: colors.text, fontSize: 20, fontWeight: '800' },
  numKeySmall: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  footerAction: { flex: 1, alignItems: 'stretch', gap: 4, marginLeft: spacing.md },
  footerButton: { alignSelf: 'stretch' },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radii.round,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabButtonDone: {
    borderColor: colors.accent,
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
  tabTextDone: {
    color: colors.accent,
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
  stepTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: spacing.sm,
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
  choiceChip: {
    minWidth: 88,
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
    marginTop: spacing.sm,
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
  footerButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
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
