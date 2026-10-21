<<<<<<< HEAD
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import JerseyVisualizer from '../components/ui/JerseyVisualizer';
import { useToast } from '../components/ui/Toast';
import { colors, radii, spacing } from '../constants/theme';

const SOLIDS = [
  '#0E1A3F',
  '#F3F5F9',
  '#1D2F8C',
  '#19A7A1',
  '#F2A33A',
  '#B8323F',
  '#121A42',
  '#4CAF6A',
];

const GRADS = [
  { name: 'Quyosh', value: '#F2A33A,#B8323F' },
  { name: 'Okean', value: '#19A7A1,#1D2F8C' },
  { name: 'Olov', value: '#B8323F,#0E1A3F' },
  { name: 'Neon', value: '#9184D9,#19A7A1' },
  { name: 'Tun', value: '#1D2F8C,#080C24' },
  { name: 'Formo', value: '#F2A33A,#B8323F,#1D2F8C' },
];

const INKS = ['#F3F5F9', '#F2A33A', '#19A7A1', '#B8323F', '#080C24'];

const FONTS = [
  'Saira Extra Condensed',
  'Bebas Neue',
  'Russo One',
  'Permanent Marker',
  'Pacifico',
  'Unbounded',
];

const PRINTS = [
  { id: 'std', title: 'Oddiy', sub: 'DTF, mat', price: 0 },
  { id: 'glow', title: 'Qorong‘ida yonadi', sub: 'Raqam tunda porlaydi', price: 15000 },
  { id: 'refl', title: 'Reflektiv', sub: 'Chiroqda yaltiraydi', price: 15000 },
  { id: 'gold', title: 'Metallik oltin', sub: 'Folga bosma', price: 20000 },
];

const PATCHES = [
  { id: 'cap', title: 'Kapitan', icon: 'shield-star', where: 'Chap yeng', price: 5000 },
  { id: 'flag', title: 'Bayroq', icon: 'flag', where: 'O‘ng yeng', price: 5000 },
  { id: 'star', title: 'Yulduz', icon: 'star', where: 'Gerb ustida', price: 5000 },
];

export default function StudioScreen({
  auth,
  t,
  onBack,
  onProceedToSize,
}) {
  const toast = useToast();
  const userName = auth?.user?.fullName?.split(' ')[0]?.toUpperCase() || 'AZIZ';

  // Design state
  const [side, setSide] = useState('front');
  const [tool, setTool] = useState('rang'); // rang | matn | orqa | logo | shorts | extra

  // Colors & gradient
  const [mode, setMode] = useState('solid'); // solid | grad
  const [color, setColor] = useState('#0E1A3F');
  const [grad, setGrad] = useState('#F2A33A,#B8323F,#1D2F8C');
  const [gradAngle, setGradAngle] = useState(160);

  // Front Motto
  const [motto, setMotto] = useState('');
  const [mottoSize, setMottoSize] = useState(24);
  const [outline, setOutline] = useState(false);
  const [collarText, setCollarText] = useState('');

  // Back Player & Number
  const [player, setPlayer] = useState(userName);
  const [number, setNumber] = useState('10');
  const [ink, setInk] = useState('#F3F5F9');
  const [font, setFont] = useState('Saira Extra Condensed');

  // Crest / AI Logo
  const [crest, setCrest] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiOptions, setAiOptions] = useState([]);

  // Shorts
  const [hasShorts, setHasShorts] = useState(true);
  const [soColor, setSoColor] = useState('#0E1A3F');
  const [soTrim, setSoTrim] = useState('#F3F5F9');
  const [soInk, setSoInk] = useState('#F3F5F9');
  const [soNum, setSoNum] = useState(true);

  // Extra patches & print
  const [selectedPatches, setSelectedPatches] = useState([]);
  const [selectedPrint, setSelectedPrint] = useState('std');

  // Price calculations
  const printExtra = PRINTS.find((p) => p.id === selectedPrint)?.price || 0;
  const patchesExtra = selectedPatches.length * 5000;
  const gradExtra = mode === 'grad' ? 20000 : 0;
  const mottoExtra = motto.trim() ? 10000 : 0;
  const crestExtra = crest ? 10000 : 0;
  const shortsExtra = hasShorts ? 60000 : 0;

  const unitPrice = 129000 + gradExtra + mottoExtra + crestExtra + patchesExtra + printExtra + shortsExtra;

  const handleMatchShorts = () => {
    setSoColor(mode === 'grad' ? grad.split(',')[0] : color);
    setSoTrim(ink);
    setSoInk(ink);
    toast.show('Shortik ranglari futbolkaga moslandi', 'success');
  };

  const handleAiGenerate = () => {
    if (!aiPrompt.trim()) {
      toast.show('Logo uchun tavsif yozing', 'error');
      return;
    }
    setAiLoading(true);
    setTimeout(() => {
      setAiLoading(false);
      const initials = aiPrompt
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 3) || 'FC';
      setAiOptions([
        { id: 1, initials, icon: 'crown', color: '#F2A33A' },
        { id: 2, initials, icon: 'lightning-bolt', color: '#19A7A1' },
        { id: 3, initials, icon: 'star', color: '#B8323F' },
      ]);
      setCrest(initials);
      toast.show('AI logotiplar generatsiya qilindi', 'success');
    }, 1200);
  };

  const togglePatch = (patchId) => {
    if (selectedPatches.includes(patchId)) {
      setSelectedPatches(selectedPatches.filter((p) => p !== patchId));
    } else {
      setSelectedPatches([...selectedPatches, patchId]);
      setSide('front');
    }
  };

  const handleProceed = () => {
    const designConfig = {
      color,
      mode,
      grad: mode === 'grad' ? grad : '',
      gradAngle,
      motto: motto.trim(),
      mottoSize,
      outline,
      collarText: collarText.trim(),
      player: player.trim().toUpperCase(),
      number: number.trim(),
      ink,
      font,
      crest,
      patches: selectedPatches,
      print: selectedPrint,
      hasShorts,
      shorts: hasShorts
        ? {
            color: soColor,
            trim: soTrim,
            ink: soInk,
            number: soNum ? number : '',
          }
        : null,
      unitPrice,
    };

    onProceedToSize?.(designConfig);
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Top Bar */}
          <View style={styles.topBar}>
            {Boolean(onBack) && (
              <Pressable onPress={onBack} hitSlop={10} style={styles.iconBtn}>
                <MaterialCommunityIcons name="arrow-left" size={24} color="#F3F5F9" />
              </Pressable>
            )}
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.topTitle}>Dizayn studiyasi</Text>
              <Text style={styles.topSub}>Noldan o‘z formangizni yarating</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          {/* Jersey Visualizer Stage */}
          <View style={styles.stage}>
            <View style={styles.sideToggle}>
              <Pressable
                onPress={() => setSide('front')}
                style={[styles.sideBtn, side === 'front' && styles.sideBtnActive]}
              >
                <Text style={[styles.sideBtnText, side === 'front' && styles.sideBtnTextActive]}>
                  Old
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setSide('back')}
                style={[styles.sideBtn, side === 'back' && styles.sideBtnActive]}
              >
                <Text style={[styles.sideBtnText, side === 'back' && styles.sideBtnTextActive]}>
                  Orqa
                </Text>
              </Pressable>
            </View>

            <View style={styles.visualWrap}>
              <JerseyVisualizer
                color={color}
                trim={ink}
                ink={ink}
                pattern="none"
                grad={mode === 'grad' ? grad : ''}
                gradAngle={gradAngle}
                player={player}
                number={number}
                motto={motto}
                mottoSize={mottoSize}
                outline={outline}
                crest={crest}
                patches={selectedPatches}
                side={side}
                size={200}
                showShorts={hasShorts}
                shorts={{
                  color: soColor,
                  trim: soTrim,
                  ink: soInk,
                  number: soNum ? number : '',
                }}
              />
            </View>
          </View>

          {/* Tools Menu Bar */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.toolsBar}
          >
            {[
              { id: 'rang', label: 'Rang', icon: 'palette' },
              { id: 'matn', label: 'Old yozuv', icon: 'format-text' },
              { id: 'orqa', label: 'Orqa', icon: 'numeric' },
              { id: 'logo', label: 'Logo', icon: 'shield-account' },
              { id: 'shorts', label: 'Shortik', icon: 'tshirt-crew' },
              { id: 'extra', label: 'Boshqa', icon: 'seal' },
            ].map((tItem) => {
              const active = tool === tItem.id;
              return (
                <Pressable
                  key={tItem.id}
                  onPress={() => {
                    setTool(tItem.id);
                    if (tItem.id === 'orqa') setSide('back');
                    if (tItem.id === 'matn' || tItem.id === 'logo') setSide('front');
                  }}
                  style={[styles.toolChip, active && styles.toolChipActive]}
                >
                  <MaterialCommunityIcons
                    name={tItem.icon}
                    size={18}
                    color={active ? colors.accent : colors.muted}
                  />
                  <Text style={[styles.toolLabel, active && styles.toolLabelActive]}>
                    {tItem.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Active Tool Content Card */}
          <View style={styles.card}>
            {/* 1. RANG TOOL */}
            {tool === 'rang' && (
              <View>
                <View style={styles.modeToggle}>
                  <Pressable
                    onPress={() => setMode('solid')}
                    style={[styles.modeBtn, mode === 'solid' && styles.modeBtnActive]}
                  >
                    <Text style={[styles.modeText, mode === 'solid' && styles.modeTextActive]}>
                      Bir rang
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setMode('grad')}
                    style={[styles.modeBtn, mode === 'grad' && styles.modeBtnActive]}
                  >
                    <Text style={[styles.modeText, mode === 'grad' && styles.modeTextActive]}>
                      Gradient (+20 000 so‘m)
                    </Text>
                  </Pressable>
                </View>
=======
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radii, spacing, TAB_BAR_HEIGHT } from '../constants/theme';
import { Button, Card, Header, Overline, Screen, Segment, formatMoney } from '../components/ui/Common';
import ErrorView from '../components/ui/ErrorView';
import { JerseyPreview } from '../components/ui/JerseyPreview';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { visibleSizes } from '../features/config';
import {
  CUSTOM_COLOR_DEFAULT,
  CUSTOM_PALETTE,
  GIFT_PACKAGE,
  GRADIENTS,
  HEX,
  PATCHES,
  SOLID_COLORS,
  designPreview,
  estimatePrice,
} from '../features/studio';
import { errorText } from '../utils/errors';

// Studiyaning ikki rejimi:
//  - "Maxsus dizayn" (pastki tabdan) — POST /cart/items { design }: rang (bir rang,
//    gradient yoki o'z HEX rangi), shrift, yamoq, qadoq + ism/raqam. Tanlovlar
//    GET /app/config → `studio`dan; faqat yoqilganlari ko'rsatiladi. Logo yuklash yo'q
//    (serverda fayl saqlash hali yo'q).
//  - "Klub formasi" (klub sahifasidan) — POST /cart/items { kitId }: o'lcham,
//    ism/raqam bosmasi, shortik.
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

function PrintInputs({ t, rules, name, setName, number, setNumber, nameStyle }) {
  const numberValue = number === '' ? null : Number(number);
  const numberInvalid = numberValue != null && (numberValue < rules.printNumberMin || numberValue > rules.printNumberMax);
  return (
    <View>
      <View style={styles.inputs}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t('namePlaceholder')}
          placeholderTextColor={colors.muted}
          style={[styles.textInput, { flex: 1 }, nameStyle]}
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
      {numberInvalid ? (
        <Text style={[styles.hint, styles.errorFeedback]}>
          {t('numberRange')}: {rules.printNumberMin}–{rules.printNumberMax}
        </Text>
      ) : null}
    </View>
  );
}

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

function CartLink({ t, cart, onOpenCart }) {
  if (cart.count <= 0) return null;
  return (
    <Pressable onPress={onOpenCart} style={styles.cartLink}>
      <Text style={styles.cartLinkText}>{t('openCart')} · {cart.count} {t('items')}</Text>
      <MaterialCommunityIcons name="chevron-right" size={16} color={colors.accent} />
    </Pressable>
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

function DesignStudio({ t, cart, rules, studio, studioError, onRetryConfig, onOpenCart, onBack, modeSwitch }) {
  const [side, setSide] = useState('back');
  const [tab, setTab] = useState('color');
  const [colorType, setColorType] = useState('solid');
  const [solidId, setSolidId] = useState(null);
  const [gradientId, setGradientId] = useState(null);
  const [customHex, setCustomHex] = useState(CUSTOM_COLOR_DEFAULT);
  const [font, setFont] = useState(null);
  const [patch, setPatch] = useState(null);
  const [pkg, setPkg] = useState(null);
  const [name, setName] = useState('');
  const [number, setNumber] = useState('10');
  const [shirtSize, setShirtSize] = useState('L');
  const [quantity, setQuantity] = useState(1);
  const { adding, feedback, setFeedback, add } = useAddToCart(t, cart);

  const sizes = visibleSizes(DESIGN_SIZES, rules);
  const colorTypes = studio
    ? [
        studio.colors.solid.length ? 'solid' : null,
        studio.colors.gradient.length ? 'gradient' : null,
        studio.colors.custom ? 'custom' : null,
      ].filter(Boolean)
    : [];

  // Superadmin tanlovni o'chirsa (config yangilanganda) — yoqilganiga o'tamiz
  useEffect(() => {
    if (!studio) return;
    setSolidId((current) => keepEnabled(current, studio.colors.solid));
    setGradientId((current) => keepEnabled(current, studio.colors.gradient));
    setColorType((current) => keepEnabled(current, colorTypes));
    setFont((current) => keepEnabled(current, studio.fonts));
    setPatch((current) => (current && studio.patches.includes(current) ? current : null));
    setPkg((current) => keepEnabled(current, studio.packages));
  }, [studio]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setShirtSize((current) => pickSize(sizes, current || 'L'));
  }, [rules.allowKidsSizes]); // eslint-disable-line react-hooks/exhaustive-deps

  const header = (
    <Header logo onBack={onBack} title={t('designStudio')} right={<SideSwitch t={t} side={side} setSide={setSide} />} />
  );

  if (!studio) {
    return (
      <Screen>
        {header}
        {modeSwitch}
        {studioError ? (
          <ErrorView message={t('studioLoadError')} onRetry={onRetryConfig} retryLabel={t('retry')} />
        ) : (
          <LoadingSpinner />
        )}
      </Screen>
    );
  }

  // Rang turi, shrift yoki qadoq umuman yoqilmagan bo'lsa server dizaynni qabul qilmaydi
  if (!colorTypes.length || !studio.fonts.length || !studio.packages.length) {
    return (
      <Screen>
        {header}
        {modeSwitch}
        <Card style={styles.unavailable}>
          <MaterialCommunityIcons name="palette-outline" size={36} color={colors.accent} />
          <Text style={styles.unavailableText}>{t('studioUnavailable')}</Text>
        </Card>
      </Screen>
    );
  }

  const hexValid = HEX.test(customHex);
  const color =
    colorType === 'gradient'
      ? { type: 'gradient', id: gradientId }
      : colorType === 'custom'
        ? { type: 'custom', hex: customHex.toUpperCase() }
        : { type: 'solid', id: solidId };
  const design = { color, font, patch, package: pkg };
  const preview = designPreview(design);
  const unit = estimatePrice(design, studio.prices);
  const maxQty = Math.max(1, Math.min(rules.maxQtyPerItem, 20));
  const printName = name.trim();
  const paused = !rules.acceptOrders;

  const showExtras = studio.patches.length > 0 || studio.packages.length > 1;
  const tabs = [
    ['color', t('tabColor')],
    ['print', t('tabPrint')],
    ...(showExtras ? [['extras', t('tabExtras')]] : []),
    ['size', t('tabSize')],
  ];
  const typeLabels = { solid: t('oneColor'), gradient: t('gradientMode'), custom: t('customColor') };

  const addToCart = () => {
    if (!shirtSize) return;
    if (colorType === 'custom' && !hexValid) {
      setFeedback({ ok: false, text: t('invalidHex') });
      return;
    }
    if (isNumberInvalid(number, rules)) {
      setFeedback({ ok: false, text: `${t('numberRange')}: ${rules.printNumberMin}–${rules.printNumberMax}` });
      return;
    }
    add({
      design,
      shirtSize,
      printName: printName || null,
      printNumber: number || null,
      quantity,
    });
  };

  const renderColor = () => (
    <View>
      {colorTypes.length > 1 ? (
        <Segment
          wide
          style={styles.typeSwitch}
          options={colorTypes.map((type) => typeLabels[type])}
          value={typeLabels[colorType]}
          onChange={(label) => setColorType(colorTypes.find((type) => typeLabels[type] === label))}
        />
      ) : null}

      {colorType === 'solid' ? (
        <View>
          <Overline>{t('readyColors')}</Overline>
          <View style={styles.swatches}>
            {SOLID_COLORS.filter((c) => studio.colors.solid.includes(c.id)).map((c) => (
              <Swatch
                key={c.id}
                label={t(`color_${c.id}`)}
                selected={solidId === c.id}
                onPress={() => setSolidId(c.id)}
              >
                <View style={[styles.swatchFill, { backgroundColor: c.hex }]} />
              </Swatch>
            ))}
          </View>
        </View>
      ) : colorType === 'gradient' ? (
        <View>
          <Overline>{t('gradientColors')} · +{formatMoney(studio.prices.gradient)}</Overline>
          <View style={styles.swatches}>
            {GRADIENTS.filter((g) => studio.colors.gradient.includes(g.id)).map((g) => (
              <Swatch
                key={g.id}
                label={t(`grad_${g.id}`)}
                selected={gradientId === g.id}
                onPress={() => setGradientId(g.id)}
              >
                <LinearGradient colors={[g.from, g.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.swatchFill} />
              </Swatch>
            ))}
          </View>
        </View>
      ) : (
        <View>
          <Overline>{t('customColor')} · +{formatMoney(studio.prices.gradient)}</Overline>
          <View style={styles.swatches}>
            {CUSTOM_PALETTE.map((hex) => (
              <Swatch key={hex} selected={customHex.toUpperCase() === hex} onPress={() => setCustomHex(hex)}>
                <View style={[styles.swatchFill, { backgroundColor: hex }]} />
              </Swatch>
            ))}
          </View>
          <View style={[styles.inputs, styles.overlineGap]}>
            <View style={[styles.hexDot, { backgroundColor: hexValid ? customHex : 'transparent' }]} />
            <TextInput
              value={customHex}
              onChangeText={(value) => setCustomHex(`#${value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6)}`)}
              placeholder={CUSTOM_COLOR_DEFAULT}
              placeholderTextColor={colors.muted}
              style={[styles.textInput, { flex: 1 }]}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={7}
            />
          </View>
          <Text style={[styles.hint, !hexValid && styles.errorFeedback]}>
            {hexValid ? t('customHexHint') : t('invalidHex')}
          </Text>
        </View>
      )}
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
        nameStyle={preview.fontStyle}
      />
      <Text style={styles.hint}>{t('priceIncludesPrint')}</Text>
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
              <MaterialCommunityIcons
                name={id === GIFT_PACKAGE ? 'gift-outline' : 'package-variant-closed'}
                size={20}
                color={pkg === id ? colors.accent : colors.muted}
              />
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

  const panels = { color: renderColor, print: renderPrint, extras: renderExtras, size: renderSize };

  return (
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
          disabled={!shirtSize || (colorType === 'custom' && !hexValid)}
          onAdd={addToCart}
        />
      }
    >
      {header}
      {modeSwitch}

      <View style={styles.preview}>
        <View style={styles.glow} />
        <JerseyPreview product={preview} number={number || ''} large side={side} name={printName || ' '} />
      </View>

      <Tabs tabs={tabs} value={panels[tab] ? tab : 'color'} onChange={setTab} />
      <View style={styles.panel}>{(panels[tab] || renderColor)()}</View>
      <Text style={[styles.hint, styles.centerHint]}>{t('priceNote')}</Text>

      <CartLink t={t} cart={cart} onOpenCart={onOpenCart} />
    </Screen>
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
function KitStudio({ t, product, cart, rules, onOpenCart, onBack, onPickKit, modeSwitch }) {
  const [side, setSide] = useState('back');
  const [tab, setTab] = useState('size');
  const [name, setName] = useState('');
  const [number, setNumber] = useState('10');
  const [shirtSize, setShirtSize] = useState(null);
  const [withShorts, setWithShorts] = useState(true);
  const [shortsSize, setShortsSize] = useState(null);
  const [numberOnShorts, setNumberOnShorts] = useState(false);
  const { adding, feedback, setFeedback, add } = useAddToCart(t, cart);

  // Forma almashganda mavjud o'lchamni qayta tanlaymiz
  // (bolalar o'lchamlari Superadmin sozlamasida o'chirilishi mumkin)
  const sizes = visibleSizes(product.sizes, rules);
  useEffect(() => {
    setShirtSize((current) => pickSize(sizes, current || 'L'));
    setShortsSize((current) => pickSize(sizes, current || 'L'));
  }, [product.kitId, rules.allowKidsSizes]); // eslint-disable-line react-hooks/exhaustive-deps

  const printName = name.trim();
  const hasPrint = Boolean(printName || number);
  const prices = product.priceBreakdown;
  const price = prices.shirt + (withShorts ? prices.shorts : 0) + (hasPrint ? prices.print : 0);
  const paused = !rules.acceptOrders;

  const tabs = [
    ['size', t('tabSize')],
    ['print', t('tabPrint')],
    ['shorts', t('tabShorts')],
  ];

  const addToCart = () => {
    if (!shirtSize) return;
    if (isNumberInvalid(number, rules)) {
      setFeedback({ ok: false, text: `${t('numberRange')}: ${rules.printNumberMin}–${rules.printNumberMax}` });
      return;
    }
    add({
      kitId: product.kitId,
      shirtSize,
      printName: printName || null,
      printNumber: number || null,
      withShorts,
      ...(withShorts ? { shortsSize: shortsSize || shirtSize, numberOnShorts } : {}),
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
          <PrintInputs t={t} rules={rules} name={name} setName={setName} number={number} setNumber={setNumber} />
          <Text style={styles.hint}>{t('printHint')} · +{formatMoney(prices.print)}</Text>
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
            <SizeRow sizes={sizes} selected={shortsSize} onPick={setShortsSize} />
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
      <Header logo onBack={onBack} title={t('designStudio')} right={<SideSwitch t={t} side={side} setSide={setSide} />} />
      {modeSwitch}

      <View style={styles.preview}>
        <View style={styles.glow} />
        <JerseyPreview product={product} number={number || ''} large side={side} name={printName || ' '} />
      </View>

      <Pressable style={styles.kitRow} onPress={onPickKit}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle} numberOfLines={1}>{product.name}</Text>
          <Text style={styles.rowSub}>{t('chooseOtherKit')}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.accent} />
      </Pressable>

      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      <View style={styles.panel}>{renderPanel()}</View>
>>>>>>> fb102bed4b36fd02c0a0e3b3ae938f93892f7dd5

                {mode === 'solid' ? (
                  <View style={styles.colorsGrid}>
                    {SOLIDS.map((c) => (
                      <Pressable
                        key={c}
                        onPress={() => setColor(c)}
                        style={[
                          styles.colorSwatch,
                          { backgroundColor: c },
                          color === c && styles.colorSwatchActive,
                        ]}
                      />
                    ))}
                  </View>
                ) : (
                  <View>
                    <View style={styles.gradsGrid}>
                      {GRADS.map((g) => (
                        <Pressable
                          key={g.name}
                          onPress={() => setGrad(g.value)}
                          style={[
                            styles.gradItem,
                            grad === g.value && styles.gradItemActive,
                          ]}
                        >
                          <View
                            style={[
                              styles.gradPreview,
                              {
                                backgroundColor: g.value.split(',')[0],
                              },
                            ]}
                          />
                          <Text
                            style={[
                              styles.gradName,
                              grad === g.value && styles.gradNameActive,
                            ]}
                          >
                            {g.name}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

<<<<<<< HEAD
                    {/* Gradient angle selector */}
                    <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Gradient burchagi: {gradAngle}°</Text>
                    <View style={styles.angleRow}>
                      {[45, 90, 135, 160, 225].map((ang) => (
                        <Pressable
                          key={ang}
                          onPress={() => setGradAngle(ang)}
                          style={[
                            styles.angleChip,
                            gradAngle === ang && styles.angleChipActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.angleText,
                              gradAngle === ang && styles.angleTextActive,
                            ]}
                          >
                            {ang}°
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* 2. MATN TOOL */}
            {tool === 'matn' && (
              <View>
                <Text style={styles.fieldLabel}>Ko‘krakdagi yozuv (motto)</Text>
                <TextInput
                  value={motto}
                  onChangeText={setMotto}
                  placeholder="Masalan: Chempion, Olg‘a"
                  placeholderTextColor={colors.caption}
                  maxLength={14}
                  style={styles.input}
                />

                <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
                  Yozuv hajmi: {mottoSize}px
                </Text>
                <View style={styles.stepperRow}>
                  <Pressable
                    onPress={() => setMottoSize(Math.max(16, mottoSize - 2))}
                    style={styles.stepBtn}
                  >
                    <MaterialCommunityIcons name="minus" size={18} color="#F3F5F9" />
                  </Pressable>
                  <Text style={styles.stepVal}>{mottoSize} px</Text>
                  <Pressable
                    onPress={() => setMottoSize(Math.min(36, mottoSize + 2))}
                    style={styles.stepBtn}
                  >
                    <MaterialCommunityIcons name="plus" size={18} color="#F3F5F9" />
                  </Pressable>
                </View>

                {/* Outline Switch */}
                <Pressable
                  onPress={() => setOutline(!outline)}
                  style={styles.switchRow}
                >
                  <Text style={styles.switchTitle}>Qora hoshiya (Outline)</Text>
                  <View style={[styles.switchTrack, outline && styles.switchTrackActive]}>
                    <View style={[styles.switchThumb, outline && styles.switchThumbActive]} />
                  </View>
                </Pressable>
              </View>
            )}

            {/* 3. ORQA TOOL */}
            {tool === 'orqa' && (
              <View>
                <Text style={styles.fieldLabel}>Formadagi ism</Text>
                <TextInput
                  value={player}
                  onChangeText={(t) =>
                    setPlayer(t.replace(/[^A-Za-z' ]/g, '').toUpperCase().slice(0, 10))
                  }
                  placeholder="AZIZ"
                  placeholderTextColor={colors.caption}
                  maxLength={10}
                  autoCapitalize="characters"
                  style={styles.input}
                />

                <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Raqam (1–99)</Text>
                <TextInput
                  value={number}
                  onChangeText={(t) => setNumber(t.replace(/\D/g, '').slice(0, 2))}
                  placeholder="10"
                  placeholderTextColor={colors.caption}
                  keyboardType="number-pad"
                  maxLength={2}
                  style={styles.input}
                />

                {/* Quick numbers */}
                <View style={styles.quickRow}>
                  {['1', '7', '9', '10', '23'].map((n) => (
                    <Pressable
                      key={n}
                      onPress={() => setNumber(n)}
                      style={[styles.quickChip, number === n && styles.quickChipActive]}
                    >
                      <Text style={[styles.quickText, number === n && styles.quickTextActive]}>
                        {n}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Ink color picker */}
                <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Yozuv va raqam rangi</Text>
                <View style={styles.colorsGrid}>
                  {INKS.map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => setInk(c)}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: c },
                        ink === c && styles.colorSwatchActive,
                      ]}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* 4. LOGO TOOL */}
            {tool === 'logo' && (
              <View>
                <Text style={styles.fieldLabel}>AI Logo generator</Text>
                <Text style={styles.subHint}>
                  Jamoangiz yoki logotipingiz nomini kiriting — sun’iy intellekt mos gerb chizib beradi
                </Text>
                <View style={styles.aiInputRow}>
                  <TextInput
                    value={aiPrompt}
                    onChangeText={setAiPrompt}
                    placeholder="Masalan: Oltin sher, Burgut"
                    placeholderTextColor={colors.caption}
                    style={styles.aiInput}
                  />
                  <Pressable
                    disabled={aiLoading}
                    onPress={handleAiGenerate}
                    style={styles.aiBtn}
                  >
                    {aiLoading ? (
                      <ActivityIndicator size="small" color="#080C24" />
                    ) : (
                      <MaterialCommunityIcons name="auto-fix" size={20} color="#080C24" />
                    )}
                  </Pressable>
                </View>

                {aiOptions.length > 0 && (
                  <View style={styles.aiOptionsRow}>
                    {aiOptions.map((opt) => (
                      <Pressable
                        key={opt.id}
                        onPress={() => setCrest(opt.initials)}
                        style={[
                          styles.aiOptCard,
                          crest === opt.initials && styles.aiOptCardActive,
                        ]}
                      >
                        <MaterialCommunityIcons name={opt.icon} size={24} color={opt.color} />
                        <Text style={styles.aiOptText}>{opt.initials}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}

                {Boolean(crest) && (
                  <Pressable onPress={() => setCrest('')} style={styles.clearCrestBtn}>
                    <MaterialCommunityIcons name="trash-can-outline" size={16} color="#E8543F" />
                    <Text style={styles.clearCrestText}>Logoni olib tashlash</Text>
                  </Pressable>
                )}
              </View>
            )}

            {/* 5. SHORTS TOOL */}
            {tool === 'shorts' && (
              <View>
                <Pressable
                  onPress={() => setHasShorts(!hasShorts)}
                  style={styles.switchRow}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.switchTitle}>Shortik qo‘shish</Text>
                    <Text style={styles.switchSub}>Futbolka + shortik to‘plami (+60 000 so‘m)</Text>
                  </View>
                  <View style={[styles.switchTrack, hasShorts && styles.switchTrackActive]}>
                    <View style={[styles.switchThumb, hasShorts && styles.switchThumbActive]} />
                  </View>
                </Pressable>

                {hasShorts && (
                  <View style={{ marginTop: 14 }}>
                    <Pressable onPress={handleMatchShorts} style={styles.matchBtn}>
                      <MaterialCommunityIcons name="auto-fix" size={16} color={colors.accent} />
                      <Text style={styles.matchBtnText}>Futbolka rangiga moslashtirish</Text>
                    </Pressable>

                    <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Shortik asosiy rangi</Text>
                    <View style={styles.colorsGrid}>
                      {SOLIDS.map((c) => (
                        <Pressable
                          key={c}
                          onPress={() => setSoColor(c)}
                          style={[
                            styles.colorSwatch,
                            { backgroundColor: c },
                            soColor === c && styles.colorSwatchActive,
                          ]}
                        />
                      ))}
                    </View>

                    <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Hoshiya va chiziqlar</Text>
                    <View style={styles.colorsGrid}>
                      {INKS.map((c) => (
                        <Pressable
                          key={c}
                          onPress={() => setSoTrim(c)}
                          style={[
                            styles.colorSwatch,
                            { backgroundColor: c },
                            soTrim === c && styles.colorSwatchActive,
                          ]}
                        />
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* 6. EXTRA TOOL */}
            {tool === 'extra' && (
              <View>
                <Text style={styles.fieldLabel}>Yamoqlar (+5 000 so‘m/dona)</Text>
                <View style={styles.patchesGrid}>
                  {PATCHES.map((p) => {
                    const active = selectedPatches.includes(p.id);
                    return (
                      <Pressable
                        key={p.id}
                        onPress={() => togglePatch(p.id)}
                        style={[styles.patchCard, active && styles.patchCardActive]}
                      >
                        <MaterialCommunityIcons
                          name={p.icon}
                          size={24}
                          color={active ? colors.accent : colors.muted}
                        />
                        <Text style={[styles.patchTitle, active && styles.patchTitleActive]}>
                          {p.title}
                        </Text>
                        <Text style={styles.patchWhere}>{p.where}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Bosma sifati</Text>
                <View style={styles.printsList}>
                  {PRINTS.map((pr) => {
                    const active = selectedPrint === pr.id;
                    return (
                      <Pressable
                        key={pr.id}
                        onPress={() => setSelectedPrint(pr.id)}
                        style={[styles.printItem, active && styles.printItemActive]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.printTitle, active && styles.printTitleActive]}>
                            {pr.title}
                          </Text>
                          <Text style={styles.printSub}>{pr.sub}</Text>
                        </View>
                        <Text style={styles.printPrice}>
                          {pr.price ? `+${pr.price.toLocaleString('uz-UZ')} so‘m` : 'Asosiy narx'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Bottom summary and Proceed button */}
            <View style={styles.bottomBar}>
              <View>
                <Text style={styles.totalLabel}>Bir komplekt narxi</Text>
                <Text style={styles.totalPrice}>
                  {unitPrice.toLocaleString('uz-UZ')} so‘m
                </Text>
              </View>

              <Pressable onPress={handleProceed} style={styles.proceedBtn}>
                <Text style={styles.proceedText}>Davom etish</Text>
                <MaterialCommunityIcons name="arrow-right" size={20} color="#080C24" />
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
=======
      <CartLink t={t} cart={cart} onOpenCart={onOpenCart} />
    </Screen>
>>>>>>> fb102bed4b36fd02c0a0e3b3ae938f93892f7dd5
  );
}

const styles = StyleSheet.create({
<<<<<<< HEAD
  safe: {
    flex: 1,
    backgroundColor: '#050818',
=======
  modeSwitch: { alignSelf: 'stretch', marginBottom: spacing.md },
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
>>>>>>> fb102bed4b36fd02c0a0e3b3ae938f93892f7dd5
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 110,
  },
<<<<<<< HEAD
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
=======
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
  inputs: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  textInput: {
    height: 48,
>>>>>>> fb102bed4b36fd02c0a0e3b3ae938f93892f7dd5
    borderRadius: radii.md,
    backgroundColor: '#0E1A3F',
    borderWidth: 1,
<<<<<<< HEAD
    borderColor: 'rgba(243, 245, 249, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F3F5F9',
  },
  topSub: {
    fontSize: 11,
    color: '#8D95BD',
    marginTop: 2,
  },
  stage: {
    backgroundColor: '#0E1A3F',
    borderRadius: radii.xl,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
    position: 'relative',
    marginBottom: 14,
  },
  sideToggle: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    backgroundColor: '#121A42',
    borderRadius: radii.round,
    padding: 2,
    zIndex: 10,
  },
  sideBtn: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: radii.round,
  },
  sideBtnActive: {
    backgroundColor: colors.accent,
  },
  sideBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A9B0D0',
  },
  sideBtnTextActive: {
    color: '#080C24',
  },
  visualWrap: {
    marginVertical: 4,
  },
  toolsBar: {
    gap: 8,
    paddingBottom: 12,
  },
  toolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0E1A3F',
    borderRadius: radii.round,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  toolChipActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(242, 163, 58, 0.12)',
  },
  toolLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A9B0D0',
  },
  toolLabelActive: {
    color: colors.accent,
  },
  card: {
    backgroundColor: '#0E1A3F',
    borderRadius: radii.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#121A42',
    borderRadius: radii.md,
    padding: 3,
    marginBottom: 16,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radii.sm,
  },
  modeBtnActive: {
    backgroundColor: '#1B2560',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  modeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A9B0D0',
  },
  modeTextActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  colorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(243, 245, 249, 0.2)',
  },
  colorSwatchActive: {
    borderColor: colors.accent,
    transform: [{ scale: 1.1 }],
  },
  gradsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gradItem: {
    width: '31%',
    backgroundColor: '#121A42',
    borderRadius: radii.md,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  gradItemActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(242, 163, 58, 0.1)',
  },
  gradPreview: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: 6,
  },
  gradName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A9B0D0',
  },
  gradNameActive: {
    color: colors.accent,
  },
  angleRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  angleChip: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#121A42',
    borderRadius: radii.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  angleChipActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(242, 163, 58, 0.12)',
  },
  angleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A9B0D0',
  },
  angleTextActive: {
    color: colors.accent,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A9B0D0',
    marginBottom: 6,
  },
  subHint: {
    fontSize: 11,
    color: '#8D95BD',
    marginBottom: 10,
    lineHeight: 16,
  },
  input: {
    backgroundColor: '#121A42',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.14)',
    color: '#F3F5F9',
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#121A42',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.14)',
    padding: 6,
  },
  stepBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.sm,
    backgroundColor: '#1B2560',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F3F5F9',
  },
  quickRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    marginBottom: 14,
  },
  quickChip: {
    flex: 1,
    paddingVertical: 7,
    backgroundColor: '#121A42',
    borderRadius: radii.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  quickChipActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(242, 163, 58, 0.12)',
  },
  quickText: {
    color: '#A9B0D0',
    fontSize: 13,
    fontWeight: '700',
  },
  quickTextActive: {
    color: colors.accent,
  },
  aiInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  aiInput: {
    flex: 1,
    backgroundColor: '#121A42',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.14)',
    color: '#F3F5F9',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  aiBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiOptionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  aiOptCard: {
    flex: 1,
    backgroundColor: '#121A42',
    borderRadius: radii.md,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  aiOptCardActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(242, 163, 58, 0.12)',
  },
  aiOptText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#F3F5F9',
    marginTop: 4,
  },
  clearCrestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 12,
  },
  clearCrestText: {
    color: '#E8543F',
    fontSize: 12,
    fontWeight: '600',
  },
  switchRow: {
=======
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
>>>>>>> fb102bed4b36fd02c0a0e3b3ae938f93892f7dd5
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F3F5F9',
  },
  switchSub: {
    fontSize: 11,
    color: '#8D95BD',
    marginTop: 2,
  },
  switchTrack: {
    width: 46,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#1B2560',
    padding: 2,
    justifyContent: 'center',
  },
  switchTrackActive: {
    backgroundColor: colors.teal,
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F3F5F9',
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  matchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(242, 163, 58, 0.1)',
    borderRadius: radii.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  matchBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
  },
  patchesGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  patchCard: {
    flex: 1,
    backgroundColor: '#121A42',
    borderRadius: radii.md,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  patchCardActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(242, 163, 58, 0.1)',
  },
  patchTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F3F5F9',
    marginTop: 6,
  },
  patchTitleActive: {
    color: colors.accent,
  },
  patchWhere: {
    fontSize: 10,
    color: '#8D95BD',
    marginTop: 2,
  },
  printsList: {
    gap: 8,
  },
  printItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#121A42',
    borderRadius: radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  printItemActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(242, 163, 58, 0.1)',
  },
  printTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F3F5F9',
  },
  printTitleActive: {
    color: colors.accent,
  },
  printSub: {
    fontSize: 11,
    color: '#8D95BD',
    marginTop: 2,
  },
  printPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(243, 245, 249, 0.1)',
  },
  totalLabel: {
    fontSize: 11,
    color: '#8D95BD',
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.accent,
  },
  proceedBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  proceedText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#080C24',
  },
<<<<<<< HEAD
=======
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
  centerHint: { textAlign: 'center' },
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
  typeSwitch: { alignSelf: 'stretch', marginBottom: spacing.lg },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  swatch: { width: 56, alignItems: 'center', gap: 4 },
  swatchRing: { width: 44, height: 44, borderRadius: 22, padding: 3, borderWidth: 2, borderColor: 'transparent' },
  swatchRingActive: { borderColor: colors.accent },
  swatchFill: { flex: 1, borderRadius: 19, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  swatchLabel: { color: colors.muted, fontSize: 10, fontWeight: '600' },
  hexDot: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#232A57' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.sm,
    backgroundColor: '#0E1330',
    borderWidth: 1.5,
    borderColor: '#1D2350',
  },
  optionText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  optionTextActive: { color: colors.accent },
  fontSample: { color: colors.muted, fontSize: 15 },
  packageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: '#0E1330',
    borderWidth: 1.5,
    borderColor: '#1D2350',
    marginTop: spacing.sm,
  },
  packageRowActive: { borderColor: colors.accent },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  qtyButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.chip,
    borderWidth: 1,
    borderColor: '#1D2350',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qty: { color: colors.text, fontSize: 16, fontWeight: '900', minWidth: 20, textAlign: 'center' },
  unavailable: { alignItems: 'center', gap: spacing.md, marginTop: spacing.xl },
  unavailableText: { color: colors.muted, textAlign: 'center', lineHeight: 20 },
>>>>>>> fb102bed4b36fd02c0a0e3b3ae938f93892f7dd5
});
