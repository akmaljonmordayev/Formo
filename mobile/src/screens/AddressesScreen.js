import React, { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BackButton, ErrorNote, OutlineButton, authColors as c } from '../components/ui/AuthUi';
import { useToast } from '../components/ui/Toast';
import { fonts } from '../constants/theme';
import { useAddresses } from '../features/checkout';
import { addressCoords } from '../features/location';
import { errorText } from '../utils/errors';

/**
 * "Manzillarim" — GET /api/addresses (faqat haqiqiy server ma'lumoti).
 * Qo'shish/tahrirlash xaritada (LocationPickerScreen), asosiy qilish —
 * PATCH /addresses/:id { isDefault: true }, o'chirish — DELETE /addresses/:id.
 * Dizayn: "Manzillarim" ekrani (karta r18, #121A42, tanlangani 1.5px to'q sariq).
 */
export default function AddressesScreen({ t, onBack, onEdit, refreshKey }) {
  const toast = useToast();
  const { addresses, isLoading, error, refetch, update, remove } = useAddresses();
  const [busyId, setBusyId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [actionError, setActionError] = useState(null);

  // Xaritadan qaytganda ro'yxatni yangilaymiz
  useEffect(() => {
    if (refreshKey) refetch();
  }, [refreshKey, refetch]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack?.();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);

  const run = async (id, action, successKey) => {
    setBusyId(id);
    setActionError(null);
    try {
      await action();
      if (successKey) toast.show(t(successKey), 'success');
    } catch (err) {
      setActionError(errorText(err, t));
    } finally {
      setBusyId(null);
      setConfirmId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <BackButton onPress={onBack} label={t('back')} />
        <Text style={styles.title}>{t('addresses')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {error ? (
          <View style={styles.state}>
            <ErrorNote>{errorText(error, t)}</ErrorNote>
            <OutlineButton label={t('retry')} onPress={refetch} />
          </View>
        ) : isLoading && !addresses.length ? (
          <ActivityIndicator style={styles.loader} color={c.accent} />
        ) : !addresses.length ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <MaterialCommunityIcons name="map-marker-plus-outline" size={30} color={c.accent} />
            </View>
            <Text style={styles.emptyTitle}>{t('addressesNone')}</Text>
            <Text style={styles.emptySub}>{t('addressesNoneSub')}</Text>
          </View>
        ) : (
          addresses.map((item) => {
            const busy = busyId === item.id;
            const asking = confirmId === item.id;
            return (
              <View key={item.id} style={[styles.card, item.isDefault && styles.cardDefault]}>
                <Pressable onPress={() => onEdit?.(item)} style={styles.cardMain} accessibilityRole="button">
                  <View style={styles.cardIcon}>
                    <MaterialCommunityIcons
                      name={addressCoords(item) ? 'map-marker' : 'map-marker-question-outline'}
                      size={20}
                      color={item.isDefault ? c.accent : c.muted}
                    />
                  </View>
                  <View style={styles.flex}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{item.label}</Text>
                      {item.isDefault && <Text style={styles.badge}>{t('addressDefault')}</Text>}
                    </View>
                    <Text style={styles.cardText}>{[item.address, item.apartment].filter(Boolean).join(', ')}</Text>
                    {!addressCoords(item) && <Text style={styles.cardHint}>{t('addressNoPin')}</Text>}
                  </View>
                  <MaterialCommunityIcons name="pencil-outline" size={18} color={c.muted} />
                </Pressable>

                <View style={styles.cardActions}>
                  {busy ? (
                    <ActivityIndicator size="small" color={c.accent} />
                  ) : asking ? (
                    <>
                      <Text style={styles.confirmText}>{t('addressDeleteConfirm')}</Text>
                      <Pressable onPress={() => setConfirmId(null)} hitSlop={8}>
                        <Text style={styles.actionText}>{t('cancel')}</Text>
                      </Pressable>
                      <Pressable onPress={() => run(item.id, () => remove(item.id), 'addressDeleted')} hitSlop={8}>
                        <Text style={[styles.actionText, styles.danger]}>{t('delete')}</Text>
                      </Pressable>
                    </>
                  ) : (
                    <>
                      {!item.isDefault && (
                        <Pressable
                          onPress={() => run(item.id, () => update(item.id, { isDefault: true }))}
                          hitSlop={8}
                        >
                          <Text style={styles.actionText}>{t('addrMakeDefault')}</Text>
                        </Pressable>
                      )}
                      <Pressable onPress={() => setConfirmId(item.id)} hitSlop={8} style={styles.pushRight}>
                        <Text style={[styles.actionText, styles.danger]}>{t('delete')}</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              </View>
            );
          })
        )}
        {Boolean(actionError) && <ErrorNote>{actionError}</ErrorNote>}
      </ScrollView>

      <View style={styles.footer}>
        <OutlineButton label={t('addAddressOnMap')} onPress={() => onEdit?.(null)} arrow />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 },
  title: { flex: 1, color: c.text, fontFamily: fonts.display, fontSize: 17 },
  list: { paddingHorizontal: 20, gap: 10, paddingBottom: 24 },
  loader: { marginTop: 40 },
  state: { gap: 12, marginTop: 12 },
  empty: { alignItems: 'center', gap: 10, paddingTop: 60, paddingHorizontal: 20 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: c.field,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: { color: c.text, fontFamily: fonts.display, fontSize: 18, textAlign: 'center' },
  emptySub: { color: c.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  card: { borderRadius: 18, backgroundColor: c.field, borderWidth: 1.5, borderColor: 'transparent', overflow: 'hidden' },
  cardDefault: { borderColor: c.accent },
  cardMain: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', padding: 14 },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: c.track,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { flexShrink: 1, color: c.text, fontFamily: fonts.bodySemi, fontSize: 15 },
  badge: {
    color: c.accent,
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(242,163,58,0.14)',
  },
  cardText: { color: c.soft, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginTop: 4 },
  cardHint: { color: c.muted, fontFamily: fonts.body, fontSize: 12, marginTop: 4 },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    minHeight: 44,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: c.line,
  },
  pushRight: { marginLeft: 'auto' },
  confirmText: { flex: 1, color: c.soft, fontFamily: fonts.body, fontSize: 13 },
  actionText: { color: c.accent, fontFamily: fonts.bodySemi, fontSize: 13 },
  danger: { color: c.danger },
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
});
