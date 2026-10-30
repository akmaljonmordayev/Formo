import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radii, spacing } from '../../constants/theme';

// ─── 1. Size Chart Modal ───────────────────────────────────────────────────────

const ADULT_ROWS = [
  { size: 'S', ru: '44–46', chest: '96 sm', length: '70 sm' },
  { size: 'M', ru: '46–48', chest: '100 sm', length: '72 sm' },
  { size: 'L', ru: '48–50', chest: '104 sm', length: '74 sm' },
  { size: 'XL', ru: '50–52', chest: '108 sm', length: '76 sm' },
  { size: 'XXL', ru: '52–54', chest: '112 sm', length: '78 sm' },
  { size: '3XL', ru: '54–56', chest: '116 sm', length: '80 sm' },
];

const KIDS_ROWS = [
  { age: '2–3 yosh', height: '98 sm', chest: '56 sm', length: '40 sm' },
  { age: '4–5 yosh', height: '110 sm', chest: '60 sm', length: '44 sm' },
  { age: '6–7 yosh', height: '122 sm', chest: '64 sm', length: '48 sm' },
  { age: '8–9 yosh', height: '134 sm', chest: '68 sm', length: '52 sm' },
  { age: '10–11 yosh', height: '146 sm', chest: '72 sm', length: '56 sm' },
  { age: '12–13 yosh', height: '158 sm', chest: '76 sm', length: '60 sm' },
];

export function SizeChartModal({ visible, onClose, group = 'adult' }) {
  const [tab, setTab] = useState(group);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>O‘lchamlar jadvali</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <MaterialCommunityIcons name="close" size={22} color={colors.muted} />
            </Pressable>
          </View>

          {/* Tab selector */}
          <View style={styles.tabRow}>
            <Pressable
              onPress={() => setTab('adult')}
              style={[styles.tabBtn, tab === 'adult' && styles.tabBtnActive]}
            >
              <Text style={[styles.tabText, tab === 'adult' && styles.tabTextActive]}>Kattalar</Text>
            </Pressable>
            <Pressable
              onPress={() => setTab('kids')}
              style={[styles.tabBtn, tab === 'kids' && styles.tabBtnActive]}
            >
              <Text style={[styles.tabText, tab === 'kids' && styles.tabTextActive]}>Bolalar</Text>
            </Pressable>
          </View>

          {/* Table */}
          <ScrollView style={styles.tableScroll}>
            {tab === 'adult' ? (
              <View style={styles.table}>
                <View style={styles.tableHead}>
                  <Text style={[styles.th, { flex: 1.2 }]}>O‘lcham</Text>
                  <Text style={[styles.th, { flex: 1.2 }]}>RU</Text>
                  <Text style={[styles.th, { flex: 1.4 }]}>Ko‘krak</Text>
                  <Text style={[styles.th, { flex: 1.4 }]}>Uzunlik</Text>
                </View>
                {ADULT_ROWS.map((r, i) => (
                  <View key={i} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                    <Text style={[styles.tdBold, { flex: 1.2 }]}>{r.size}</Text>
                    <Text style={[styles.td, { flex: 1.2 }]}>{r.ru}</Text>
                    <Text style={[styles.td, { flex: 1.4 }]}>{r.chest}</Text>
                    <Text style={[styles.td, { flex: 1.4 }]}>{r.length}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.table}>
                <View style={styles.tableHead}>
                  <Text style={[styles.th, { flex: 1.6 }]}>Yosh</Text>
                  <Text style={[styles.th, { flex: 1.4 }]}>Bo‘y</Text>
                  <Text style={[styles.th, { flex: 1.4 }]}>Ko‘krak</Text>
                  <Text style={[styles.th, { flex: 1.4 }]}>Uzunlik</Text>
                </View>
                {KIDS_ROWS.map((r, i) => (
                  <View key={i} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                    <Text style={[styles.tdBold, { flex: 1.6 }]}>{r.age}</Text>
                    <Text style={[styles.td, { flex: 1.4 }]}>{r.height}</Text>
                    <Text style={[styles.td, { flex: 1.4 }]}>{r.chest}</Text>
                    <Text style={[styles.td, { flex: 1.4 }]}>{r.length}</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          <Text style={styles.hint}>
            O‘lcham mos kelmasa 7 kun ichida bepul almashtirib beriladi.
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── 2. Language Selection Modal ───────────────────────────────────────────────

const LANGUAGES = [
  { code: 'uz', name: 'O‘zbekcha', sub: 'Lotin yozuvi' },
  { code: 'cy', name: 'Ўзбекча', sub: 'Кирилл ёзуви' },
  { code: 'ru', name: 'Русский', sub: 'Русский язык' },
  { code: 'en', name: 'English', sub: 'International' },
];

export function LanguageModal({ visible, onClose, current, onSelect }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Ilova tili</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <MaterialCommunityIcons name="close" size={22} color={colors.muted} />
            </Pressable>
          </View>

          <View style={styles.langList}>
            {LANGUAGES.map((l) => {
              const active = current === l.code || (l.code === 'cy' && current === 'uz');
              return (
                <Pressable
                  key={l.code}
                  onPress={() => {
                    onSelect(l.code);
                    onClose();
                  }}
                  style={[styles.langItem, active && styles.langItemActive]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.langName, active && styles.langNameActive]}>{l.name}</Text>
                    <Text style={styles.langSub}>{l.sub}</Text>
                  </View>
                  {active && (
                    <MaterialCommunityIcons name="check-circle" size={20} color={colors.accent} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── 3. Confirm Modal (Logout / Delete / Cancel) ──────────────────────────────

export function ConfirmModal({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Tasdiqlash',
  cancelText = 'Bekor qilish',
  danger = false,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.confirmTitle}>{title}</Text>
          {Boolean(message) && <Text style={styles.confirmMessage}>{message}</Text>}

          <View style={styles.confirmActions}>
            <Pressable onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>{cancelText}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                onConfirm();
                onClose();
              }}
              style={[styles.confirmBtn, danger && styles.dangerBtn]}
            >
              <Text style={[styles.confirmText, danger && styles.dangerText]}>{confirmText}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── 4. Add/Edit Address Modal ────────────────────────────────────────────────

export function AddressModal({ visible, onClose, onSave, initial = null }) {
  const [title, setTitle] = useState(initial?.title || 'Uy');
  const [address, setAddress] = useState(initial?.address || '');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {initial ? 'Manzilni tahrirlash' : 'Yangi manzil qo‘shish'}
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <MaterialCommunityIcons name="close" size={22} color={colors.muted} />
            </Pressable>
          </View>

          <Text style={styles.label}>Manzil nomi (masalan: Uy, Ishxona)</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Uy / Ish"
            placeholderTextColor={colors.caption}
            style={styles.input}
          />

          <Text style={[styles.label, { marginTop: 14 }]}>To‘liq manzil</Text>
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="Toshkent, Yunusobod tumani, 4-mavze..."
            placeholderTextColor={colors.caption}
            multiline
            numberOfLines={3}
            style={[styles.input, { height: 75, textAlignVertical: 'top' }]}
          />

          <Pressable
            disabled={!address.trim()}
            onPress={() => {
              onSave({ title: title.trim() || 'Manzil', address: address.trim() });
              onClose();
            }}
            style={[styles.saveBtn, !address.trim() && { opacity: 0.5 }]}
          >
            <Text style={styles.saveBtnText}>Saqlash</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 24, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.xl,
    padding: 20,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 3,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radii.sm,
  },
  tabBtnActive: {
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
  },
  tabTextActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  tableScroll: {
    maxHeight: 280,
  },
  table: {
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceHighlight,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  th: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  tr: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  trAlt: {
    backgroundColor: 'rgba(27, 37, 96, 0.4)',
  },
  tdBold: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.accent,
  },
  td: {
    fontSize: 12,
    color: colors.text,
  },
  hint: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 14,
    lineHeight: 16,
    textAlign: 'center',
  },
  langList: {
    gap: 8,
  },
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  langItemActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(242, 163, 58, 0.08)',
  },
  langName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  langNameActive: {
    color: colors.accent,
  },
  langSub: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  confirmMessage: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
    lineHeight: 18,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#080C24',
  },
  dangerBtn: {
    backgroundColor: colors.red,
  },
  dangerText: {
    color: '#F3F5F9',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 20,
  },
  saveBtnText: {
    color: '#080C24',
    fontSize: 14,
    fontWeight: '800',
  },
});
