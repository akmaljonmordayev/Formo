import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SizeChartModal } from '../components/ui/Modals';
import { useToast } from '../components/ui/Toast';
import { colors, radii } from '../constants/theme';

const ADULT_SIZES = [
  { size: 'S', ru: '44–46' },
  { size: 'M', ru: '46–48' },
  { size: 'L', ru: '48–50' },
  { size: 'XL', ru: '50–52' },
  { size: 'XXL', ru: '52–54' },
  { size: '3XL', ru: '54–56' },
];

const KIDS_SIZES = [
  { age: '2–3 yosh', height: '98 sm' },
  { age: '4–5 yosh', height: '110 sm' },
  { age: '6–7 yosh', height: '122 sm' },
  { age: '8–9 yosh', height: '134 sm' },
  { age: '10–11 yosh', height: '146 sm' },
  { age: '12–13 yosh', height: '158 sm' },
];

export default function SizeScreen({
  designConfig,
  store,
  auth,
  t,
  onBack,
  onOpenCart,
}) {
  const toast = useToast();
  const [group, setGroup] = useState('adult');
  const [adultSize, setAdultSize] = useState('L');
  const [kidIndex, setKidIndex] = useState(2);
  const [qty, setQty] = useState(1);
  const [showChart, setShowChart] = useState(false);

  if (!designConfig) return null;

  const unitPrice = designConfig.unitPrice || 189000;
  const totalPrice = unitPrice * qty;

  const handleAddToCart = () => {
    const selectedSizeLabel =
      group === 'adult'
        ? adultSize
        : `${KIDS_SIZES[kidIndex].age} · ${KIDS_SIZES[kidIndex].height}`;

    const item = {
      id: Date.now(),
      title: `${designConfig.player || 'FORMO'} · ${designConfig.number || '10'}`,
      sub: `${designConfig.hasShorts ? 'To‘plam' : 'Futbolka'} · ${selectedSizeLabel}`,
      unit: unitPrice,
      qty,
      sh: {
        color: designConfig.color,
        trim: designConfig.ink,
        ink: designConfig.ink,
        grad: designConfig.grad,
        gradAngle: designConfig.gradAngle,
        player: designConfig.player,
        number: designConfig.number,
        motto: designConfig.motto,
        mottoSize: designConfig.mottoSize,
        outline: designConfig.outline,
        crest: designConfig.crest,
        patches: designConfig.patches,
        side: 'back',
      },
      hasSo: designConfig.hasShorts,
      so: designConfig.shorts,
    };

    store.addToCart(item);
    toast.show('Savatga qo‘shildi', 'success');
    onOpenCart?.();
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <Pressable onPress={onBack} hitSlop={10} style={styles.iconBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#F3F5F9" />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.title}>O‘lcham va soni</Text>
            <Text style={styles.sub}>O‘zingiz yoki jamoangiz uchun tanlang</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Group Selector */}
        <View style={styles.groupTabs}>
          <Pressable
            onPress={() => setGroup('adult')}
            style={[styles.groupTab, group === 'adult' && styles.groupTabActive]}
          >
            <MaterialCommunityIcons
              name="tshirt-crew"
              size={18}
              color={group === 'adult' ? colors.accent : colors.muted}
            />
            <Text style={[styles.groupText, group === 'adult' && styles.groupTextActive]}>
              Kattalar
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setGroup('kids')}
            style={[styles.groupTab, group === 'kids' && styles.groupTabActive]}
          >
            <MaterialCommunityIcons
              name="baby-face-outline"
              size={18}
              color={group === 'kids' ? colors.accent : colors.muted}
            />
            <Text style={[styles.groupText, group === 'kids' && styles.groupTextActive]}>
              Bolalar
            </Text>
          </Pressable>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>
              {group === 'adult' ? 'Kattalar o‘lchami' : 'Bolalar yoshi va bo‘yi'}
            </Text>
            <Pressable onPress={() => setShowChart(true)} hitSlop={8} style={styles.chartLink}>
              <MaterialCommunityIcons name="ruler" size={16} color={colors.accent} />
              <Text style={styles.chartLinkText}>O‘lchamlar jadvali</Text>
            </Pressable>
          </View>

          {/* Sizes Grid */}
          {group === 'adult' ? (
            <View style={styles.sizesGrid}>
              {ADULT_SIZES.map((sz) => {
                const active = adultSize === sz.size;
                return (
                  <Pressable
                    key={sz.size}
                    onPress={() => setAdultSize(sz.size)}
                    style={[styles.sizeCard, active && styles.sizeCardActive]}
                  >
                    <Text style={[styles.sizeMain, active && styles.sizeMainActive]}>
                      {sz.size}
                    </Text>
                    <Text style={styles.sizeSub}>RU {sz.ru}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.sizesGrid}>
              {KIDS_SIZES.map((sz, i) => {
                const active = kidIndex === i;
                return (
                  <Pressable
                    key={sz.age}
                    onPress={() => setKidIndex(i)}
                    style={[styles.sizeCard, active && styles.sizeCardActive]}
                  >
                    <Text style={[styles.sizeMain, active && styles.sizeMainActive]}>
                      {sz.age}
                    </Text>
                    <Text style={styles.sizeSub}>{sz.height}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Quantity stepper */}
          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Komplektlar soni</Text>
          <View style={styles.qtyRow}>
            <Pressable
              onPress={() => setQty(Math.max(1, qty - 1))}
              style={styles.qtyBtn}
            >
              <MaterialCommunityIcons name="minus" size={20} color="#F3F5F9" />
            </Pressable>
            <View style={styles.qtyDisplay}>
              <Text style={styles.qtyText}>{qty}</Text>
              <Text style={styles.qtySub}>dona</Text>
            </View>
            <Pressable
              onPress={() => setQty(Math.min(50, qty + 1))}
              style={styles.qtyBtn}
            >
              <MaterialCommunityIcons name="plus" size={20} color="#F3F5F9" />
            </Pressable>
          </View>

          {/* Price Breakdown */}
          <View style={styles.priceBreakdown}>
            <View style={styles.priceLine}>
              <Text style={styles.priceText}>1 dona narxi:</Text>
              <Text style={styles.priceVal}>{unitPrice.toLocaleString('uz-UZ')} so‘m</Text>
            </View>
            <View style={[styles.priceLine, { marginTop: 6 }]}>
              <Text style={styles.priceBold}>Jami summa:</Text>
              <Text style={styles.totalPriceVal}>{totalPrice.toLocaleString('uz-UZ')} so‘m</Text>
            </View>
          </View>

          {/* Add to Cart Button */}
          <Pressable onPress={handleAddToCart} style={styles.addBtn}>
            <MaterialCommunityIcons name="shopping-bag" size={20} color="#080C24" />
            <Text style={styles.addBtnText}>Savatga qo‘shish</Text>
          </Pressable>
        </View>

        {/* Size Chart Modal */}
        <SizeChartModal
          visible={showChart}
          onClose={() => setShowChart(false)}
          group={group}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#050818',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 110,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: '#0E1A3F',
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F3F5F9',
  },
  sub: {
    fontSize: 11,
    color: '#8D95BD',
    marginTop: 2,
  },
  groupTabs: {
    flexDirection: 'row',
    backgroundColor: '#0E1A3F',
    borderRadius: radii.md,
    padding: 3,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
  },
  groupTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: radii.sm,
  },
  groupTabActive: {
    backgroundColor: '#1B2560',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  groupText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
  },
  groupTextActive: {
    color: colors.accent,
  },
  card: {
    backgroundColor: '#0E1A3F',
    borderRadius: radii.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F3F5F9',
  },
  chartLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chartLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
  },
  sizesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sizeCard: {
    width: '31%',
    backgroundColor: '#121A42',
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sizeCardActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(242, 163, 58, 0.12)',
  },
  sizeMain: {
    fontSize: 16,
    fontWeight: '900',
    color: '#F3F5F9',
  },
  sizeMainActive: {
    color: colors.accent,
  },
  sizeSub: {
    fontSize: 11,
    color: '#8D95BD',
    marginTop: 4,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#121A42',
    borderRadius: radii.md,
    padding: 6,
    marginTop: 10,
    marginBottom: 20,
  },
  qtyBtn: {
    width: 48,
    height: 48,
    borderRadius: radii.sm,
    backgroundColor: '#1B2560',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyDisplay: {
    alignItems: 'center',
  },
  qtyText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#F3F5F9',
  },
  qtySub: {
    fontSize: 11,
    color: '#8D95BD',
  },
  priceBreakdown: {
    backgroundColor: 'rgba(27, 37, 96, 0.4)',
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 20,
  },
  priceLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 13,
    color: '#A9B0D0',
  },
  priceVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F3F5F9',
  },
  priceBold: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F3F5F9',
  },
  totalPriceVal: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.accent,
  },
  addBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#080C24',
  },
});
