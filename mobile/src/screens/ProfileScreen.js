import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radii, spacing } from '../constants/theme';
import { Button, Card, Header, Screen, Segment } from '../components/ui/Common';
import { formatUzPhone } from '../utils/phone';

/** dd.mm.yyyy without relying on full ICU date formatting. */
function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${date.getFullYear()}`;
}

/**
 * ProfileScreen — real data from GET /auth/me only; no mock fallback.
 * "Personal data" opens a modal that saves via auth.updateUser (PATCH /auth/me).
 * Backend hozircha bu endpointni bermaydi — bunday holatda useAuth qiymatlarni
 * qurilmada (lokal overlay) saqlaydi va UI baribir yangilanadi.
 */
export default function ProfileScreen({ t, onSettings, onOrders, auth }) {
  const [editVisible, setEditVisible] = useState(false);
  const [logoutRequested, setLogoutRequested] = useState(false);

  const user = auth?.user || {};
  const name = user.fullName || '—';
  const phone = user.phone ? formatUzPhone(user.phone) : '—';
  const avatarInitial = (user.fullName || 'F')[0].toUpperCase();

  const stats = useMemo(
    () => [
      { icon: 'calendar-outline', value: user.age != null ? String(user.age) : '—', label: t('age') },
      { icon: 'ruler-height', value: user.height != null ? String(user.height) : '—', label: `${t('height')}, sm` },
      { icon: 'scale-bathroom', value: user.weight != null ? String(user.weight) : '—', label: `${t('weight')}, kg` },
    ],
    [user.age, user.height, user.weight, t],
  );

  const requestLogout = () => {
    if (logoutRequested) {
      setLogoutRequested(false);
      auth?.logout?.();
      return;
    }
    setLogoutRequested(true);
    Alert.alert(t('logout'), t('logoutConfirm'), [
      { text: t('back'), onPress: () => setLogoutRequested(false), style: 'cancel' },
      { text: t('logout'), style: 'destructive', onPress: () => { setLogoutRequested(false); auth?.logout?.(); } },
    ]);
  };

  return (
    <Screen>
      <Header
        title={t('myProfile')}
        right={
          <Pressable onPress={onSettings} style={styles.headerButton} hitSlop={8}>
            <MaterialCommunityIcons name="cog-outline" size={20} color={colors.text} />
          </Pressable>
        }
      />

      <Card style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{avatarInitial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.phone}>{phone}</Text>
          <Text style={styles.memberSince}>
            {t('memberSince')}: {formatDate(user.createdAt)}
          </Text>
        </View>
      </Card>

      <View style={styles.stats}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.stat}>
            <MaterialCommunityIcons name={stat.icon} size={16} color={colors.accent} />
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.group}>
        <Row
          icon="account-details-outline"
          title={t('personalData')}
          sub={t('personalDataSub')}
          onPress={() => setEditVisible(true)}
        />
        <Row icon="clipboard-list-outline" title={t('myOrders')} onPress={onOrders} />
        <Row icon="cog-outline" title={t('settings')} sub={t('languageSub')} onPress={onSettings} last />
      </View>

      <Button variant="secondary" style={styles.logout} onPress={requestLogout}>
        {t('logout')}
      </Button>

      <EditProfileModal
        visible={editVisible}
        t={t}
        user={user}
        onClose={() => setEditVisible(false)}
        auth={auth}
      />
    </Screen>
  );
}

function Row({ icon, title, sub, onPress, last }) {
  const content = (
    <View style={[styles.row, last && styles.rowLast]}>
      <View style={styles.rowIcon}>
        <MaterialCommunityIcons name={icon} size={18} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.muted} />
    </View>
  );
  return onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content;
}

/** Modal-style editor for the measurements collected during registration. */
function EditProfileModal({ visible, onClose, user, auth, t }) {
  const [gender, setGender] = useState(user.gender || null);
  const [age, setAge] = useState(user.age != null ? String(user.age) : '');
  const [height, setHeight] = useState(user.height != null ? String(user.height) : '');
  const [weight, setWeight] = useState(user.weight != null ? String(user.weight) : '');
  const [address, setAddress] = useState(user.address || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [savedFlash, setSavedFlash] = useState(false);

  // Re-hydrate from the latest server user whenever the modal opens
  React.useEffect(() => {
    if (visible) {
      setGender(user.gender || null);
      setAge(user.age != null ? String(user.age) : '');
      setHeight(user.height != null ? String(user.height) : '');
      setWeight(user.weight != null ? String(user.weight) : '');
      setAddress(user.address || '');
      setError(null);
      setSavedFlash(false);
    }
  }, [visible, user]);

  const parseIntOrNull = (raw, min, max) => {
    if (!raw.trim()) return null;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < min || value > max) return NaN;
    return value;
  };

  const handleSave = async () => {
    setError(null);

    const ageValue = parseIntOrNull(age, 1, 120);
    const heightValue = parseIntOrNull(height, 50, 250);
    const weightValue = parseIntOrNull(weight, 20, 300);
    if ([ageValue, heightValue, weightValue].some(Number.isNaN)) {
      setError(t('invalidValue'));
      return;
    }

    setSaving(true);
    try {
      await auth.updateUser({
        gender,
        age: ageValue,
        height: heightValue,
        weight: weightValue,
        address: address.trim() || null,
      });
      setSavedFlash(true);
      setTimeout(() => {
        setSavedFlash(false);
        onClose();
      }, 600);
    } catch (err) {
      setError(err?.message || t('networkError'));
    } finally {
      setSaving(false);
    }
  };

  const genderLabel =
    gender === 'MALE' ? t('male') : gender === 'FEMALE' ? t('female') : t('male');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('editProfile')}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <MaterialCommunityIcons name="close" size={22} color={colors.muted} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalLabel}>{t('gender')}</Text>
            <Segment
              wide
              style={styles.modalSegment}
              options={[t('male'), t('female')]}
              value={genderLabel}
              onChange={(value) => setGender(value === t('male') ? 'MALE' : 'FEMALE')}
            />

            <View style={styles.modalMetrics}>
              <ModalInput label={t('age')} value={age} onChangeText={setAge} placeholder="25" />
              <ModalInput label={`${t('height')}, sm`} value={height} onChangeText={setHeight} placeholder="178" />
              <ModalInput label={`${t('weight')}, kg`} value={weight} onChangeText={setWeight} placeholder="76" />
            </View>

            <Text style={styles.modalLabel}>{t('address')}</Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="—"
              placeholderTextColor={colors.muted}
              style={styles.modalInput}
              selectionColor={colors.accent}
            />

            {error ? <Text style={styles.modalError}>{error}</Text> : null}
            {savedFlash ? <Text style={styles.modalSaved}>{t('saved')}</Text> : null}

            <Button style={styles.modalSave} onPress={handleSave} disabled={saving}>
              {saving ? '…' : t('save')}
            </Button>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ModalInput({ label, value, onChangeText, placeholder }) {
  return (
    <View style={styles.modalMetric}>
      <Text style={styles.modalLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType="number-pad"
        maxLength={3}
        style={styles.modalInput}
        selectionColor={colors.accent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: '#141A3E',
    borderWidth: 1,
    borderColor: '#232A57',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    padding: 0,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#151B42',
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.accent, fontWeight: '900', fontSize: 22 },
  name: { color: colors.text, fontSize: 16, fontWeight: '800' },
  phone: { color: colors.muted, fontSize: 12, marginTop: 4 },
  memberSince: { color: '#59618D', fontSize: 10, marginTop: 3 },
  stats: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#1B2150',
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 2,
  },
  statValue: { color: colors.text, fontSize: 15, fontWeight: '900' },
  statLabel: { color: colors.muted, fontSize: 9, textAlign: 'center' },
  group: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#1B2150',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#171C3F',
  },
  rowLast: { borderBottomWidth: 0 },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: '#171E4B',
    borderWidth: 1,
    borderColor: '#232A57',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { color: colors.text, fontSize: 13, fontWeight: '700' },
  rowSub: { color: colors.muted, fontSize: 11, marginTop: 3 },
  logout: { marginTop: spacing.sm },

  // Edit modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 6, 20, 0.72)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: '#242B58',
    padding: spacing.xl,
    maxHeight: '86%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  modalLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: spacing.md,
  },
  modalSegment: { alignSelf: 'stretch' },
  modalMetrics: { flexDirection: 'row', gap: spacing.sm },
  modalMetric: { flex: 1 },
  modalInput: {
    backgroundColor: '#0E1330',
    borderWidth: 1.5,
    borderColor: '#232A57',
    borderRadius: radii.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  modalError: { color: '#E8543F', fontSize: 12, marginTop: spacing.md },
  modalSaved: { color: colors.teal, fontSize: 12, marginTop: spacing.md, fontWeight: '700' },
  modalSave: { marginTop: spacing.lg },
});
