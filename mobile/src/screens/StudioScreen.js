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
  useWindowDimensions,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radii, spacing, TAB_BAR_HEIGHT } from '../constants/theme';
import { Button, Card, Header, Overline, Screen, Segment, formatMoney } from '../components/ui/Common';
import ErrorView from '../components/ui/ErrorView';
import Jersey3D from '../components/ui/Jersey3D';
import KitDesignPicker from '../components/ui/KitDesignPicker';
import KitViewer from '../components/ui/KitViewer';
import { Shorts, patchKind } from '../components/ui/Shirt';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { visibleSizes } from '../features/config';
import { clubKitDesign, studioKitDesign, useKitDesigns } from '../features/kit3d';
import { GIFT_PACKAGE, NEON, PATCHES, SOLID_COLORS, TEXT_COLORS, designPreview, estimatePrice } from '../features/studio';
import { errorText } from '../utils/errors';

// Studiyaning ikki rejimi (ikkalasida forma — admin paneldagi bilan bir xil 3D, WebView'da):
//  - "Maxsus dizayn" (pastki tabdan):
//      · Superadmin nashr qilgan 3D dizayn (GET /kits/designs) — POST /cart/items { kitDesignId }:
//        ism/raqam, o'lcham, shortik; narx serverda (club.* narxlari).
//      · "O'z rangim" — POST /cart/items { design }: bir rang, yozuv rangi, neon, shrift, yamoq,
//        qadoq. Tanlovlar GET /app/config → `studio`dan; faqat yoqilganlari ko'rsatiladi.
//  - "Klub formasi" (klub sahifasidan) — POST /cart/items { kitId }: o'lcham,
//    ism/raqam bosmasi, shortik.
// Ism yoki raqam maydoniga bosilganda forma orqasiga buriladi; yozilgani orqada darhol ko'rinadi.
const pickSize = (sizes, preferred) => {
  const open = sizes.filter((s) => s.available).map((s) => s.size);
  return open.includes(preferred) ? preferred : open[0] || null;
};

// Maxsus futbolka barcha o'lchamlarda tikiladi (backend ALL_SIZES)
const DESIGN_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL', '2-3', '4-5', '6-7', '8-9', '10-11', '12-13'].map((size) => ({
  size,
  available: true,
}));

/** Ro'yxatdagi tanlov hali yoqilganmi — aks holda birinchi yoqilgani */
const keepEnabled = (current, enabled) => (enabled.includes(current) ? current : enabled[0] ?? null);

export default function StudioScreen({ t, kit, studio, studioError, onRetryConfig, onPickKit, ...props }) {
  const [mode, setMode] = useState(kit ? 'kit' : 'design');
  useEffect(() => {
    setMode(kit ? 'kit' : 'design');
  }, [kit?.kitId]); // eslint-disable-line react-hooks/exhaustive-deps

  const modeSwitch = (
    <Segment
      wide
      style={styles.modeSwitch}
      options={[t('customDesign'), t('clubKitMode')]}
      value={mode === 'kit' && kit ? t('clubKitMode') : t('customDesign')}
      onChange={(value) => {
        if (value === t('customDesign')) setMode('design');
        else if (kit) setMode('kit');
        else onPickKit();
      }}
    />
  );

  if (mode === 'kit' && kit) {
    return <KitStudio t={t} product={kit} modeSwitch={modeSwitch} onPickKit={onPickKit} {...props} />;
  }
  return (
    <DesignStudio
      t={t}
      studio={studio}
      studioError={studioError}
      onRetryConfig={onRetryConfig}
      modeSwitch={modeSwitch}
      {...props}
    />
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

/** Preview'dagi shortik raqami */
const shortsPreview = (s, number) => (s.withShorts ? { number: s.numberOnShorts ? s.shortsNumber || number : '' } : null);

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

/**
 * 3D forma (WebView, admin bilan bir xil) + "Old/Orqa" + shortik (2D, forma ostida).
 * fallback — WebView moduli yo'q eski dev-build'da yoki WebView ishdan chiqsa oldingi expo-gl ko'rinish.
 */
function Preview({ t, side, setSide, design, name, number, glow, patch, shorts, fallback }) {
  const { height: screenH } = useWindowDimensions();
  const height = Math.max(320, Math.min(520, Math.round(screenH * 0.55)));
  return (
    <View style={styles.previewWrap}>
      <View style={styles.preview}>
        <KitViewer
          t={t}
          height={height}
          design={design}
          backName={name}
          number={number}
          glow={glow}
          patch={patch}
          view={side}
          onViewChange={setSide}
          fallback={fallback}
        />
        <View style={styles.previewSide}>
          <SideSwitch t={t} side={side} setSide={setSide} />
        </View>
      </View>
      {shorts ? (
        <View style={styles.shorts} pointerEvents="none">
          <Shorts width={120} color={design.primaryColor} trim={design.secondaryColor} ink={design.textColor} number={shorts.number} glow={glow} />
        </View>
      ) : null}
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

// ─── Maxsus dizayn ───────────────────────────────────────────────────────────

function DesignStudio({ t, cart, rules, studio, studioError, onRetryConfig, onBack, modeSwitch }) {
  const [side, setSide] = useState('back');
  const [tab, setTab] = useState('color');
  const [solidId, setSolidId] = useState(null);
  const [textColor, setTextColor] = useState(null);
  const [neon, setNeon] = useState(false);
  const [font, setFont] = useState(null);
  const [patch, setPatch] = useState(null);
  const [pkg, setPkg] = useState(null);
  const [name, setName] = useState('');
  const [number, setNumber] = useState('10');
  const [shirtSize, setShirtSize] = useState('L');
  const [quantity, setQuantity] = useState(1);
  const shorts = useShorts(false);
  const { adding, feedback, setFeedback, add } = useAddToCart(t, cart);

  // Superadmin 3D dizaynlari: birinchi yuklanishda birinchisi tanlanadi; null — "O'z rangim"
  const kits = useKitDesigns();
  const [kitDesignId, setKitDesignId] = useState(null);
  const autoPicked = useRef(false);
  useEffect(() => {
    if (!autoPicked.current && kits.designs.length) {
      autoPicked.current = true;
      setKitDesignId(kits.designs[0].id);
      setTab('print');
    }
    // Admin nashrdan olgan dizayn tanlangan bo'lib qolmasin
    setKitDesignId((current) => (current == null || kits.designs.some((d) => d.id === current) ? current : null));
  }, [kits.designs]);
  const kit = kits.designs.find((d) => d.id === kitDesignId) || null;
  const selectDesign = (id) => {
    autoPicked.current = true;
    setKitDesignId(id);
    setTab(id == null ? 'color' : 'print');
  };

  const sizes = visibleSizes(DESIGN_SIZES, rules);
  // Gradient va o'z rangi hozircha o'chirilgan — faqat tayyor ranglar
  const solidColors = studio ? SOLID_COLORS.filter((c) => studio.colors.solid.includes(c.id)) : [];
  // Eski backend textColors bermasa — ilovadagi ro'yxat
  const textColors = studio ? TEXT_COLORS.filter((c) => !studio.textColors || studio.textColors.includes(c.id)) : [];
  const neonAvailable = !studio?.textEffects || studio.textEffects.includes(NEON);

  // Superadmin tanlovni o'chirsa (config yangilanganda) — yoqilganiga o'tamiz
  useEffect(() => {
    if (!studio) return;
    setSolidId((current) => keepEnabled(current, studio.colors.solid));
    setFont((current) => keepEnabled(current, studio.fonts));
    setPatch((current) => (current && studio.patches.includes(current) ? current : null));
    setPkg((current) => keepEnabled(current, studio.packages));
  }, [studio]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setShirtSize((current) => pickSize(sizes, current || 'L'));
    shorts.setShortsSize((current) => pickSize(sizes, current || 'L'));
  }, [rules.allowKidsSizes]); // eslint-disable-line react-hooks/exhaustive-deps

  const header = <Header cart onBack={onBack} title={t('designStudio')} />;
  // Rang turi, shrift yoki qadoq umuman yoqilmagan bo'lsa server "O'z rangim" dizaynini qabul qilmaydi
  const customReady = Boolean(studio && solidColors.length && studio.fonts.length && studio.packages.length);
  const picker = (
    <KitDesignPicker
      t={t}
      designs={kits.designs}
      loading={kits.loading}
      error={kits.error}
      onRetry={kits.reload}
      selectedId={kit ? kit.id : null}
      onSelect={selectDesign}
      showCustom={customReady || !studio}
    />
  );

  if (!kit && !studio) {
    return (
      <Screen>
        {header}
        {modeSwitch}
        {picker}
        {studioError ? (
          <ErrorView message={t('studioLoadError')} onRetry={onRetryConfig} retryLabel={t('retry')} />
        ) : (
          <LoadingSpinner />
        )}
      </Screen>
    );
  }

  if (!kit && !customReady) {
    return (
      <Screen>
        {header}
        {modeSwitch}
        {picker}
        <Card style={styles.unavailable}>
          <MaterialCommunityIcons name="palette-outline" size={36} color={colors.accent} />
          <Text style={styles.unavailableText}>{t('studioUnavailable')}</Text>
        </Card>
      </Screen>
    );
  }

  const design = {
    color: { type: 'solid', id: solidId },
    font,
    patch,
    package: pkg,
    ...(textColor && { textColor }),
    ...(neon && neonAvailable && { textEffect: NEON }),
  };
  const preview = designPreview(design);
  const printName = name.trim();
  // Narx taxminiy ko'rsatiladi — yakuniysini server hisoblaydi (3D dizayn: club.*, o'z rangim: studio.*)
  const unit = kit
    ? kit.prices.shirt + (printName || number ? kit.prices.print : 0) + (shorts.withShorts ? kit.prices.shorts : 0)
    : estimatePrice(design, studio.prices, shorts.withShorts);
  const maxQty = Math.max(1, Math.min(rules.maxQtyPerItem, 20));
  const paused = !rules.acceptOrders;

  const showExtras = !kit && (studio.patches.length > 0 || studio.packages.length > 1);
  const tabs = [
    ...(kit ? [] : [['color', t('tabColor')]]),
    ['print', t('tabPrint')],
    ['shorts', t('tabShorts')],
    ...(showExtras ? [['extras', t('tabExtras')]] : []),
    ['size', t('tabSize')],
  ];
  const activeTab = tabs.some(([key]) => key === tab) ? tab : tabs[0][0];
  // 3D ko'rinishdagi forma: tanlangan admin dizayni yoki "o'z rangim" (rang + neon + yamoq)
  const viewDesign = kit ? kit.design : studioKitDesign(preview);
  const turnToBack = () => setSide('back');

  const addToCart = () => {
    if (!shirtSize) return;
    if (isNumberInvalid(number, rules) || (shorts.withShorts && shorts.numberOnShorts && isNumberInvalid(shorts.shortsNumber, rules))) {
      setFeedback({ ok: false, text: `${t('numberRange')}: ${rules.printNumberMin}–${rules.printNumberMax}` });
      return;
    }
    add({
      ...(kit ? { kitDesignId: kit.id } : { design }),
      shirtSize,
      printName: printName || null,
      printNumber: number || null,
      quantity,
      ...shortsPayload(shorts, shirtSize),
    });
  };

  const renderColor = () => (
    <View>
      <Overline>{t('readyColors')}</Overline>
      <View style={styles.swatches}>
        {solidColors.map((c) => (
          <Swatch key={c.id} label={t(`color_${c.id}`)} selected={solidId === c.id} onPress={() => setSolidId(c.id)}>
            <View style={[styles.swatchFill, { backgroundColor: c.hex }]} />
          </Swatch>
        ))}
      </View>
    </View>
  );

  const renderPrint = () => (
    <View>
      <Overline>{t('nameNumber')}</Overline>
      <PrintInputs
        t={t}
        rules={rules}
        name={name}
        setName={setName}
        number={number}
        setNumber={setNumber}
        nameStyle={kit ? undefined : preview.fontStyle}
        onFocus={turnToBack}
      />
      {kit ? <Text style={styles.hint}>{t('printHint')} · +{formatMoney(kit.prices.print)}</Text> : renderPrintStyle()}
    </View>
  );

  // "O'z rangim" uchun: yozuv rangi, neon va shrift (3D dizaynda bular admin dizaynida belgilangan)
  const renderPrintStyle = () => (
    <View>
      <Overline style={styles.overlineGap}>{t('textColor')}</Overline>
      <View style={styles.swatches}>
        <Swatch label={t('textColorAuto')} selected={!textColor} onPress={() => setTextColor(null)}>
          <View style={[styles.swatchFill, styles.autoSwatch]}>
            <View style={[styles.autoHalf, { backgroundColor: preview.color }]} />
            <Text style={[styles.autoA, { color: designPreview({ ...design, textColor: null }).accent }]}>A</Text>
          </View>
        </Swatch>
        {textColors.map((c) => (
          <Swatch key={c.id} label={t(`tcolor_${c.id}`)} selected={textColor === c.id} onPress={() => setTextColor(c.id)}>
            <View style={[styles.swatchFill, { backgroundColor: c.hex }]} />
          </Swatch>
        ))}
      </View>

      {neonAvailable ? (
        <View style={[styles.panelRow, styles.overlineGap]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{t('neonEffect')}</Text>
            <Text style={styles.rowSub}>{t('neonEffectSub')}</Text>
          </View>
          <Switch value={neon} onValueChange={setNeon} trackColor={{ false: '#2A3160', true: colors.teal }} thumbColor="#FFFFFF" />
        </View>
      ) : null}

      {studio.fonts.length > 1 ? (
        <View>
          <Overline style={styles.overlineGap}>{t('fontTitle')}</Overline>
          <View style={styles.options}>
            {studio.fonts.map((id) => (
              <OptionChip key={id} selected={font === id} onPress={() => setFont(id)}>
                <Text style={[styles.fontSample, designPreview({ font: id }).fontStyle, font === id && styles.optionTextActive]}>
                  {t(`font_${id}`)}
                </Text>
              </OptionChip>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );

  const renderExtras = () => (
    <View>
      {studio.patches.length > 0 ? (
        <View>
          <Overline>{t('patchTitle')} · +{formatMoney(studio.prices.patch)}</Overline>
          <View style={styles.options}>
            <OptionChip selected={!patch} onPress={() => setPatch(null)}>
              <Text style={[styles.optionText, !patch && styles.optionTextActive]}>{t('noPatch')}</Text>
            </OptionChip>
            {PATCHES.filter((p) => studio.patches.includes(p.id)).map((p) => (
              <OptionChip key={p.id} selected={patch === p.id} onPress={() => setPatch(p.id)}>
                <Text style={[styles.optionText, patch === p.id && styles.optionTextActive]}>
                  {p.sym} · {t(`patch_${p.id}`)}
                </Text>
              </OptionChip>
            ))}
          </View>
        </View>
      ) : null}
      {studio.packages.length > 1 ? (
        <View>
          <Overline style={studio.patches.length > 0 && styles.overlineGap}>{t('packageTitle')}</Overline>
          {studio.packages.map((id) => (
            <Pressable
              key={id}
              onPress={() => setPkg(id)}
              style={[styles.packageRow, pkg === id && styles.packageRowActive]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{t(`pkg_${id}`)}</Text>
                <Text style={styles.rowSub}>{t(`pkgSub_${id}`)}</Text>
              </View>
              <Text style={styles.rowSub}>
                {id === GIFT_PACKAGE ? `+${formatMoney(studio.prices.gift)}` : t('free')}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );

  const renderSize = () => (
    <View>
      <Overline>{t('shirtSize')}</Overline>
      <SizeRow sizes={sizes} selected={shirtSize} onPick={setShirtSize} />
      <Overline style={styles.overlineGap}>{t('quantityTitle')}</Overline>
      <View style={styles.qtyRow}>
        <Pressable
          style={styles.qtyButton}
          hitSlop={6}
          disabled={quantity <= 1}
          onPress={() => setQuantity((q) => Math.max(1, q - 1))}
        >
          <MaterialCommunityIcons name="minus" size={16} color={colors.text} />
        </Pressable>
        <Text style={styles.qty}>{quantity}</Text>
        <Pressable
          style={styles.qtyButton}
          hitSlop={6}
          disabled={quantity >= maxQty}
          onPress={() => setQuantity((q) => Math.min(maxQty, q + 1))}
        >
          <MaterialCommunityIcons name="plus" size={16} color={colors.text} />
        </Pressable>
        <Text style={styles.rowSub}>× {formatMoney(unit)}</Text>
      </View>
    </View>
  );

  const renderShorts = () => (
    <ShortsPanel
      t={t}
      rules={rules}
      sizes={sizes}
      price={kit ? kit.prices.shorts : (studio.prices.shorts ?? 0)}
      s={{ ...shorts, fallbackNumber: number }}
    />
  );

  const panels = { color: renderColor, print: renderPrint, shorts: renderShorts, extras: renderExtras, size: renderSize };

  return (
    <KeyboardSafe>
      <Screen
        contentStyle={{ paddingBottom: 170 }}
        footerStyle={{ bottom: TAB_BAR_HEIGHT }}
        footer={
          <StudioFooter
            t={t}
            label={t('estimatedTotal')}
            price={unit * quantity}
            paused={paused}
            rules={rules}
            feedback={feedback}
            adding={adding}
            disabled={!shirtSize}
            onAdd={addToCart}
          />
        }
      >
        {header}
        {modeSwitch}
        {picker}

        <Preview
          t={t}
          side={side}
          setSide={setSide}
          design={viewDesign}
          name={printName}
          number={number}
          glow={!kit && preview.glow}
          patch={kit ? null : preview.patch}
          shorts={shortsPreview(shorts, number)}
          fallback={
            <Jersey3D
              kit={{
                color: viewDesign.primaryColor,
                ink: viewDesign.textColor,
                textStyle: kit ? undefined : preview.fontStyle,
                glow: !kit && preview.glow,
                patches: !kit && patchKind(preview.patch) ? [patchKind(preview.patch)] : [],
              }}
              name={printName}
              number={number}
              side={side}
              onSideChange={setSide}
              width={190}
            />
          }
        />

        <Tabs tabs={tabs} value={activeTab} onChange={setTab} />
        <View style={styles.panel}>{panels[activeTab]()}</View>
      </Screen>
    </KeyboardSafe>
  );
}

function Swatch({ label, selected, onPress, children }) {
  return (
    <Pressable onPress={onPress} style={styles.swatch}>
      <View style={[styles.swatchRing, selected && styles.swatchRingActive]}>{children}</View>
      {label ? (
        <Text style={[styles.swatchLabel, selected && styles.optionTextActive]} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

function OptionChip({ selected, onPress, children }) {
  return (
    <Pressable onPress={onPress} style={[styles.optionChip, selected && styles.sizeChipActive]}>
      {children}
    </Pressable>
  );
}

// ─── Klub formasi ────────────────────────────────────────────────────────────

// Backend savat qatori: forma (kitId), futbolka o'lchami, ism/raqam bosmasi,
// shortik (+ o'lchami, raqami).
function KitStudio({ t, product, cart, rules, onBack, onPickKit, modeSwitch }) {
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
  // 3D ko'rinish uchun: forma rangi, yozuv rangi, nishonda klub kodi (haqiqiy klub logotipi emas)
  const design = useMemo(() => clubKitDesign(product), [product]);
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
        {modeSwitch}

        {/* Klub formasi: shortik tanlansa ostida ko'rinadi, "shortikka raqam" darhol aks etadi */}
        <Preview
          t={t}
          side={side}
          setSide={setSide}
          design={design}
          name={printName}
          number={number}
          shorts={shortsPreview(shorts, number)}
          fallback={
            <Jersey3D
              kit={{ color: product.color || '#1A3582', ink: product.accent || '#FFFFFF', crest: product.code }}
              name={printName}
              number={number}
              side={side}
              onSideChange={setSide}
              width={190}
            />
          }
        />

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
  modeSwitch: { alignSelf: 'stretch', marginBottom: spacing.md },
  flex: { flex: 1 },
  previewWrap: { marginBottom: spacing.lg },
  // 3D sahna (WebView) butun qutini egallaydi; fon — viewer'dagi studiya foni bilan bir xil
  preview: {
    minHeight: 330,
    borderRadius: radii.xl,
    backgroundColor: '#1a1b1e',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewSide: { position: 'absolute', bottom: 12, alignSelf: 'center' },
  shorts: { alignItems: 'center', marginTop: spacing.sm },
  autoSwatch: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised },
  autoHalf: { ...StyleSheet.absoluteFillObject, left: '50%' },
  autoA: { fontSize: 18, fontWeight: '900' },
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
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  swatch: { width: 56, alignItems: 'center', gap: 4 },
  swatchRing: { width: 46, height: 46, borderRadius: 23, padding: 3, borderWidth: 2, borderColor: 'transparent' },
  swatchRingActive: { borderColor: colors.accent },
  swatchFill: { flex: 1, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
  swatchLabel: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  optionText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  optionTextActive: { color: colors.accent, fontWeight: '800' },
  fontSample: { color: colors.muted, fontSize: 15 },
  packageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  packageRowActive: { borderColor: colors.accent },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  qtyButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qty: { color: colors.text, fontSize: 16, fontWeight: '900', minWidth: 20, textAlign: 'center' },
  unavailable: { alignItems: 'center', gap: spacing.md, marginTop: spacing.xl },
  unavailableText: { color: colors.muted, textAlign: 'center', lineHeight: 20 },
});
