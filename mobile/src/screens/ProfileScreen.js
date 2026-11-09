import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { KeyboardAvoider, KeyboardAwareScrollView } from '../components/ui/KeyboardAware';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radii, spacing } from '../constants/theme';
import { languageOptions } from '../i18n';
import { Button, Card, Header, Overline, Screen, Segment } from '../components/ui/Common';
import { useAddresses } from '../features/checkout';
import useWallet from '../features/wallet';
import { api, assetUrl } from '../services/api';
import { WalletChip } from './WalletScreen';
import { errorText } from '../utils/errors';
import { formatUzPhone } from '../utils/phone';
import {
  cleanCode,
  isValidChallenge,
  telegramAppLink,
  telegramErrorText,
} from '../features/auth/telegram';
import {
  displayName,
  isNameUnsupportedError,
  joinFullName,
  nameInitial,
  realFullName,
  splitFullName,
  validateName,
} from '../utils/userName';

const LANGUAGE_SUBS = {
  uz: { uz: 'Lotin alifbosi', uzn: 'Yangi lotin alifbosi (Ō, Ḡ, Ş, Ç)', ru: 'Kirill yozuvi', en: 'Lotin alifbosi' },
  uzn: { uz: 'Lotin alifbosi', uzn: 'Yangi lotin alifbosi (Ō, Ḡ, Ş, Ç)', ru: 'Kirill yozuvi', en: 'Lotin alifbosi' },
  ru: { uz: 'Узбекский · латиница', uzn: 'Узбекский · новый латинский алфавит', ru: 'Русский · кириллица', en: 'Английский · латиница' },
  en: { uz: 'Uzbek · Latin', uzn: 'Uzbek · new Latin alphabet', ru: 'Russian · Cyrillic', en: 'English · Latin' },
};

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
 * Hisob sozlamalari (rasm, ism-familiya, parol, telefon, til) to'g'ridan-to'g'ri shu
 * sahifada — alohida "Sozlamalar" ekrani yo'q. "Shaxsiy ma'lumotlar" modali faqat
 * jins/yosh/bo'y/vazn uchun (ism bu yerda, pastdagi "Hisob" bo'limida tahrirlanadi).
 */
export default function ProfileScreen({ t, language, setLanguage, onOrders, onAddresses, onWallet, onSupport, auth }) {
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

  // ─── Profil rasmi ────────────────────────────────────────────────────────
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState(null);

  const pickAvatar = async () => {
    setAvatarError(null);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        setAvatarError(t('avatarFailed'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.8, allowsEditing: true, aspect: [1, 1] });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      const ext = (asset.mimeType?.split('/')[1] || asset.uri.split('.').pop() || 'jpg').toLowerCase();
      setAvatarBusy(true);
      await api.auth.setAvatar({ uri: asset.uri, name: `avatar.${ext}`, type: asset.mimeType || `image/${ext}` });
      await auth.refreshUser();
    } catch (err) {
      setAvatarError(errorText(err, t));
    } finally {
      setAvatarBusy(false);
    }
  };

  const removeAvatar = async () => {
    setAvatarBusy(true);
    setAvatarError(null);
    try {
      await api.auth.removeAvatar();
      await auth.refreshUser();
    } catch (err) {
      setAvatarError(errorText(err, t));
    } finally {
      setAvatarBusy(false);
    }
  };

  // ─── Ism-familiya ────────────────────────────────────────────────────────
  const [firstName, setFirstName] = useState(() => splitFullName(realFullName(user)).first);
  const [lastName, setLastName] = useState(() => splitFullName(realFullName(user)).last);
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState(null);
  const [nameSaved, setNameSaved] = useState(false);

  const saveName = async () => {
    setNameError(null);
    setNameSaved(false);
    const nameErr = validateName(firstName, lastName);
    if (nameErr) {
      setNameError(t(nameErr));
      return;
    }
    setNameSaving(true);
    try {
      try {
        await auth.updateUser({ fullName: joinFullName(firstName, lastName) });
      } catch (err) {
        if (!isNameUnsupportedError(err)) throw err;
        setNameError(t('nameNotSupported'));
        return;
      }
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 1500);
    } catch (err) {
      setNameError(errorText(err, t));
    } finally {
      setNameSaving(false);
    }
  };

  // ─── Parol ───────────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSaved, setPasswordSaved] = useState(false);

  const savePassword = async () => {
    setPasswordError(null);
    setPasswordSaved(false);
    if (newPassword.length < 6) {
      setPasswordError(t('passwordShort'));
      return;
    }
    if (newPassword.length > 64) {
      setPasswordError(t('passwordTooLong'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t('passwordMismatch'));
      return;
    }
    setPasswordSaving(true);
    try {
      await api.auth.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 1500);
    } catch (err) {
      setPasswordError(errorText(err, t));
    } finally {
      setPasswordSaving(false);
    }
  };

  // ─── Telefon raqami (Telegram orqali qayta tasdiqlash bilan) ───────────────
  const [newPhoneDigits, setNewPhoneDigits] = useState('');
  const [phoneChallenge, setPhoneChallenge] = useState(null);
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneSending, setPhoneSending] = useState(false);
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  const [phoneError, setPhoneError] = useState(null);
  const [phoneDone, setPhoneDone] = useState(false);

  const sendPhoneCode = async () => {
    setPhoneError(null);
    setPhoneSending(true);
    try {
      const challenge = await api.auth.phoneChangeStart(`+998${newPhoneDigits}`);
      if (!isValidChallenge(challenge)) throw new Error('Unexpected Telegram challenge response');
      setPhoneChallenge(challenge);
    } catch (err) {
      setPhoneError(telegramErrorText(err, t));
    } finally {
      setPhoneSending(false);
    }
  };

  const openPhoneBot = async () => {
    try {
      const appLink = telegramAppLink(phoneChallenge.deepLink);
      const opened = appLink ? await Linking.openURL(appLink).then(() => true, () => false) : false;
      if (!opened) await Linking.openURL(phoneChallenge.deepLink);
    } catch {
      // Bot ochilmasa ham kod maydoni ishlaydi — foydalanuvchi Telegram'ni o'zi ochishi mumkin
    }
  };

  const cancelPhoneChange = () => {
    setPhoneChallenge(null);
    setPhoneCode('');
    setPhoneError(null);
  };

  const confirmPhoneChange = async () => {
    setPhoneError(null);
    setPhoneVerifying(true);
    try {
      await api.auth.phoneChangeVerify(phoneChallenge.challengeId, phoneCode);
      await auth.refreshUser();
      setPhoneChallenge(null);
      setPhoneCode('');
      setNewPhoneDigits('');
      setPhoneDone(true);
      setTimeout(() => setPhoneDone(false), 2000);
    } catch (err) {
      setPhoneError(telegramErrorText(err, t));
    } finally {
      setPhoneVerifying(false);
    }
  };

  return (
    <Screen>
      <Header cart title={t('myProfile')} />

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

      {/* ─── Hisob sozlamalari: rasm, ism-familiya, parol, telefon, til ─── */}
      <Overline style={styles.sectionGap}>{t('accountSection')}</Overline>
      <View style={styles.avatarRow}>
        <View style={styles.avatarWrapSmall}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarInitialSmall}>{avatarInitial}</Text>
          )}
        </View>
        <View style={styles.avatarActions}>
          <Pressable onPress={pickAvatar} disabled={avatarBusy} hitSlop={8}>
            <Text style={styles.link}>{avatarBusy ? t('avatarUploading') : t('avatarChange')}</Text>
          </Pressable>
          {Boolean(user.avatarUrl) && (
            <Pressable onPress={removeAvatar} disabled={avatarBusy} hitSlop={8}>
              <Text style={styles.linkDanger}>{t('avatarRemove')}</Text>
            </Pressable>
          )}
        </View>
      </View>
      {avatarError ? <Text style={styles.errorText}>{avatarError}</Text> : null}

      <View style={styles.card}>
        <View style={styles.row2}>
          <View style={styles.field}>
            <Text style={styles.label}>{t('firstName')}</Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder={t('firstNamePlaceholder')}
              placeholderTextColor={colors.muted}
              autoCapitalize="words"
              maxLength={50}
              style={styles.input}
              selectionColor={colors.accent}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>{t('lastName')}</Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder={t('lastNamePlaceholder')}
              placeholderTextColor={colors.muted}
              autoCapitalize="words"
              maxLength={50}
              style={styles.input}
              selectionColor={colors.accent}
            />
          </View>
        </View>
        {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
        {nameSaved ? <Text style={styles.savedText}>{t('saved')}</Text> : null}
        <Button style={styles.saveBtn} onPress={saveName} disabled={nameSaving}>
          {nameSaving ? '…' : t('save')}
        </Button>
      </View>

      <Overline style={styles.sectionGap}>{t('changePasswordBtn')}</Overline>
      <View style={styles.card}>
        <View style={styles.field}>
          <Text style={styles.label}>{t('currentPassword')}</Text>
          <TextInput
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            placeholderTextColor={colors.muted}
            style={styles.input}
            selectionColor={colors.accent}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('newPassword')}</Text>
          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            maxLength={64}
            placeholderTextColor={colors.muted}
            style={styles.input}
            selectionColor={colors.accent}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('confirmPassword')}</Text>
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            maxLength={64}
            placeholderTextColor={colors.muted}
            style={styles.input}
            selectionColor={colors.accent}
          />
        </View>
        {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
        {passwordSaved ? <Text style={styles.savedText}>{t('passwordChanged')}</Text> : null}
        <Button style={styles.saveBtn} onPress={savePassword} disabled={passwordSaving || !currentPassword || !newPassword}>
          {passwordSaving ? '…' : t('changePasswordBtn')}
        </Button>
      </View>

      <Overline style={styles.sectionGap}>{t('phoneChangeTitle')}</Overline>
      <View style={styles.card}>
        <Text style={styles.currentPhone}>{formatUzPhone(user.phone)}</Text>

        {!phoneChallenge ? (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>{t('newPhone')}</Text>
              <View style={styles.phoneRow}>
                <Text style={styles.phonePrefix}>+998</Text>
                <TextInput
                  value={newPhoneDigits}
                  onChangeText={(v) => setNewPhoneDigits(v.replace(/\D/g, '').slice(0, 9))}
                  placeholder="90 123 45 67"
                  placeholderTextColor={colors.muted}
                  keyboardType="number-pad"
                  style={[styles.input, styles.phoneInput]}
                  selectionColor={colors.accent}
                />
              </View>
            </View>
            {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
            {phoneDone ? <Text style={styles.savedText}>{t('phoneChanged')}</Text> : null}
            <Button style={styles.saveBtn} onPress={sendPhoneCode} disabled={phoneSending || newPhoneDigits.length < 9}>
              {phoneSending ? '…' : t('sendCode')}
            </Button>
          </>
        ) : (
          <>
            <Pressable onPress={openPhoneBot} style={styles.telegramBtn}>
              <MaterialCommunityIcons name="send-circle-outline" size={18} color={colors.accent} />
              <Text style={styles.telegramBtnText}>{t('tgOpenBot')}</Text>
            </Pressable>
            <View style={styles.field}>
              <Text style={styles.label}>{t('enterCode')}</Text>
              <TextInput
                value={phoneCode}
                onChangeText={(v) => setPhoneCode(cleanCode(v))}
                keyboardType="number-pad"
                maxLength={5}
                placeholderTextColor={colors.muted}
                style={styles.input}
                selectionColor={colors.accent}
              />
            </View>
            {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
            <View style={styles.phoneActions}>
              <Pressable onPress={cancelPhoneChange} style={styles.cancelInline} hitSlop={8}>
                <Text style={styles.link}>{t('cancel')}</Text>
              </Pressable>
              <Button style={styles.flexBtn} onPress={confirmPhoneChange} disabled={phoneVerifying || phoneCode.length < 5}>
                {phoneVerifying ? '…' : t('save')}
              </Button>
            </View>
          </>
        )}
      </View>

      <Overline style={styles.sectionGap}>{t('langShort')}</Overline>
      <View style={styles.languageList}>
        {languageOptions.map((option) => (
          <Pressable
            key={option.code}
            onPress={() => setLanguage(option.code)}
            style={[styles.option, language === option.code && styles.selected]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionTitle, language === option.code && styles.selectedTitle]}>
                {option.label}
              </Text>
              <Text style={styles.optionSub}>{(LANGUAGE_SUBS[language] || LANGUAGE_SUBS.uz)[option.code]}</Text>
            </View>
          </Pressable>
        ))}
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

const styles = StyleSheet.create({
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
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { color: colors.accent, fontWeight: '900', fontSize: 22 },
  name: { color: colors.text, fontSize: 16, fontWeight: '800' },
  nameMissing: { color: colors.muted, fontWeight: '600' },
  phone: { color: colors.muted, fontSize: 12, marginTop: 4 },
  memberSince: { color: '#59618D', fontSize: 10, marginTop: 3 },
  stats: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg, marginTop: spacing.md },
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

  // Hisob bo'limi (Sozlamalardan ko'chirilgan)
  sectionGap: { marginTop: spacing.xl },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md, marginTop: spacing.sm },
  avatarWrapSmall: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#151B42',
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarInitialSmall: { color: colors.accent, fontWeight: '900', fontSize: 24 },
  avatarActions: { gap: 8 },
  link: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  linkDanger: { color: colors.danger, fontSize: 13, fontWeight: '700' },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  row2: { flexDirection: 'row', gap: spacing.sm },
  field: { flex: 1, gap: 6 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  input: {
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
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  phonePrefix: { color: colors.text, fontWeight: '700', fontSize: 14 },
  phoneInput: { flex: 1 },
  currentPhone: { color: colors.text, fontWeight: '800', fontSize: 15 },
  saveBtn: { marginTop: 4 },
  errorText: { color: colors.danger, fontSize: 12 },
  savedText: { color: colors.tealLight, fontSize: 12, fontWeight: '700' },

  telegramBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  telegramBtnText: { color: colors.accent, fontWeight: '700', fontSize: 14 },
  phoneActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: 4 },
  cancelInline: { paddingVertical: 10 },
  flexBtn: { flex: 1 },

  languageList: { gap: spacing.sm },
  option: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  selected: { borderColor: colors.accent, backgroundColor: colors.surfaceRaised },
  optionTitle: { color: colors.text, fontWeight: '800', fontSize: 15 },
  selectedTitle: { color: colors.accent },
  optionSub: { color: colors.muted, fontSize: 11, marginTop: 4 },

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
});
