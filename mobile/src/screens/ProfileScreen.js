import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
<<<<<<< HEAD
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ConfirmModal } from '../components/ui/Modals';
import { useToast } from '../components/ui/Toast';
import { colors, radii } from '../constants/theme';
=======
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radii, spacing } from '../constants/theme';
import { Button, Card, Header, Screen, Segment } from '../components/ui/Common';
import { useAddresses } from '../features/checkout';
import { errorText } from '../utils/errors';
>>>>>>> fb102bed4b36fd02c0a0e3b3ae938f93892f7dd5
import { formatUzPhone } from '../utils/phone';

export default function ProfileScreen({
  auth,
  t,
  onNavigate,
  onEditProfile,
  onAddresses,
  onSettings,
  onOrders,
  onHelp,
}) {
  const toast = useToast();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

<<<<<<< HEAD
  // Refresh user data from server when profile screen opens
  useEffect(() => {
    if (auth?.isAuthenticated && auth?.refreshUser) {
      auth.refreshUser().catch(() => null);
    }
  }, [auth?.isAuthenticated]);
=======
/**
 * ProfileScreen — real data from GET /auth/me only; no mock fallback.
 * "Personal data" opens a modal that saves via auth.updateUser (PATCH /auth/me:
 * gender/age/height/weight). Profilda manzil maydoni yo'q — "Manzillarim"
 * rasmiylashtirishda saqlangan manzillarni ko'rsatadi (GET /addresses).
 */
export default function ProfileScreen({ t, onSettings, onOrders, onChats, chatUnread = 0, auth }) {
  const [editVisible, setEditVisible] = useState(false);
  const [logoutRequested, setLogoutRequested] = useState(false);
  const [addressesOpen, setAddressesOpen] = useState(false);
  const { addresses, isLoading: addressesLoading, error: addressesError, refetch: refetchAddresses } = useAddresses();
>>>>>>> fb102bed4b36fd02c0a0e3b3ae938f93892f7dd5

  const user = auth?.user || {};
  const name = user.fullName || 'Mehmon Foydalanuvchi';
  const phone = user.phone ? formatUzPhone(user.phone) : '+998 90 000-00-00';
  const avatarInitial = (user.fullName || 'F')[0].toUpperCase();

  const handleShareApp = () => {
    toast.show('Ulashish havolasi nusxalandi: https://formo.uz', 'success');
  };

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    auth?.logout?.();
    toast.show('Tizimdan chiqildi', 'info');
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>Profil</Text>
        <Pressable onPress={onSettings} hitSlop={10} style={styles.iconBtn}>
          <MaterialCommunityIcons name="cog-outline" size={22} color="#F3F5F9" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarInitial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{name}</Text>
            <Text style={styles.userPhone}>{phone}</Text>
            <Text style={styles.memberBadge}>Formo Club a‘zosi</Text>
          </View>
          <Pressable onPress={onEditProfile} hitSlop={8} style={styles.editBtn}>
            <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.accent} />
          </Pressable>
        </View>

<<<<<<< HEAD
        {/* Stats Chips */}
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <MaterialCommunityIcons name="gender-male-female" size={18} color={colors.teal} />
            <Text style={styles.statVal}>{user.gender === 'FEMALE' ? 'Ayol' : 'Erkak'}</Text>
            <Text style={styles.statLabel}>Jinsi</Text>
          </View>
=======
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
          expanded={addressesOpen}
          onPress={() => {
            if (addressesError) refetchAddresses();
            setAddressesOpen((open) => !open);
          }}
        />
        {addressesOpen && addresses.length ? (
          <View style={styles.addressList}>
            {addresses.map((item) => (
              <View key={item.id} style={styles.addressItem}>
                <Text style={styles.addressLabel}>
                  {item.label || t('address')}
                  {item.isDefault ? ` · ${t('addressDefault')}` : ''}
                </Text>
                <Text style={styles.addressText}>
                  {[item.address, item.apartment].filter(Boolean).join(', ')}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
        <Row icon="clipboard-list-outline" title={t('myOrders')} onPress={onOrders} />
        {onChats ? (
          <Row icon="message-text-outline" title={t('chats')} sub={t('chatsSub')} badge={chatUnread} onPress={onChats} />
        ) : null}
        <Row icon="cog-outline" title={t('settings')} sub={t('languageSub')} onPress={onSettings} last />
      </View>
>>>>>>> fb102bed4b36fd02c0a0e3b3ae938f93892f7dd5

          <View style={styles.statChip}>
            <MaterialCommunityIcons name="calendar-clock" size={18} color={colors.accent} />
            <Text style={styles.statVal}>{user.age ? `${user.age}` : '—'}</Text>
            <Text style={styles.statLabel}>Yoshi</Text>
          </View>

          <View style={styles.statChip}>
            <MaterialCommunityIcons name="human-male" size={18} color={colors.teal} />
            <Text style={styles.statVal}>{user.height ? `${user.height} sm` : '—'}</Text>
            <Text style={styles.statLabel}>Bo‘yi</Text>
          </View>

          <View style={styles.statChip}>
            <MaterialCommunityIcons name="weight-kilogram" size={18} color={colors.accent} />
            <Text style={styles.statVal}>{user.weight ? `${user.weight} kg` : '—'}</Text>
            <Text style={styles.statLabel}>Vazni</Text>
          </View>
        </View>

        {/* Menu Section 1 */}
        <View style={styles.menuGroup}>
          <MenuItem
            icon="account-edit-outline"
            iconColor={colors.accent}
            title="Mening ma‘lumotlarim"
            sub="Ism, yosh, bo‘y va vazn ko‘rsatkichlari"
            onPress={onEditProfile}
          />
          <MenuItem
            icon="map-marker-radius-outline"
            iconColor={colors.teal}
            title="Saqlangan manzillar"
            sub="Yetkazib berish manzillari"
            onPress={onAddresses}
          />
          <MenuItem
            icon="clipboard-list-outline"
            iconColor={colors.accent}
            title="Mening buyurtmalarim"
            sub="Barcha buyurtmalar va kuzatuv"
            onPress={onOrders}
            last
          />
        </View>

        {/* Menu Section 2 */}
        <View style={styles.menuGroup}>
          <MenuItem
            icon="cog-outline"
            iconColor="#8D95BD"
            title="Sozlamalar"
            sub="Bildirishnomalar va til"
            onPress={onSettings}
          />
          <MenuItem
            icon="help-circle-outline"
            iconColor={colors.teal}
            title="Yordam va FAQ"
            sub="Ko‘p beriladigan savollar va qo‘llab-quvvatlash"
            onPress={onHelp}
          />
          <MenuItem
            icon="share-variant-outline"
            iconColor={colors.accent}
            title="Ilovani ulashish"
            sub="Do‘stlarga tavsiya qilish"
            onPress={handleShareApp}
            last
          />
        </View>

        {/* Logout Button */}
        <Pressable onPress={() => setShowLogoutModal(true)} style={styles.logoutBtn}>
          <MaterialCommunityIcons name="logout" size={20} color="#E8543F" />
          <Text style={styles.logoutBtnText}>Tizimdan chiqish</Text>
        </Pressable>

        <Text style={styles.versionText}>Formo Mobile v1.0.0 (Expo 57)</Text>
      </ScrollView>

      {/* Logout confirm modal */}
      <ConfirmModal
        visible={showLogoutModal}
        title="Tizimdan chiqish"
        message="Haqiqatan ham o‘z hisobingizdan chiqmoqchimisiz?"
        confirmText="Chiqish"
        confirmColor="#E8543F"
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </SafeAreaView>
  );
}

<<<<<<< HEAD
function MenuItem({ icon, iconColor, title, sub, onPress, last }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.menuItem, last && { borderBottomWidth: 0 }]}
    >
      <View style={[styles.menuIconCircle, { backgroundColor: 'rgba(243, 245, 249, 0.05)' }]}>
        <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
=======
function Row({ icon, title, sub, onPress, last, expanded, badge = 0 }) {
  const content = (
    <View style={[styles.row, last && styles.rowLast]}>
      <View style={styles.rowIcon}>
        <MaterialCommunityIcons name={icon} size={18} color={colors.accent} />
>>>>>>> fb102bed4b36fd02c0a0e3b3ae938f93892f7dd5
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.menuTitle}>{title}</Text>
        {Boolean(sub) && <Text style={styles.menuSub}>{sub}</Text>}
      </View>
<<<<<<< HEAD
      <MaterialCommunityIcons name="chevron-right" size={22} color="#6F77A0" />
    </Pressable>
=======
      {badge > 0 ? (
        <View style={styles.rowBadge}>
          <Text style={styles.rowBadgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
      <MaterialCommunityIcons
        name={expanded === undefined ? 'chevron-right' : expanded ? 'chevron-up' : 'chevron-down'}
        size={20}
        color={colors.muted}
      />
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
      await auth.updateUser({
        gender,
        age: ageValue,
        height: heightValue,
        weight: weightValue,
      });
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
>>>>>>> fb102bed4b36fd02c0a0e3b3ae938f93892f7dd5
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#050818',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  topTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F3F5F9',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: '#0E1A3F',
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 110,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E1A3F',
    borderRadius: radii.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
    marginBottom: 16,
    gap: 14,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(242, 163, 58, 0.15)',
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.accent,
    fontSize: 24,
    fontWeight: '900',
  },
  userName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#F3F5F9',
  },
  userPhone: {
    fontSize: 12,
    color: '#8D95BD',
    marginTop: 3,
  },
  memberBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.teal,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#121A42',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(242, 163, 58, 0.3)',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  statChip: {
    flex: 1,
    backgroundColor: '#0E1A3F',
    borderRadius: radii.md,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.08)',
    gap: 2,
  },
  statVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F3F5F9',
    marginTop: 2,
  },
  statLabel: {
    fontSize: 10,
    color: '#8D95BD',
  },
  menuGroup: {
    backgroundColor: '#0E1A3F',
    borderRadius: radii.xl,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(243, 245, 249, 0.08)',
    gap: 12,
  },
  menuIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
<<<<<<< HEAD
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F3F5F9',
=======
  rowBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    marginRight: 6,
    borderRadius: radii.round,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBadgeText: { color: colors.background, fontSize: 11, fontWeight: '800' },
  rowTitle: { color: colors.text, fontSize: 13, fontWeight: '700' },
  rowSub: { color: colors.muted, fontSize: 11, marginTop: 3 },
  logout: { marginTop: spacing.sm },
  addressList: { paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: '#171C3F' },
  addressItem: { paddingVertical: 8, paddingLeft: 46 },
  addressLabel: { color: colors.text, fontSize: 12, fontWeight: '700' },
  addressText: { color: colors.muted, fontSize: 11, marginTop: 2 },

  // Edit modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 6, 20, 0.72)',
    justifyContent: 'center',
    paddingHorizontal: 24,
>>>>>>> fb102bed4b36fd02c0a0e3b3ae938f93892f7dd5
  },
  menuSub: {
    fontSize: 11,
    color: '#8D95BD',
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(232, 84, 63, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(232, 84, 63, 0.35)',
    borderRadius: radii.md,
    paddingVertical: 14,
    marginTop: 4,
    marginBottom: 16,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#E8543F',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 11,
    color: '#6F77A0',
    marginBottom: 16,
  },
});
