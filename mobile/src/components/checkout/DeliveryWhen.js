import React from 'react';
import { Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { fonts, radii, spacing, themedStyles } from '../../constants/theme';
import { formatMoney } from '../ui/Common';

const fill = (text, days) => text.replace('{min}', days.min).replace('{max}', days.max);

/**
 * "Qachon?" bloki — kun/vaqt tanlanmaydi, faqat yetkazish usuli, narxi va muddati ko'rsatiladi:
 *  • Viloyatlarga (pochta): pochta bo'limigacha (topshirish punkti), viloyat bo'yicha pochta narxi, 2–5 ish kuni.
 *  • Toshkent shahri (kuryer): uy manziligacha, 2–3 kun.
 * Karta ataylab ko'zga tashlanadigan: mijoz buyurtma qayerga va qachon kelishini o'tkazib yubormasin.
 *
 * Props: t, postal, regionName, fee, postalDays ({ min, max }), courierDays ({ min, max })
 */
export default function DeliveryWhen({ t, postal, regionName, fee, postalDays, courierDays }) {
  const days = postal ? postalDays || { min: 2, max: 5 } : courierDays || { min: 2, max: 3 };
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.icon}>
          <MaterialCommunityIcons name={postal ? 'truck-delivery' : 'moped'} size={28} color="#FFFFFF" />
        </View>
        <View style={styles.flex}>
          <Text style={styles.title}>{t(postal ? 'postTitle' : 'courierTitle')}</Text>
          {postal ? (
            regionName ? <Text style={styles.region}>{regionName}</Text> : null
          ) : (
            <Text style={styles.region}>{t('courierSub')}</Text>
          )}
        </View>
      </View>
      <View style={styles.facts}>
        <View style={styles.fact}>
          <Text style={styles.factLabel}>{t(postal ? 'postFee' : 'courierFee')}</Text>
          <Text style={styles.factValue}>{fee > 0 ? formatMoney(fee) : t('free')}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.fact}>
          <Text style={styles.factLabel}>{t(postal ? 'postDays' : 'courierDays')}</Text>
          <Text style={styles.factValue}>{fill(t(postal ? 'postDaysValue' : 'courierDaysValue'), days)}</Text>
        </View>
      </View>
      <View style={styles.note}>
        <MaterialCommunityIcons name="information" size={18} color="#FFFFFF" />
        <Text style={styles.noteText}>{fill(t(postal ? 'postOnly' : 'courierNote'), days)}</Text>
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  flex: { flex: 1 },
  // Ataylab to'yingan rang (ikkala mavzuda bir xil)
  card: { borderRadius: radii.xl, backgroundColor: '#0F8F89', padding: spacing.lg, gap: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 52, height: 52, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#FFFFFF', fontFamily: fonts.display, fontSize: 18, lineHeight: 24 },
  region: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '700', marginTop: 2 },
  facts: { flexDirection: 'row', alignItems: 'center', borderRadius: radii.lg, backgroundColor: '#FFFFFF', paddingVertical: 14 },
  fact: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  divider: { width: 1, alignSelf: 'stretch', backgroundColor: '#D9E3EC' },
  factLabel: { color: '#55637E', fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  factValue: { color: '#0A1330', fontSize: 19, fontWeight: '900', marginTop: 4, textAlign: 'center' },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: radii.md,
    backgroundColor: 'rgba(0,0,0,0.16)',
  },
  noteText: { flex: 1, color: '#FFFFFF', fontSize: 13, lineHeight: 18, fontWeight: '700' },
}));
