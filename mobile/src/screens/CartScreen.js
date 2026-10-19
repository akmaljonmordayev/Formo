import React, { useState } from 'react';
import {
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
import { colors, radii } from '../constants/theme';
import { api } from '../services/api';

export default function CartScreen({
  store,
  t,
  onBack,
  onNavigate,
  onProceedToCheckout,
}) {
  const toast = useToast();
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);

  const cart = store.cart || [];

  const subtotal = cart.reduce((sum, item) => sum + (item.unit || 0) * (item.qty || 1), 0);
  const discount = promoApplied ? Math.round(subtotal * 0.1) : 0;
  const deliveryFee = cart.length > 0 ? 15000 : 0;
  const total = subtotal - discount + deliveryFee;

  const handleApplyPromo = async () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) {
      toast.show('Promokodni kiriting', 'error');
      return;
    }

    try {
      // Try backend promocode endpoint
      await api.cart.applyPromocode(code).catch(() => null);
    } catch {
      // ignore
    }

    if (code === 'FORMO10') {
      setPromoApplied(true);
      setPromoDiscount(0.1);
      toast.show('FORMO10: 10% chegirma qo‘llandi!', 'success');
    } else {
      setPromoApplied(false);
      setPromoDiscount(0);
      toast.show('Promokod topilmadi. "FORMO10" ni sinab ko‘ring', 'error');
    }
  };

  const handleUpdateQty = (index, delta) => {
    const item = cart[index];
    if (!item) return;

    const nextQty = (item.qty || 1) + delta;
    if (nextQty <= 0) {
      store.removeFromCart(index);
      toast.show('Mahsulot savatdan olib tashlandi', 'info');
      return;
    }

    if (typeof store.updateCart === 'function') {
      store.updateCart((current) =>
        current.map((currentItem, currentIndex) =>
          currentIndex === index ? { ...currentItem, qty: nextQty } : currentItem,
        ),
      );
      return;
    }

    const updated = cart.map((currentItem, currentIndex) =>
      currentIndex === index ? { ...currentItem, qty: nextQty } : currentItem,
    );
    store.clearCart();
    updated.forEach((it) => store.addToCart(it));
  };

  const handleDelete = (index) => {
    store.removeFromCart(index);
    toast.show('Mahsulot olib tashlandi', 'info');
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.show('Savatingiz bo‘sh', 'error');
      return;
    }
    onProceedToCheckout?.({
      subtotal,
      discount,
      deliveryFee,
      total,
      promoCode: promoApplied ? promoCode : '',
    });
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          {Boolean(onBack) && (
            <Pressable onPress={onBack} hitSlop={10} style={styles.iconBtn}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="#F3F5F9" />
            </Pressable>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Savat</Text>
            <Text style={styles.sub}>{cart.length} ta komplekt</Text>
          </View>
          {cart.length > 0 && (
            <Pressable onPress={() => store.clearCart()} hitSlop={8}>
              <Text style={styles.clearText}>Tozalash</Text>
            </Pressable>
          )}
        </View>

        {cart.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <MaterialCommunityIcons name="shopping-outline" size={54} color={colors.muted} />
            </View>
            <Text style={styles.emptyTitle}>Savatingiz bo‘sh</Text>
            <Text style={styles.emptyDesc}>
              Katalogdan sevimli klubingiz formasini tanlang yoki studiyada noldan yarating
            </Text>
            <Pressable onPress={() => onNavigate('catalog')} style={styles.goCatalogBtn}>
              <Text style={styles.goCatalogText}>Katalogga o‘tish</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Cart Items */}
            <View style={styles.itemsList}>
              {cart.map((item, i) => (
                <View key={item.id || i} style={styles.cartCard}>
                  {/* Jersey Thumbnail */}
                  <View style={styles.jerseyThumb}>
                    <JerseyVisualizer
                      color={item.sh?.color || '#0E1A3F'}
                      trim={item.sh?.trim || '#F2A33A'}
                      ink={item.sh?.ink || '#F3F5F9'}
                      pattern={item.sh?.pattern || 'none'}
                      grad={item.sh?.grad || ''}
                      crest={item.sh?.crest || ''}
                      player={item.sh?.player || ''}
                      number={item.sh?.number || ''}
                      side="back"
                      size={75}
                      showShorts={item.hasSo}
                      shorts={item.so}
                    />
                  </View>

                  {/* Details */}
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.itemSub} numberOfLines={1}>
                      {item.sub}
                    </Text>
                    <Text style={styles.itemPrice}>
                      {((item.unit || 0) * (item.qty || 1)).toLocaleString('uz-UZ')} so‘m
                    </Text>

                    {/* Quantity controls */}
                    <View style={styles.qtyControls}>
                      <Pressable
                        onPress={() => handleUpdateQty(i, -1)}
                        style={styles.qtySmallBtn}
                      >
                        <MaterialCommunityIcons name="minus" size={16} color="#F3F5F9" />
                      </Pressable>
                      <Text style={styles.qtySmallText}>{item.qty || 1}</Text>
                      <Pressable
                        onPress={() => handleUpdateQty(i, 1)}
                        style={styles.qtySmallBtn}
                      >
                        <MaterialCommunityIcons name="plus" size={16} color="#F3F5F9" />
                      </Pressable>
                    </View>
                  </View>

                  {/* Remove button */}
                  <Pressable
                    onPress={() => handleDelete(i)}
                    hitSlop={10}
                    style={styles.deleteBtn}
                  >
                    <MaterialCommunityIcons name="trash-can-outline" size={20} color="#E8543F" />
                  </Pressable>
                </View>
              ))}
            </View>

            {/* Promocode Box */}
            <View style={styles.promoCard}>
              <Text style={styles.promoLabel}>Promokod bormi?</Text>
              <View style={styles.promoInputRow}>
                <TextInput
                  value={promoCode}
                  onChangeText={setPromoCode}
                  placeholder="FORMO10"
                  placeholderTextColor={colors.caption}
                  autoCapitalize="characters"
                  style={styles.promoInput}
                />
                <Pressable onPress={handleApplyPromo} style={styles.applyBtn}>
                  <Text style={styles.applyBtnText}>Qo‘llash</Text>
                </Pressable>
              </View>
            </View>

            {/* Receipt Breakdown Card */}
            <View style={styles.receiptCard}>
              <Text style={styles.receiptTitle}>To‘lov xulosasi</Text>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptKey}>Mahsulotlar</Text>
                <Text style={styles.receiptVal}>{subtotal.toLocaleString('uz-UZ')} so‘m</Text>
              </View>

              {promoApplied && (
                <View style={styles.receiptRow}>
                  <Text style={[styles.receiptKey, { color: colors.teal }]}>
                    Chegirma (FORMO10)
                  </Text>
                  <Text style={[styles.receiptVal, { color: colors.teal }]}>
                    −{discount.toLocaleString('uz-UZ')} so‘m
                  </Text>
                </View>
              )}

              <View style={styles.receiptRow}>
                <Text style={styles.receiptKey}>Yetkazib berish</Text>
                <Text style={styles.receiptVal}>{deliveryFee.toLocaleString('uz-UZ')} so‘m</Text>
              </View>

              <View style={styles.receiptDivider} />

              <View style={styles.receiptRow}>
                <Text style={styles.totalKey}>Jami to‘lov</Text>
                <Text style={styles.totalVal}>{total.toLocaleString('uz-UZ')} so‘m</Text>
              </View>

              {/* Checkout Button */}
              <Pressable onPress={handleCheckout} style={styles.checkoutBtn}>
                <Text style={styles.checkoutBtnText}>Rasmiylashtirish</Text>
                <MaterialCommunityIcons name="arrow-right" size={20} color="#080C24" />
              </Pressable>
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#050818',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    marginBottom: 12,
    gap: 12,
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
    fontSize: 24,
    fontWeight: '800',
    color: '#F3F5F9',
  },
  sub: {
    fontSize: 12,
    color: '#8D95BD',
  },
  clearText: {
    fontSize: 13,
    color: '#E8543F',
    fontWeight: '700',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 110,
  },
  itemsList: {
    gap: 12,
    marginBottom: 16,
  },
  cartCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E1A3F',
    borderRadius: radii.xl,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
  },
  jerseyThumb: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121A42',
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F3F5F9',
  },
  itemSub: {
    fontSize: 11,
    color: '#8D95BD',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.accent,
    marginTop: 4,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  qtySmallBtn: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    backgroundColor: '#1B2560',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtySmallText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F3F5F9',
  },
  deleteBtn: {
    padding: 8,
  },
  promoCard: {
    backgroundColor: '#0E1A3F',
    borderRadius: radii.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
    marginBottom: 16,
  },
  promoLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F3F5F9',
    marginBottom: 8,
  },
  promoInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  promoInput: {
    flex: 1,
    backgroundColor: '#121A42',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.14)',
    color: '#F3F5F9',
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  applyBtn: {
    backgroundColor: '#1B2560',
    borderRadius: radii.md,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  applyBtnText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  receiptCard: {
    backgroundColor: '#0E1A3F',
    borderRadius: radii.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
  },
  receiptTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F3F5F9',
    marginBottom: 14,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  receiptKey: {
    fontSize: 13,
    color: '#A9B0D0',
  },
  receiptVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F3F5F9',
  },
  receiptDivider: {
    height: 1,
    backgroundColor: 'rgba(243, 245, 249, 0.1)',
    marginVertical: 12,
  },
  totalKey: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F3F5F9',
  },
  totalVal: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.accent,
  },
  checkoutBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  checkoutBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#080C24',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(243, 245, 249, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F3F5F9',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#8D95BD',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  goCatalogBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 13,
    paddingHorizontal: 28,
    borderRadius: radii.md,
  },
  goCatalogText: {
    color: '#080C24',
    fontSize: 15,
    fontWeight: '800',
  },
});
