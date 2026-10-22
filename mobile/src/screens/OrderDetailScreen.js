import React, { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radii, spacing } from '../constants/theme';
import { Button, Card, Header, Overline, Screen, formatMoney } from '../components/ui/Common';
import ErrorView from '../components/ui/ErrorView';
import { JerseyPreview } from '../components/ui/JerseyPreview';
import { designText, itemPreview } from '../features/studio';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import {
  PAYMENT_METHODS,
  onlinePaymentsEnabled,
  paymentText,
  statusText,
  useOrder,
} from '../features/orders';
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
export default function OrderDetailScreen({ t, orderId, rules, onBack }) {
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
  // Productionda Click/Payme taklif qilinmaydi: real provayder yo'q va bunday
  // buyurtma 30 daqiqadan keyin to'lovsiz bekor qilinadi.
  const switchMethods = PAYMENT_METHODS.filter(
    (method) =>
      method !== order.paymentMethod &&
      (method === 'CASH' ? rules.allowCash : onlinePaymentsEnabled()),
  );
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
            {switchMethods.length ? (
              <>
                <Overline style={styles.payOverline}>{t('changePayment')}</Overline>
                <View style={styles.methods}>
                  {switchMethods.map((method) => (
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
              </>
            ) : null}
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
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 16, paddingHorizontal: spacing.lg, paddingBottom: 50 },
  payCard: { backgroundColor: colors.surfaceRaised, borderColor: colors.accent, marginBottom: spacing.lg },
  payTitle: { color: colors.accent, fontSize: 16, fontWeight: '800' },
  paySub: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  payButton: { marginTop: spacing.md },
  payNote: { color: colors.muted, fontSize: 11, marginTop: spacing.md },
  payOverline: { marginTop: spacing.lg },
  methods: { flexDirection: 'row', gap: spacing.sm },
  block: { marginBottom: spacing.lg, gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  stopped: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stoppedText: { color: colors.danger, fontSize: 14, fontWeight: '800' },
  step: { flexDirection: 'row', gap: spacing.md, minHeight: 44 },
  stepRail: { width: 14, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface, marginTop: 3 },
  dotDone: { borderColor: colors.teal, backgroundColor: colors.teal },
  dotCurrent: { borderColor: colors.accent, backgroundColor: colors.accent },
  line: { flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 2 },
  lineDone: { backgroundColor: colors.teal },
  stepCopy: { flex: 1, paddingBottom: spacing.sm },
  stepLabel: { color: colors.text, fontSize: 13, fontWeight: '800' },
  stepLabelTodo: { color: colors.muted, fontWeight: '500' },
  stepAt: { color: colors.muted, fontSize: 11, marginTop: 2 },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  thumb: {
    width: 48,
    height: 56,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemTitle: { color: colors.text, fontSize: 13, fontWeight: '800' },
  itemSub: { color: colors.muted, fontSize: 11, marginTop: 3 },
  itemPrice: { color: colors.accent, fontSize: 13, fontWeight: '800' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  rowLabel: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  rowValue: { color: colors.text, fontSize: 13, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  strongLabel: { color: colors.text, fontSize: 15, fontWeight: '800' },
  strong: { color: colors.accent, fontSize: 18, fontWeight: '900' },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  error: { color: colors.danger, fontSize: 12, textAlign: 'center', marginBottom: spacing.md },
  backLink: { alignItems: 'center', padding: spacing.lg },
  backText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
});
