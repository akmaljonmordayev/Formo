import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, fonts, radii, spacing, themedStyles } from '../../constants/theme';
import { addressCoords, formatFullAddress, isDistrictOf } from '../../features/location';

/** Manzil to'liqmi: viloyat, tuman, uy raqami va xaritadagi nuqta — kuryer/pochta aniq topishi uchun */
export const isAddressComplete = (a) =>
  Boolean(a && a.region && isDistrictOf(a.region, a.district) && String(a.house || '').trim() && addressCoords(a));

/**
 * Rasmiylashtirishdagi manzil bloki: tanlangan manzil bitta katta kartada (to'liq manzil bilan), ostida ikki
 * aniq tugma — "Boshqa manzil" (saqlanganlar ro'yxati pastdan ochiladi) va "Yangi manzil". Manzillar ko'paysa ham
 * sahifa cho'zilmaydi. To'liq bo'lmagan (eski) manzilda — "Aniqlashtirish" ogohlantirishi.
 *
 * Props: t, addresses, selected (manzil | null), onSelect(id), onAdd(), onEdit(address)
 */
export default function AddressPicker({ t, addresses, selected, onSelect, onAdd, onEdit }) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const others = addresses.length - (selected ? 1 : 0);

  if (!addresses.length) {
    return (
      <Pressable onPress={onAdd} accessibilityRole="button" style={({ pressed }) => [styles.empty, pressed && styles.pressed]}>
        <View style={styles.emptyIcon}>
          <MaterialCommunityIcons name="map-marker-plus" size={30} color={colors.primaryDark} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.emptyTitle}>{t('mapAddTitle')}</Text>
          <Text style={styles.emptySub}>{t('mapAddSub')}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color={colors.accent} />
      </Pressable>
    );
  }

  const complete = isAddressComplete(selected);
  return (
    <View>
      {selected ? (
        <View style={[styles.card, !complete && styles.cardWarn]}>
          <View style={styles.cardHead}>
            <View style={styles.cardIcon}>
              <MaterialCommunityIcons name="map-marker" size={22} color={colors.primaryDark} />
            </View>
            <View style={styles.flex}>
              <View style={styles.titleRow}>
                <Text style={styles.cardTitle} numberOfLines={1}>{selected.label}</Text>
                {selected.isDefault ? <Text style={styles.badge}>{t('addressDefault')}</Text> : null}
              </View>
              <Text style={styles.cardText}>{formatFullAddress(selected, t)}</Text>
            </View>
            <Pressable onPress={() => onEdit(selected)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('addressEdit')}>
              <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.muted} />
            </Pressable>
          </View>
          {!complete ? (
            <Pressable onPress={() => onEdit(selected)} style={styles.warn} accessibilityRole="button">
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.danger} />
              <Text style={styles.warnText}>{t('addrIncomplete')}</Text>
              <Text style={styles.warnAction}>{t('addrFix')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={styles.actions}>
        {others > 0 ? (
          <Pressable onPress={() => setOpen(true)} style={({ pressed }) => [styles.action, pressed && styles.pressed]} accessibilityRole="button">
            <MaterialCommunityIcons name="swap-horizontal" size={18} color={colors.accent} />
            <Text style={styles.actionText} numberOfLines={1}>{`${t('addrOther')} · ${others}`}</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={onAdd} style={({ pressed }) => [styles.action, styles.actionAdd, pressed && styles.pressed]} accessibilityRole="button">
          <MaterialCommunityIcons name="plus" size={18} color={colors.accent} />
          <Text style={styles.actionText} numberOfLines={1}>{t('addrAddNew')}</Text>
        </Pressable>
      </View>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>{t('addressPick')}</Text>
            <ScrollView style={styles.sheetList} contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
              {addresses.map((a) => {
                const on = a.id === selected?.id;
                return (
                  <Pressable
                    key={a.id}
                    onPress={() => {
                      onSelect(a.id);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [styles.option, on && styles.optionOn, pressed && styles.pressed]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                  >
                    <MaterialCommunityIcons name={on ? 'radiobox-marked' : 'radiobox-blank'} size={22} color={on ? colors.accent : colors.dim} />
                    <View style={styles.flex}>
                      <Text style={[styles.optionTitle, on && styles.optionTitleOn]} numberOfLines={1}>{a.label}</Text>
                      <Text style={styles.optionText} numberOfLines={2}>{formatFullAddress(a, t)}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable
              onPress={() => {
                setOpen(false);
                onAdd();
              }}
              style={({ pressed }) => [styles.sheetAdd, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="map-marker-plus-outline" size={20} color={colors.primaryDark} />
              <Text style={styles.sheetAddText}>{t('addrAddNew')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = themedStyles(() => ({
  flex: { flex: 1 },
  pressed: { opacity: 0.8 },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.accent,
    backgroundColor: colors.accentGlow,
  },
  emptyIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: colors.text, fontSize: 16, fontFamily: fonts.bodySemi, fontWeight: '800' },
  emptySub: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 4 },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.accent,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  cardWarn: { borderColor: colors.danger },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  cardIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { flexShrink: 1, color: colors.text, fontSize: 16, fontWeight: '900' },
  badge: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: colors.accentGlow,
  },
  cardText: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 4 },
  warn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.md,
    padding: 10,
    borderRadius: radii.md,
    backgroundColor: colors.dangerGlow,
  },
  warnText: { flex: 1, color: colors.text, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  warnAction: { color: colors.danger, fontSize: 12, fontWeight: '900' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 46,
    paddingHorizontal: 10,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  actionAdd: { borderStyle: 'dashed', borderColor: colors.accent, backgroundColor: colors.accentGlow },
  actionText: { flexShrink: 1, color: colors.text, fontSize: 13, fontWeight: '800' },
  backdrop: { flex: 1, backgroundColor: 'rgba(5, 8, 24, 0.6)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '78%',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingTop: 10,
    paddingHorizontal: spacing.lg,
  },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.borderLight, marginBottom: 12 },
  sheetTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 18, marginBottom: spacing.md },
  sheetList: { flexGrow: 0 },
  sheetContent: { gap: spacing.sm, paddingBottom: spacing.md },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionOn: { borderColor: colors.accent, backgroundColor: colors.surfaceRaised },
  optionTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
  optionTitleOn: { color: colors.accent },
  optionText: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 3 },
  sheetAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    marginTop: 4,
  },
  sheetAddText: { color: colors.primaryDark, fontSize: 15, fontWeight: '900' },
}));
