import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, fonts, radii, screenStyles, spacing, themedStyles } from '../constants/theme';
import { EmptyState, Header, Overline, formatMoney } from '../components/ui/Common';
import ErrorView from '../components/ui/ErrorView';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import useWallet, { TX_META } from '../features/wallet';
import { errorText } from '../utils/errors';

const dateOf = (iso) => {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * Balans: GET /wallet (server — yagona manba). To'ldirish faqat Telegram bot orqali:
 * bot summani so'raydi (30 000 / 50 000 / 100 000 yoki boshqa), Humo karta rekvizitlarini beradi,
 * chek rasmini qabul qiladi; pul faqat superadmin chekni tasdiqlagach qo'shiladi.
 */
export default function WalletScreen({ t, onBack }) {
  const wallet = useWallet();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    await wallet.refetch({ silent: true });
    setRefreshing(false);
  };

  const body = () => {
    if (wallet.isLoading && wallet.balance == null) return <LoadingSpinner />;
    if (wallet.error && wallet.balance == null) {
      return <ErrorView message={errorText(wallet.error, t)} onRetry={() => wallet.refetch()} retryLabel={t('retry')} />;
    }
    return (
      <>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>{t('walletBalance')}</Text>
          <Text style={styles.balance} adjustsFontSizeToFit numberOfLines={1}>
            {formatMoney(wallet.balance)}
          </Text>
        </View>

        <Overline style={styles.sectionGap}>{t('walletHistory')}</Overline>
        {wallet.transactions.length ? (
          <View style={styles.list}>
            {wallet.transactions.map((tx, i) => {
              const meta = TX_META[tx.type] || TX_META.TOPUP;
              const plus = tx.amount > 0;
              return (
                <View key={tx.id} style={[styles.row, i === wallet.transactions.length - 1 && styles.rowLast]}>
                  <View style={[styles.txIcon, plus ? styles.txIconIn : styles.txIconOut]}>
                    <MaterialCommunityIcons name={meta.icon} size={18} color={plus ? colors.tealLight : colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{t(meta.key)}</Text>
                    <Text style={styles.rowSub}>
                      {[tx.note, dateOf(tx.createdAt)].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <Text style={[styles.amount, plus ? styles.amountIn : styles.amountOut]}>
                    {plus ? '+' : '−'}
                    {formatMoney(Math.abs(tx.amount))}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <EmptyState icon="wallet-outline" title={t('walletEmpty')} description={t('walletEmptySub')} />
        )}
      </>
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={screenStyles.safe}>
      <View style={styles.headerBar}>
        <Header title={t('wallet')} onBack={onBack} sticky />
      </View>
      <ScrollView
        contentContainerStyle={[screenStyles.content, { paddingTop: spacing.md, paddingBottom: 40 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {body()}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Profil va checkout'dagi ixcham balans qatori */
export function WalletChip({ t, balance, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.chip, pressed && { opacity: 0.85 }]} accessibilityRole="button">
      <MaterialCommunityIcons name="wallet-outline" size={18} color={colors.accent} />
      <View style={{ flex: 1 }}>
        <Text style={styles.chipLabel}>{t('walletBalance')}</Text>
        <Text style={styles.chipValue}>{balance == null ? '…' : formatMoney(balance)}</Text>
      </View>
      <Text style={styles.chipAction}>{t('walletHistory')}</Text>
      <MaterialCommunityIcons name="chevron-right" size={18} color={colors.accent} />
    </Pressable>
  );
}

const styles = themedStyles(() => ({
  headerBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.tabBarBorder,
  },
  balanceCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.xl,
    padding: spacing.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  balanceLabel: { color: colors.textSecondary, fontSize: 12, fontFamily: fonts.bodyMedium, letterSpacing: 0.6, textTransform: 'uppercase' },
  balance: { color: colors.text, fontSize: 38, fontFamily: fonts.numeric, marginTop: 4, letterSpacing: 0.5 },
  sectionGap: { marginTop: spacing.xxl },
  list: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLast: { borderBottomWidth: 0 },
  rowTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
  rowSub: { color: colors.muted, fontSize: 11, marginTop: 2 },
  reject: { color: colors.danger, fontSize: 11, marginTop: 3 },
  txIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txIconIn: { backgroundColor: colors.tealGlow },
  txIconOut: { backgroundColor: colors.accentGlow },
  amount: { fontSize: 14, fontWeight: '900' },
  amountIn: { color: colors.tealLight },
  amountOut: { color: colors.text },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
  },
  chipLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  chipValue: { color: colors.text, fontSize: 16, fontWeight: '900', marginTop: 1 },
  chipAction: { color: colors.accent, fontSize: 12, fontWeight: '800' },
}));
