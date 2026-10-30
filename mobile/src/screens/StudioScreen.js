import React, { useEffect, useState } from 'react';
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
  useWindowDimensions,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radii, spacing, TAB_BAR_HEIGHT } from '../constants/theme';
import { Button, EmptyState, Header, Overline, Screen, Segment, formatMoney } from '../components/ui/Common';
import ErrorView from '../components/ui/ErrorView';
import Kit360ClubGrid from '../components/ui/Kit360ClubGrid';
import Kit360Thumb, { KIT360_BG } from '../components/ui/Kit360Thumb';
import Kit360Viewer from '../components/ui/Kit360Viewer';
import { visibleSizes } from '../features/config';
import { kit360Team } from '../features/kit360';
import { useClubs } from '../features/products';
import { errorText } from '../utils/errors';

// Studiya — faqat Forma 360° (admin paneldagi Superadmin → Forma 360° suratlari, WebView'da):
//  - forma tanlanmagan (pastki tabdan) — 360° jamoalari kartalari; bosilsa klub sahifasi ochiladi;
//  - klub formasi (klub sahifasidan "Moslashtirish") — POST /cart/items { kitId }: o'lcham,
//    ism/raqam bosmasi, shortik. Ism/raqam haqiqiy forma suratiga chiziladi.
// Ism yoki raqam maydoniga bosilganda forma orqasiga buriladi; yozilgani orqada darhol ko'rinadi.
const pickSize = (sizes, preferred) => {
  const open = sizes.filter((s) => s.available).map((s) => s.size);
  return open.includes(preferred) ? preferred : open[0] || null;
};

export default function StudioScreen({ t, kit, onClub, ...props }) {
  if (kit) return <KitStudio t={t} product={kit} {...props} />;
  return <StudioPicker t={t} onClub={onClub} onBack={props.onBack} />;
}

/** Forma tanlanmagan: Forma 360° jamoalari — katalog bilan bir xil kartalar */
function StudioPicker({ t, onClub, onBack }) {
  const { clubs, isLoading, error, refetch } = useClubs({});
  return (
    <Screen>
      <Header cart onBack={onBack} title={t('designStudio')} />
      <Text style={styles.pickTitle}>{t('studioPickTitle')}</Text>
      <Text style={styles.pickSub}>{t('studioPickSub')}</Text>
      {error ? (
        <ErrorView message={t('loadError')} onRetry={refetch} retryLabel={t('retry')} />
      ) : clubs.length || isLoading ? (
        <Kit360ClubGrid t={t} clubs={clubs} loading={isLoading} onPress={onClub} />
      ) : (
        <EmptyState icon="tshirt-crew-outline" title={t('catalogEmpty')} />
      )}
    </Screen>
  );
}

// ─── Umumiy bo'laklar ────────────────────────────────────────────────────────

function SizeRow({ sizes, selected, onPick }) {
  return (
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
}

function Tabs({ tabs, value, onChange }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
      {tabs.map(([key, label]) => (
        <Pressable key={key} onPress={() => onChange(key)} style={[styles.tab, value === key && styles.tabActive]}>
          <Text style={[styles.tabText, value === key && styles.tabTextActive]}>{label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function PrintInputs({ t, rules, name, setName, number, setNumber, nameStyle, onFocus }) {
  const numberValue = number === '' ? null : Number(number);
  const numberInvalid = numberValue != null && (numberValue < rules.printNumberMin || numberValue > rules.printNumberMax);
  return (
    <View>
      <View style={styles.inputs}>
        <TextInput
          value={name}
          onChangeText={setName}
          onFocus={onFocus}
          placeholder={t('namePlaceholder')}
          placeholderTextColor={colors.muted}
          style={[styles.textInput, { flex: 1 }, nameStyle]}
          autoCapitalize="characters"
          maxLength={rules.printNameMaxLength}
        />
        <TextInput
          value={number}
          onChangeText={(value) => setNumber(value.replace(/\D/g, ''))}
          onFocus={onFocus}
          placeholder="10"
          placeholderTextColor={colors.muted}
          style={[styles.textInput, styles.number]}
          keyboardType="number-pad"
          maxLength={2}
        />
      </View>
      {numberInvalid ? (
        <Text style={[styles.hint, styles.errorFeedback]}>
          {t('numberRange')}: {rules.printNumberMin}–{rules.printNumberMax}
        </Text>
      ) : null}
    </View>
  );
}

function ShortsPanel({ t, rules, sizes, price, s }) {
  const numberInvalid = isNumberInvalid(s.shortsNumber, rules);
  return (
    <View>
      <View style={styles.panelRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>{t('addShorts')}</Text>
          <Text style={styles.rowSub}>{t('addShortsSub')} · +{formatMoney(price)}</Text>
        </View>
        <Switch
          value={s.withShorts}
          onValueChange={s.setWithShorts}
          trackColor={{ false: '#2A3160', true: colors.teal }}
          thumbColor="#FFFFFF"
        />
      </View>
      {s.withShorts ? (
        <View>
          <Overline style={styles.overlineGap}>{t('shortsSize')}</Overline>
          <SizeRow sizes={sizes} selected={s.shortsSize} onPick={s.setShortsSize} />
          <View style={[styles.panelRow, styles.overlineGap]}>
            <Text style={[styles.rowTitle, { flex: 1 }]}>{t('numberOnShorts')}</Text>
            <Switch
              value={s.numberOnShorts}
              onValueChange={s.setNumberOnShorts}
              trackColor={{ false: '#2A3160', true: colors.teal }}
              thumbColor="#FFFFFF"
            />
          </View>
          {s.numberOnShorts ? (
            <View style={[styles.inputs, styles.overlineGap]}>
              <Text style={[styles.rowSub, { flex: 1, marginTop: 0 }]}>{t('shortsNumber')}</Text>
              <TextInput
                value={s.shortsNumber}
                onChangeText={(value) => s.setShortsNumber(value.replace(/\D/g, ''))}
                placeholder={s.fallbackNumber || '10'}
                placeholderTextColor={colors.muted}
                style={[styles.textInput, styles.number]}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
          ) : null}
          {numberInvalid ? (
            <Text style={[styles.hint, styles.errorFeedback]}>
              {t('numberRange')}: {rules.printNumberMin}–{rules.printNumberMax}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/** Shortik tanlovi (ikkala rejimda bir xil): shortik bor/yo'q, o'lcham, raqam va uning qiymati */
function useShorts(defaultOn) {
  const [withShorts, setWithShorts] = useState(defaultOn);
  const [shortsSize, setShortsSize] = useState(null);
  const [numberOnShorts, setNumberOnShorts] = useState(false);
  const [shortsNumber, setShortsNumber] = useState('');
  return { withShorts, setWithShorts, shortsSize, setShortsSize, numberOnShorts, setNumberOnShorts, shortsNumber, setShortsNumber };
}

/** Savatga yuboriladigan shortik maydonlari; raqam bo'sh bo'lsa server futbolka raqamini oladi */
const shortsPayload = (s, shirtSize) =>
  s.withShorts
    ? { withShorts: true, shortsSize: s.shortsSize || shirtSize, numberOnShorts: s.numberOnShorts, shortsNumber: s.numberOnShorts ? s.shortsNumber || null : null }
    : { withShorts: false };

const isNumberInvalid = (number, rules) => {
  if (number === '') return false;
  const value = Number(number);
  return value < rules.printNumberMin || value > rules.printNumberMax;
};

function StudioFooter({ t, label, price, paused, rules, feedback, adding, disabled, onAdd }) {
  return (
    <View style={styles.footerBar}>
      <View>
        <Text style={styles.footerLabel}>{label}</Text>
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
        <Button disabled={paused || adding || disabled} onPress={onAdd}>
          {adding ? t('adding') : t('addToCart')}
        </Button>
      </View>
    </View>
  );
}

function SideSwitch({ t, side, setSide }) {
  return (
    <Segment
      options={[t('front'), t('rear')]}
      value={side === 'front' ? t('front') : t('rear')}
      onChange={(value) => setSide(value === t('front') ? 'front' : 'back')}
    />
  );
}


/** Klub formasi foto-360° (admin paneldagi Forma 360°): ism/raqam formaga — viewer ichida.
 *  WebView moduli yo'q eski dev-build'da yoki WebView ishdan chiqsa — old tomon surati */
function Preview360({ t, side, setSide, team, name, number }) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const height = Math.max(320, Math.min(520, Math.round(screenH * 0.55)));
  const width = screenW - spacing.lg * 2;
  if (!team) {
    return (
      <View style={styles.previewWrap}>
        <Kit360Thumb team={null} width={width} height={height} style={styles.preview} />
      </View>
    );
  }
  return (
    <View style={styles.previewWrap}>
      <View style={styles.preview}>
        <Kit360Viewer
          t={t}
          height={height}
          team={team}
          name={name}
          number={number}
          view={side}
          onViewChange={setSide}
          fallback={<Kit360Thumb team={team} width={width} height={height} zoom={1.2} />}
        />
        <View style={styles.previewSide}>
          <SideSwitch t={t} side={side} setSide={setSide} />
        </View>
      </View>
    </View>
  );
}

/** iOS'da klaviatura pastki tugmani yopmasin (Android — app.json: softwareKeyboardLayoutMode=resize) */
function KeyboardSafe({ children }) {
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {children}
    </KeyboardAvoidingView>
  );
}

/** Savatga qo'shish: muvaffaqiyat/xato matni footer'da */
function useAddToCart(t, cart) {
  const [adding, setAdding] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const add = async (item) => {
    setAdding(true);
    setFeedback(null);
    try {
      await cart.addItem(item);
      setFeedback({ ok: true, text: t('added') });
      setTimeout(() => setFeedback(null), 2000);
    } catch (err) {
      setFeedback({ ok: false, text: errorText(err, t) });
    } finally {
      setAdding(false);
    }
  };

  return { adding, feedback, setFeedback, add };
}

// ─── Klub formasi ────────────────────────────────────────────────────────────

// Backend savat qatori: forma (kitId), futbolka o'lchami, ism/raqam bosmasi,
// shortik (+ o'lchami, raqami).
function KitStudio({ t, product, cart, rules, onBack, onPickKit }) {
  const [side, setSide] = useState('back');
  const [tab, setTab] = useState('size');
  const [name, setName] = useState('');
  const [number, setNumber] = useState('10');
  const [shirtSize, setShirtSize] = useState(null);
  const shorts = useShorts(true);
  const { withShorts } = shorts;
  const { adding, feedback, setFeedback, add } = useAddToCart(t, cart);

  // Forma almashganda mavjud o'lchamni qayta tanlaymiz
  // (bolalar o'lchamlari Superadmin sozlamasida o'chirilishi mumkin)
  const sizes = visibleSizes(product.sizes, rules);
  useEffect(() => {
    setShirtSize((current) => pickSize(sizes, current || 'L'));
    shorts.setShortsSize((current) => pickSize(sizes, current || 'L'));
  }, [product.kitId, rules.allowKidsSizes]); // eslint-disable-line react-hooks/exhaustive-deps

  const printName = name.trim();
  const hasPrint = Boolean(printName || number);
  const prices = product.priceBreakdown;
  const team360 = kit360Team(product);
  const price = prices.shirt + (withShorts ? prices.shorts : 0) + (hasPrint ? prices.print : 0);
  const paused = !rules.acceptOrders;

  const tabs = [
    ['size', t('tabSize')],
    ['print', t('tabPrint')],
    ['shorts', t('tabShorts')],
  ];

  const addToCart = () => {
    if (!shirtSize) return;
    if (isNumberInvalid(number, rules) || (withShorts && shorts.numberOnShorts && isNumberInvalid(shorts.shortsNumber, rules))) {
      setFeedback({ ok: false, text: `${t('numberRange')}: ${rules.printNumberMin}–${rules.printNumberMax}` });
      return;
    }
    add({
      kitId: product.kitId,
      shirtSize,
      printName: printName || null,
      printNumber: number || null,
      ...shortsPayload(shorts, shirtSize),
    });
  };

  const renderPanel = () => {
    if (tab === 'size') {
      return (
        <View>
          <Overline>{t('shirtSize')}</Overline>
          <SizeRow sizes={sizes} selected={shirtSize} onPick={setShirtSize} />
        </View>
      );
    }
    if (tab === 'print') {
      return (
        <View>
          <Overline>{t('nameNumber')}</Overline>
          <PrintInputs
            t={t}
            rules={rules}
            name={name}
            setName={setName}
            number={number}
            setNumber={setNumber}
            onFocus={() => setSide('back')}
          />
          <Text style={styles.hint}>{t('printHint')} · +{formatMoney(prices.print)}</Text>
        </View>
      );
    }
    return <ShortsPanel t={t} rules={rules} sizes={sizes} price={prices.shorts} s={{ ...shorts, fallbackNumber: number }} />;
  };

  return (
    <KeyboardSafe>
      <Screen
        contentStyle={{ paddingBottom: 170 }}
        footerStyle={{ bottom: TAB_BAR_HEIGHT }}
        footer={
          <StudioFooter
            t={t}
            label={t('total')}
            price={price}
            paused={paused}
            rules={rules}
            feedback={feedback}
            adding={adding}
            disabled={!shirtSize}
            onAdd={addToCart}
          />
        }
      >
        <Header cart onBack={onBack} title={t('designStudio')} />

        {/* Haqiqiy forma surati (Forma 360°): ism/raqam formaga, shortik ham suratda. Surati yo'q klub
            (admin bog'lamagan, eski havola) — joy egasi; viewer boshqa jamoani ko'rsatmasin */}
        <Preview360 t={t} side={side} setSide={setSide} team={team360} name={printName} number={number} />

        <Pressable style={styles.kitRow} onPress={onPickKit}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle} numberOfLines={1}>{product.name}</Text>
            <Text style={styles.rowSub}>{t('chooseOtherKit')}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.accent} />
        </Pressable>

        <Tabs tabs={tabs} value={tab} onChange={setTab} />
        <View style={styles.panel}>{renderPanel()}</View>
      </Screen>
    </KeyboardSafe>
  );
}

const styles = StyleSheet.create({
  pickTitle: { color: colors.text, fontSize: 18, fontWeight: '900', marginBottom: 4 },
  pickSub: { color: colors.muted, fontSize: 12, lineHeight: 18, marginBottom: spacing.lg },
  flex: { flex: 1 },
  previewWrap: { marginBottom: spacing.lg },
  // 360° sahna (WebView) butun qutini egallaydi; fon — viewer'dagi suratlar foni bilan bir xil
  preview: {
    minHeight: 330,
    borderRadius: radii.xl,
    backgroundColor: KIT360_BG,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewSide: { position: 'absolute', bottom: 12, alignSelf: 'center' },
  tabRow: { gap: spacing.sm, paddingRight: spacing.sm },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radii.round,
  },
  tabActive: { backgroundColor: colors.accent },
  tabText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: colors.primaryDark, fontWeight: '900' },
  // Panel qutisiz — tanlovlar to'g'ridan-to'g'ri sahna ostida
  panel: {
    paddingTop: spacing.lg,
    paddingHorizontal: 2,
  },
  inputs: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  textInput: {
    height: 50,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
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
  footerBar: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footerLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  footerPrice: { color: colors.accent, fontSize: 18, fontWeight: '900', marginTop: 2 },
  addedFeedback: { color: colors.tealLight, fontSize: 12, fontWeight: '800', textAlign: 'right' },
  errorFeedback: { color: colors.danger },
  hint: { color: colors.muted, fontSize: 11, marginTop: spacing.sm },
  sizes: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sizeChip: {
    minWidth: 48,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  sizeChipActive: { borderColor: colors.accent, backgroundColor: colors.surfaceSubtle },
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
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
});

