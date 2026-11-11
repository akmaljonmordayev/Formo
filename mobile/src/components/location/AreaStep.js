import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, fonts, radii, spacing, themedStyles } from '../../constants/theme';

const norm = (s) => String(s ?? '').toLowerCase().replace(/[‘’ʻʼ`']/g, '').trim();

/**
 * Manzil qo'shishning ro'yxatli bosqichi: viloyat yoki tuman tanlash.
 * Uzun ro'yxatda (8 tadan ko'p) tepada qidiruv chiqadi; `groups` berilsa bo'lim sarlavhalari bilan.
 *
 * Props: t, items ([{ key, label, sub?, icon?, group? }]), value (tanlangan key), onPick(key),
 *        searchPlaceholder, emptyText
 */
export default function AreaStep({ items, value, onPick, searchPlaceholder, emptyText }) {
  const [filter, setFilter] = useState('');
  const searchable = items.length > 8;
  const visible = useMemo(() => {
    const q = norm(filter);
    return q ? items.filter((item) => norm(item.label).includes(q)) : items;
  }, [items, filter]);

  let lastGroup = null;
  return (
    <View style={styles.root}>
      {searchable ? (
        <View style={styles.search}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.muted} />
          <TextInput
            value={filter}
            onChangeText={setFilter}
            placeholder={searchPlaceholder}
            placeholderTextColor={colors.dim}
            autoCorrect={false}
            selectionColor={colors.accent}
            style={styles.searchInput}
          />
          {filter ? (
            <Pressable onPress={() => setFilter('')} hitSlop={8}>
              <MaterialCommunityIcons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {visible.length ? (
          visible.map((item) => {
            const on = item.key === value;
            const head = item.group && item.group !== lastGroup ? item.group : null;
            lastGroup = item.group || lastGroup;
            return (
              <React.Fragment key={item.key}>
                {head ? <Text style={styles.group}>{head}</Text> : null}
                <Pressable
                  onPress={() => onPick(item.key)}
                  style={({ pressed }) => [styles.row, on && styles.rowOn, pressed && styles.pressed]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                >
                  <View style={[styles.icon, on && styles.iconOn]}>
                    <MaterialCommunityIcons name={item.icon || 'map-marker-outline'} size={18} color={on ? colors.primaryDark : colors.accent} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={[styles.label, on && styles.labelOn]} numberOfLines={1}>
                      {item.label}
                    </Text>
                    {item.sub ? <Text style={styles.sub} numberOfLines={1}>{item.sub}</Text> : null}
                  </View>
                  <MaterialCommunityIcons name={on ? 'check-circle' : 'chevron-right'} size={20} color={on ? colors.accent : colors.dim} />
                </Pressable>
              </React.Fragment>
            );
          })
        ) : (
          <Text style={styles.empty}>{emptyText}</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = themedStyles(() => ({
  root: { flex: 1 },
  flex: { flex: 1 },
  pressed: { opacity: 0.75 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, paddingVertical: 0, color: colors.text, fontFamily: fonts.body, fontSize: 15 },
  list: { paddingHorizontal: spacing.xl, paddingBottom: 32, gap: spacing.sm },
  group: {
    color: colors.muted,
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 58,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  rowOn: { borderColor: colors.accent, backgroundColor: colors.surfaceRaised },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentGlow,
  },
  iconOn: { backgroundColor: colors.accent },
  label: { color: colors.text, fontFamily: fonts.bodySemi, fontSize: 15 },
  labelOn: { color: colors.accent },
  sub: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  empty: { color: colors.muted, fontFamily: fonts.body, fontSize: 14, textAlign: 'center', marginTop: 40 },
}));
