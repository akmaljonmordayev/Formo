import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radii, spacing, themedStyles } from '../constants/theme';
import AddressPicker, { isAddressComplete } from '../components/checkout/AddressPicker';
import DeliveryWhen, { defaultSlot } from '../components/checkout/DeliveryWhen';
import { Button, Card, Header, Screen, formatMoney } from '../components/ui/Common';
import ErrorView from '../components/ui/ErrorView';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { placeOrder, useAddresses, useDeliverySlots } from '../features/checkout';
import { isPostalDelivery } from '../features/location/tashkent';
import useWallet, { canPayFromBalance } from '../features/wallet';
import { ApiError } from '../services/api';
import { errorText } from '../utils/errors';

/**
 * Rasmiylashtirish — 3 qadam:
 *   1) Qayerga? — tanlangan manzil bitta kartada; "Boshqa manzil" ro'yxati pastdan ochiladi, "Yangi manzil" — xaritadan.
 *   2) Qachon? — Toshkent shahri: kuryer, eng erta ertaga (kun va vaqt); viloyatlar: pochta bo'limigacha,
 *      viloyat bo'yicha pochta narxi (GET /api/checkout/delivery-slots) va 2–5 ish kuni.
 *   3) To'lov — balans (asosiy); Toshkent shahri ichida kuryerga naqd ham (Superadmin allowCash). Viloyatlarga —
 *      faqat balansdan. Balans yetmasa "To'ldirish".
 * Narx serverda qayta hisoblanadi; savatdagi promokod buyurtmaga uzatiladi.
 */
export default function CheckoutScreen({ t, cart, rules, onBack, onPlaced, onPickOnMap, onEditAddress, onWallet, initialAddressId }) {
  const { addresses, isLoading: addrLoading, error: addrError, refetch: refetchAddresses } = useAddresses();

  // Xaritadan yangi manzil saqlab qaytilganda — o'sha manzil tanlanadi
  const [addressId, setAddressId] = useState(initialAddressId ?? null);
  const selectedAddress = addresses.find((a) => a.id === addressId) || null;
  const postal = isPostalDelivery(selectedAddress);
  const addressOk = isAddressComplete(selectedAddress);
  const {
    fee,
    days,
    postalDays,
    isLoading: slotsLoading,
    error: slotsError,
    refetch: refetchSlots,
  } = useDeliverySlots(3, selectedAddress?.region);

  const [date, setDate] = useState(null);
  // Naqd — faqat Toshkent shahri ichida (kuryer) va Superadmin yoqib qo'ygan bo'lsa; server ham tekshiradi
  const cashAllowed = Boolean(rules.allowCash && selectedAddress && !postal);
  const [paymentMethod, setPaymentMethod] = useState('BALANCE');
  const method = paymentMethod === 'CASH' && !cashAllowed ? 'BALANCE' : paymentMethod;
  const [slot, setSlot] = useState(null);
  // Balans serverdan; ilovaga (Telegram'dan) qaytganda yangilanadi
  const wallet = useWallet();
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);
  const [submitError, setSubmitError] = useState(null);

  // Manzil (va shu bilan viloyat) almashganda savat yakuni (yetkazish narxi) o'sha viloyat bo'yicha qayta hisoblanadi
  useEffect(() => {
    cart.setDeliveryRegion(selectedAddress?.region);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAddress?.region]);

  // Asosiy manzil oldindan tanlanadi; manzil yo'q bo'lsa — xaritadan qo'shish kartasi
  useEffect(() => {
    if (addrLoading || !addresses.length) return;
    if (!addresses.some((a) => a.id === addressId)) {
      setAddressId((addresses.find((a) => a.isDefault) || addresses[0]).id);
    }
  }, [addresses, addrLoading, addressId]);

  // Birinchi bo'sh kun (eng erta — ertaga) tanlanadi
  useEffect(() => {
    if (!days.length || days.some((d) => d.date === date)) return;
    const first = days.find((d) => d.slots.some((s) => s.available)) || days[0];
    setDate(first.date);
  }, [days, date]);

  const selectedDay = days.find((d) => d.date === date);
  // Kun almashsa yoki tanlangan vaqt band bo'lib qolsa — shu kunning kechki bo'sh vaqti
  useEffect(() => {
    if (!selectedDay) return;
    if (!selectedDay.slots.some((s) => s.slot === slot && s.available)) setSlot(defaultSlot(selectedDay));
  }, [selectedDay, slot]);

  const { summary } = cart;
  const paused = !rules.acceptOrders;
  const total = summary?.total ?? 0;
  const balanceKnown = wallet.balance != null;
  const byBalance = method === 'BALANCE';
  const balanceShort = byBalance && balanceKnown && !canPayFromBalance(wallet.balance, total);
  const whenReady = postal || Boolean(date && slot);
  const ready =
    Boolean(addressId && addressOk && whenReady && cart.items.length) && !submitting && !paused && (!byBalance || (balanceKnown && !balanceShort));

  const submit = async () => {
    // Tez ikki marta bosish: `submitting` holati keyingi render'gacha o'zgarmaydi — ref darhol
    if (inFlight.current || !ready) return;
    inFlight.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const order = await placeOrder({
        addressId,
        // Viloyatlarga pochta orqali — kun/vaqt yuborilmaydi
        ...(postal ? {} : { deliveryDate: date, deliverySlot: slot }),
        paymentMethod: method,
        ...(cart.promocode ? { promocode: cart.promocode } : {}),
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      });
      // Server savatni tozaladi — lokal holat va promokod ham tozalanadi
      cart.afterOrder();
      wallet.refetch({ silent: true });
      onPlaced(order);
    } catch (err) {
      setSubmitError(errorText(err, t));
      wallet.refetch({ silent: true });
      // Vaqt band bo'lib qolgan (409) — bo'sh joylarni qayta yuklaymiz
      if (err instanceof ApiError && err.status === 409) refetchSlots();
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  // Tugma o'chiq bo'lsa — nima yetishmayotgani bitta qatorda
  const blocker = paused
    ? rules.pausedMessage || t('ordersPaused')
    : !selectedAddress
      ? t('checkoutNeedAddress')
      : !addressOk
        ? t('addrIncomplete')
        : !whenReady
          ? t('checkoutNeedTime')
          : balanceShort
            ? t('balanceShort')
            : null;

  return (
    <Screen
      contentStyle={{ paddingBottom: 130 }}
      footer={
        <View style={styles.footer}>
          <View>
            <Text style={styles.footerLabel}>{t('total')}</Text>
            <Text style={styles.footerPrice}>{formatMoney(total)}</Text>
          </View>
          <Button disabled={!ready} onPress={submit} style={styles.footerButton}>
            {submitting ? t('checkingOut') : t('placeOrder')}
          </Button>
        </View>
      }
    >
      <Header title={t('checkoutTitle')} onBack={onBack} />

      {/* ── 1. Qayerga yetkazamiz? ── */}
      <StepHead n={1} title={t('checkoutStepAddress')} done={addressOk} />
      {addrError ? (
        <ErrorView message={errorText(addrError, t)} onRetry={refetchAddresses} retryLabel={t('retry')} />
      ) : addrLoading && !addresses.length ? (
        <LoadingSpinner size="small" />
      ) : (
        <AddressPicker
          t={t}
          addresses={addresses}
          selected={selectedAddress}
          onSelect={setAddressId}
          onAdd={onPickOnMap}
          onEdit={onEditAddress}
        />
      )}

      {/* ── 2. Qachon? ── */}
      <StepHead n={2} title={t('checkoutStepTime')} done={Boolean(selectedAddress) && whenReady} style={styles.sectionGap} />
      {!selectedAddress ? (
        <Text style={styles.note}>{t('checkoutTimeNeedsAddress')}</Text>
      ) : slotsError ? (
        <ErrorView message={errorText(slotsError, t)} onRetry={refetchSlots} retryLabel={t('retry')} />
      ) : slotsLoading && !days.length ? (
        <LoadingSpinner size="small" />
      ) : (
        <DeliveryWhen
          t={t}
          postal={postal}
          regionName={selectedAddress.region ? t(`region_${selectedAddress.region}`) : ''}
          fee={fee}
          postalDays={postalDays}
          days={days}
          date={date}
          slot={slot}
          onDate={setDate}
          onSlot={setSlot}
        />
      )}

      {/* ── 3. To'lov: faqat shaxsiy hisob ── */}
      <StepHead n={3} title={t('checkoutStepPay')} done={!byBalance || (balanceKnown && !balanceShort)} style={styles.sectionGap} />
      <View style={styles.payList}>
        <PayOption
          icon="wallet"
          title={t('pay_BALANCE')}
          sub={balanceKnown ? `${t('walletBalance')}: ${formatMoney(wallet.balance)}` : wallet.error ? errorText(wallet.error, t) : '…'}
          selected={byBalance}
          warn={balanceShort}
          onPress={() => setPaymentMethod('BALANCE')}
        />
        {cashAllowed ? (
          <PayOption icon="cash" title={t('pay_CASH')} sub={t('payCashSub')} selected={method === 'CASH'} onPress={() => setPaymentMethod('CASH')} />
        ) : null}
      </View>
      {postal && rules.allowCash ? <Text style={[styles.note, styles.payNote]}>{t('cashCityOnly')}</Text> : null}
      {balanceShort ? (
        <View style={styles.short}>
          <Text style={styles.shortText}>
            {t('balanceShort')} · {t('balanceNeed')} {formatMoney(total - wallet.balance)}
          </Text>
          <Button small onPress={onWallet}>
            {t('topUp')}
          </Button>
        </View>
      ) : null}

      <TextInput
        value={comment}
        onChangeText={setComment}
        placeholder={t(postal ? 'commentPlaceholderPost' : 'commentPlaceholder')}
        placeholderTextColor={colors.muted}
        maxLength={300}
        multiline
        style={[styles.input, styles.comment]}
      />

      <Card style={styles.summary}>
        <Row label={`${t('products')} · ${cart.count} ${t('pcs')}`} value={formatMoney(summary.subtotal)} />
        {summary.discount > 0 ? (
          <Row label={`${t('discount')} · ${cart.promocode}`} value={`−${formatMoney(summary.discount)}`} />
        ) : null}
        <Row label={t(postal ? 'postFee' : 'delivery')} value={summary.delivery > 0 ? formatMoney(summary.delivery) : t('free')} />
        <View style={styles.divider} />
        <Row label={t('total')} value={formatMoney(summary.total)} strong />
      </Card>

      {submitError ? (
        <Text style={[styles.error, styles.centered]}>{submitError}</Text>
      ) : blocker ? (
        <Text style={[paused ? styles.error : styles.note, styles.centered]}>{blocker}</Text>
      ) : null}
    </Screen>
  );
}

/** Bo'lim sarlavhasi: raqamli doira (bajarilsa ✓) + savol */
function StepHead({ n, title, done, style }) {
  return (
    <View style={[styles.stepHead, style]}>
      <View style={[styles.stepDot, done && styles.stepDotDone]}>
        {done ? (
          <MaterialCommunityIcons name="check" size={16} color={colors.primaryDark} />
        ) : (
          <Text style={styles.stepNum}>{n}</Text>
        )}
      </View>
      <Text style={styles.stepTitle}>{title}</Text>
    </View>
  );
}

function PayOption({ icon, title, sub, selected, warn, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.pay, selected && styles.payOn, warn && styles.payShort, pressed && styles.pressed]}
    >
      <View style={[styles.payIcon, !selected && styles.payIconOff]}>
        <MaterialCommunityIcons name={icon} size={22} color={selected ? colors.primaryDark : colors.muted} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.payTitle}>{title}</Text>
        <Text style={styles.paySub}>{sub}</Text>
      </View>
      <MaterialCommunityIcons name={selected ? 'check-circle' : 'circle-outline'} size={24} color={selected ? colors.accent : colors.border} />
    </Pressable>
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

const styles = themedStyles(() => ({
  flex: { flex: 1 },
  sectionGap: { marginTop: spacing.xxl },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  stepDotDone: { backgroundColor: colors.accent },
  stepNum: { color: colors.accent, fontSize: 14, fontWeight: '900' },
  stepTitle: { flex: 1, color: colors.text, fontSize: 19, fontWeight: '900', letterSpacing: -0.2 },
  pay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  payOn: { borderColor: colors.accent, backgroundColor: colors.surfaceRaised },
  payShort: { borderColor: colors.danger },
  payIconOff: { backgroundColor: colors.surfaceRaised },
  payList: { gap: spacing.sm },
  payNote: { marginTop: spacing.sm },
  pressed: { opacity: 0.85 },
  payIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  payTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  paySub: { color: colors.textSecondary, fontSize: 13, marginTop: 3, fontWeight: '600' },
  short: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.dangerGlow,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  shortText: { flex: 1, color: colors.text, fontSize: 12, lineHeight: 17, fontWeight: '700' },
  input: {
    minHeight: 50,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    fontWeight: '600',
  },
  comment: { marginTop: spacing.xl, paddingTop: 14, minHeight: 80, textAlignVertical: 'top' },
  summary: { gap: spacing.md, marginTop: spacing.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  rowValue: { color: colors.text, fontSize: 13, fontWeight: '700' },
  strongLabel: { color: colors.text, fontSize: 15, fontWeight: '800' },
  strong: { color: colors.accent, fontSize: 18, fontWeight: '900' },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  note: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  error: { color: colors.danger, fontSize: 12, fontWeight: '700' },
  centered: { textAlign: 'center', marginTop: spacing.md },
  footer: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  footerButton: { flexShrink: 1 },
  footerLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  footerPrice: { color: colors.accent, fontSize: 18, fontWeight: '900', marginTop: 2 },
}));
