import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../constants/theme';
import useOrders from '../features/orders';
import { Card, Header, Screen, Segment, formatMoney } from '../components/ui/Common';
import { JerseyPreview } from '../components/ui/JerseyPreview';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function OrdersScreen({ t }) {
  const [tab, setTab] = useState('active');
  const { orders, isLoading, refetch } = useOrders();

  const activeLabel = t('tabActive');
  const doneLabel = t('tabDone');
  const filtered = orders.filter((order) => (tab === 'active' ? order.status === 'production' : order.status === 'delivered'));

  // Active order for tracker card — safe fallback when array is empty
  const activeOrder = orders[0] || null;

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
        <Header title={t('myOrders')} />

        {isLoading && orders.length === 0 ? (
          <LoadingSpinner />
        ) : (
          <>
            <Card style={styles.tracker}>
              {activeOrder ? (
                <>
                  <View style={styles.row}>
                    <Text style={styles.overline}>{t('activeOrder')}</Text>
                    <Text style={styles.id}>{activeOrder.id}</Text>
                  </View>
                  <Text style={styles.trackerTitle}>{t('production')}</Text>
                  <Text style={styles.trackerSub}>{activeOrder.date || '—'} · {t('trackStage')}</Text>
                  <View style={styles.progress}>
                    <View style={styles.done} />
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

            <Segment
              wide
              style={styles.tabs}
              options={[activeLabel, doneLabel]}
              value={tab === 'active' ? activeLabel : doneLabel}
              onChange={(value) => setTab(value === activeLabel ? 'active' : 'done')}
            />

            <View style={styles.list}>
              {filtered.map((order, index) => {
                const production = order.status === 'production';
                return (
                  <Card key={order.id} style={styles.order}>
                    <View style={styles.orderTop}>
                      <Text style={styles.id}>{order.id}</Text>
                      <View style={[styles.pill, !production && styles.pillGreen]}>
                        <Text style={[styles.pillText, !production && styles.pillTextGreen]}>
                          {production ? t('production') : t('delivered')}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.orderBody}>
                      <View style={styles.thumb}>
                        <JerseyPreview
                          product={{ color: index ? '#F29C59' : '#5A66DE', accent: '#BFD5FF' }}
                          number="10"
                          tiny
                        />
                      </View>
                      <View style={styles.orderCopy}>
                        <Text style={styles.product}>{order.product}</Text>
                        <Text style={styles.meta}>{order.size} · {order.date}</Text>
                      </View>
                      <Text style={styles.total}>{formatMoney(order.total)}</Text>
                    </View>
                    <View style={styles.bar}>
                      <View style={[styles.barDone, { width: production ? '58%' : '100%' }]} />
                    </View>
                  </Card>
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
  done: { height: 5, width: '58%', backgroundColor: colors.accent },
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
  pillText: { color: colors.accent, fontSize: 10, fontWeight: '800' },
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
