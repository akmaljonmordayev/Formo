import React, { useState } from 'react';
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
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
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
});
