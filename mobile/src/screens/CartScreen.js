import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radii, spacing } from '../constants/theme';
import { Button, Card, Header, Screen, formatMoney } from '../components/ui/Common';
import ErrorView from '../components/ui/ErrorView';
import { JerseyPreview } from '../components/ui/JerseyPreview';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { errorText } from '../utils/errors';

// Server savati (/api/cart): yakunlar serverdan, promokod — POST /api/cart/promocode.
export default function CartScreen({ t, cart, rules, onBack, onCheckout }) {
  const [promo, setPromo] = useState(cart.promocode || '');
  const [promoNote, setPromoNote] = useState(null);
  const [busy, setBusy] = useState(null);
  const [actionError, setActionError] = useState(null);

  const { items, count, summary } = cart;
  const maxQty = Math.min(rules.maxQtyPerItem, 20);
  const paused = !rules.acceptOrders;
  const belowMin = rules.minOrderSum > 0 && summary.subtotal < rules.minOrderSum;
  const blocked = items.some((item) => !item.available) || paused || belowMin;
  // Savat o'zgarib promokod yaroqsiz bo'lib qolsa — sababini ko'rsatamiz
  const promoProblem = cart.promoError ? errorText(cart.promoError, t) : null;

  const run = async (key, action) => {
    setBusy(key);
    setActionError(null);
    try {
      await action();
    } catch (err) {
      setActionError(errorText(err, t));
    } finally {
      setBusy(null);
    }
  };

  const applyPromo = async () => {
    const code = promo.trim().toUpperCase();
    if (!code) return;
    setBusy('promo');
    setPromoNote(null);
    try {
      await cart.applyPromocode(code);
      setPromoNote({ ok: true, text: `${t('promoApplied')}: ${code}` });
    } catch (err) {
      setPromoNote({ ok: false, text: errorText(err, t) });
    } finally {
      setBusy(null);
    }
  };

  const removePromo = () =>
    run('promo', async () => {
      await cart.removePromocode();
      setPromo('');
      setPromoNote(null);
    });

  if (cart.isLoading && items.length === 0) {
    return (
      <Screen>
        <Header title={t('cart')} onBack={onBack} />
        <LoadingSpinner />
      </Screen>
    );
  }

  return (
    <Screen>
      <Header title={t('cart')} onBack={onBack} right={<Text style={styles.count}>{count} {t('pcs')}</Text>} />
      {cart.error && items.length === 0 ? (
        <ErrorView message={errorText(cart.error, t)} onRetry={cart.refresh} retryLabel={t('retry')} />
      ) : items.length === 0 ? (
        <Card style={styles.empty}>
          <MaterialCommunityIcons name="cart-outline" size={42} color={colors.accent} />
          <Text style={styles.emptyTitle}>{t('emptyCart')}</Text>
          <Text style={styles.emptyText}>{t('emptyCartSub')}</Text>
          <Button onPress={onBack} style={styles.emptyButton}>{t('goStudio')}</Button>
        </Card>
      ) : (
        <>
          <View style={styles.list}>
            {items.map((item) => (
              <View key={item.id} style={[styles.item, !item.available && styles.itemOff]}>
                <View style={styles.thumb}>
                  <JerseyPreview
                    product={{ color: item.kit.bgColor, accent: item.kit.textColor }}
                    number={item.printNumber || ''}
                    tiny
                  />
                </View>
                <View style={styles.itemCopy}>
                  <Text style={styles.name} numberOfLines={1}>{item.title}</Text>
                  {item.subtitle ? <Text style={styles.sub} numberOfLines={1}>{item.subtitle}</Text> : null}
                  {item.problem ? <Text style={styles.problem}>{item.problem}</Text> : null}
                  <View style={styles.qtyRow}>
                    <Pressable
                      style={styles.qtyButton}
                      hitSlop={6}
                      disabled={busy != null || item.quantity <= 1}
                      onPress={() => run(item.id, () => cart.updateItem(item.id, { quantity: item.quantity - 1 }))}
                    >
                      <MaterialCommunityIcons name="minus" size={14} color={colors.text} />
                    </Pressable>
                    <Text style={styles.qty}>{item.quantity}</Text>
                    <Pressable
                      style={styles.qtyButton}
                      hitSlop={6}
                      disabled={busy != null || item.quantity >= maxQty}
                      onPress={() => run(item.id, () => cart.updateItem(item.id, { quantity: item.quantity + 1 }))}
                    >
                      <MaterialCommunityIcons name="plus" size={14} color={colors.text} />
                    </Pressable>
                    <Text style={styles.price}>{formatMoney(item.totalPrice)}</Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => run(item.id, () => cart.removeItem(item.id))}
                  disabled={busy != null}
                  style={styles.remove}
                  hitSlop={6}
                >
                  <MaterialCommunityIcons name="close" size={18} color={colors.muted} />
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
              editable={!cart.promocode}
              style={styles.promoInput}
            />
            {cart.promocode ? (
              <Pressable onPress={removePromo} hitSlop={14} disabled={busy != null}>
                <Text style={styles.promoApply}>{t('promoRemove')}</Text>
              </Pressable>
            ) : (
              <Pressable onPress={applyPromo} hitSlop={14} disabled={busy != null}>
                <Text style={styles.promoApply}>{busy === 'promo' ? '…' : t('promoApply')}</Text>
              </Pressable>
            )}
          </View>

          {promoNote || promoProblem ? (
            <Text style={[styles.promoNote, (promoProblem || !promoNote?.ok) && styles.errorText]}>
              {promoProblem || promoNote.text}
            </Text>
          ) : null}

          <Card style={styles.summary}>
            <Row label={t('products')} value={formatMoney(summary.subtotal)} />
            {summary.discount > 0 ? <Row label={t('discount')} value={`−${formatMoney(summary.discount)}`} /> : null}
            <Row label={t('delivery')} value={summary.delivery > 0 ? formatMoney(summary.delivery) : t('free')} />
            <View style={styles.divider} />
            <Row label={t('total')} value={formatMoney(summary.total)} strong />
            {rules.minOrderSum > 0 ? (
              <Text style={styles.minNote}>{t('minOrder')}: {formatMoney(rules.minOrderSum)}</Text>
            ) : null}
          </Card>

          <Button disabled={blocked || busy != null} onPress={onCheckout}>{t('checkout')}</Button>
          {paused ? (
            <Text style={styles.checkoutError}>{rules.pausedMessage || t('ordersPaused')}</Text>
          ) : belowMin ? (
            <Text style={styles.checkoutError}>{t('minOrder')}: {formatMoney(rules.minOrderSum)}</Text>
          ) : blocked ? (
            <Text style={styles.checkoutError}>{t('cartBlocked')}</Text>
          ) : null}
          {actionError ? <Text style={styles.checkoutError}>{actionError}</Text> : null}

          <Pressable onPress={() => run('clear', () => cart.clear())} disabled={busy != null} style={styles.clear}>
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
  price: { color: colors.text, fontWeight: '800', fontSize: 13, marginLeft: 'auto' },
  itemOff: { borderColor: 'rgba(232, 84, 63, 0.45)' },
  problem: { color: '#E8543F', fontSize: 11, marginTop: 4 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 7 },
  qtyButton: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: colors.chip,
    borderWidth: 1,
    borderColor: '#1D2350',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qty: { color: colors.text, fontSize: 13, fontWeight: '800', minWidth: 16, textAlign: 'center' },
  errorText: { color: '#E8543F' },
  minNote: { color: colors.muted, fontSize: 11 },
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
  promo: {
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#242B58',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  promoInput: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '700' },
  promoApply: { color: colors.accent, fontSize: 12, fontWeight: '800' },
  promoNote: { color: colors.muted, fontSize: 11, marginBottom: spacing.lg, textAlign: 'center' },
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
