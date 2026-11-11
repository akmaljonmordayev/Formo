import React from 'react';
import { Pressable, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, fonts, radii, spacing, themedStyles } from '../../constants/theme';
import { formatMoney } from '../ui/Common';

/** "2026-10-20" -> { name: "Ertaga" | "Indinga" | "Juma", date: "20.10" } (joriy tilda) */
export function dayParts(t, day, index) {
  const weekday = t(`weekday_${new Date(`${day.date}T00:00:00Z`).getUTCDay()}`);
  const ddmm = `${day.date.slice(8, 10)}.${day.date.slice(5, 7)}`;
  if (index === 0 && day.dayLabel === 'Ertaga') return { name: t('tomorrow'), date: `${weekday} · ${ddmm}` };
  if (index === 1) return { name: t('dayAfterTomorrow'), date: `${weekday} · ${ddmm}` };
  return { name: weekday, date: ddmm };
}

/** Kunning standart vaqti — eng kechki bo'sh slot (kechqurun, odamlar uyda) */
export const defaultSlot = (day) => [...(day?.slots || [])].reverse().find((s) => s.available)?.slot || null;

/**
 * "Qachon?" bloki.
 *  • Viloyatlarga (pochta): katta ko'zga tashlanadigan karta — faqat pochta bo'limigacha, viloyat bo'yicha
 *    pochta narxi (serverdan) va yetib kelish muddati (2–5 ish kuni). Kun/vaqt tanlanmaydi.
 *  • Toshkent shahri (kuryer): eng erta — ertaga; kun kartalari va (bir nechta bo'lsa) vaqt tugmalari.
 *
 * Props: t, postal, regionName, fee, postalDays ({ min, max }), days, date, slot, onDate(date), onSlot(slot)
 */
export default function DeliveryWhen({ t, postal, regionName, fee, postalDays, days, date, slot, onDate, onSlot }) {
  if (postal) {
    const range = t('postDaysValue').replace('{min}', postalDays?.min ?? 2).replace('{max}', postalDays?.max ?? 5);
    return (
      <View style={styles.post}>
        <View style={styles.postHead}>
          <View style={styles.postIcon}>
            <MaterialCommunityIcons name="truck-delivery" size={28} color="#FFFFFF" />
          </View>
          <View style={styles.flex}>
            <Text style={styles.postTitle}>{t('postTitle')}</Text>
            {regionName ? <Text style={styles.postRegion}>{regionName}</Text> : null}
          </View>
        </View>
        <View style={styles.postFacts}>
          <View style={styles.postFact}>
            <Text style={styles.postFactLabel}>{t('postFee')}</Text>
            <Text style={styles.postFactValue}>{fee > 0 ? formatMoney(fee) : t('free')}</Text>
          </View>
          <View style={styles.postDivider} />
          <View style={styles.postFact}>
            <Text style={styles.postFactLabel}>{t('postDays')}</Text>
            <Text style={styles.postFactValue}>{range}</Text>
          </View>
        </View>
        <View style={styles.postNote}>
          <MaterialCommunityIcons name="information" size={18} color="#FFFFFF" />
          <Text style={styles.postNoteText}>{t('postOnly')}</Text>
        </View>
      </View>
    );
  }

  const selectedDay = days.find((d) => d.date === date);
  const slots = selectedDay?.slots || [];
  return (
    <View>
      <View style={styles.courier}>
        <MaterialCommunityIcons name="moped" size={22} color={colors.accent} />
        <View style={styles.flex}>
          <Text style={styles.courierTitle}>{t('courierTitle')}</Text>
          <Text style={styles.courierSub}>{t('courierSub')}</Text>
        </View>
      </View>

      <View style={styles.days}>
        {days.map((day, index) => {
          const on = day.date === date;
          const free = day.slots.some((s) => s.available);
          const parts = dayParts(t, day, index);
          const time = on && slot ? slot.replace('-', '–') : defaultSlot(day)?.replace('-', '–');
          return (
            <Pressable
              key={day.date}
              onPress={() => onDate(day.date)}
              disabled={!free}
              style={[styles.day, on && styles.dayOn, !free && styles.dayOff]}
              accessibilityRole="radio"
              accessibilityState={{ selected: on, disabled: !free }}
            >
              <Text style={[styles.dayName, on && styles.dayNameOn]} numberOfLines={1}>{parts.name}</Text>
              <Text style={[styles.dayDate, on && styles.dayDateOn]} numberOfLines={1}>{parts.date}</Text>
              <View style={[styles.dayTime, on && styles.dayTimeOn]}>
                <MaterialCommunityIcons name="clock-outline" size={13} color={on ? colors.primaryDark : colors.muted} />
                <Text style={[styles.dayTimeText, on && styles.dayTimeTextOn]} numberOfLines={1}>
                  {free ? time : t('dayFull')}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {slots.length > 1 ? (
        <>
          <Text style={styles.timeLabel}>{t('deliveryTimeLabel')}</Text>
          <View style={styles.chips}>
            {slots.map((s) => {
              const on = s.slot === slot;
              return (
                <Pressable
                  key={s.slot}
                  onPress={() => onSlot(s.slot)}
                  disabled={!s.available}
                  style={[styles.chip, on && styles.chipOn, !s.available && styles.dayOff]}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{`${s.start}–${s.end}`}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
      {selectedDay && !slots.some((s) => s.available) ? <Text style={styles.note}>{t('noSlots')}</Text> : null}
    </View>
  );
}

const styles = themedStyles(() => ({
  flex: { flex: 1 },
  // Pochta kartasi — ataylab to'yingan rang (ikkala mavzuda bir xil): mijoz "faqat pochtagacha"ni o'tkazib yubormasin
  post: { borderRadius: radii.xl, backgroundColor: '#0F8F89', padding: spacing.lg, gap: spacing.md },
  postHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  postIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  postTitle: { color: '#FFFFFF', fontFamily: fonts.display, fontSize: 18, lineHeight: 24 },
  postRegion: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '700', marginTop: 2 },
  postFacts: { flexDirection: 'row', alignItems: 'center', borderRadius: radii.lg, backgroundColor: '#FFFFFF', paddingVertical: 14 },
  postFact: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  postDivider: { width: 1, alignSelf: 'stretch', backgroundColor: '#D9E3EC' },
  postFactLabel: { color: '#55637E', fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  postFactValue: { color: '#0A1330', fontSize: 19, fontWeight: '900', marginTop: 4, textAlign: 'center' },
  postNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: radii.md,
    backgroundColor: 'rgba(0,0,0,0.16)',
  },
  postNoteText: { flex: 1, color: '#FFFFFF', fontSize: 13, lineHeight: 18, fontWeight: '700' },
  courier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.accentGlow,
    marginBottom: spacing.md,
  },
  courierTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
  courierSub: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  days: { flexDirection: 'row', gap: spacing.sm },
  day: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dayOn: { borderColor: colors.accent, backgroundColor: colors.accentGlow },
  dayOff: { opacity: 0.4 },
  dayName: { color: colors.text, fontSize: 15, fontWeight: '900' },
  dayNameOn: { color: colors.accent },
  dayDate: { color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 3 },
  dayDateOn: { color: colors.textSecondary },
  dayTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radii.round,
    backgroundColor: colors.surfaceRaised,
  },
  dayTimeOn: { backgroundColor: colors.accent },
  dayTimeText: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  dayTimeTextOn: { color: colors.primaryDark },
  timeLabel: { color: colors.muted, fontSize: 12, fontWeight: '800', marginTop: spacing.md, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.round,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.textSecondary, fontSize: 13, fontWeight: '800' },
  chipTextOn: { color: colors.primaryDark, fontWeight: '900' },
  note: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: spacing.sm },
}));
