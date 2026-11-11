import React, { useState } from 'react';
import { Image, Linking, Pressable, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radii, spacing, themedStyles } from '../constants/theme';
import { Button, Header, Overline, Screen } from '../components/ui/Common';
import { api, assetUrl } from '../services/api';
import { errorText } from '../utils/errors';
import { formatUzPhone } from '../utils/phone';
import { cleanCode, isValidChallenge, telegramAppLink, telegramErrorText } from '../features/auth/telegram';
import { isNameUnsupportedError, joinFullName, nameInitial, realFullName, splitFullName, validateName } from '../utils/userName';

/** dd.mm.yyyy without relying on full ICU date formatting. */

/**
 * "Hisob sozlamalari" — profil sahifasidagi bitta tugmadan ochiladi: profil rasmi, ism-familiya, parol,
 * telefon raqami (Telegram orqali tasdiqlash). Ko'rinish va til — profil sahifasida (tez-tez o'zgartiriladi).
 *
 * Props: t, auth, onBack
 */
export default function AccountScreen({ t, auth, onBack }) {
  const user = auth?.user || {};
  const avatarInitial = nameInitial(user);
  const avatarUri = assetUrl(user.avatarUrl);

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
      <Header title={t('accountSettings')} onBack={onBack} />

      <Overline>{t('avatarSection')}</Overline>
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

      <Overline style={styles.sectionGap}>{t('fullName')}</Overline>
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

    </Screen>
  );
}

const styles = themedStyles(() => ({
  sectionGap: { marginTop: spacing.xl },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md, marginTop: spacing.sm },
  avatarImg: { width: '100%', height: '100%' },
  avatarWrapSmall: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceRaised,
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

  themeRow: { flexDirection: 'row', gap: spacing.sm },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  themeIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
  },
  themeIconOn: { backgroundColor: colors.accent },
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
}));
