import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoider, KeyboardAwareScrollView } from '../components/ui/KeyboardAware';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radii, spacing, themedStyles } from '../constants/theme';
import { Button, Card, Header, Screen, Segment } from '../components/ui/Common';
import LanguagePicker from '../components/ui/LanguagePicker';
import ThemeToggle from '../components/ui/ThemeToggle';
import { useTheme } from '../contexts/ThemeContext';
import { useAddresses } from '../features/checkout';
import useWallet from '../features/wallet';
import { assetUrl } from '../services/api';
import { WalletChip } from './WalletScreen';
import { errorText } from '../utils/errors';
import { formatUzPhone } from '../utils/phone';
import { displayName, nameInitial, realFullName } from '../utils/userName';

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
 * Hisob sozlamalari (rasm, ism-familiya, parol, telefon, ko'rinish, til) — alohida sahifa (AccountScreen),
 * bu yerda faqat "Hisob sozlamalari" tugmasi. "Shaxsiy ma'lumotlar" modali — jins/yosh/bo'y/vazn.
 */
export default function ProfileScreen({ t, language, setLanguage, onOrders, onAddresses, onWallet, onSupport, onAccount, auth }) {
  // Mavzu shu sahifada almashadi — sahifa o'zi ham qayta chizilsin (ota komponentga bog'liq bo'lmasin)
  useTheme();
  const wallet = useWallet();
  const [editVisible, setEditVisible] = useState(false);
  const [logoutRequested, setLogoutRequested] = useState(false);
  const { addresses, isLoading: addressesLoading, error: addressesError, refetch: refetchAddresses } = useAddresses();

  const user = auth?.user || {};
  const name = displayName(user, t('nameMissing'));
  const phone = user.phone ? formatUzPhone(user.phone) : '—';
  const avatarInitial = nameInitial(user);
  const avatarUri = assetUrl(user.avatarUrl);

  const stats = useMemo(
    () => [
      { icon: 'calendar-outline', value: user.age != null ? String(user.age) : '—', label: t('age') },
      { icon: 'human-male-height', value: user.height != null ? String(user.height) : '—', label: `${t('height')}, sm` },
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
      <Header cart title={t('myProfile')} right={<LanguagePicker t={t} language={language} setLanguage={setLanguage} />} />

      <Card style={styles.profile}>
        <View style={styles.avatar}>
          {avatarUri ? <Image source={{ uri: avatarUri }} style={styles.avatarImg} /> : <Text style={styles.avatarText}>{avatarInitial}</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, !realFullName(user) && styles.nameMissing]}>{name}</Text>
          <Text style={styles.phone}>{phone}</Text>
          <Text style={styles.memberSince}>
            {t('memberSince')}: {formatDate(user.createdAt)}
          </Text>
        </View>
      </Card>

      <WalletChip t={t} balance={wallet.balance} onPress={onWallet} />

      <View style={styles.stats}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.stat}>
            <MaterialCommunityIcons name={stat.icon} size={16} color={colors.accent} />
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <ThemeToggle t={t} />

      <View style={styles.group}>
        <Row
          icon="account-details-outline"
          title={t('personalData')}
          sub={t('personalDataSub')}
          onPress={() => setEditVisible(true)}
        />
        <Row
          icon="map-marker-outline"
          title={t('addresses')}
          sub={
            addressesLoading
              ? '…'
              : addressesError
                ? errorText(addressesError, t)
                : addresses.length
                  ? `${addresses.length} ${t('addressesSaved')}`
                  : t('addressesEmpty')
          }
          onPress={() => {
            if (addressesError) refetchAddresses();
            onAddresses?.();
          }}
        />
        <Row icon="clipboard-list-outline" title={t('myOrders')} onPress={onOrders} />
        <Row icon="message-text-outline" title={t('supportChat')} sub={t('supportChatSub')} onPress={onSupport} last />
      </View>

      <View style={styles.group}>
        <Row
          icon="account-cog-outline"
          title={t('accountSettings')}
          sub={t('accountSettingsSub')}
          onPress={onAccount}
          last
        />
      </View>

      <Button
        variant="danger"
        style={styles.logout}
        onPress={requestLogout}
        icon={<MaterialCommunityIcons name="logout" size={18} color={colors.danger} />}
      >
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

function Row({ icon, title, sub, onPress, last, expanded }) {
  const content = (
    <View style={[styles.row, last && styles.rowLast]}>
      <View style={styles.rowIcon}>
        <MaterialCommunityIcons name={icon} size={18} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      <MaterialCommunityIcons
        name={expanded === undefined ? 'chevron-right' : expanded ? 'chevron-up' : 'chevron-down'}
        size={20}
        color={colors.muted}
      />
    </View>
  );
  return onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content;
}

/** Modal-style editor faqat jins/yosh/bo'y/vazn uchun — ism endi sahifada, "Hisob" bo'limida. */
function EditProfileModal({ visible, onClose, user, auth, t }) {
  const [gender, setGender] = useState(user.gender || null);
  const [age, setAge] = useState(user.age != null ? String(user.age) : '');
  const [height, setHeight] = useState(user.height != null ? String(user.height) : '');
  const [weight, setWeight] = useState(user.weight != null ? String(user.weight) : '');
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

    // Backend chegaralari (UpdateProfileDto): yosh 3–100, bo'y 50–250, vazn 10–250
    const ageValue = parseIntOrNull(age, 3, 100);
    const heightValue = parseIntOrNull(height, 50, 250);
    const weightValue = parseIntOrNull(weight, 10, 250);
    if ([ageValue, heightValue, weightValue].some(Number.isNaN)) {
      setError(t('invalidValue'));
      return;
    }

    setSaving(true);
    try {
      await auth.updateUser({ gender, age: ageValue, height: heightValue, weight: weightValue });
      setSavedFlash(true);
      setTimeout(() => {
        setSavedFlash(false);
        onClose();
      }, 600);
    } catch (err) {
      setError(errorText(err, t));
    } finally {
      setSaving(false);
    }
  };

  const genderLabel = gender === 'MALE' ? t('male') : gender === 'FEMALE' ? t('female') : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoider style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('editProfile')}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <MaterialCommunityIcons name="close" size={22} color={colors.muted} />
            </Pressable>
          </View>

          <KeyboardAwareScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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

            {error ? <Text style={styles.modalError}>{error}</Text> : null}
            {savedFlash ? <Text style={styles.modalSaved}>{t('saved')}</Text> : null}

            <Button style={styles.modalSave} onPress={handleSave} disabled={saving}>
              {saving ? '…' : t('save')}
            </Button>
          </KeyboardAwareScrollView>
        </View>
      </KeyboardAvoider>
    </Modal>
  );
}

/** 3 xonali son (yosh/bo'y/vazn) maydoni. */
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
        autoCorrect={false}
        maxLength={3}
        style={styles.modalInput}
        selectionColor={colors.accent}
      />
    </View>
  );
}

const styles = themedStyles(() => ({
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
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { color: colors.accent, fontWeight: '900', fontSize: 22 },
  name: { color: colors.text, fontSize: 16, fontWeight: '800' },
  nameMissing: { color: colors.muted, fontWeight: '600' },
  phone: { color: colors.muted, fontSize: 12, marginTop: 4 },
  memberSince: { color: colors.dim, fontSize: 10, marginTop: 3 },
  stats: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg, marginTop: spacing.md },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
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
    borderColor: colors.border,
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
    borderBottomColor: colors.border,
  },
  rowLast: { borderBottomWidth: 0 },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { color: colors.text, fontSize: 13, fontWeight: '700' },
  rowSub: { color: colors.muted, fontSize: 11, marginTop: 3 },
  logout: { marginTop: spacing.lg, marginBottom: spacing.sm },

  // Edit modal (jins/yosh/bo'y/vazn)
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 6, 20, 0.75)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
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
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  modalError: { color: colors.danger, fontSize: 12, marginTop: spacing.md },
  modalSaved: { color: colors.tealLight, fontSize: 12, marginTop: spacing.md, fontWeight: '700' },
  modalSave: { marginTop: spacing.lg },
}));
