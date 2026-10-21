import React, { useState } from 'react';
<<<<<<< HEAD
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import JerseyVisualizer from '../components/ui/JerseyVisualizer';
import { useToast } from '../components/ui/Toast';
import { colors, radii } from '../constants/theme';

export default function OrderDetailScreen({
  order,
  store,
  t,
  onBack,
  onTrack,
  onReOrder,
}) {
  const toast = useToast();
  const [reordering, setReordering] = useState(false);

  const orderId = order?.orderNumber || order?.id || 'FRM-000124';
  const total = order?.total || 189000;
  const isDelivered = order?.status === 'DELIVERED';

  const handleReOrder = () => {
    setReordering(true);
    if (store?.addToCart) {
      store.addToCart({
        title: order?.product || order?.items?.[0]?.title || 'Formo Maxsus Futbolka',
        sub: `${order?.size || 'L'} · Qayta buyurtma`,
        qty: 1,
        unit: total,
      });
      toast.show('Mahsulot savatchaga qo‘shildi', 'success');
      setTimeout(() => {
        setReordering(false);
        onReOrder?.();
      }, 500);
    } else {
      setReordering(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.iconBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#F3F5F9" />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.title}>Buyurtma tafsilotlari</Text>
          <Text style={styles.sub}>#{orderId}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.cardSectionLabel}>Holati</Text>
              <Text style={styles.statusBig}>
                {isDelivered
                  ? 'Muvaffaqiyatli yetkazildi'
                  : order?.status === 'CANCELLED'
                  ? 'Bekor qilingan'
                  : 'Faol buyurtma (bosilmoqda)'}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                isDelivered && styles.statusBadgeGreen,
                order?.status === 'CANCELLED' && styles.statusBadgeRed,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  isDelivered && styles.statusBadgeTextGreen,
                  order?.status === 'CANCELLED' && styles.statusBadgeTextRed,
                ]}
              >
                {isDelivered ? 'YAKUNLANGAN' : 'JARAYONDA'}
              </Text>
            </View>
          </View>

          {!isDelivered && order?.status !== 'CANCELLED' && (
            <Pressable onPress={() => onTrack?.(orderId)} style={styles.trackCardBtn}>
              <MaterialCommunityIcons name="truck-fast-outline" size={20} color="#080C24" />
              <Text style={styles.trackCardBtnText}>Xaritada kuzatish</Text>
            </Pressable>
          )}
        </View>

        {/* Items Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Buyurtmadagi mahsulotlar</Text>

          <View style={styles.itemRow}>
            <View style={styles.itemThumb}>
              <JerseyVisualizer
                color="#154284"
                trim="#D4AF37"
                ink="#FFFFFF"
                crest="RMA"
                number="10"
                player="FORMO"
                side="front"
                size={70}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>
                {order?.product || order?.items?.[0]?.title || 'Real Madrid 24/25 Uy formasi'}
              </Text>
              <Text style={styles.itemSub}>O‘lcham: {order?.size || 'L'} · 1 dona</Text>
              <Text style={styles.itemPrice}>{total.toLocaleString('uz-UZ')} so‘m</Text>
            </View>
          </View>
        </View>

        {/* Delivery & Payment details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Yetkazish va to‘lov</Text>

          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="map-marker-outline" size={20} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={styles.detailKey}>Yetkazish manzili</Text>
              <Text style={styles.detailVal}>
                {order?.deliveryAddress || order?.address || 'Toshkent sh., Yunusobod tumani, 4-mavze, 12-uy'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="credit-card-outline" size={20} color={colors.teal} />
            <View style={{ flex: 1 }}>
              <Text style={styles.detailKey}>To‘lov usuli</Text>
              <Text style={styles.detailVal}>{order?.payMethod || 'Click'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="calendar-clock-outline" size={20} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={styles.detailKey}>Buyurtma sanasi</Text>
              <Text style={styles.detailVal}>{order?.date || order?.createdAt || 'Bugun, 14:30'}</Text>
            </View>
          </View>
        </View>

        {/* Pricing breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>To‘lov hisobi</Text>

          <View style={styles.priceRow}>
            <Text style={styles.priceKey}>Mahsulot summasi</Text>
            <Text style={styles.priceVal}>{total.toLocaleString('uz-UZ')} so‘m</Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceKey}>Yetkazib berish</Text>
            <Text style={[styles.priceVal, { color: colors.teal }]}>Bepul</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.priceRow}>
            <Text style={styles.totalKey}>Jami</Text>
            <Text style={styles.totalVal}>{total.toLocaleString('uz-UZ')} so‘m</Text>
          </View>
        </View>

        {/* Actions */}
        <Pressable
          disabled={reordering}
          onPress={handleReOrder}
          style={styles.reorderBtn}
        >
          {reordering ? (
            <ActivityIndicator color="#080C24" />
          ) : (
            <>
              <MaterialCommunityIcons name="reload" size={20} color="#080C24" />
              <Text style={styles.reorderBtnText}>Qayta buyurtma berish</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
=======
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radii, spacing } from '../constants/theme';
import { Button, Card, Header, Overline, Screen, formatMoney } from '../components/ui/Common';
import ErrorView from '../components/ui/ErrorView';
import { JerseyPreview } from '../components/ui/JerseyPreview';
import { designText, itemPreview } from '../features/studio';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { PAYMENT_METHODS, paymentText, statusText, useOrder } from '../features/orders';
import { errorText } from '../utils/errors';
import { formatDate } from '../utils/formatters';

const timeOf = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${formatDate(iso)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/**
 * Buyurtma tafsiloti: GET /api/orders/:id (timeline, canCancel, payment).
 * Holat operator/sex tomonida o'zgaradi — ekran 20 s da va pastga tortilganda yangilanadi.
 * Amallar: POST /:id/cancel, POST /:id/payment/confirm (demo), PATCH /:id/payment-method.
 */
export default function OrderDetailScreen({ t, orderId, rules, onBack, onChat }) {
  const { order, isLoading, error, refetch, cancel, confirmPayment, changePaymentMethod } = useOrder(orderId);
  const [busy, setBusy] = useState(null);
  const [actionError, setActionError] = useState(null);

  const run = async (key, action) => {
    setBusy(key);
    setActionError(null);
    try {
      await action();
    } catch (err) {
      setActionError(errorText(err, t));
      // Holat boshqa tomonda o'zgargan bo'lishi mumkin (409) — yangisini ko'rsatamiz
      refetch({ silent: true });
    } finally {
      setBusy(null);
    }
  };

  const askCancel = () =>
    Alert.alert(t('cancelOrder'), t('cancelConfirm'), [
      { text: t('back'), style: 'cancel' },
      { text: t('cancelOrder'), style: 'destructive', onPress: () => run('cancel', cancel) },
    ]);

  if (!order) {
    return (
      <Screen>
        <Header title={t('orderTitle')} onBack={onBack} />
        {error ? (
          <ErrorView message={errorText(error, t)} onRetry={refetch} retryLabel={t('retry')} />
        ) : isLoading ? (
          <LoadingSpinner />
        ) : null}
      </Screen>
    );
  }

  const pending = order.status === 'PENDING_PAYMENT';
  const stopped = ['CANCELLED', 'RETURNED'].includes(order.status);
  const payment = order.payment || {};

  return (
    <Screen scroll={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        <Header title={order.code} subtitle={statusText(t, order.status, order.statusLabel)} onBack={onBack} />

        {pending ? (
          <Card style={styles.payCard}>
            <Text style={styles.payTitle}>{t('paymentPending')}</Text>
            <Text style={styles.paySub}>
              {formatMoney(payment.amount ?? order.summary.total)} · {paymentText(t, order.paymentMethod)}
              {payment.expiresAt ? ` · ${t('payUntil')} ${timeOf(payment.expiresAt)}` : ''}
            </Text>
            {payment.demo ? (
              <Button style={styles.payButton} disabled={busy != null} onPress={() => run('pay', confirmPayment)}>
                {busy === 'pay' ? t('checkingOut') : t('confirmPaymentDemo')}
              </Button>
            ) : (
              <Text style={styles.payNote}>{t('paymentUnavailable')}</Text>
            )}
            <Overline style={styles.payOverline}>{t('changePayment')}</Overline>
            <View style={styles.methods}>
              {PAYMENT_METHODS.filter((m) => m !== order.paymentMethod && (m !== 'CASH' || rules.allowCash)).map((method) => (
                <Button
                  key={method}
                  small
                  variant="secondary"
                  disabled={busy != null}
                  onPress={() => run('method', () => changePaymentMethod(method))}
                >
                  {paymentText(t, method)}
                </Button>
              ))}
            </View>
          </Card>
        ) : null}

        <Card style={styles.block}>
          {stopped ? (
            <View style={styles.stopped}>
              <MaterialCommunityIcons name="close-circle-outline" size={20} color="#E8543F" />
              <Text style={styles.stoppedText}>{statusText(t, order.status, order.statusLabel)}</Text>
            </View>
          ) : (
            order.timeline.map((step, index) => (
              <View key={step.status} style={styles.step}>
                <View style={styles.stepRail}>
                  <View style={[styles.dot, step.done && styles.dotDone, step.current && styles.dotCurrent]} />
                  {index < order.timeline.length - 1 ? (
                    <View style={[styles.line, step.done && !step.current && styles.lineDone]} />
                  ) : null}
                </View>
                <View style={styles.stepCopy}>
                  <Text style={[styles.stepLabel, !step.done && styles.stepLabelTodo]}>
                    {statusText(t, step.status, step.label)}
                  </Text>
                  {step.at ? <Text style={styles.stepAt}>{timeOf(step.at)}</Text> : null}
                </View>
              </View>
            ))
          )}
        </Card>

        <Card style={styles.block}>
          {order.items.map((item) => (
            <View key={item.id} style={styles.item}>
              <View style={styles.thumb}>
                <JerseyPreview product={itemPreview(item)} number={item.printNumber || ''} tiny />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {item.design ? t('customJersey') : `${item.clubName} · ${item.kitLabel}`}
                </Text>
                {item.design ? (
                  <Text style={styles.itemSub} numberOfLines={1}>{designText(t, item.design)}</Text>
                ) : null}
                <Text style={styles.itemSub} numberOfLines={1}>
                  {[
                    [item.printName, item.printNumber].filter(Boolean).join(' · '),
                    item.withShorts ? `${item.shirtSize} / ${item.shortsSize}` : item.shirtSize,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              <Text style={styles.itemPrice}>
                {item.quantity} × {formatMoney(item.unitPrice)}
              </Text>
            </View>
          ))}
        </Card>

        <Card style={styles.block}>
          <Row label={t('delivery')} value={order.delivery.date ? `${order.delivery.date.split('-').reverse().join('.')} · ${order.delivery.slot}` : '—'} />
          <Row label={t('address')} value={order.delivery.address || '—'} />
          {order.comment ? <Row label={t('comment')} value={order.comment} /> : null}
          <Row label={t('paymentMethod')} value={paymentText(t, order.paymentMethod)} />
          <View style={styles.divider} />
          <Row label={t('products')} value={formatMoney(order.summary.subtotal)} />
          {order.summary.discount > 0 ? (
            <Row label={`${t('discount')}${order.promocode ? ` · ${order.promocode}` : ''}`} value={`−${formatMoney(order.summary.discount)}`} />
          ) : null}
          <Row label={t('delivery')} value={order.summary.delivery > 0 ? formatMoney(order.summary.delivery) : t('free')} />
          <Row label={t('total')} value={formatMoney(order.summary.total)} strong />
        </Card>

        {actionError ? <Text style={styles.error}>{actionError}</Text> : null}

        {onChat ? (
          <Button variant="secondary" onPress={onChat} style={styles.chatButton}>
            {t('writeToOperator')}
          </Button>
        ) : null}

        {order.canCancel ? (
          <Button variant="danger" disabled={busy != null} onPress={askCancel}>
            {busy === 'cancel' ? t('checkingOut') : t('cancelOrder')}
          </Button>
        ) : null}

        <Pressable onPress={onBack} style={styles.backLink}>
          <Text style={styles.backText}>{t('myOrders')}</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function Row({ label, value, strong }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, strong && styles.strongLabel]}>{label}</Text>
      <Text style={[styles.rowValue, strong && styles.strong]} numberOfLines={3}>{value}</Text>
    </View>
>>>>>>> fb102bed4b36fd02c0a0e3b3ae938f93892f7dd5
  );
}

const styles = StyleSheet.create({
<<<<<<< HEAD
  safe: {
    flex: 1,
    backgroundColor: '#050818',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
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
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 110,
  },
  card: {
    backgroundColor: '#0E1A3F',
    borderRadius: radii.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
    marginBottom: 14,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardSectionLabel: {
    fontSize: 11,
    color: '#8D95BD',
  },
  statusBig: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F3F5F9',
    marginTop: 4,
  },
  statusBadge: {
    backgroundColor: 'rgba(242, 163, 58, 0.14)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(242, 163, 58, 0.35)',
  },
  statusBadgeGreen: {
    backgroundColor: 'rgba(25, 167, 161, 0.14)',
    borderColor: 'rgba(25, 167, 161, 0.35)',
  },
  statusBadgeRed: {
    backgroundColor: 'rgba(232, 84, 63, 0.14)',
    borderColor: 'rgba(232, 84, 63, 0.35)',
  },
  statusBadgeText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
  },
  statusBadgeTextGreen: {
    color: colors.teal,
  },
  statusBadgeTextRed: {
    color: '#E8543F',
  },
  trackCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 12,
    marginTop: 14,
  },
  trackCardBtnText: {
    color: '#080C24',
    fontSize: 13,
    fontWeight: '800',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F3F5F9',
    marginBottom: 14,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemThumb: {
    width: 70,
    height: 70,
    borderRadius: radii.md,
    backgroundColor: '#121A42',
=======
  content: { paddingTop: 16, paddingHorizontal: spacing.xl, paddingBottom: 40 },
  chatButton: { marginBottom: spacing.md },
  payCard: { backgroundColor: '#141A40', borderColor: 'rgba(245, 165, 94, 0.45)', marginBottom: spacing.lg },
  payTitle: { color: colors.accent, fontSize: 15, fontWeight: '800' },
  paySub: { color: colors.muted, fontSize: 12, marginTop: 4 },
  payButton: { marginTop: spacing.md },
  payNote: { color: colors.muted, fontSize: 11, marginTop: spacing.md },
  payOverline: { marginTop: spacing.lg },
  methods: { flexDirection: 'row', gap: spacing.sm },
  block: { marginBottom: spacing.lg, gap: spacing.md },
  stopped: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stoppedText: { color: colors.text, fontSize: 14, fontWeight: '800' },
  step: { flexDirection: 'row', gap: spacing.md, minHeight: 40 },
  stepRail: { width: 14, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#2A3160', backgroundColor: colors.surface, marginTop: 3 },
  dotDone: { borderColor: colors.teal, backgroundColor: colors.teal },
  dotCurrent: { borderColor: colors.accent, backgroundColor: colors.accent },
  line: { flex: 1, width: 2, backgroundColor: '#2A3160', marginVertical: 2 },
  lineDone: { backgroundColor: colors.teal },
  stepCopy: { flex: 1, paddingBottom: spacing.sm },
  stepLabel: { color: colors.text, fontSize: 13, fontWeight: '700' },
  stepLabelTodo: { color: colors.muted, fontWeight: '500' },
  stepAt: { color: colors.muted, fontSize: 10, marginTop: 2 },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  thumb: {
    width: 46,
    height: 54,
    borderRadius: radii.md,
    backgroundColor: '#0E1330',
>>>>>>> fb102bed4b36fd02c0a0e3b3ae938f93892f7dd5
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
<<<<<<< HEAD
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F3F5F9',
  },
  itemSub: {
    fontSize: 12,
    color: '#8D95BD',
    marginTop: 3,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.accent,
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailKey: {
    fontSize: 11,
    color: '#8D95BD',
  },
  detailVal: {
    fontSize: 13,
    color: '#F3F5F9',
    fontWeight: '600',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(243, 245, 249, 0.08)',
    marginVertical: 10,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceKey: {
    fontSize: 13,
    color: '#8D95BD',
  },
  priceVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F3F5F9',
  },
  totalKey: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F3F5F9',
  },
  totalVal: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.accent,
  },
  reorderBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  reorderBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#080C24',
  },
=======
  itemTitle: { color: colors.text, fontSize: 13, fontWeight: '800' },
  itemSub: { color: colors.muted, fontSize: 11, marginTop: 3 },
  itemPrice: { color: colors.text, fontSize: 12, fontWeight: '800' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  rowLabel: { color: colors.muted, fontSize: 13 },
  rowValue: { color: colors.text, fontSize: 13, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  strongLabel: { color: colors.text, fontSize: 15, fontWeight: '800' },
  strong: { color: colors.text, fontSize: 17, fontWeight: '900' },
  divider: { borderTopWidth: 1, borderTopColor: '#171C3F' },
  error: { color: '#E8543F', fontSize: 12, textAlign: 'center', marginBottom: spacing.md },
  backLink: { alignItems: 'center', padding: spacing.lg },
  backText: { color: colors.muted, fontSize: 12 },
>>>>>>> fb102bed4b36fd02c0a0e3b3ae938f93892f7dd5
});
