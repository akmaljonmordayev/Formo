import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radii, spacing } from '../constants/theme';
import useOrders, { isFinal, progressOf, statusText } from '../features/orders';
import { Card, EmptyState, Header, Screen, Segment, formatMoney } from '../components/ui/Common';
import ErrorView from '../components/ui/ErrorView';
import Kit360Thumb from '../components/ui/Kit360Thumb';
import { itemKit360 } from '../features/kit360';
import { designText } from '../features/studio';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import StatusPill, { OrderStepper, statusTone } from '../components/ui/StatusPill';
import { errorText } from '../utils/errors';
import { formatDate } from '../utils/formatters';

export default function OrdersScreen({ t, onOrder }) {
  const [tab, setTab] = useState('active');
  const { orders, isLoading, error, refetch } = useOrders();

  const activeLabel = t('tabActive');
  const doneLabel = t('tabDone');
  const filtered = orders.filter((order) => (tab === 'active' ? !isFinal(order) : isFinal(order)));
  const activeOrder = orders.find((order) => !isFinal(order)) || null;
  const activeTone = statusTone(activeOrder?.status);

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
        <Header cart title={t('myOrders')} />

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

                  <View style={styles.trackerHead}>
                    <View style={[styles.trackerIcon, { backgroundColor: activeTone.bg, borderColor: activeTone.border }]}>
                      <MaterialCommunityIcons name={activeTone.icon} size={24} color={activeTone.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.trackerTitle} numberOfLines={1}>
                        {statusText(t, activeOrder.status, activeOrder.statusLabel)}
                      </Text>
                      <Text style={styles.trackerSub}>
                        {activeOrder.delivery.date
                          ? `${activeOrder.delivery.date.split('-').reverse().join('.')} · ${activeOrder.delivery.slot}`
                          : '—'}
                      </Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
                  </View>

                  <View style={styles.stepper}>
                    <OrderStepper t={t} status={activeOrder.status} />
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
                        <StatusPill status={order.status} label={statusText(t, order.status, order.statusLabel)} />
                      </View>

                      <View style={styles.orderBody}>
                        <View style={styles.thumb}>
                          <Kit360Thumb team={itemKit360(first)} />
                        </View>
                        <View style={styles.orderCopy}>
                          <Text style={styles.product} numberOfLines={1}>
                            {first.design
                              ? `${t('customDesign')} · ${designText(t, first.design)}`
                              : first.clubName}
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
                              { backgroundColor: statusTone(order.status).color },
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
                      ? t('noActiveOrders')
                      : t('noDoneOrders')
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
  trackerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  trackerIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  trackerSub: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 3,
  },
  stepper: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
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
