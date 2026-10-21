import React, { useState } from 'react';
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

  return (
    <Screen scroll={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && orders.length > 0}
            onRefresh={refetch}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        <Header title={t('myOrders')} />

        {error && orders.length === 0 ? (
          <ErrorView message={errorText(error, t)} onRetry={refetch} retryLabel={t('retry')} />
        ) : isLoading && orders.length === 0 ? (
          <LoadingSpinner />
        ) : (
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

            <Segment
              wide
              style={styles.tabs}
              options={[activeLabel, doneLabel]}
              value={tab === 'active' ? activeLabel : doneLabel}
              onChange={(value) => setTab(value === activeLabel ? 'active' : 'done')}
            />

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
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
    borderWidth: 1,
    borderColor: 'rgba(245, 165, 94, 0.35)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pillGreen: { backgroundColor: 'rgba(63, 217, 183, 0.1)', borderColor: 'rgba(63, 217, 183, 0.35)' },
  pillRed: { backgroundColor: 'rgba(232, 84, 63, 0.1)', borderColor: 'rgba(232, 84, 63, 0.35)' },
  pillText: { color: colors.accent, fontSize: 10, fontWeight: '800' },
  pillTextRed: { color: '#E8543F' },
  pillTextGreen: { color: colors.teal },
  orderBody: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  thumb: {
    width: 52,
    height: 60,
    borderRadius: radii.md,
    backgroundColor: '#0E1330',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  orderCopy: { flex: 1 },
  product: { color: colors.text, fontSize: 13, fontWeight: '800' },
  meta: { color: colors.muted, fontSize: 11, marginTop: 4 },
  total: { color: colors.text, fontSize: 13, fontWeight: '900' },
  bar: { height: 4, borderRadius: 2, backgroundColor: '#242B58', overflow: 'hidden' },
  barDone: { height: 4, backgroundColor: colors.accent },
  empty: { color: colors.muted, fontSize: 13, textAlign: 'center', paddingVertical: spacing.xl },
});
