import React, { useEffect, useState } from 'react';
<<<<<<< HEAD
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AddressModal } from '../components/ui/Modals';
import { useToast } from '../components/ui/Toast';
import { colors, radii } from '../constants/theme';
import { api } from '../services/api';

const DEFAULT_SLOTS = [
  { day: 'Ertaga', time: '10:00–14:00' },
  { day: 'Ertaga', time: '14:00–18:00' },
  { day: 'Juma', time: '10:00–14:00' },
];

const PAY_METHODS = [
  { id: 'click', name: 'Click', icon: 'credit-card-outline', color: '#1D2F8C' },
  { id: 'payme', name: 'Payme', icon: 'credit-card-check-outline', color: '#19A7A1' },
  { id: 'cash', name: 'Naqd, kuryerga', icon: 'cash-multiple', color: '#F2A33A' },
];

export default function CheckoutScreen({
  checkoutData,
  store,
  auth,
  t,
  onBack,
  onOrderSuccess,
  onProceedToPay,
}) {
  const toast = useToast();
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [address, setAddress] = useState('Toshkent sh., Yunusobod tumani, 4-mavze, 12-uy');
  const [addressTitle, setAddressTitle] = useState('Uy');
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [slotIndex, setSlotIndex] = useState(0);
  const [slots, setSlots] = useState(DEFAULT_SLOTS);
  const [payMethod, setPayMethod] = useState('click');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const total = checkoutData?.total || 189000;

  const mapAddress = (a, index = 0) => ({
    id: a.id ?? index + 1,
    title: a.label || a.title || (index === 0 ? 'Uy' : 'Ishxona'),
    address: [a.address, a.apartment].filter(Boolean).join(', ') || 'Toshkent shahri',
    isDefault: Boolean(a.isDefault),
  });

  // Load addresses & delivery slots from API
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const addrRes = await api.addresses.list().catch(() => null);
        if (!cancelled && Array.isArray(addrRes) && addrRes.length > 0) {
          const mapped = addrRes.map(mapAddress);
          setAddresses(mapped);
          const defaultAddress = mapped.find((item) => item.isDefault) || mapped[0];
          if (defaultAddress) {
            setSelectedAddressId(defaultAddress.id);
            setAddress(defaultAddress.address);
            setAddressTitle(defaultAddress.title);
          }
        }

        const slotsRes = await api.orders.getDeliverySlots(5).catch(() => null);
        if (!cancelled && slotsRes?.days && slotsRes.days.length > 0) {
          const flat = [];
          slotsRes.days.forEach((d) => {
            (d.slots || []).forEach((s) => {
              if (s.available !== false) {
                flat.push({
                  date: d.date,
                  day: d.dayLabel || d.date,
                  slot: s.slot || `${s.start}-${s.end}`,
                  time: s.slot || `${s.start}-${s.end}`,
                  label: `${d.dayLabel || d.date} · ${s.slot || `${s.start}-${s.end}`}`,
                });
              }
            });
          });
          if (flat.length > 0) setSlots(flat.slice(0, 4));
        }
      } catch {
        // ignore
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePlaceOrder = async () => {
    if (!selectedAddressId && addresses.length === 0) {
      toast.show('Avval manzil tanlang', 'error');
      return;
    }

    setLoading(true);
    const selectedSlot = slots[slotIndex] || slots[0];
    const payload = {
      addressId: Number(selectedAddressId ?? addresses[0]?.id),
      deliveryDate: selectedSlot?.date,
      deliverySlot: selectedSlot?.slot || selectedSlot?.time,
      paymentMethod: payMethod.toUpperCase(),
      ...(checkoutData?.promoCode ? { promocode: checkoutData.promoCode.toUpperCase() } : {}),
      ...(comment.trim() ? { comment: comment.trim() } : {}),
    };

    try {
      const orderRes = await api.orders.checkout(payload);
      const createdOrder = {
        id: orderRes?.id,
        orderNumber: orderRes?.code || orderRes?.id,
        status: orderRes?.status || (payMethod === 'cash' ? 'ACCEPTED' : 'PENDING_PAYMENT'),
        statusLabel: orderRes?.statusLabel || (payMethod === 'cash' ? 'Qabul qilindi' : 'To\'lov kutilmoqda'),
        date: orderRes?.delivery?.date || 'Bugun',
        total: orderRes?.summary?.total ?? total,
        payMethod: PAY_METHODS.find((p) => p.id === payMethod)?.name || 'Click',
        address,
        slot: selectedSlot?.label || `${selectedSlot?.day} · ${selectedSlot?.time}`,
        items: store.cart || [],
      };

      store.clearCart();
      toast.show('Buyurtmangiz qabul qilindi!', 'success');

      if (payMethod === 'cash') {
        onOrderSuccess?.(createdOrder);
      } else {
        onProceedToPay?.(createdOrder);
      }
    } catch (err) {
      toast.show(err?.message || 'Buyurtma berishda xatolik yuz berdi', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Top Bar */}
          <View style={styles.topBar}>
            <Pressable onPress={onBack} hitSlop={10} style={styles.iconBtn}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="#F3F5F9" />
            </Pressable>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.title}>Rasmiylashtirish</Text>
              <Text style={styles.sub}>Yetkazish va to‘lov</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          {/* 1. Address Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <MaterialCommunityIcons name="map-marker-outline" size={20} color={colors.accent} />
                <Text style={styles.cardTitle}>Yetkazib berish manzili</Text>
              </View>
              <Pressable onPress={() => setShowAddressModal(true)} hitSlop={8}>
                <Text style={styles.changeBtnText}>O‘zgartirish</Text>
              </Pressable>
            </View>

            <View style={styles.addressBox}>
              <Text style={styles.addressTitle}>{addressTitle}</Text>
              <Text style={styles.addressText}>{address}</Text>
            </View>
          </View>

          {/* 2. Delivery Slots */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <MaterialCommunityIcons name="clock-outline" size={20} color={colors.teal} />
              <Text style={styles.cardTitle}>Yetkazish vaqti</Text>
            </View>

            <View style={styles.slotsRow}>
              {slots.map((s, i) => {
                const active = slotIndex === i;
                return (
                  <Pressable
                    key={i}
                    onPress={() => setSlotIndex(i)}
                    style={[styles.slotChip, active && styles.slotChipActive]}
                  >
                    <Text style={[styles.slotDay, active && styles.slotDayActive]}>{s.day}</Text>
                    <Text style={[styles.slotTime, active && styles.slotTimeActive]}>{s.time}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* 3. Payment Method */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <MaterialCommunityIcons name="wallet-outline" size={20} color={colors.accent} />
              <Text style={styles.cardTitle}>To‘lov usuli</Text>
            </View>

            <View style={styles.paysList}>
              {PAY_METHODS.map((p) => {
                const active = payMethod === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => setPayMethod(p.id)}
                    style={[styles.payRow, active && styles.payRowActive]}
                  >
                    <View style={[styles.payIconCircle, { backgroundColor: 'rgba(243,245,249,0.06)' }]}>
                      <MaterialCommunityIcons name={p.icon} size={22} color={p.color} />
                    </View>
                    <Text style={[styles.payName, active && styles.payNameActive]}>{p.name}</Text>
                    <View style={[styles.radioCircle, active && styles.radioCircleActive]}>
                      {active && <View style={styles.radioDot} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* 4. Courier Note */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Kuryer uchun izoh (ixtiyoriy)</Text>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Masalan: Domofon kodi 45, eshik oldida qoldiring"
              placeholderTextColor={colors.caption}
              multiline
              numberOfLines={2}
              style={styles.commentInput}
            />
          </View>

          {/* Bottom Bar */}
          <View style={styles.bottomBar}>
            <View>
              <Text style={styles.totalLabel}>Jami summa</Text>
              <Text style={styles.totalPrice}>{total.toLocaleString('uz-UZ')} so‘m</Text>
            </View>

            <Pressable
              disabled={loading}
              onPress={handlePlaceOrder}
              style={[styles.orderBtn, loading && { opacity: 0.5 }]}
            >
              {loading ? (
                <ActivityIndicator color="#080C24" />
              ) : (
                <>
                  <Text style={styles.orderBtnText}>
                    {payMethod === 'cash' ? 'Buyurtma berish' : 'To‘lashga o‘tish'}
                  </Text>
                  <MaterialCommunityIcons name="arrow-right" size={20} color="#080C24" />
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Address Edit Modal */}
      <AddressModal
        visible={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        initial={{ title: addressTitle, address }}
        onSave={(data) => {
          setAddressTitle(data.title);
          setAddress(data.address);
          toast.show('Manzil saqlandi', 'success');
        }}
      />
    </SafeAreaView>
=======
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
>>>>>>> fb102bed4b36fd02c0a0e3b3ae938f93892f7dd5
  );
}

const styles = StyleSheet.create({
<<<<<<< HEAD
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
  card: {
    backgroundColor: '#0E1A3F',
    borderRadius: radii.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F3F5F9',
  },
  changeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
  },
  addressBox: {
    backgroundColor: '#121A42',
    borderRadius: radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.1)',
  },
  addressTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 13,
    color: '#F3F5F9',
    lineHeight: 18,
  },
  slotsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  slotChip: {
    flex: 1,
    backgroundColor: '#121A42',
    borderRadius: radii.md,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  slotChipActive: {
    borderColor: colors.teal,
    backgroundColor: 'rgba(25, 167, 161, 0.12)',
  },
  slotDay: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A9B0D0',
  },
  slotDayActive: {
    color: colors.teal,
  },
  slotTime: {
    fontSize: 10,
    color: '#8D95BD',
    marginTop: 2,
  },
  slotTimeActive: {
    color: '#F3F5F9',
  },
  paysList: {
    gap: 8,
  },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121A42',
    borderRadius: radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  payRowActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(242, 163, 58, 0.08)',
  },
  payIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  payName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#F3F5F9',
  },
  payNameActive: {
    color: colors.accent,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#6F77A0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: colors.accent,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  commentInput: {
    backgroundColor: '#121A42',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.14)',
    color: '#F3F5F9',
    fontSize: 13,
    padding: 10,
    height: 60,
    textAlignVertical: 'top',
    marginTop: 8,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0E1A3F',
    borderRadius: radii.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 11,
    color: '#8D95BD',
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.accent,
  },
  orderBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 13,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#080C24',
  },
=======
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
>>>>>>> fb102bed4b36fd02c0a0e3b3ae938f93892f7dd5
});
