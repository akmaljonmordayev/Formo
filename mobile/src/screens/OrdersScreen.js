import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radii, spacing } from '../constants/theme';
import useOrders, { isFinal, progressOf, statusText } from '../features/orders';
import { Card, EmptyState, Header, Screen, Segment, formatMoney } from '../components/ui/Common';
import ErrorView from '../components/ui/ErrorView';
import { JerseyPreview } from '../components/ui/JerseyPreview';
import { designText, itemPreview } from '../features/studio';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { errorText } from '../utils/errors';
import { formatDate } from '../utils/formatters';

export default function OrdersScreen({ t, onOrder }) {
  const [tab, setTab] = useState('active');
  const { orders, isLoading, error, refetch } = useOrders();

  const activeLabel = t('tabActive');
  const doneLabel = t('tabDone');
  const filtered = orders.filter((order) => (tab === 'active' ? !isFinal(order) : isFinal(order)));
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
            {/* Active Order Spotlight Tracker */}
            {activeOrder ? (
              <Pressable
                onPress={() => onOrder(activeOrder.id)}
                accessibilityRole="button"
              >
                <Card style={styles.tracker}>
                  <View style={styles.row}>
                    <View style={styles.trackerBadge}>
                      <Text style={styles.trackerBadgeText}>{t('activeOrder')}</Text>
                    </View>
                    <Text style={styles.id}>{activeOrder.code}</Text>
                  </View>

                  <Text style={styles.trackerTitle}>
                    {statusText(t, activeOrder.status, activeOrder.statusLabel)}
                  </Text>
                  <Text style={styles.trackerSub}>
                    {activeOrder.delivery.date
                      ? `${activeOrder.delivery.date.split('-').reverse().join('.')} · ${activeOrder.delivery.slot}`
                      : '—'}
                  </Text>

                  <View style={styles.progress}>
                    <View
                      style={[
                        styles.done,
                        { width: `${Math.max(15, Math.round(progressOf(activeOrder) * 100))}%` },
                      ]}
                    />
                  </View>

                  <View style={styles.labels}>
                    <Text style={styles.labelText}>{t('trackDesign')}</Text>
                    <Text style={styles.labelText}>{t('trackProduction')}</Text>
                    <Text style={styles.labelText}>{t('trackDelivery')}</Text>
                  </View>
                </Card>
              </Pressable>
            ) : null}

            {/* Segment: Faol / Tugagan */}
            <Segment
              wide
              style={styles.tabs}
              options={[activeLabel, doneLabel]}
              value={tab === 'active' ? activeLabel : doneLabel}
              onChange={(value) => setTab(value === activeLabel ? 'active' : 'done')}
            />

            {/* Orders List */}
            <View style={styles.list}>
              {filtered.map((order) => {
                const delivered = order.status === 'DELIVERED';
                const stopped = ['CANCELLED', 'RETURNED'].includes(order.status);
                const first = order.items[0] || {};
                const more = order.items.length > 1 ? ` +${order.items.length - 1}` : '';

                return (
                  <Pressable
                    key={order.id}
                    onPress={() => onOrder(order.id)}
                    style={({ pressed }) => [pressed && styles.pressed]}
                    accessibilityRole="button"
                  >
                    <Card style={styles.order}>
                      <View style={styles.orderTop}>
                        <Text style={styles.id}>{order.code}</Text>
                        <View
                          style={[
                            styles.pill,
                            delivered && styles.pillGreen,
                            stopped && styles.pillRed,
                          ]}
                        >
                          <Text
                            style={[
                              styles.pillText,
                              delivered && styles.pillTextGreen,
                              stopped && styles.pillTextRed,
                            ]}
                          >
                            {statusText(t, order.status, order.statusLabel)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.orderBody}>
                        <View style={styles.thumb}>
                          <JerseyPreview
                            product={itemPreview(first)}
                            number={first.printNumber || ''}
                            tiny
                          />
                        </View>
                        <View style={styles.orderCopy}>
                          <Text style={styles.product} numberOfLines={1}>
                            {first.design
                              ? `${t('customDesign')} · ${designText(t, first.design)}`
                              : `${first.clubName} · ${first.kitLabel}`}
                            {more}
                          </Text>
                          <Text style={styles.meta}>
                            {order.itemsCount} {t('pcs')} · {formatDate(order.createdAt)}
                          </Text>
                        </View>
                        <Text style={styles.total}>{formatMoney(order.summary.total)}</Text>
                      </View>

                      {!stopped ? (
                        <View style={styles.bar}>
                          <View
                            style={[
                              styles.barDone,
                              { width: `${Math.max(15, Math.round(progressOf(order) * 100))}%` },
                            ]}
                          />
                        </View>
                      ) : null}
                    </Card>
                  </Pressable>
                );
              })}

              {filtered.length === 0 ? (
                <EmptyState
                  icon="clipboard-text-outline"
                  title={t('noOrders')}
                  description={
                    tab === 'active'
                      ? 'Hozirda faol buyurtmalaringiz mavjud emas.'
                      : 'Yakunlangan buyurtmalar tarixi bu yerda ko‘rinadi.'
                  }
                />
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 16,
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },
  tracker: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.borderLight,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trackerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.xs,
    backgroundColor: 'rgba(25, 167, 161, 0.15)',
    borderWidth: 1,
    borderColor: colors.teal,
  },
  trackerBadgeText: {
    color: colors.tealLight,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  id: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  trackerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginTop: spacing.md,
  },
  trackerSub: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },
  progress: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surface,
    marginTop: spacing.lg,
    overflow: 'hidden',
  },
  done: {
    height: 6,
    backgroundColor: colors.accent,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  labelText: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  tabs: {
    alignSelf: 'stretch',
    marginBottom: spacing.lg,
  },
  list: {
    gap: spacing.md,
  },
  order: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    gap: spacing.md,
  },
  orderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pill: {
    backgroundColor: 'rgba(242, 163, 58, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(242, 163, 58, 0.35)',
    borderRadius: radii.xs,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillGreen: {
    backgroundColor: 'rgba(25, 167, 161, 0.12)',
    borderColor: 'rgba(25, 167, 161, 0.4)',
  },
  pillRed: {
    backgroundColor: 'rgba(232, 84, 63, 0.12)',
    borderColor: 'rgba(232, 84, 63, 0.4)',
  },
  pillText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
  },
  pillTextRed: {
    color: colors.danger,
  },
  pillTextGreen: {
    color: colors.tealLight,
  },
  orderBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  thumb: {
    width: 52,
    height: 62,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderCopy: {
    flex: 1,
  },
  product: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  meta: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 4,
  },
  total: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '900',
  },
  bar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  barDone: {
    height: 4,
    backgroundColor: colors.accent,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
});
