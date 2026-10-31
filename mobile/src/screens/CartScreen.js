import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radii, spacing } from '../constants/theme';
import { Badge, Button, Card, EmptyState, Header, Screen, formatMoney } from '../components/ui/Common';
import ErrorView from '../components/ui/ErrorView';
import Kit360Thumb from '../components/ui/Kit360Thumb';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { itemKit360 } from '../features/kit360';
import { designText } from '../features/studio';
import { errorText } from '../utils/errors';

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
      <Header
        title={t('cart')}
        onBack={onBack}
        right={
          count > 0 ? (
            <Badge label={`${count} ${t('pcs')}`} variant="orange" />
          ) : null
        }
      />

      {cart.error && items.length === 0 ? (
        <ErrorView message={errorText(cart.error, t)} onRetry={cart.refresh} retryLabel={t('retry')} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="cart-outline"
          title={t('emptyCart')}
          description={t('emptyCartSub')}
          actionLabel={t('goStudio')}
          onAction={onBack}
        />
      ) : (
        <>
          {/* Order Paused / Below Minimum Notice */}
          {paused ? (
            <View style={styles.alertBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={20} color={colors.danger} />
              <Text style={styles.alertText}>{rules.pausedMessage || t('ordersPaused')}</Text>
            </View>
          ) : belowMin ? (
            <View style={styles.alertBox}>
              <MaterialCommunityIcons name="information-outline" size={20} color={colors.warning} />
              <Text style={styles.alertText}>
                {t('minOrder')}: {formatMoney(rules.minOrderSum)}
              </Text>
            </View>
          ) : null}

          {/* Cart Items List */}
          <View style={styles.itemsList}>
            {items.map((item) => {
              return (
                <View
                  key={item.id}
                  style={[styles.itemCard, !item.available && styles.itemUnavailable]}
                >
                  <View style={styles.itemThumb}>
                    <Kit360Thumb team={itemKit360(item)} />
                  </View>

                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.design ? t('customJersey') : item.club?.name || item.title}
                    </Text>

                    {item.design ? (
                      <Text style={styles.itemSub} numberOfLines={1}>
                        {designText(t, item.design)}
                      </Text>
                    ) : null}

                    {item.subtitle ? (
                      <Text style={styles.itemSub} numberOfLines={1}>
                        {item.subtitle}
                      </Text>
                    ) : null}

                    {item.problem ? (
                      <Text style={styles.problemText}>{item.problem}</Text>
                    ) : null}

                    <View style={styles.qtyRow}>
                      <View style={styles.stepper}>
                        <Pressable
                          style={[styles.stepperBtn, item.quantity <= 1 && styles.stepperBtnDisabled]}
                          hitSlop={6}
                          disabled={busy != null || item.quantity <= 1}
                          onPress={() =>
                            run(item.id, () =>
                              cart.updateItem(item.id, { quantity: item.quantity - 1 }),
                            )
                          }
                        >
                          <MaterialCommunityIcons name="minus" size={16} color={colors.text} />
                        </Pressable>
                        <Text style={styles.qtyNumber}>{item.quantity}</Text>
                        <Pressable
                          style={[styles.stepperBtn, item.quantity >= maxQty && styles.stepperBtnDisabled]}
                          hitSlop={6}
                          disabled={busy != null || item.quantity >= maxQty}
                          onPress={() =>
                            run(item.id, () =>
                              cart.updateItem(item.id, { quantity: item.quantity + 1 }),
                            )
                          }
                        >
                          <MaterialCommunityIcons name="plus" size={16} color={colors.text} />
                        </Pressable>
                      </View>

                      <Text style={styles.itemPrice}>{formatMoney(item.totalPrice)}</Text>
                    </View>
                  </View>

                  <Pressable
                    onPress={() => run(item.id, () => cart.removeItem(item.id))}
                    disabled={busy != null}
                    style={styles.deleteBtn}
                    hitSlop={8}
                    accessibilityLabel="Delete item"
                  >
                    <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.muted} />
                  </Pressable>
                </View>
              );
            })}
          </View>

          {/* Promocode Input Card */}
          <View style={styles.promoContainer}>
            <View style={styles.promoInputRow}>
              <MaterialCommunityIcons name="ticket-percent-outline" size={20} color={colors.muted} />
              <TextInput
                value={promo}
                onChangeText={setPromo}
                placeholder="PROMO KOD (masalan: FORMO10)"
                placeholderTextColor={colors.dim}
                autoCapitalize="characters"
                editable={!cart.promocode}
                style={styles.promoInput}
              />
              {cart.promocode ? (
                <Pressable onPress={removePromo} hitSlop={10} disabled={busy != null}>
                  <Text style={styles.promoRemoveText}>{t('promoRemove')}</Text>
                </Pressable>
              ) : (
                <Pressable onPress={applyPromo} hitSlop={10} disabled={busy != null}>
                  <Text style={styles.promoApplyText}>
                    {busy === 'promo' ? '…' : t('promoApply')}
                  </Text>
                </Pressable>
              )}
            </View>

            {promoNote || promoProblem ? (
              <Text
                style={[
                  styles.promoFeedback,
                  (promoProblem || !promoNote?.ok) && styles.promoFeedbackError,
                ]}
              >
                {promoProblem || promoNote?.text}
              </Text>
            ) : null}
          </View>

          {/* Order Financial Summary Card */}
          <Card style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('products')}</Text>
              <Text style={styles.summaryValue}>{formatMoney(summary.subtotal)}</Text>
            </View>

            {summary.discount > 0 ? (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, styles.discountLabel]}>{t('discount')}</Text>
                <Text style={[styles.summaryValue, styles.discountValue]}>
                  −{formatMoney(summary.discount)}
                </Text>
              </View>
            ) : null}

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('delivery')}</Text>
              <Text style={styles.summaryValue}>
                {summary.delivery > 0 ? formatMoney(summary.delivery) : t('free')}
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryTotalRow}>
              <Text style={styles.summaryTotalLabel}>{t('total')}</Text>
              <Text style={styles.summaryTotalValue}>{formatMoney(summary.total)}</Text>
            </View>
          </Card>

          {/* Main Checkout Button */}
          <Button
            size="large"
            disabled={blocked || busy != null}
            onPress={onCheckout}
            icon={<MaterialCommunityIcons name="check-bold" size={18} color={colors.primaryDark} />}
          >
            {t('checkout')}
          </Button>

          {actionError ? <Text style={styles.actionErrorText}>{actionError}</Text> : null}

          <Pressable
            onPress={() => run('clear', () => cart.clear())}
            disabled={busy != null}
            style={styles.clearBtn}
            hitSlop={10}
          >
            <Text style={styles.clearText}>{t('clearCart')}</Text>
          </Pressable>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(232, 84, 63, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(232, 84, 63, 0.4)',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: 10,
  },
  alertText: {
    flex: 1,
    color: '#F5A398',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  itemsList: {
    gap: 12,
    marginBottom: spacing.lg,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemUnavailable: {
    borderColor: colors.danger,
    backgroundColor: 'rgba(232, 84, 63, 0.05)',
  },
  itemThumb: {
    width: 62,
    height: 72,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 14,
  },
  itemName: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 14,
  },
  itemSub: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 3,
  },
  problemText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 2,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: radii.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: {
    opacity: 0.35,
  },
  qtyNumber: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    minWidth: 24,
    textAlign: 'center',
  },
  itemPrice: {
    color: colors.accent,
    fontWeight: '900',
    fontSize: 14,
  },
  deleteBtn: {
    padding: 8,
    marginLeft: 6,
  },
  promoContainer: {
    marginBottom: spacing.lg,
  },
  promoInputRow: {
    height: 50,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  promoInput: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 10,
  },
  promoApplyText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '900',
  },
  promoRemoveText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '800',
  },
  promoFeedback: {
    color: colors.tealLight,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  promoFeedbackError: {
    color: colors.danger,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  summaryValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  discountLabel: {
    color: colors.tealLight,
  },
  discountValue: {
    color: colors.tealLight,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  summaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTotalLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  summaryTotalValue: {
    color: colors.accent,
    fontSize: 19,
    fontWeight: '900',
  },
  actionErrorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 10,
  },
  clearBtn: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  clearText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
});
