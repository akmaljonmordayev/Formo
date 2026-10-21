import React, { useState } from 'react';
<<<<<<< HEAD
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import JerseyVisualizer from '../components/ui/JerseyVisualizer';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { colors, radii } from '../constants/theme';
import useOrders from '../features/orders';

export default function OrdersScreen({
  t,
  onOpenOrder,
  onOpenTrack,
  onBack,
}) {
  const [tab, setTab] = useState('active'); // 'active' | 'completed'
  const { orders, isLoading, error, refetch } = useOrders();

  const normalizeOrder = (ord) => {
    const status = ord?.status || 'ACCEPTED';
    const total = ord?.summary?.total ?? ord?.total ?? 0;
    const statusLabel = ord?.statusLabel ||
      (status === 'DELIVERED'
        ? 'Yetkazildi'
        : status === 'CANCELLED'
        ? 'Bekor qilingan'
        : status === 'SHIPPED'
        ? 'Yetkazilmoqda'
        : 'Bosilmoqda');

    return {
      ...ord,
      id: ord?.id,
      code: ord?.code || ord?.orderNumber || ord?.id,
      status,
      statusLabel,
      total,
      date: ord?.delivery?.date || ord?.date || ord?.createdAt || 'Bugun',
      itemCount: ord?.itemsCount ?? ord?.items?.length ?? 1,
      product: ord?.items?.[0]?.title || ord?.product || 'Formo Maxsus Futbolka',
    };
  };

  const mappedOrders = orders.map(normalizeOrder);
  const activeOrders = mappedOrders.filter((o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED');
  const completedOrders = mappedOrders.filter((o) => o.status === 'DELIVERED' || o.status === 'CANCELLED');

  const displayedOrders = tab === 'active' ? activeOrders : completedOrders;
=======
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../constants/theme';
import useOrders, { isFinal, progressOf, statusText } from '../features/orders';
import { Card, Header, Screen, Segment, formatMoney } from '../components/ui/Common';
import ErrorView from '../components/ui/ErrorView';
import { JerseyPreview } from '../components/ui/JerseyPreview';
import { designText, itemPreview } from '../features/studio';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { errorText } from '../utils/errors';
import { formatDate } from '../utils/formatters';

// Buyurtmalarim: GET /api/orders — 20 s da va pastga tortilganda yangilanadi,
// shuning uchun operator/sex o'zgartirgan holat shu yerda ko'rinadi.
export default function OrdersScreen({ t, onOrder }) {
  const [tab, setTab] = useState('active');
  const { orders, isLoading, error, refetch } = useOrders();

  const activeLabel = t('tabActive');
  const doneLabel = t('tabDone');
  const filtered = orders.filter((order) => (tab === 'active' ? !isFinal(order) : isFinal(order)));

  // Kuzatish kartasi — eng oxirgi yakunlanmagan buyurtma
  const activeOrder = orders.find((order) => !isFinal(order)) || null;
>>>>>>> fb102bed4b36fd02c0a0e3b3ae938f93892f7dd5

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <View style={styles.topBar}>
        {Boolean(onBack) && (
          <Pressable onPress={onBack} hitSlop={10} style={styles.iconBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#F3F5F9" />
          </Pressable>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Mening buyurtmalarim</Text>
          <Text style={styles.sub}>Barcha buyurtmalar tarixi</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <Pressable
          onPress={() => setTab('active')}
          style={[styles.tabBtn, tab === 'active' && styles.tabBtnActive]}
        >
          <Text style={[styles.tabText, tab === 'active' && styles.tabTextActive]}>
            Faol ({activeOrders.length})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('completed')}
          style={[styles.tabBtn, tab === 'completed' && styles.tabBtnActive]}
        >
          <Text style={[styles.tabText, tab === 'completed' && styles.tabTextActive]}>
            Yakunlangan ({completedOrders.length})
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && orders.length > 0}
            onRefresh={refetch}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
<<<<<<< HEAD
        {isLoading && mappedOrders.length === 0 ? (
=======
        <Header title={t('myOrders')} />

        {error && orders.length === 0 ? (
          <ErrorView message={errorText(error, t)} onRetry={refetch} retryLabel={t('retry')} />
        ) : isLoading && orders.length === 0 ? (
>>>>>>> fb102bed4b36fd02c0a0e3b3ae938f93892f7dd5
          <LoadingSpinner />
        ) : error && mappedOrders.length === 0 ? (
          <View style={styles.emptyWrap}>
            <MaterialCommunityIcons name="alert-circle-outline" size={64} color="#E8543F" />
            <Text style={styles.emptyTitle}>Buyurtmalar yuklanmadi</Text>
            <Text style={styles.emptySub}>{error.message || 'Server bilan aloqa mavjud emas'}</Text>
          </View>
        ) : displayedOrders.length === 0 ? (
          <View style={styles.emptyWrap}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={64} color="#3E4772" />
            <Text style={styles.emptyTitle}>
              {tab === 'active' ? 'Faol buyurtmalar yo‘q' : 'Yakunlangan buyurtmalar yo‘q'}
            </Text>
            <Text style={styles.emptySub}>
              {tab === 'active'
                ? 'Dizayn studiyasida o‘z formangizni yarating yoki katalogdan tanlang'
                : 'Barcha yetkazilgan buyurtmalaringiz shu yerda saqlanadi'}
            </Text>
          </View>
        ) : (
<<<<<<< HEAD
          displayedOrders.map((ord, idx) => {
            const isCompleted = ord.status === 'DELIVERED';
            const orderId = ord.code || ord.orderNumber || ord.id || `FRM-000${idx + 10}`;
            const total = ord.total || 0;
            const statusLabel = ord.statusLabel ||
              (ord.status === 'DELIVERED'
                ? 'Yetkazildi'
                : ord.status === 'CANCELLED'
                ? 'Bekor qilingan'
                : ord.status === 'SHIPPED'
                ? 'Yetkazilmoqda'
                : 'Bosilmoqda');
=======
          <>
            <Pressable onPress={() => activeOrder && onOrder(activeOrder.id)}>
              <Card style={styles.tracker}>
                {activeOrder ? (
                  <>
                    <View style={styles.row}>
                      <Text style={styles.overline}>{t('activeOrder')}</Text>
                      <Text style={styles.id}>{activeOrder.code}</Text>
                    </View>
                    <Text style={styles.trackerTitle}>{statusText(t, activeOrder.status, activeOrder.statusLabel)}</Text>
                    <Text style={styles.trackerSub}>
                      {activeOrder.delivery.date
                        ? `${activeOrder.delivery.date.split('-').reverse().join('.')} · ${activeOrder.delivery.slot}`
                        : '—'}
                    </Text>
                    <View style={styles.progress}>
                      <View style={[styles.done, { width: `${Math.round(progressOf(activeOrder) * 100)}%` }]} />
                    </View>
                    <View style={styles.labels}>
                      <Text style={styles.labelText}>{t('trackDesign')}</Text>
                      <Text style={styles.labelText}>{t('trackProduction')}</Text>
                      <Text style={styles.labelText}>{t('trackDelivery')}</Text>
                    </View>
                  </>
                ) : (
                  <Text style={styles.noOrdersText}>{t('noOrders')}</Text>
                )}
              </Card>
            </Pressable>
>>>>>>> fb102bed4b36fd02c0a0e3b3ae938f93892f7dd5

            return (
              <Pressable
                key={ord.id || idx}
                onPress={() => (onOpenOrder ? onOpenOrder(ord) : onOpenTrack?.(ord.id))}
                style={styles.orderCard}
              >
                {/* Order Top Info */}
                <View style={styles.cardTop}>
                  <View>
                    <Text style={styles.orderNumber}>#{orderId}</Text>
                    <Text style={styles.orderDate}>{ord.date || ord.createdAt || 'Bugun'}</Text>
                  </View>

<<<<<<< HEAD
                  <View
                    style={[
                      styles.statusPill,
                      isCompleted && styles.statusPillGreen,
                      ord.status === 'CANCELLED' && styles.statusPillRed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        isCompleted && styles.statusPillTextGreen,
                        ord.status === 'CANCELLED' && styles.statusPillTextRed,
                      ]}
                    >
                      {statusLabel}
                    </Text>
                  </View>
                </View>

                {/* Items Row */}
                <View style={styles.itemRow}>
                  <View style={styles.itemThumb}>
                    <JerseyVisualizer
                      color={idx % 2 === 0 ? '#154284' : '#C8102E'}
                      trim={idx % 2 === 0 ? '#D4AF37' : '#FFFFFF'}
                      ink="#FFFFFF"
                      crest={idx % 2 === 0 ? 'RMA' : 'FCB'}
                      number="10"
                      player="FORMO"
                      side="front"
                      size={54}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {ord.product || ord.items?.[0]?.title || 'Formo Maxsus Futbolka'}
                    </Text>
                    <Text style={styles.itemMeta}>
                      {ord.size || 'L'} · {ord.itemCount || ord.items?.length || 1} ta mahsulot
                    </Text>
                    <Text style={styles.itemTotal}>
                      {Number(total || 0).toLocaleString('uz-UZ')} so‘m
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={24} color="#6F77A0" />
                </View>

                {/* Action footer */}
                {!isCompleted && ord.status !== 'CANCELLED' && (
                  <View style={styles.cardFooter}>
                    <Pressable
                      onPress={() => onOpenTrack?.(ord.id)}
                      style={styles.trackActionBtn}
                    >
                      <MaterialCommunityIcons name="truck-fast-outline" size={16} color={colors.accent} />
                      <Text style={styles.trackActionText}>Kuzatish</Text>
                    </Pressable>
                  </View>
                )}
              </Pressable>
            );
          })
=======
            <View style={styles.list}>
              {filtered.map((order) => {
                const delivered = order.status === 'DELIVERED';
                const stopped = ['CANCELLED', 'RETURNED'].includes(order.status);
                const first = order.items[0] || {};
                const more = order.items.length > 1 ? ` +${order.items.length - 1}` : '';
                return (
                  <Pressable key={order.id} onPress={() => onOrder(order.id)}>
                    <Card style={styles.order}>
                      <View style={styles.orderTop}>
                        <Text style={styles.id}>{order.code}</Text>
                        <View style={[styles.pill, delivered && styles.pillGreen, stopped && styles.pillRed]}>
                          <Text style={[styles.pillText, delivered && styles.pillTextGreen, stopped && styles.pillTextRed]}>
                            {statusText(t, order.status, order.statusLabel)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.orderBody}>
                        <View style={styles.thumb}>
                          <JerseyPreview product={itemPreview(first)} number={first.printNumber || ''} tiny />
                        </View>
                        <View style={styles.orderCopy}>
                          <Text style={styles.product} numberOfLines={1}>
                            {first.design
                              ? `${t('customDesign')} · ${designText(t, first.design)}`
                              : `${first.clubName} · ${first.kitLabel}`}
                            {more}
                          </Text>
                          <Text style={styles.meta}>{order.itemsCount} {t('pcs')} · {formatDate(order.createdAt)}</Text>
                        </View>
                        <Text style={styles.total}>{formatMoney(order.summary.total)}</Text>
                      </View>
                      {!stopped ? (
                        <View style={styles.bar}>
                          <View style={[styles.barDone, { width: `${Math.round(progressOf(order) * 100)}%` }]} />
                        </View>
                      ) : null}
                    </Card>
                  </Pressable>
                );
              })}
              {filtered.length === 0 ? <Text style={styles.empty}>{t('noOrders')}</Text> : null}
            </View>
          </>
>>>>>>> fb102bed4b36fd02c0a0e3b3ae938f93892f7dd5
        )}
      </ScrollView>
    </SafeAreaView>
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
    paddingVertical: 12,
    gap: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: '#0E1A3F',
=======
  content: { paddingTop: 16, paddingHorizontal: spacing.xl, paddingBottom: 110 },
  tracker: { backgroundColor: '#141A40', marginBottom: spacing.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  overline: { color: colors.teal, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  id: { color: colors.text, fontSize: 12, fontWeight: '800' },
  trackerTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: spacing.md },
  trackerSub: { color: colors.muted, fontSize: 12, marginTop: 5 },
  progress: { height: 5, borderRadius: 3, backgroundColor: '#242B58', marginTop: spacing.lg, overflow: 'hidden' },
  done: { height: 5, backgroundColor: colors.accent },
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  labelText: { color: colors.muted, fontSize: 10 },
  noOrdersText: { color: colors.muted, fontSize: 13, textAlign: 'center', paddingVertical: spacing.md },
  tabs: { alignSelf: 'stretch', marginBottom: spacing.lg },
  list: { gap: spacing.md },
  order: { gap: spacing.md },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pill: {
    backgroundColor: 'rgba(245, 165, 94, 0.12)',
>>>>>>> fb102bed4b36fd02c0a0e3b3ae938f93892f7dd5
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F3F5F9',
  },
  sub: {
    fontSize: 12,
    color: '#8D95BD',
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: '#0E1A3F',
    borderRadius: radii.md,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radii.sm,
  },
  tabBtnActive: {
    backgroundColor: '#1B2560',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8D95BD',
  },
  tabTextActive: {
    color: '#F3F5F9',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 110,
  },
  orderCard: {
    backgroundColor: '#0E1A3F',
    borderRadius: radii.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
    marginBottom: 14,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(243, 245, 249, 0.08)',
    paddingBottom: 10,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F3F5F9',
  },
  orderDate: {
    fontSize: 11,
    color: '#8D95BD',
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: 'rgba(242, 163, 58, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(242, 163, 58, 0.35)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
<<<<<<< HEAD
  statusPillGreen: {
    backgroundColor: 'rgba(25, 167, 161, 0.14)',
    borderColor: 'rgba(25, 167, 161, 0.35)',
  },
  statusPillRed: {
    backgroundColor: 'rgba(232, 84, 63, 0.14)',
    borderColor: 'rgba(232, 84, 63, 0.35)',
  },
  statusPillText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
  },
  statusPillTextGreen: {
    color: colors.teal,
  },
  statusPillTextRed: {
    color: '#E8543F',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemThumb: {
    width: 54,
    height: 54,
=======
  pillGreen: { backgroundColor: 'rgba(63, 217, 183, 0.1)', borderColor: 'rgba(63, 217, 183, 0.35)' },
  pillRed: { backgroundColor: 'rgba(232, 84, 63, 0.1)', borderColor: 'rgba(232, 84, 63, 0.35)' },
  pillText: { color: colors.accent, fontSize: 10, fontWeight: '800' },
  pillTextRed: { color: '#E8543F' },
  pillTextGreen: { color: colors.teal },
  orderBody: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  thumb: {
    width: 52,
    height: 60,
>>>>>>> fb102bed4b36fd02c0a0e3b3ae938f93892f7dd5
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
  itemMeta: {
    fontSize: 11,
    color: '#8D95BD',
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.accent,
    marginTop: 4,
  },
  cardFooter: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(243, 245, 249, 0.08)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  trackActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(242, 163, 58, 0.1)',
  },
  trackActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F3F5F9',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: '#8D95BD',
    textAlign: 'center',
    lineHeight: 18,
  },
});
