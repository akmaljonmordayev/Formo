import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radii, spacing, TAB_BAR_HEIGHT } from '../constants/theme';
import { Button, Card, Header, Overline, Screen, Segment, formatMoney } from '../components/ui/Common';
import ErrorView from '../components/ui/ErrorView';
import { JerseyPreview } from '../components/ui/JerseyPreview';
import { Shirt, Shorts } from '../components/ui/Shirt';
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

      {/* Klub formasi: shortik tanlansa ostida ko'rinadi, "shortikka raqam" darhol aks etadi */}
      <View style={styles.preview}>
        <View style={styles.glow} />
        <View style={styles.shirtLayer}>
          <Shirt
            width={withShorts ? 170 : 196}
            color={product.color || '#1A3582'}
            ink={product.accent || '#FFFFFF'}
            side={side}
            player={printName}
            number={number}
          />
        </View>
        {withShorts ? (
          <View style={styles.shortsLayer}>
            <Shorts
              width={110}
              color={product.color || '#1A3582'}
              trim={product.accent || '#FFFFFF'}
              ink={product.accent || '#FFFFFF'}
              number={numberOnShorts ? number : ''}
            />
          </View>
        ) : null}
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

      <Card style={styles.ar}>
        <MaterialCommunityIcons name="cube-scan" size={24} color={colors.teal} />
        <View style={{ flex: 1 }}>
          <Text style={styles.arTitle}>{t('arTitle')}</Text>
          <Text style={styles.arText}>{t('arSub')}</Text>
        </View>
      </Card>

      <CartLink t={t} cart={cart} onOpenCart={onOpenCart} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  modeSwitch: { alignSelf: 'stretch', marginBottom: spacing.md },
  preview: {
    height: 290,
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
  glow: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(242, 163, 58, 0.08)' },
  shirtLayer: { zIndex: 1 },
  shortsLayer: { marginTop: -12 },
  tabRow: { gap: spacing.sm, paddingRight: spacing.sm },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radii.round,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.surfaceRaised, borderColor: colors.accent },
  tabText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  tabTextActive: { color: colors.accent, fontWeight: '900' },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginTop: spacing.md,
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
  footerLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  footerPrice: { color: colors.accent, fontSize: 18, fontWeight: '900', marginTop: 2 },
  addedFeedback: { color: colors.tealLight, fontSize: 12, fontWeight: '800', textAlign: 'right' },
  errorFeedback: { color: colors.danger },
  hint: { color: colors.muted, fontSize: 11, marginTop: spacing.sm },
  centerHint: { textAlign: 'center' },
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
  typeSwitch: { alignSelf: 'stretch', marginBottom: spacing.lg },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  swatch: { width: 56, alignItems: 'center', gap: 4 },
  swatchRing: { width: 46, height: 46, borderRadius: 23, padding: 3, borderWidth: 2, borderColor: 'transparent' },
  swatchRingActive: { borderColor: colors.accent },
  swatchFill: { flex: 1, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
  swatchLabel: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  hexDot: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.border },
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
