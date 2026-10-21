import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radii, spacing } from '../constants/theme';
import { Button, Card, Header, Overline, Screen, formatMoney } from '../components/ui/Common';
import ErrorView from '../components/ui/ErrorView';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { placeOrder, useAddresses, useDeliverySlots } from '../features/checkout';
import { PAYMENT_METHODS, paymentText } from '../features/orders';
import { ApiError } from '../services/api';
import { errorText } from '../utils/errors';

/** "2026-10-20" -> "Ertaga · 20.10" / "Juma · 23.10" (joriy tilda) */
export function dayText(t, day, index) {
  const date = new Date(`${day.date}T00:00:00Z`);
  const ddmm = `${day.date.slice(8, 10)}.${day.date.slice(5, 7)}`;
  const name = index === 0 && day.dayLabel === 'Ertaga' ? t('tomorrow') : t(`weekday_${date.getUTCDay()}`);
  return `${name} · ${ddmm}`;
}

const formatAddress = (a) => [a.address, a.apartment].filter(Boolean).join(', ');

/**
 * Rasmiylashtirish: manzil (GET/POST /api/addresses) -> yetkazish kuni va vaqti
 * (GET /api/checkout/delivery-slots) -> to'lov usuli -> POST /api/orders/checkout.
 * Narx serverda qayta hisoblanadi; savatdagi promokod buyurtmaga uzatiladi.
 */
export default function CheckoutScreen({ t, cart, rules, onBack, onPlaced }) {
  const { addresses, isLoading: addrLoading, error: addrError, refetch: refetchAddresses, create } = useAddresses();
  const { days, isLoading: slotsLoading, error: slotsError, refetch: refetchSlots } = useDeliverySlots(3);

  const [addressId, setAddressId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ label: '', address: '', apartment: '' });
  const [formError, setFormError] = useState(null);
  const [savingAddress, setSavingAddress] = useState(false);

  const [date, setDate] = useState(null);
  const [slot, setSlot] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Naqd to'lov Superadmin sozlamasida o'chirilishi mumkin
  const methods = rules.allowCash ? PAYMENT_METHODS : PAYMENT_METHODS.filter((m) => m !== 'CASH');
  useEffect(() => {
    if (!methods.includes(paymentMethod)) setPaymentMethod(methods[0]);
  }, [methods, paymentMethod]);

  // Asosiy manzil oldindan tanlanadi; manzil yo'q bo'lsa forma ochiladi
  useEffect(() => {
    if (addrLoading) return;
    if (!addresses.length) {
      setFormOpen(true);
      return;
    }
    if (!addresses.some((a) => a.id === addressId)) {
      setAddressId((addresses.find((a) => a.isDefault) || addresses[0]).id);
    }
  }, [addresses, addrLoading, addressId]);

  // Birinchi bo'sh slotli kun tanlanadi
  useEffect(() => {
    if (!days.length || days.some((d) => d.date === date)) return;
    const first = days.find((d) => d.slots.some((s) => s.available)) || days[0];
    setDate(first.date);
  }, [days, date]);

  const selectedDay = days.find((d) => d.date === date);
  // Tanlangan slot band bo'lib qolsa (yoki kun almashsa) — tanlov tozalanadi
  useEffect(() => {
    if (!selectedDay) return;
    if (!selectedDay.slots.some((s) => s.slot === slot && s.available)) {
      setSlot(selectedDay.slots.find((s) => s.available)?.slot || null);
    }
  }, [selectedDay, slot]);

  const saveAddress = async () => {
    setSavingAddress(true);
    setFormError(null);
    try {
      const created = await create({
        label: form.label.trim() || t('addrDefaultLabel'),
        address: form.address.trim(),
        ...(form.apartment.trim() ? { apartment: form.apartment.trim() } : {}),
      });
      setAddressId(created.id);
      setForm({ label: '', address: '', apartment: '' });
      setFormOpen(false);
    } catch (err) {
      setFormError(errorText(err, t));
    } finally {
      setSavingAddress(false);
    }
  };

  const submit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const order = await placeOrder({
        addressId,
        deliveryDate: date,
        deliverySlot: slot,
        paymentMethod,
        ...(cart.promocode ? { promocode: cart.promocode } : {}),
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      });
      // Server savatni tozaladi — lokal holatni ham yangilaymiz
      cart.refresh();
      onPlaced(order);
    } catch (err) {
      setSubmitError(errorText(err, t));
      // Slot band bo'lib qolgan (409) — bo'sh joylarni qayta yuklaymiz
      if (err instanceof ApiError && err.status === 409) refetchSlots();
    } finally {
      setSubmitting(false);
    }
  };

  const { summary } = cart;
  const paused = !rules.acceptOrders;
  const ready = Boolean(addressId && date && slot && paymentMethod && cart.items.length) && !submitting && !paused;

  return (
    <Screen
      contentStyle={{ paddingBottom: 130 }}
      footer={
        <View style={styles.footer}>
          <View>
            <Text style={styles.footerLabel}>{t('total')}</Text>
            <Text style={styles.footerPrice}>{formatMoney(summary.total)}</Text>
          </View>
          <Button disabled={!ready} onPress={submit}>
            {submitting ? t('checkingOut') : t('placeOrder')}
          </Button>
        </View>
      }
    >
      <Header title={t('checkoutTitle')} onBack={onBack} />

      {/* ── Manzil ── */}
      <Overline>{t('deliveryAddress')}</Overline>
      {addrError ? (
        <ErrorView message={errorText(addrError, t)} onRetry={refetchAddresses} retryLabel={t('retry')} />
      ) : addrLoading && !addresses.length ? (
        <LoadingSpinner size="small" />
      ) : (
        <View style={styles.options}>
          {addresses.map((a) => (
            <Option
              key={a.id}
              selected={a.id === addressId}
              title={a.label}
              sub={formatAddress(a)}
              onPress={() => setAddressId(a.id)}
            />
          ))}
        </View>
      )}

      {formOpen ? (
        <Card style={styles.form}>
          <TextInput
            value={form.label}
            onChangeText={(label) => setForm((f) => ({ ...f, label }))}
            placeholder={t('addrLabelPlaceholder')}
            placeholderTextColor={colors.muted}
            maxLength={30}
            style={styles.input}
          />
          <TextInput
            value={form.address}
            onChangeText={(address) => setForm((f) => ({ ...f, address }))}
            placeholder={t('addrPlaceholder')}
            placeholderTextColor={colors.muted}
            maxLength={200}
            style={styles.input}
          />
          <TextInput
            value={form.apartment}
            onChangeText={(apartment) => setForm((f) => ({ ...f, apartment }))}
            placeholder={t('addrApartmentPlaceholder')}
            placeholderTextColor={colors.muted}
            maxLength={60}
            style={styles.input}
          />
          {formError ? <Text style={styles.error}>{formError}</Text> : null}
          <View style={styles.formActions}>
            {addresses.length ? (
              <Button small variant="secondary" onPress={() => setFormOpen(false)}>{t('back')}</Button>
            ) : null}
            <Button small disabled={savingAddress || form.address.trim().length < 5} onPress={saveAddress}>
              {savingAddress ? t('saving') : t('save')}
            </Button>
          </View>
        </Card>
      ) : (
        <Pressable style={styles.addLink} onPress={() => setFormOpen(true)}>
          <MaterialCommunityIcons name="plus" size={16} color={colors.accent} />
          <Text style={styles.addLinkText}>{t('addAddress')}</Text>
        </Pressable>
      )}

      {/* ── Yetkazish vaqti ── */}
      <Overline style={styles.sectionGap}>{t('deliveryTime')}</Overline>
      {slotsError ? (
        <ErrorView message={errorText(slotsError, t)} onRetry={refetchSlots} retryLabel={t('retry')} />
      ) : slotsLoading && !days.length ? (
        <LoadingSpinner size="small" />
      ) : (
        <>
          <View style={styles.chips}>
            {days.map((day, index) => (
              <Chip key={day.date} active={day.date === date} onPress={() => setDate(day.date)}>
                {dayText(t, day, index)}
              </Chip>
            ))}
          </View>
          <View style={[styles.chips, styles.slotChips]}>
            {(selectedDay?.slots || []).map((s) => (
              <Chip key={s.slot} active={s.slot === slot} disabled={!s.available} onPress={() => setSlot(s.slot)}>
                {`${s.start}–${s.end}`}
              </Chip>
            ))}
          </View>
          {selectedDay && !selectedDay.slots.some((s) => s.available) ? (
            <Text style={styles.note}>{t('noSlots')}</Text>
          ) : null}
        </>
      )}

      {/* ── To'lov usuli ── */}
      <Overline style={styles.sectionGap}>{t('paymentMethod')}</Overline>
      <View style={styles.options}>
        {methods.map((method) => (
          <Option
            key={method}
            selected={method === paymentMethod}
            title={paymentText(t, method)}
            sub={method === 'CASH' ? t('payCashSub') : t('payOnlineSub')}
            onPress={() => setPaymentMethod(method)}
          />
        ))}
      </View>

      <TextInput
        value={comment}
        onChangeText={setComment}
        placeholder={t('commentPlaceholder')}
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
        <Row label={t('delivery')} value={summary.delivery > 0 ? formatMoney(summary.delivery) : t('free')} />
        <View style={styles.divider} />
        <Row label={t('total')} value={formatMoney(summary.total)} strong />
      </Card>

      {paused ? (
        <Text style={[styles.error, styles.submitError]}>{rules.pausedMessage || t('ordersPaused')}</Text>
      ) : null}
      {submitError ? <Text style={[styles.error, styles.submitError]}>{submitError}</Text> : null}
    </Screen>
  );
}

function Option({ selected, title, sub, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.option, selected && styles.optionActive]}>
      <MaterialCommunityIcons
        name={selected ? 'radiobox-marked' : 'radiobox-blank'}
        size={20}
        color={selected ? colors.accent : colors.muted}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.optionTitle}>{title}</Text>
        {sub ? <Text style={styles.optionSub} numberOfLines={2}>{sub}</Text> : null}
      </View>
    </Pressable>
  );
}

function Chip({ children, active, disabled, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.chip, active && styles.chipActive, disabled && styles.chipOff]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{children}</Text>
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

const styles = StyleSheet.create({
  options: { gap: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: '#1B2150',
    padding: spacing.md,
  },
  optionActive: { borderColor: colors.accent, backgroundColor: '#0E1330' },
  optionTitle: { color: colors.text, fontSize: 13, fontWeight: '800' },
  optionSub: { color: colors.muted, fontSize: 11, marginTop: 3 },
  form: { gap: spacing.sm, marginTop: spacing.md },
  input: {
    minHeight: 46,
    borderRadius: radii.md,
    backgroundColor: '#0E1330',
    borderWidth: 1,
    borderColor: '#232A57',
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 14,
  },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.xs },
  addLink: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: spacing.md },
  addLinkText: { color: colors.accent, fontSize: 12, fontWeight: '800' },
  sectionGap: { marginTop: spacing.xl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slotChips: { marginTop: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radii.round,
    backgroundColor: colors.chip,
    borderWidth: 1,
    borderColor: '#1D2350',
  },
  chipActive: { backgroundColor: '#0E1330', borderColor: colors.accent },
  chipOff: { opacity: 0.35 },
  chipText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: colors.accent },
  note: { color: colors.muted, fontSize: 11, marginTop: spacing.sm },
  comment: { marginTop: spacing.xl, paddingTop: 12, minHeight: 70, textAlignVertical: 'top' },
  summary: { gap: spacing.md, marginTop: spacing.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { color: colors.muted, fontSize: 13 },
  rowValue: { color: colors.text, fontSize: 13, fontWeight: '700' },
  strongLabel: { color: colors.text, fontSize: 15, fontWeight: '800' },
  strong: { color: colors.text, fontSize: 17, fontWeight: '900' },
  divider: { borderTopWidth: 1, borderTopColor: '#171C3F' },
  error: { color: '#E8543F', fontSize: 12 },
  submitError: { textAlign: 'center', marginTop: spacing.md },
  footer: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footerLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  footerPrice: { color: colors.text, fontSize: 17, fontWeight: '900', marginTop: 3 },
});
