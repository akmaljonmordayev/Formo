import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radii, spacing, TAB_BAR_HEIGHT } from '../constants/theme';
import { colorOptions, products } from '../data/mockData';
import { Button, Card, Header, Overline, Screen, Segment, formatMoney } from '../components/ui/Common';
import { JerseyPreview } from '../components/ui/JerseyPreview';

const DEFAULT_COLOR = '#5A66DE';

export default function StudioScreen({ t, addToCart, cartCount, onOpenCart, onBack }) {
  const [side, setSide] = useState('front');
  const [tab, setTab] = useState('color');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [colorMode, setColorMode] = useState('solid');
  const [textAccent, setTextAccent] = useState('#F5A55E');
  const [name, setName] = useState('OYIM');
  const [number, setNumber] = useState('10');
  const [shorts, setShorts] = useState(false);
  const [shortsColor, setShortsColor] = useState(DEFAULT_COLOR);
  const [patch, setPatch] = useState('captain');
  const [sleeve, setSleeve] = useState('');
  const [addedFeedback, setAddedFeedback] = useState(false);

  const product = { ...products[0], color, accent: textAccent };
  const item = { ...product, customName: name.trim() || 'OYIM', customNumber: number || '10' };

  const tabs = [
    ['color', t('tabColor')],
    ['frontText', t('tabFrontText')],
    ['back', t('tabBackText')],
    ['logo', t('tabLogo')],
    ['shorts', t('tabShorts')],
    ['other', t('tabOther')],
  ];

  const swatchRow = (selected, onPick) => (
    <View style={styles.swatches}>
      {colorOptions.map((option) => (
        <Pressable
          key={option}
          onPress={() => onPick(option)}
          style={[
            styles.swatch,
            { backgroundColor: option },
            selected === option && styles.swatchSelected,
          ]}
        />
      ))}
    </View>
  );

  const renderPanel = () => {
    if (tab === 'color') {
      return (
        <View>
          <Segment
            style={styles.modeSegment}
            wide
            options={[t('oneColor'), t('gradientMode')]}
            value={colorMode === 'solid' ? t('oneColor') : t('gradientMode')}
            onChange={(value) => setColorMode(value === t('oneColor') ? 'solid' : 'gradient')}
          />
          <Overline>{t('readyColors')}</Overline>
          {swatchRow(color, setColor)}
          <View style={styles.customCard}>
            <View style={[styles.customSwatch, { backgroundColor: color }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.customTitle}>{t('customColor')}</Text>
              <Text style={styles.customHex}>{color.toUpperCase()}</Text>
            </View>
          </View>
        </View>
      );
    }
    if (tab === 'frontText') {
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
              maxLength={10}
            />
            <TextInput
              value={number}
              onChangeText={setNumber}
              placeholder="10"
              placeholderTextColor={colors.muted}
              style={[styles.textInput, styles.number]}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
        </View>
      );
    }
    if (tab === 'back') {
      return (
        <View>
          <Overline>{t('textColor')}</Overline>
          {swatchRow(textAccent, setTextAccent)}
          <View style={styles.customCard}>
            <View style={[styles.customSwatch, { backgroundColor: textAccent }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.customTitle}>{t('textColor')}</Text>
              <Text style={styles.customHex}>{textAccent.toUpperCase()}</Text>
            </View>
          </View>
        </View>
      );
    }
    if (tab === 'logo') {
      return (
        <View style={styles.logoRow}>
          <View style={styles.logoBox}>
            <Text style={styles.logoBoxText}>Logo</Text>
          </View>
          <Text style={styles.logoHint}>{t('logoHint')}</Text>
        </View>
      );
    }
    if (tab === 'shorts') {
      return (
        <View>
          <View style={styles.panelRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{t('addShorts')}</Text>
              <Text style={styles.rowSub}>{t('addShortsSub')}</Text>
            </View>
            <Switch
              value={shorts}
              onValueChange={setShorts}
              trackColor={{ false: '#2A3160', true: colors.teal }}
              thumbColor="#FFFFFF"
            />
          </View>
          <Button variant="secondary" small style={styles.matchButton} onPress={() => setShortsColor(color)}>
            {t('matchJersey')}
          </Button>
          {shorts ? (
            <View>
              <Overline style={styles.overlineGap}>{t('shortsColor')}</Overline>
              {swatchRow(shortsColor, setShortsColor)}
            </View>
          ) : null}
        </View>
      );
    }
    return (
      <View>
        <Overline>{t('patches')}</Overline>
        <View style={styles.patchRow}>
          {[
            ['captain', t('patchCaptain')],
            ['flag', t('patchFlag')],
            ['star', t('patchStar')],
          ].map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => setPatch(key)}
              style={[styles.patchTile, patch === key && styles.patchTileActive]}
            >
              <View style={[styles.patchSquare, patch === key && styles.patchSquareActive]} />
              <Text style={[styles.patchLabel, patch === key && styles.patchLabelActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <Overline style={styles.overlineGap}>{t('sleevePrint')}</Overline>
        <TextInput
          value={sleeve}
          onChangeText={setSleeve}
          placeholder={t('sleevePlaceholder')}
          placeholderTextColor={colors.muted}
          style={styles.textInput}
        />
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
            <Text style={styles.footerPrice}>{formatMoney(item.price)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            {addedFeedback ? (
              <Text style={styles.addedFeedback}>{t('added')}</Text>
            ) : null}
            <Button
              onPress={() => {
                addToCart(item);
                setAddedFeedback(true);
                setTimeout(() => setAddedFeedback(false), 2000);
              }}
            >
              {t('addToCart')}
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
          number={number || '10'}
          large
          side={side}
          name={name || 'ISM'}
        />
      </View>

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

      {cartCount > 0 ? (
        <Pressable onPress={onOpenCart} style={styles.cartLink}>
          <Text style={styles.cartLinkText}>{t('openCart')} · {cartCount} {t('items')}</Text>
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
  modeSegment: { alignSelf: 'stretch', marginBottom: spacing.md },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: 'transparent' },
  swatchSelected: { borderColor: colors.white, transform: [{ scale: 1.08 }] },
  customCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#141A3E',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#232A57',
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  customSwatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#2A3160' },
  customTitle: { color: colors.text, fontSize: 13, fontWeight: '800' },
  customHex: { color: colors.muted, fontSize: 11, marginTop: 2 },
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
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#3A4270',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0E1330',
  },
  logoBoxText: { color: colors.muted, fontSize: 10, fontWeight: '800' },
  logoHint: { flex: 1, color: colors.muted, fontSize: 11, lineHeight: 16 },
  panelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
  rowSub: { color: colors.muted, fontSize: 11, marginTop: 3 },
  matchButton: { marginTop: spacing.md, alignSelf: 'flex-start' },
  overlineGap: { marginTop: spacing.lg },
  patchRow: { flexDirection: 'row', gap: spacing.md },
  patchTile: {
    flex: 1,
    height: 74,
    borderRadius: radii.md,
    backgroundColor: '#0E1330',
    borderWidth: 1.5,
    borderColor: '#1D2350',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  patchTileActive: { borderColor: colors.accent },
  patchSquare: { width: 26, height: 26, borderRadius: 7, backgroundColor: '#171E4B' },
  patchSquareActive: { backgroundColor: '#242B58' },
  patchLabel: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  patchLabelActive: { color: colors.accent },
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
  addedFeedback: { color: colors.teal, fontSize: 11, fontWeight: '700' },
});
