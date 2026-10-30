import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import JerseyVisualizer from '../components/ui/JerseyVisualizer';
import { ConfirmModal } from '../components/ui/Modals';
import { useToast } from '../components/ui/Toast';
import { colors, radii } from '../constants/theme';
import { api } from '../services/api';

const TRACK_STAGES = [
  { key: 'CREATED', label: 'Qabul qilindi', desc: 'Buyurtmangiz tizimga kiritildi', icon: 'check-circle' },
  { key: 'DESIGN', label: 'Dizayn tekshiruvi', desc: 'Maket mutaxassis tomonidan ko‘rilmoqda', icon: 'palette' },
  { key: 'PRINT', label: 'Chop etilmoqda', desc: 'Mato va termotransfer bosilmoqda', icon: 'printer-3d' },
  { key: 'DELIVERY', label: 'Yetkazilmoqda', desc: 'Kuryer yo‘lga chiqdi', icon: 'truck-delivery' },
];

export default function TrackScreen({
  orderId,
  t,
  onBack,
  onCancelOrder,
}) {
  const toast = useToast();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchOrder() {
      try {
        setLoading(true);
        let res = null;
        if (orderId) {
          res = await api.orders.getById(orderId).catch(() => null);
        }
        if (!res) {
          res = await api.orders.getActive().catch(() => null);
        }
        if (!cancelled && res) {
          setOrder(res);
        }
      } catch {
        // use fallback demo
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchOrder();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const activeStageIndex = 2; // Default to 'PRINT' stage in progress (stage 3)

  const handleCallCourier = () => {
    Linking.openURL('tel:+998901234567').catch(() => {
      toast.show('Qo‘ng‘iroq qilib bo‘lmadi: +998 90 123-45-67', 'info');
    });
  };

  const handleConfirmCancel = async () => {
    setShowCancelModal(false);
    setCancelling(true);
    try {
      if (order?.id) {
        await api.orders.cancel(order.id).catch(() => null);
      }
      toast.show('Buyurtma bekor qilindi', 'info');
      onCancelOrder?.();
      onBack?.();
    } catch {
      toast.show('Buyurtmani bekor qilishda xatolik', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const currentOrderId = order?.orderNumber || order?.id || orderId || 'FRM-000124';
  const eta = order?.estimatedDelivery || 'Ertaga, 14:00 gacha';

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.iconBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#F3F5F9" />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.title}>Kuzatish</Text>
          <Text style={styles.sub}>#{currentOrderId}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loaderText}>Buyurtma holati yuklanmoqda...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Header Card: Status & ETA */}
          <View style={styles.etaCard}>
            <View style={styles.etaTop}>
              <View style={styles.pulseBadge}>
                <View style={styles.pulseDot} />
                <Text style={styles.pulseText}>BOSMA BOSQICHIDA</Text>
              </View>
              <Text style={styles.orderDate}>{order?.date || 'Bugun, 15:40'}</Text>
            </View>

            <Text style={styles.etaTitle}>Kutilayotgan yetkazish</Text>
            <Text style={styles.etaValue}>{eta}</Text>
            <Text style={styles.etaAddress}>
              {order?.deliveryAddress || 'Toshkent sh., Yunusobod tumani, 4-mavze, 12-uy'}
            </Text>
          </View>

          {/* Stepper Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Buyurtma bosqichlari</Text>

            <View style={styles.timeline}>
              {TRACK_STAGES.map((st, i) => {
                const isPassed = i < activeStageIndex;
                const isCurrent = i === activeStageIndex;
                const isFuture = i > activeStageIndex;

                return (
                  <View key={st.key} style={styles.timelineStep}>
                    {/* Left indicator & vertical connector line */}
                    <View style={styles.indicatorCol}>
                      <View
                        style={[
                          styles.dot,
                          isPassed && styles.dotPassed,
                          isCurrent && styles.dotCurrent,
                          isFuture && styles.dotFuture,
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={isPassed ? 'check' : st.icon}
                          size={14}
                          color={isFuture ? '#6F77A0' : '#080C24'}
                        />
                      </View>
                      {i < TRACK_STAGES.length - 1 && (
                        <View
                          style={[
                            styles.line,
                            i < activeStageIndex ? styles.linePassed : styles.lineFuture,
                          ]}
                        />
                      )}
                    </View>

                    {/* Step label & description */}
                    <View style={styles.stepContent}>
                      <Text
                        style={[
                          styles.stepTitle,
                          isCurrent && styles.stepTitleCurrent,
                          isFuture && styles.stepTitleFuture,
                        ]}
                      >
                        {st.label}
                      </Text>
                      <Text style={styles.stepDesc}>{st.desc}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Courier Card */}
          <View style={styles.courierCard}>
            <View style={styles.courierAvatar}>
              <MaterialCommunityIcons name="motorbike" size={26} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.courierRole}>Kuryer tayinlandi</Text>
              <Text style={styles.courierName}>Davron Rahimov</Text>
              <Text style={styles.courierPhone}>+998 90 123-45-67</Text>
            </View>
            <Pressable onPress={handleCallCourier} style={styles.callBtn}>
              <MaterialCommunityIcons name="phone" size={20} color="#080C24" />
            </Pressable>
          </View>

          {/* Items Preview Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Buyurtmadagi mahsulotlar</Text>
            <View style={styles.itemRow}>
              <View style={styles.itemThumb}>
                <JerseyVisualizer
                  color="#154284"
                  trim="#D4AF37"
                  ink="#FFFFFF"
                  crest="RMA"
                  number="7"
                  player="JASUR"
                  side="front"
                  size={60}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>
                  {order?.items?.[0]?.title || 'Real Madrid 24/25 Uy formasi'}
                </Text>
                <Text style={styles.itemSub}>O‘lcham: L · Ism: JASUR · Raqam: 7</Text>
                <Text style={styles.itemPrice}>
                  {(order?.total || 189000).toLocaleString('uz-UZ')} so‘m
                </Text>
              </View>
            </View>
          </View>

          {/* Cancel Order Action */}
          <Pressable
            disabled={cancelling}
            onPress={() => setShowCancelModal(true)}
            style={styles.cancelBtn}
          >
            <Text style={styles.cancelBtnText}>Buyurtmani bekor qilish</Text>
          </Pressable>
        </ScrollView>
      )}

      {/* Confirm Cancel Modal */}
      <ConfirmModal
        visible={showCancelModal}
        title="Buyurtmani bekor qilmoqchimisiz?"
        message="Agar buyurtma chop etishga yuborilgan bo‘lsa, bekor qilish imkoni bo‘lmasligi mumkin."
        confirmText="Ha, bekor qilish"
        confirmColor="#E8543F"
        onConfirm={handleConfirmCancel}
        onCancel={() => setShowCancelModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loaderText: {
    color: '#8D95BD',
    fontSize: 13,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 110,
  },
  etaCard: {
    backgroundColor: '#0E1A3F',
    borderRadius: radii.xl,
    padding: 18,
    borderWidth: 1.5,
    borderColor: colors.accent,
    marginBottom: 16,
  },
  etaTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pulseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(242, 163, 58, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radii.round,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  pulseText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
  },
  orderDate: {
    color: '#8D95BD',
    fontSize: 12,
  },
  etaTitle: {
    fontSize: 12,
    color: '#8D95BD',
  },
  etaValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F3F5F9',
    marginTop: 4,
    marginBottom: 6,
  },
  etaAddress: {
    fontSize: 13,
    color: '#A9B0D0',
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#0E1A3F',
    borderRadius: radii.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F3F5F9',
    marginBottom: 16,
  },
  timeline: {
    paddingLeft: 4,
  },
  timelineStep: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  indicatorCol: {
    alignItems: 'center',
    width: 32,
    marginRight: 12,
  },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  dotPassed: {
    backgroundColor: colors.teal,
  },
  dotCurrent: {
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 6,
  },
  dotFuture: {
    backgroundColor: '#1B2456',
  },
  line: {
    position: 'absolute',
    top: 26,
    bottom: -20,
    width: 2,
    zIndex: 1,
  },
  linePassed: {
    backgroundColor: colors.teal,
  },
  lineFuture: {
    backgroundColor: '#1B2456',
  },
  stepContent: {
    flex: 1,
    paddingTop: 2,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F3F5F9',
  },
  stepTitleCurrent: {
    color: colors.accent,
    fontWeight: '800',
  },
  stepTitleFuture: {
    color: '#6F77A0',
  },
  stepDesc: {
    fontSize: 12,
    color: '#8D95BD',
    marginTop: 2,
    lineHeight: 16,
  },
  courierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E1A3F',
    borderRadius: radii.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
    marginBottom: 16,
    gap: 12,
  },
  courierAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(242, 163, 58, 0.15)',
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  courierRole: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
  },
  courierName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F3F5F9',
    marginTop: 2,
  },
  courierPhone: {
    fontSize: 12,
    color: '#8D95BD',
    marginTop: 2,
  },
  callBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemThumb: {
    width: 60,
    height: 60,
    borderRadius: radii.md,
    backgroundColor: '#121A42',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F3F5F9',
  },
  itemSub: {
    fontSize: 11,
    color: '#8D95BD',
    marginTop: 3,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.accent,
    marginTop: 4,
  },
  cancelBtn: {
    paddingVertical: 14,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(232, 84, 63, 0.35)',
    backgroundColor: 'rgba(232, 84, 63, 0.08)',
    alignItems: 'center',
    marginTop: 4,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E8543F',
  },
});
