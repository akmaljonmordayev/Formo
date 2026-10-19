import React, { useEffect, useState } from 'react';
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
  );
}

const styles = StyleSheet.create({
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
});
