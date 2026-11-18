import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radii, spacing, themedStyles } from '../constants/theme';
import { Button, Card, Header, Overline, Screen, formatMoney } from '../components/ui/Common';
import ErrorView from '../components/ui/ErrorView';
import Kit360Thumb from '../components/ui/Kit360Thumb';
import { itemKit360, itemVariant } from '../features/kit360';
import { designText } from '../features/studio';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { ConfirmModal } from '../components/ui/Modals';
import { useToast } from '../components/ui/Toast';
import StatusPill, { OrderStepper, statusTone } from '../components/ui/StatusPill';
import {
  CHECKOUT_METHODS,
  canCancelOrder,
  deliveryText,
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
  const { order, isLoading, error, refetch, cancel, received, confirmPayment, changePaymentMethod } = useOrder(orderId);
  const toast = useToast();
  const insets = useSafeAreaInsets();
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

  // "Rostdan ham bekor qilmoqchimisiz?" — tasdiqlanmaguncha bekor qilinmaydi
  const [cancelAsk, setCancelAsk] = useState(false);

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
  // To'lov kutayotgan buyurtma: balansdan to'lash (server darhol yechadi) yoki naqd
  const switchMethods = CHECKOUT_METHODS.filter(
    (method) => method !== order.paymentMethod && (method !== 'CASH' || rules.allowCash),
  );
  const stopped = ['CANCELLED', 'RETURNED'].includes(order.status);
  const payment = order.payment || {};
  const tone = statusTone(order.status);
  // Pastdagi yashil tugma: yetkazilmoqda (yoki admin "yetkazildi" degan, mijoz hali tasdiqlamagan)
  const askReceipt = Boolean(order.canConfirmReceipt);
  const deliveredAsk = askReceipt && order.status === 'DELIVERED';
  const confirmReceived = () =>
    run('received', async () => {
      await received();
      toast.show(t('receivedDone'), 'success');
    });

  return (
    <Screen scroll={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, askReceipt && styles.contentWithBar]}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        <Header title={order.code} subtitle={formatDate(order.createdAt)} onBack={onBack} />

        {/* Holat kartasi: rangli belgi + 4 bosqichli kuzatish */}
        <Card style={[styles.statusCard, { borderColor: tone.border }]}>
          <View style={styles.statusHead}>
            <View style={[styles.statusIcon, { backgroundColor: tone.bg, borderColor: tone.border }]}>
              <MaterialCommunityIcons name={tone.icon} size={26} color={tone.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Overline style={styles.statusOverline}>{t('orderStatus')}</Overline>
              <StatusPill size="large" status={order.status} label={statusText(t, order.status, order.statusLabel)} />
            </View>
          </View>
          {stopped ? null : (
            <View style={styles.statusStepper}>
              <OrderStepper t={t} status={order.status} />
            </View>
          )}
        </Card>

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
                  <View
                    style={[
                      styles.dot,
                      step.done && styles.dotDone,
                      step.current && { borderColor: tone.color, backgroundColor: tone.color, shadowColor: tone.color },
                      step.current && styles.dotCurrent,
                    ]}
                  />
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
                <Kit360Thumb team={itemKit360(item)} variant={itemVariant(item)} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {item.design ? t('customJersey') : item.clubName}
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
          <Row label={t('delivery')} value={deliveryText(t, order.delivery)} />
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

        {canCancelOrder(order) ? (
          <Button variant="danger" disabled={busy != null} onPress={() => setCancelAsk(true)}>
            {busy === 'cancel' ? t('checkingOut') : t('cancelOrder')}
          </Button>
        ) : !stopped && order.status !== 'DELIVERED' ? (
          // Admin buyurtmani qabul qilgan (yoki bekor qilish muddati o'tgan) — tugma o'chiq
          <View>
            <Button variant="danger" disabled onPress={() => {}}>
              {t('cancelOrder')}
            </Button>
            <View style={styles.lockNote}>
              <MaterialCommunityIcons name="lock-outline" size={16} color={colors.muted} />
              {/* Hali qabul qilinmagan, lekin server ruxsat bermayapti — bekor qilish muddati o'tgan */}
              <Text style={styles.lockText}>{t(['PENDING_PAYMENT', 'NEW'].includes(order.status) ? 'cancelWindowOver' : 'cancelLocked')}</Text>
            </View>
          </View>
        ) : null}

        <Pressable onPress={onBack} style={styles.backLink}>
          <Text style={styles.backText}>{t('myOrders')}</Text>
        </Pressable>
      </ScrollView>

      {askReceipt ? (
        <View style={[styles.receiptBar, { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm }]}>
          {deliveredAsk ? (
            <View style={styles.receiptAsk}>
              <MaterialCommunityIcons name="package-variant-closed-check" size={22} color={colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={styles.receiptTitle}>{t('receivedAsk')}</Text>
                <Text style={styles.receiptSub}>{t('receivedAskSub')}</Text>
              </View>
            </View>
          ) : null}
          <Pressable
            onPress={confirmReceived}
            disabled={busy != null}
            accessibilityRole="button"
            style={({ pressed }) => [styles.receiptBtn, pressed && styles.receiptBtnPressed, busy != null && styles.receiptBtnBusy]}
          >
            <MaterialCommunityIcons name="check-circle" size={22} color="#FFFFFF" />
            <Text style={styles.receiptBtnText}>
              {busy === 'received' ? t('checkingOut') : t(deliveredAsk ? 'receivedYes' : 'receivedBtn')}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <ConfirmModal
        visible={cancelAsk}
        danger
        title={t('cancelOrder')}
        message={t('cancelConfirm')}
        confirmText={t('cancelYes')}
        cancelText={t('back')}
        onClose={() => setCancelAsk(false)}
        onConfirm={() => run('cancel', cancel)}
      />
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

const styles = themedStyles(() => ({
  content: { paddingTop: 16, paddingHorizontal: spacing.lg, paddingBottom: 50 },
  contentWithBar: { paddingBottom: 190 },
  // "Buyurtmani qabul qildim" — ekran pastida doim ko'rinadigan yashil tugma
  receiptBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  receiptAsk: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  receiptTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  receiptSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  receiptBtn: {
    height: 56,
    borderRadius: radii.lg,
    backgroundColor: '#16A34A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    shadowColor: '#16A34A',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  receiptBtnPressed: { backgroundColor: '#15803D', transform: [{ scale: 0.98 }] },
  receiptBtnBusy: { opacity: 0.7 },
  receiptBtnText: { color: '#FFFFFF', fontSize: 16, fontFamily: fonts.bodySemi },
  payCard: { backgroundColor: colors.surfaceRaised, borderColor: colors.accent, marginBottom: spacing.lg },
  payTitle: { color: colors.accent, fontSize: 16, fontWeight: '800' },
  paySub: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  payButton: { marginTop: spacing.md },
  payNote: { color: colors.muted, fontSize: 11, marginTop: spacing.md },
  payOverline: { marginTop: spacing.lg },
  methods: { flexDirection: 'row', gap: spacing.sm },
  block: { marginBottom: spacing.lg, gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  lockNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: spacing.sm, paddingHorizontal: 4 },
  lockText: { flex: 1, color: colors.muted, fontSize: 12, lineHeight: 17 },
  stopped: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stoppedText: { color: colors.danger, fontSize: 14, fontWeight: '800' },
  step: { flexDirection: 'row', gap: spacing.md, minHeight: 44 },
  stepRail: { width: 14, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface, marginTop: 3 },
  dotDone: { borderColor: colors.teal, backgroundColor: colors.teal },
  dotCurrent: { width: 14, height: 14, borderRadius: 7, marginTop: 2, shadowOpacity: 0.6, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 3 },
  statusCard: { marginBottom: spacing.lg, backgroundColor: colors.surfaceRaised, borderWidth: 1 },
  statusHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  statusIcon: { width: 52, height: 52, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  statusOverline: { marginBottom: 6 },
  statusStepper: { marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight },
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
}));
