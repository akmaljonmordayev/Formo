import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radii, spacing } from '../constants/theme';
import { api } from '../services/api';
import { Button, Card, Header, Screen, formatMoney } from '../components/ui/Common';
import { JerseyPreview } from '../components/ui/JerseyPreview';

export default function CartScreen({ cart, removeFromCart, clearCart, t, onBack, onNavigate }) {
  const [promo, setPromo] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);

  const total = cart.reduce((sum, item) => sum + item.price, 0);

  const applyPromo = () => {
    // Promo code feature placeholder — backend integration pending
  };

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const payload = {
        items: cart.map((item) => ({
          productId: item.id,
          name: item.name,
          customName: item.customName,
          customNumber: item.customNumber,
          price: item.price,
          color: item.color,
        })),
        total,
      };
      await api.orders.create(payload);
      clearCart();
      if (onNavigate) {
        onNavigate('orders');
      }
    } catch (err) {
      const msg = err?.message || t('networkError');
      setCheckoutError(msg);
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <Screen>
      <Header title={t('cart')} right={<Text style={styles.count}>{cart.length} {t('pcs')}</Text>} />
      {cart.length === 0 ? (
        <Card style={styles.empty}>
          <Text style={styles.emptyIcon}>＋</Text>
          <Text style={styles.emptyTitle}>{t('emptyCart')}</Text>
          <Text style={styles.emptyText}>{t('emptyCartSub')}</Text>
          <Button onPress={onBack} style={styles.emptyButton}>{t('goStudio')}</Button>
        </Card>
      ) : (
        <>
          <View style={styles.list}>
            {cart.map((item, index) => (
              <View key={`${item.id}-${index}`} style={styles.item}>
                <View style={styles.thumb}>
                  <JerseyPreview product={item} number={item.customNumber} tiny />
                </View>
                <View style={styles.itemCopy}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.sub}>{item.customName} · №{item.customNumber}</Text>
                  <Text style={styles.price}>{formatMoney(item.price)}</Text>
                </View>
                <Pressable onPress={() => removeFromCart(index)} style={styles.remove} hitSlop={6}>
                  <Text style={styles.removeText}>×</Text>
                </Pressable>
              </View>
            ))}
          </View>

          <View style={styles.promo}>
            <TextInput
              value={promo}
              onChangeText={setPromo}
              placeholder="FORMO10"
              placeholderTextColor="#6E77A3"
              autoCapitalize="characters"
              style={styles.promoInput}
            />
            <Pressable onPress={applyPromo} hitSlop={14}>
              <Text style={styles.promoApply}>{t('promoApply')}</Text>
            </Pressable>
          </View>

          <Card style={styles.summary}>
            <Row label={t('products')} value={formatMoney(total)} />
            <Row label={t('delivery')} value={t('free')} />
            <View style={styles.divider} />
            <Row label={t('total')} value={formatMoney(total)} strong />
          </Card>

          <Button onPress={checkoutLoading ? undefined : handleCheckout}>
            {checkoutLoading ? t('loggingIn') : t('checkout')}
          </Button>

          {checkoutError ? (
            <Text style={styles.checkoutError}>{checkoutError}</Text>
          ) : null}

          <Pressable onPress={clearCart} style={styles.clear}>
            <Text style={styles.clearText}>{t('clearCart')}</Text>
          </Pressable>
        </>
      )}
    </Screen>
  );
}

function Row({ label, value, strong }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, strong && styles.strongLabel]}>{label}</Text>
      <Text style={[styles.rowValue, strong && styles.strong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  count: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  empty: { alignItems: 'center', marginTop: spacing.xxxl },
  emptyIcon: { color: colors.accent, fontSize: 42 },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: '800', marginTop: spacing.md },
  emptyText: { color: colors.muted, textAlign: 'center', lineHeight: 20, marginTop: spacing.sm },
  emptyButton: { marginTop: spacing.xl, alignSelf: 'stretch' },
  list: { gap: spacing.md, marginBottom: spacing.lg },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#1B2150',
  },
  thumb: {
    width: 58,
    height: 66,
    borderRadius: radii.md,
    backgroundColor: '#0E1330',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  itemCopy: { flex: 1 },
  name: { color: colors.text, fontWeight: '800', fontSize: 13 },
  sub: { color: colors.muted, fontSize: 11, marginTop: 4 },
  price: { color: colors.text, fontWeight: '800', fontSize: 13, marginTop: 7 },
  remove: {
    width: 44,
    height: 40,
    borderRadius: radii.sm,
    backgroundColor: colors.chip,
    borderWidth: 1,
    borderColor: '#1D2350',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { color: colors.muted, fontSize: 20, lineHeight: 22 },
  promo: {
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#242B58',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  promoInput: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '700' },
  promoApply: { color: colors.accent, fontSize: 12, fontWeight: '800' },
  summary: { gap: spacing.md, marginBottom: spacing.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { color: colors.muted, fontSize: 13 },
  rowValue: { color: colors.text, fontSize: 13, fontWeight: '700' },
  strongLabel: { color: colors.text, fontSize: 15, fontWeight: '800' },
  strong: { color: colors.text, fontSize: 17, fontWeight: '900' },
  divider: { borderTopWidth: 1, borderTopColor: '#171C3F' },
  checkoutError: { color: '#E8543F', fontSize: 12, textAlign: 'center', marginTop: spacing.sm },
  clear: { alignItems: 'center', padding: spacing.lg },
  clearText: { color: colors.muted, fontSize: 12 },
});
