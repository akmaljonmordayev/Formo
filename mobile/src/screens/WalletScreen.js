import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, fonts, radii, screenStyles, spacing } from '../constants/theme';
import { Badge, Button, EmptyState, Header, Overline, formatMoney } from '../components/ui/Common';
import ErrorView from '../components/ui/ErrorView';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import useWallet, { TOPUP_STATUS, TX_META, openTopUpBot } from '../features/wallet';
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
export default function WalletScreen({ t, telegramBot, onBack }) {
  const wallet = useWallet();
  const [openError, setOpenError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const topUp = async () => {
    setOpenError(null);
    const ok = await openTopUpBot(telegramBot);
    if (!ok) setOpenError(t(telegramBot ? 'tgOpenFailed' : 'topupUnavailable'));
  };

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
        <LinearGradient colors={['#1D2F8C', '#0E1A3F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceCard}>
          <View style={styles.balanceGlow} />
          <Text style={styles.balanceLabel}>{t('walletBalance')}</Text>
          <Text style={styles.balance} adjustsFontSizeToFit numberOfLines={1}>
            {formatMoney(wallet.balance)}
          </Text>
          <Button
            style={styles.topUpBtn}
            disabled={!telegramBot}
            onPress={topUp}
            icon={<MaterialCommunityIcons name="send" size={16} color={colors.primaryDark} />}
          >
            {t('topUpViaTelegram')}
          </Button>
          {openError ? <Text style={styles.openError}>{openError}</Text> : null}
        </LinearGradient>

        <View style={styles.steps}>
          {['topupStep1', 'topupStep2', 'topupStep3'].map((key, i) => (
            <View key={key} style={styles.step}>
              <Text style={styles.stepNo}>{i + 1}</Text>
              <Text style={styles.stepText}>{t(key)}</Text>
            </View>
          ))}
        </View>

        {wallet.topUps.length ? (
          <>
            <Overline style={styles.sectionGap}>{t('topupRequests')}</Overline>
            <View style={styles.list}>
              {wallet.topUps.map((x, i) => {
                const meta = TOPUP_STATUS[x.status] || TOPUP_STATUS.PENDING;
                return (
                  <View key={x.id} style={[styles.row, i === wallet.topUps.length - 1 && styles.rowLast]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{formatMoney(x.amount)}</Text>
                      <Text style={styles.rowSub}>
                        {x.code} · {dateOf(x.createdAt)}
                      </Text>
                      {x.status === 'REJECTED' && x.rejectReason ? <Text style={styles.reject}>{x.rejectReason}</Text> : null}
                      {x.status === 'PENDING' ? <Text style={styles.rowSub}>{t('topupPendingHint')}</Text> : null}
                    </View>
                    <Badge label={t(meta.key)} variant={meta.tone} />
                  </View>
                );
              })}
            </View>
          </>
        ) : null}

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
      <Text style={styles.chipAction}>{t('topUp')}</Text>
      <MaterialCommunityIcons name="chevron-right" size={18} color={colors.accent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.tabBarBorder,
  },
  balanceCard: {
    borderRadius: radii.xl,
    padding: spacing.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  balanceGlow: {
    position: 'absolute',
    right: -60,
    top: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(242,163,58,0.14)',
  },
  balanceLabel: { color: colors.textSecondary, fontSize: 12, fontFamily: fonts.bodyMedium, letterSpacing: 0.6, textTransform: 'uppercase' },
  balance: { color: colors.text, fontSize: 38, fontFamily: fonts.numeric, marginTop: 4, letterSpacing: 0.5 },
  topUpBtn: { marginTop: spacing.lg },
  openError: { color: colors.danger, fontSize: 12, marginTop: spacing.sm },
  steps: { marginTop: spacing.lg, gap: spacing.sm },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepNo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: 'center',
    lineHeight: 24,
    overflow: 'hidden',
    backgroundColor: colors.surfaceRaised,
    color: colors.accent,
    fontSize: 12,
    fontWeight: '900',
  },
  stepText: { flex: 1, color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
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
});
