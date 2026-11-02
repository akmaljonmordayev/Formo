import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

// Buyurtma holatlari: har biriga o'z rangi va belgisi — ro'yxatda bir qarashda ajraladi.
// Backend OrderStatus (prisma/schema.prisma) bilan bir xil kalitlar.
const TONES = {
  PENDING_PAYMENT: { color: '#F5A55E', icon: 'credit-card-clock-outline' },
  NEW: { color: '#7B93FF', icon: 'check-circle-outline' },
  SENT_TO_WORKSHOP: { color: '#A68BFF', icon: 'send-outline' },
  ACCEPTED: { color: '#A68BFF', icon: 'clipboard-check-outline' },
  PRINTING: { color: '#F2A33A', icon: 'printer-outline' },
  QUALITY_CHECK: { color: '#F2A33A', icon: 'shield-check-outline' },
  READY: { color: '#3FD9B7', icon: 'package-variant-closed' },
  DELIVERING: { color: '#4FC3FF', icon: 'truck-fast-outline' },
  DELIVERED: { color: '#3FD98A', icon: 'check-decagram' },
  CANCELLED: { color: '#FF6B57', icon: 'close-circle-outline' },
  RETURNED: { color: '#FF6B57', icon: 'undo-variant' },
};
const FALLBACK = { color: '#838EB8', icon: 'progress-clock' };

/** { color, icon, bg, border } — holat rangi (fon/chegara shaffof variantlari bilan) */
export function statusTone(status) {
  const tone = TONES[status] || FALLBACK;
  return { ...tone, bg: `${tone.color}1F`, border: `${tone.color}59` };
}

/** Holat belgisi: rangli nuqta-ikon + nom. size="large" — kuzatish kartasi uchun */
export default function StatusPill({ status, label, size = 'regular', style }) {
  const tone = statusTone(status);
  const large = size === 'large';
  return (
    <View style={[styles.pill, large && styles.pillLarge, { backgroundColor: tone.bg, borderColor: tone.border }, style]}>
      <MaterialCommunityIcons name={tone.icon} size={large ? 16 : 13} color={tone.color} />
      <Text style={[styles.text, large && styles.textLarge, { color: tone.color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  pillLarge: { paddingHorizontal: 12, paddingVertical: 6, gap: 7 },
  text: { fontSize: 11, fontWeight: '800', letterSpacing: 0.2 },
  textLarge: { fontSize: 13, fontWeight: '900' },
});

// ─── 4 bosqichli kuzatish: Qabul qilindi → Tayyorlanmoqda → Yetkazilmoqda → Yetkazildi ───

const STAGES = [
  { key: 'stageAccepted', icon: 'check-circle-outline', statuses: ['PENDING_PAYMENT', 'NEW'] },
  { key: 'stagePreparing', icon: 'tshirt-crew-outline', statuses: ['SENT_TO_WORKSHOP', 'ACCEPTED', 'PRINTING', 'QUALITY_CHECK', 'READY'] },
  { key: 'stageDelivering', icon: 'truck-fast-outline', statuses: ['DELIVERING'] },
  { key: 'stageDelivered', icon: 'home-check-outline', statuses: ['DELIVERED'] },
];

/** Holat → bosqich indeksi (0..3); bekor/qaytarilgan — -1 */
export function stageOf(status) {
  return STAGES.findIndex((stage) => stage.statuses.includes(status));
}

export function OrderStepper({ t, status }) {
  const current = stageOf(status);
  const tone = statusTone(status);
  return (
    <View style={stepper.row}>
      {STAGES.map((stage, i) => {
        const done = i < current;
        const active = i === current;
        const reached = done || active;
        return (
          <React.Fragment key={stage.key}>
            {i > 0 ? <View style={[stepper.line, (done || active) && { backgroundColor: tone.color }]} /> : null}
            <View style={stepper.item}>
              <View
                style={[
                  stepper.dot,
                  reached && { borderColor: tone.color, backgroundColor: active ? tone.color : tone.bg },
                ]}
              >
                <MaterialCommunityIcons
                  name={done ? 'check' : stage.icon}
                  size={active ? 17 : 15}
                  color={active ? '#080C24' : reached ? tone.color : '#57628C'}
                />
              </View>
              <Text style={[stepper.label, reached && { color: active ? tone.color : '#C5CCE8' }, active && stepper.labelActive]} numberOfLines={2}>
                {t(stage.key)}
              </Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const stepper = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  item: { width: 64, alignItems: 'center' },
  dot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: '#2D3A7A',
    backgroundColor: '#0E1A3F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: { flex: 1, height: 2, borderRadius: 1, backgroundColor: '#212B60', marginTop: 16 },
  label: { color: '#57628C', fontSize: 10, fontWeight: '700', textAlign: 'center', marginTop: 6, lineHeight: 13 },
  labelActive: { fontWeight: '900' },
});
