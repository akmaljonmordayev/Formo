import React, { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radii, spacing, TAB_BAR_HEIGHT } from '../constants/theme';
import { Button, Header, Screen, Segment, formatMoney } from '../components/ui/Common';
import AddedToCart from '../components/ui/AddedToCart';
import Kit360Viewer from '../components/ui/Kit360Viewer';
import ShortsNumberStep from '../components/ui/kit360/ShortsNumberStep';
import { visibleSizes } from '../features/config';
import { KIT360_TEAMS, findKit360Team, kit360Team } from '../features/kit360';
import { useClub, useClubs } from '../features/products';
import { errorText } from '../utils/errors';

const SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];
const STEPS = [
  { n: 1, label: 'tabSize', icon: 'ruler' },
  { n: 2, label: 'tabPrint', icon: 'format-letter-case' },
  { n: 3, label: 'tabShorts', icon: 'numeric' },
];

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
 *   1) o'lcham (majburiy) → 2) ism va raqam (ixtiyoriy) → 3) shortikka raqam (toggle; oldindan formadagi raqam) → savatga.
 * Forma komplekt (futbolka + shortik) bitta narx: shortik o'lchami futbolka bilan bir xil, alohida so'ralmaydi.
 * Savatga qo'shilganda ekrandan chiqilmaydi — forma savatga "uchadi" va "Savatga o'tish" kartasi chiqadi.
 *
 * Props: t, initialTeam, rules, cart, onBack, onOpenCart()
 */
export default function Kit360Screen({ t, initialTeam = null, rules = {}, cart, onBack, onOpenCart }) {
  const [selectedId, setSelectedId] = useState(initialTeam || 'rm');
  const [side, setSide] = useState('back');
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [shirtSize, setShirtSize] = useState(null);
  const [shortsOn, setShortsOn] = useState(false);
  // Mijoz toggle'ga o'zi tegmaguncha: formada raqam bo'lsa shortikda ham bor
  const shortsTouched = useRef(false);
  const [adding, setAdding] = useState(false);
  const addingRef = useRef(false);
  const [feedback, setFeedback] = useState(null);
  const [addedEvent, setAddedEvent] = useState(null);

  // Backend klublarini yuklaymiz (aniq kitId va narxlar uchun)
  const { clubs, isLoading: clubsLoading, refetch: refetchClubs } = useClubs();

  useEffect(() => {
    if (initialTeam && KIT360_TEAMS.some((tm) => tm.id === initialTeam)) {
      setSelectedId(initialTeam);
    }
  }, [initialTeam]);

  // Lentada faqat backend'da formasi bor (buyurtma beriladigan) jamoalar; klublar yuklanmagan yoki birortasi ham
  // bog'lanmagan bo'lsa — butun ro'yxat (aks holda lenta bo'sh qolardi)
  const teams = useMemo(() => {
    if (!clubs || !clubs.length) return KIT360_TEAMS;
    const ids = new Set(clubs.filter((c) => c.forms > 0).map((c) => c.kit360Id || kit360Team(c)).filter(Boolean));
    const list = KIT360_TEAMS.filter((tm) => ids.has(tm.id));
    return list.length ? list : KIT360_TEAMS;
  }, [clubs]);

  // Tanlangan jamoa bazada yo'q bo'lsa (masalan standart 'rm') — birinchi mavjud jamoaga o'tamiz
  useEffect(() => {
    if (!teams.some((tm) => tm.id === selectedId)) setSelectedId(teams[0].id);
  }, [teams, selectedId]);

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

  // Komplekt narxi (futbolka + shortik bitta narx); eski API'da shortik alohida kelsa — qo'shiladi
  const prices = useMemo(() => {
    const pb = matchedKit?.priceBreakdown || {};
    return { kit: (pb.shirt ?? 159000) + (pb.shorts ?? 0), print: pb.print ?? 30000 };
  }, [matchedKit]);

  const availableSizes = useMemo(() => {
    const raw = matchedKit?.sizes || SIZES;
    const sizeObjects = raw.map((s) => (typeof s === 'string' ? { size: s, available: true } : { size: s.size, available: s.available !== false }));
    return visibleSizes(sizeObjects, rules).filter((s) => s.available).map((s) => s.size);
  }, [matchedKit, rules]);

  useEffect(() => {
    if (shirtSize && !availableSizes.includes(shirtSize)) setShirtSize(null);
  }, [availableSizes, shirtSize]);

  const maxNumber = rules.printNumberMax || 99;
  const printName = cleanPrintName(name, rules.printNameMaxLength || 30);
  const printNum = cleanPrintNumber(number, maxNumber);
  const hasPrint = Boolean(printName.trim() || printNum);
  // Shortik raqami — formaning orqasidagi raqamning o'zi
  const shortsNum = printNum;
  const numberOnShorts = shortsOn && Boolean(shortsNum);

  useEffect(() => {
    if (shortsTouched.current) return;
    setShortsOn(Boolean(printNum));
  }, [printNum]);

  const touchShorts = (fn) => {
    shortsTouched.current = true;
    setFeedback(null);
    fn();
  };

  const totalPrice = prices.kit + (hasPrint ? prices.print : 0);
  const paused = Boolean(rules && rules.acceptOrders === false);

  const goStep = (next) => {
    setFeedback(null);
    setStep(next);
    setSide(next === 3 ? 'front' : 'back');
  };

  const onNext = () => {
    if (step === 1 && !shirtSize) {
      setFeedback({ ok: false, text: t('kitStepSize') });
      return;
    }
    goStep(step + 1);
  };

  // Keyingi forma uchun: bosqichlar boshidan; ism/raqam saqlanadi (jamoaga bir nechta forma olinadi)
  const resetSelection = () => {
    setStep(1);
    setSide('back');
    shortsTouched.current = false;
    setShortsOn(Boolean(printNum));
  };

  const addToCart = async () => {
    // Tez ikki marta bosish — server bir xil qatorlarni birlashtirib miqdorni 2 qilib qo'yardi
    if (!cart || addingRef.current) return;
    if (!shirtSize) {
      goStep(1);
      setFeedback({ ok: false, text: t('kitStepSize') });
      return;
    }
    if (shortsOn && !shortsNum) {
      setFeedback({ ok: false, text: t('shortsNumberEmpty') });
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
      setAddedEvent({
        key: Date.now(),
        team: team.id,
        summary: [team.name, shirtSize, [printName.trim(), printNum].filter(Boolean).join(' ')].filter(Boolean).join(' · '),
      });
      resetSelection();
    } catch (err) {
      setFeedback({ ok: false, text: errorText(err, t) });
    } finally {
      addingRef.current = false;
      setAdding(false);
    }
  };

  const stepTitles = { 1: t('kitStepSize'), 2: t('kitStepPrint'), 3: t('shortsNumberAsk') };
  const canOpen = (s) => s <= step || Boolean(shirtSize);
  const summary = [
    shirtSize,
    [printName.trim(), printNum].filter(Boolean).join(' '),
    step === 3 || shortsTouched.current ? `${t('kitStepShorts')}: ${numberOnShorts ? shortsNum : t('noNumber')}` : null,
  ].filter(Boolean);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardWrap}>
      <Screen
        contentStyle={styles.screenContent}
        footerStyle={{ bottom: TAB_BAR_HEIGHT }}
        footer={
          <View style={styles.footerBar}>
            <View>
              <Text style={styles.footerLabel}>{t('total')}</Text>
              <Text style={styles.footerPrice}>{formatMoney(totalPrice)}</Text>
              <Text style={styles.footerSub}>{t('kitSetIncludes')}</Text>
            </View>
            <View style={styles.footerAction}>
              {paused ? (
                <Text style={[styles.feedback, styles.errorFeedback]} numberOfLines={2}>
                  {rules.pausedMessage || t('ordersPaused')}
                </Text>
              ) : feedback ? (
                <Text style={[styles.feedback, !feedback.ok && styles.errorFeedback]} numberOfLines={2}>
                  {feedback.text}
                </Text>
              ) : null}
              {step < 3 ? (
                <Button onPress={onNext} disabled={step === 1 && !shirtSize} style={styles.footerButton}>
                  {`${t('nextStep')} →`}
                </Button>
              ) : (
                <Button disabled={paused || adding || (kitPending && !kitId)} onPress={addToCart} style={styles.footerButton}>
                  {adding ? t('adding') : t('addToCart')}
                </Button>
              )}
            </View>
          </View>
        }
      >
        <Header cart title={t('forma360')} subtitle={t('forma360Sub')} onBack={onBack} />

        {/* Jamoani tanlash lentasi */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.teamRail}>
          {teams.map((item) => {
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

        {/* 360° ko'rinish */}
        <View style={styles.previewBox}>
          <View style={styles.glow} />
          <Kit360Viewer t={t} team={team.id} name={printName} number={printNum} shortsNumber={numberOnShorts ? shortsNum : ''} view={side} onViewChange={setSide} height={340} />
          <View style={styles.previewSide}>
            <Segment
              options={[t('front'), t('rear')]}
              value={side === 'front' ? t('front') : side === 'back' ? t('rear') : null}
              onChange={(value) => setSide(value === t('front') ? 'front' : 'back')}
            />
          </View>
        </View>

        {/* Bosqichlar: raqamli doiralar + chiziq; bajarilganlari ✓ */}
        <View style={styles.stepper}>
          {STEPS.map((s, i) => {
            const isActive = step === s.n;
            const isDone = s.n < step;
            return (
              <React.Fragment key={s.n}>
                {i > 0 ? <View style={[styles.stepLine, s.n <= step && styles.stepLineDone]} /> : null}
                <Pressable
                  onPress={() => (canOpen(s.n) ? goStep(s.n) : onNext())}
                  style={styles.stepItem}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  hitSlop={6}
                >
                  <View style={[styles.stepDot, isDone && styles.stepDotDone, isActive && styles.stepDotActive]}>
                    {isDone ? (
                      <MaterialCommunityIcons name="check" size={16} color={colors.accent} />
                    ) : (
                      <Text style={[styles.stepNum, isActive && styles.stepNumActive]}>{s.n}</Text>
                    )}
                  </View>
                  <Text style={[styles.stepLabel, (isActive || isDone) && styles.stepLabelOn]} numberOfLines={1}>
                    {t(s.label)}
                  </Text>
                </Pressable>
              </React.Fragment>
            );
          })}
        </View>

        {/* Joriy bosqich */}
        <View style={styles.panelBox}>
          <View style={styles.panelHead}>
            {step > 1 ? (
              <Pressable onPress={() => goStep(step - 1)} hitSlop={8} style={styles.panelBack} accessibilityRole="button" accessibilityLabel={t('back')}>
                <MaterialCommunityIcons name="chevron-left" size={22} color={colors.accent} />
              </Pressable>
            ) : null}
            <Text style={styles.stepTitle}>{stepTitles[step]}</Text>
          </View>

          {step === 1 ? (
            <>
              <View style={styles.sizesGrid}>
                {availableSizes.map((size) => (
                  <Pressable
                    key={size}
                    onPress={() => {
                      setShirtSize(size);
                      setFeedback(null);
                    }}
                    style={[styles.sizeChip, shirtSize === size && styles.sizeChipActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: shirtSize === size }}
                  >
                    <Text style={[styles.sizeText, shirtSize === size && styles.sizeTextActive]}>{size}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.hint}>{t('sameSizeHint')}</Text>
            </>
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
            <ShortsNumberStep
              t={t}
              enabled={shortsOn}
              onToggle={(on) => touchShorts(() => setShortsOn(on))}
              number={printNum}
            />
          )}

          {/* Tanlov xulosasi */}
          {summary.length ? (
            <View style={styles.summaryRow}>
              {summary.map((s) => (
                <View key={s} style={styles.summaryChip}>
                  <Text style={styles.summaryText} numberOfLines={1}>
                    {s}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </Screen>

      <AddedToCart
        event={addedEvent}
        t={t}
        bottom={TAB_BAR_HEIGHT + 96}
        onOpenCart={onOpenCart}
        onDismiss={() => setAddedEvent(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardWrap: { flex: 1, backgroundColor: colors.background },
  screenContent: { paddingBottom: 190 },
  teamRail: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.sm },
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
  teamChipActive: { borderColor: colors.accent, backgroundColor: colors.surfaceSubtle },
  teamDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1 },
  teamChipText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  teamChipTextActive: { color: colors.accent, fontWeight: '800' },
  previewBox: {
    marginHorizontal: spacing.lg,
    height: 340,
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  glow: { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(235, 185, 78, 0.08)' },
  previewSide: { position: 'absolute', bottom: 12, alignSelf: 'center' },
  stepper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  stepItem: { width: 84, alignItems: 'center' },
  stepDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  stepDotDone: { borderColor: colors.accent, backgroundColor: colors.accentGlow },
  stepDotActive: { borderColor: colors.accent, backgroundColor: colors.accent },
  stepNum: { color: colors.muted, fontSize: 14, fontWeight: '900' },
  stepNumActive: { color: colors.primaryDark },
  stepLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 6 },
  stepLabelOn: { color: colors.text, fontWeight: '800' },
  stepLine: { flex: 1, height: 2, borderRadius: 1, backgroundColor: colors.border, marginTop: 16, marginHorizontal: -18 },
  stepLineDone: { backgroundColor: colors.accent },
  panelBox: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  panelBack: { marginLeft: -6 },
  stepTitle: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '900' },
  sizesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.sm, marginTop: spacing.xs },
  sizeChip: {
    width: '31.5%',
    paddingVertical: 13,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  sizeChipActive: { borderColor: colors.accent, backgroundColor: colors.accentGlow },
  sizeText: { color: colors.muted, fontSize: 15, fontWeight: '800' },
  sizeTextActive: { color: colors.accent, fontWeight: '900' },
  inputsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  textInput: {
    height: 50,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    fontWeight: '800',
  },
  numberInput: { width: 84, textAlign: 'center', fontSize: 18 },
  hint: { color: colors.muted, fontSize: 11, marginTop: spacing.sm },
  optionSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  summaryChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.round,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: '100%',
  },
  summaryText: { color: colors.textSecondary, fontSize: 11, fontWeight: '800' },
  footerBar: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footerAction: { flex: 1, alignItems: 'stretch', gap: 4, marginLeft: spacing.md },
  footerButton: { alignSelf: 'stretch' },
  footerLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  footerPrice: { color: colors.accent, fontSize: 18, fontWeight: '900', marginTop: 2 },
  footerSub: { color: colors.muted, fontSize: 10, fontWeight: '700', marginTop: 1 },
  feedback: { color: colors.tealLight, fontSize: 12, fontWeight: '800', textAlign: 'right' },
  errorFeedback: { color: colors.danger },
});
