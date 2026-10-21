import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radii } from '../constants/theme';

export default function SuccessScreen({
  order,
  t,
  onTrack,
  onGoHome,
}) {
  const orderId = order?.id || 'FRM-000124';
  const total = order?.total || 189000;
  const payMethod = order?.payMethod || 'Click';
  const address = order?.address || 'Toshkent sh., Yunusobod tumani';

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Success checkmark */}
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="check" size={54} color="#080C24" />
        </View>

        <Text style={styles.title}>Buyurtma qabul qilindi!</Text>
        <Text style={styles.subtitle}>
          Formangiz tez orada bosmaga yuboriladi va tayyorlangach yetkaziladi
        </Text>

        {/* Receipt Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Buyurtma ma‘lumotlari</Text>

          <View style={styles.row}>
            <Text style={styles.key}>Buyurtma raqami</Text>
            <Text style={styles.valHighlight}>#{orderId}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.key}>Sana</Text>
            <Text style={styles.val}>{order?.date || 'Bugun'}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.key}>To‘lov usuli</Text>
            <Text style={styles.val}>{payMethod}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.key}>Yetkazish manzili</Text>
            <Text style={[styles.val, { maxWidth: '60%', textAlign: 'right' }]}>
              {address}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.totalKey}>Jami to‘lov</Text>
            <Text style={styles.totalVal}>{total.toLocaleString('uz-UZ')} so‘m</Text>
          </View>
        </View>

        {/* Action buttons */}
        <Pressable onPress={() => onTrack?.(orderId)} style={styles.trackBtn}>
          <MaterialCommunityIcons name="truck-fast-outline" size={20} color="#080C24" />
          <Text style={styles.trackBtnText}>Buyurtmani kuzatish</Text>
        </Pressable>

        <Pressable onPress={onGoHome} style={styles.homeBtn}>
          <Text style={styles.homeBtnText}>Asosiy ekranga qaytish</Text>
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
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: colors.teal,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#F3F5F9',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#A9B0D0',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 16,
    marginBottom: 28,
  },
  card: {
    width: '100%',
    backgroundColor: '#0E1A3F',
    borderRadius: radii.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
    marginBottom: 28,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F3F5F9',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  key: {
    fontSize: 13,
    color: '#8D95BD',
  },
  val: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F3F5F9',
  },
  valHighlight: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.accent,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(243, 245, 249, 0.1)',
    marginVertical: 8,
  },
  totalKey: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F3F5F9',
  },
  totalVal: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.accent,
  },
  trackBtn: {
    width: '100%',
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  trackBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#080C24',
  },
  homeBtn: {
    width: '100%',
    backgroundColor: '#121A42',
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.15)',
  },
  homeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F3F5F9',
  },
});
