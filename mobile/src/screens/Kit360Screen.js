import React, { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radii, spacing, TAB_BAR_HEIGHT, themedStyles } from '../constants/theme';
import { Button, Header, Screen, Segment, formatMoney } from '../components/ui/Common';
import AddedToCart from '../components/ui/AddedToCart';
import Kit360Viewer from '../components/ui/Kit360Viewer';
import KitTypeStep from '../components/ui/kit360/KitTypeStep';
import { PrintStep, SizeStep } from '../components/ui/kit360/PrintSteps';
import ShortsNumberStep from '../components/ui/kit360/ShortsNumberStep';
import StepBar from '../components/ui/kit360/StepBar';
import { visibleSizes } from '../features/config';
import { KIT360_TEAMS, cleanPrintName, cleanPrintNumber, findKit360Team, kit360Team, kit360Variant } from '../features/kit360';
import { useClub, useClubs } from '../features/products';
import { errorText } from '../utils/errors';

const SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];
const STEP_TYPE = { id: 'type', label: 'tabType' };
const STEP_SIZE = { id: 'size', label: 'tabSize' };
const STEP_PRINT = { id: 'print', label: 'tabPrint' };
const STEP_SHORTS = { id: 'bottom', label: 'tabShorts' };
const STEP_PANTS = { id: 'bottom', label: 'tabPants' };

const sleeveOf = (kit) => (kit?.sleeve === 'LONG' ? 'LONG' : 'SHORT');

/**
 * Forma 360°: jamoa tanlanadi, so'ng bosqichma-bosqich:
 *   1) forma turi — qishki (uzun yeng + shalvar) yoki yozgi (kalta yeng + shortik), suratlari bilan;
 *      jamoada faqat bitta tur bo'lsa bu bosqich ko'rsatilmaydi;
 *   2) o'lcham (majburiy) → 3) ism va raqam (ixtiyoriy) → 4) shortik/shalvarga raqam (toggle) → savatga.
 * Komplekt (futbolka + shortik/shalvar) bitta narx: pastki qism o'lchami futbolka bilan bir xil.
 * Savatga qo'shilganda ekrandan chiqilmaydi — forma savatga "uchadi" va "Savatga o'tish" kartasi chiqadi.
 *
 * Props: t, initialTeam, initialSleeve ('SHORT' | 'LONG' — katalogda bosilgan forma), rules, cart, onBack, onOpenCart()
 */
export default function Kit360Screen({ t, initialTeam = null, initialSleeve = null, rules = {}, cart, onBack, onOpenCart }) {
  const [selectedId, setSelectedId] = useState(initialTeam || 'rm');
  const [side, setSide] = useState('back');
  const [step, setStep] = useState(1);
  // Mijoz tanlagan tur; katalogdan kelgan bo'lsa — oldindan belgilangan (1-bosqichda o'zgartirsa bo'ladi)
  const [sleevePick, setSleevePick] = useState(initialSleeve);
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

  // Jamoa haqiqatan almashganda — bosqichlar boshidan, tur qayta tanlanadi (StrictMode qayta ishlatsa ham tanlov qoladi)
  const prevTeam = useRef(team.id);
  useEffect(() => {
    if (prevTeam.current === team.id) return;
    prevTeam.current = team.id;
    setStep(1);
    setFeedback(null);
    setSleevePick(null);
  }, [team.id]);

  // Backend'dagi mos klub va uning formalari
  const matchedClub = useMemo(() => {
    if (!clubs || !clubs.length) return null;
    return clubs.find((c) => c.kit360Id === team.id) || clubs.find((c) => kit360Team(c) === team.id) || null;
  }, [clubs, team.id]);

  // Klublar ro'yxatida formalar yo'q (faqat kitsCount) — haqiqiy kit id, narx va o'lchamlar klub sahifasidan
  const { products: clubKits, isLoading: kitLoading } = useClub(matchedClub?.id);
  // Har tur uchun birinchi forma. Uzun yengli forma suratlari bo'lmasa ham sotiladi (viewer kalta yeng suratini
  // ko'rsatadi, matnlar — shalvar): admin qo'shgan qishki forma katalogda ko'rinib, buyurtmada yo'qolmasin
  const kitsBySleeve = useMemo(
    () => ({
      SHORT: clubKits.find((k) => sleeveOf(k) === 'SHORT') || null,
      LONG: clubKits.find((k) => sleeveOf(k) === 'LONG') || null,
    }),
    [clubKits],
  );
  const hasChoice = Boolean(kitsBySleeve.SHORT && kitsBySleeve.LONG);
  // Tanlov yo'q — jamoadagi yagona turning o'zi; tur doim buyurtma qilinadigan formadan olinadi (ekran va buyurtma mos)
  const onlyKit = hasChoice ? null : kitsBySleeve.SHORT || kitsBySleeve.LONG || clubKits[0] || null;
  const sleeve = hasChoice ? sleevePick : sleeveOf(onlyKit);
  const long = sleeve === 'LONG';
  const matchedKit = hasChoice ? (sleeve && kitsBySleeve[sleeve]) || null : onlyKit;
  const kitId = matchedKit?.kitId ?? null;
  const kitPending = clubsLoading || (matchedClub && kitLoading);
  const variant = kit360Variant(team.id, sleeve || 'SHORT');

  const steps = useMemo(() => [...(hasChoice ? [STEP_TYPE] : []), STEP_SIZE, STEP_PRINT, long ? STEP_PANTS : STEP_SHORTS], [hasChoice, long]);
  const current = steps[Math.min(step, steps.length) - 1].id;

  // Turlar yuklanib "Turi" bosqichi paydo bo'lsa/yo'qolsa — raqamlar siljimasin, boshidan
  const prevChoice = useRef(hasChoice);
  useEffect(() => {
    if (prevChoice.current === hasChoice) return;
    prevChoice.current = hasChoice;
    setStep(1);
  }, [hasChoice]);

  // Komplekt narxi (futbolka + pastki qism bitta narx) o'lchamga bog'liq: serverdagi `sizes[].price`
  // (Superadmin har o'lchamga o'z narxini qo'yadi); eski API'da yo'q bo'lsa — umumiy narx
  const priceKit = matchedKit || clubKits[0];
  const pb = priceKit?.priceBreakdown || {};
  const printPrice = pb.print ?? 30000;
  const sizeRow = (priceKit?.sizes || []).find((s) => typeof s === 'object' && s.size === shirtSize);
  // O'lcham tanlanmaguncha narx ko'rsatilmaydi (hamma o'lchamda narx har xil)
  const kitPrice = shirtSize ? (sizeRow?.price ?? (pb.shirt ?? 159000) + (pb.shorts ?? 0)) : null;

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
  // Shortik/shalvar raqami — formaning orqasidagi raqamning o'zi
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

  const totalPrice = kitPrice == null ? null : kitPrice + (hasPrint ? printPrice : 0);
  const paused = Boolean(rules && rules.acceptOrders === false);

  const goStep = (next) => {
    setFeedback(null);
    setStep(next);
    setSide(steps[next - 1].id === 'bottom' ? 'front' : 'back');
  };

  // Joriy bosqichni o'tkazmaydigan sabab (yoki null)
  const blocker = (id) => {
    if (id === 'type' && !sleeve) return t('kitStepType');
    if (id === 'size' && !shirtSize) return t('kitStepSize');
    return null;
  };

  const onNext = () => {
    const why = blocker(current);
    if (why) {
      setFeedback({ ok: false, text: why });
      return;
    }
    goStep(step + 1);
  };

  // Bosqichlar paneli: oldingi yoki majburiy bosqichlari to'ldirilgan keyingisiga o'tiladi
  const openStep = (n) => {
    if (n <= step) return goStep(n);
    const missing = steps.slice(0, n - 1).findIndex((s) => blocker(s.id));
    if (missing === -1) return goStep(n);
    goStep(missing + 1);
    return setFeedback({ ok: false, text: blocker(steps[missing].id) });
  };

  // Keyingi forma uchun: bosqichlar boshidan; ism/raqam va tur saqlanadi (jamoaga bir nechta forma olinadi)
  const resetSelection = () => {
    setStep(1);
    setSide('back');
    shortsTouched.current = false;
    setShortsOn(Boolean(printNum));
  };

  const addToCart = async () => {
    // Tez ikki marta bosish — server bir xil qatorlarni birlashtirib miqdorni 2 qilib qo'yardi
    if (!cart || addingRef.current) return;
    const missing = steps.findIndex((s) => blocker(s.id));
    if (missing !== -1) {
      goStep(missing + 1);
      setFeedback({ ok: false, text: blocker(steps[missing].id) });
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
        variant,
        summary: [team.name, long ? t('sleeveLong') : null, shirtSize, [printName.trim(), printNum].filter(Boolean).join(' ')]
          .filter(Boolean)
          .join(' · '),
      });
      resetSelection();
    } catch (err) {
      setFeedback({ ok: false, text: errorText(err, t) });
    } finally {
      addingRef.current = false;
      setAdding(false);
    }
  };

  const stepTitles = { type: 'kitStepType', size: 'kitStepSize', print: 'kitStepPrint', bottom: long ? 'pantsNumberAsk' : 'shortsNumberAsk' };
  const bottomLabel = t(long ? 'kitStepPants' : 'kitStepShorts');
  const summary = [
    hasChoice && sleeve ? t(long ? 'sleeveLong' : 'sleeveShort') : null,
    shirtSize,
    [printName.trim(), printNum].filter(Boolean).join(' '),
    current === 'bottom' || shortsTouched.current ? `${bottomLabel}: ${numberOnShorts ? shortsNum : t('noNumber')}` : null,
  ].filter(Boolean);
  const isLast = step >= steps.length;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardWrap}>
      <Screen
        contentStyle={styles.screenContent}
        footerStyle={{ bottom: TAB_BAR_HEIGHT }}
        footer={
          <View style={styles.footerBar}>
            <View>
              <Text style={styles.footerLabel}>{t(totalPrice == null ? 'priceWord' : 'total')}</Text>
              {totalPrice == null ? (
                <Text style={styles.footerPending}>{t('priceAfterSize')}</Text>
              ) : (
                <Text style={styles.footerPrice}>{formatMoney(totalPrice)}</Text>
              )}
              <Text style={styles.footerSub}>{t(long ? 'kitSetIncludesLong' : 'kitSetIncludes')}</Text>
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
              {!isLast ? (
                <Button onPress={onNext} disabled={Boolean(blocker(current))} style={styles.footerButton}>
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

        {/* 360° ko'rinish: tanlangan turdagi suratlar (uzun yeng — l0..l7) */}
        <View style={styles.previewBox}>
          <View style={styles.glow} />
          <Kit360Viewer
            t={t}
            team={team.id}
            variant={variant}
            name={printName}
            number={printNum}
            shortsNumber={numberOnShorts ? shortsNum : ''}
            view={side}
            onViewChange={setSide}
            height={340}
          />
          <View style={styles.previewSide}>
            <Segment
              options={[t('front'), t('rear')]}
              value={side === 'front' ? t('front') : side === 'back' ? t('rear') : null}
              onChange={(value) => setSide(value === t('front') ? 'front' : 'back')}
            />
          </View>
        </View>

        <StepBar t={t} steps={steps} step={step} onPress={openStep} />

        {/* Joriy bosqich */}
        <View style={styles.panelBox}>
          <View style={styles.panelHead}>
            {step > 1 ? (
              <Pressable onPress={() => goStep(step - 1)} hitSlop={8} style={styles.panelBack} accessibilityRole="button" accessibilityLabel={t('back')}>
                <MaterialCommunityIcons name="chevron-left" size={22} color={colors.accent} />
              </Pressable>
            ) : null}
            <Text style={styles.stepTitle}>{t(stepTitles[current])}</Text>
          </View>

          {current === 'type' ? (
            <KitTypeStep
              t={t}
              team={team.id}
              value={sleeve}
              onChange={(next) => {
                setSleevePick(next);
                setFeedback(null);
              }}
            />
          ) : current === 'size' ? (
            <SizeStep
              sizes={availableSizes}
              value={shirtSize}
              hint={t(long ? 'sameSizeHintLong' : 'sameSizeHint')}
              price={kitPrice}
              priceLabel={t('shirtPrice')}
              onChange={(size) => {
                setShirtSize(size);
                setFeedback(null);
              }}
            />
          ) : current === 'print' ? (
            <PrintStep
              t={t}
              name={name}
              number={number}
              onName={setName}
              onNumber={setNumber}
              onFocus={() => setSide('back')}
              nameMaxLength={rules.printNameMaxLength || 30}
              printPrice={printPrice}
            />
          ) : (
            <ShortsNumberStep
              t={t}
              pants={long}
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

const styles = themedStyles(() => ({
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
  footerPending: { color: colors.textSecondary, fontSize: 13, fontWeight: '800', marginTop: 3, maxWidth: 150 },
  footerSub: { color: colors.muted, fontSize: 10, fontWeight: '700', marginTop: 1 },
  feedback: { color: colors.tealLight, fontSize: 12, fontWeight: '800', textAlign: 'right' },
  errorFeedback: { color: colors.danger },
}));
