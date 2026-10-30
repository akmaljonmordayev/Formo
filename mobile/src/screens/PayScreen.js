import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useToast } from '../components/ui/Toast';
import { colors, radii } from '../constants/theme';
import { api } from '../services/api';

export default function PayScreen({
  order,
  t,
  onBack,
  onPaymentSuccess,
  onChangeMethod,
}) {
  const toast = useToast();
  const [secondsLeft, setSecondsLeft] = useState(30 * 60); // 30 minutes reservation
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timerStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const handleConfirmPay = async () => {
    setLoading(true);
    try {
      if (order?.id && !isNaN(Number(order.id))) {
        await api.orders.confirmPayment(Number(order.id)).catch(() => null);
      }
      setLoading(false);
      toast.show('To‘lov muvaffaqiyatli qabul qilindi!', 'success');
      onPaymentSuccess?.({
        ...order,
        status: 'ACCEPTED',
      });
    } catch {
      setLoading(false);
      toast.show('To‘lov qabul qilindi', 'success');
      onPaymentSuccess?.({
        ...order,
        status: 'ACCEPTED',
      });
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <View style={styles.container}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable onPress={onBack} hitSlop={10} style={styles.iconBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#F3F5F9" />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.title}>To‘lov</Text>
            <Text style={styles.sub}>{order?.payMethod || 'Click / Payme'}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Payment Card */}
        <View style={styles.card}>
          <View style={styles.providerLogoWrap}>
            <MaterialCommunityIcons
              name={order?.payMethod === 'Payme' ? 'credit-card-check' : 'credit-card-fast'}
              size={48}
              color={order?.payMethod === 'Payme' ? colors.teal : '#1D2F8C'}
            />
          </View>

          <Text style={styles.providerTitle}>{order?.payMethod || 'Click'}</Text>
          <Text style={styles.orderNumber}>Buyurtma #{order?.id || 'FRM-000124'}</Text>

          {/* Amount Box */}
          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>To‘lov summasi</Text>
            <Text style={styles.amountVal}>
              {(order?.total || 189000).toLocaleString('uz-UZ')} so‘m
            </Text>
          </View>

          {/* 30-min reservation countdown */}
          <View style={styles.timerBadge}>
            <MaterialCommunityIcons name="timer-sand" size={16} color={colors.accent} />
            <Text style={styles.timerText}>
              Buyurtma band qilingan: <Text style={styles.timerBold}>{timerStr}</Text>
            </Text>
          </View>

          <Text style={styles.demoNote}>
            Click / Payme to‘lov tizimi integratsiyasi ulanish arafasida. Hozirda test to‘lovini tasdiqlashingiz mumkin.
          </Text>

          {/* Confirm Button */}
          <Pressable
            disabled={loading}
            onPress={handleConfirmPay}
            style={[styles.payBtn, loading && { opacity: 0.5 }]}
          >
            {loading ? (
              <ActivityIndicator color="#080C24" />
            ) : (
              <>
                <Text style={styles.payBtnText}>To‘lovni tasdiqlash (demo)</Text>
                <MaterialCommunityIcons name="check-circle" size={20} color="#080C24" />
              </>
            )}
          </Pressable>

          {/* Change method button */}
          <Pressable onPress={onChangeMethod || onBack} style={styles.changeMethodBtn}>
            <Text style={styles.changeMethodText}>Boshqa to‘lov usulini tanlash</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#050818',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
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
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
  },
  providerLogoWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#121A42',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.15)',
  },
  providerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F3F5F9',
  },
  orderNumber: {
    fontSize: 13,
    color: '#8D95BD',
    marginTop: 4,
  },
  amountBox: {
    width: '100%',
    backgroundColor: '#121A42',
    borderRadius: radii.lg,
    padding: 16,
    alignItems: 'center',
    marginVertical: 20,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.1)',
  },
  amountLabel: {
    fontSize: 12,
    color: '#8D95BD',
    marginBottom: 4,
  },
  amountVal: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.accent,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(242, 163, 58, 0.1)',
    borderRadius: radii.round,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  timerText: {
    fontSize: 12,
    color: '#F3F5F9',
  },
  timerBold: {
    color: colors.accent,
    fontWeight: '800',
  },
  demoNote: {
    fontSize: 12,
    color: '#8D95BD',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  payBtn: {
    width: '100%',
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  payBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#080C24',
  },
  changeMethodBtn: {
    marginTop: 16,
    paddingVertical: 8,
  },
  changeMethodText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
  },
});
